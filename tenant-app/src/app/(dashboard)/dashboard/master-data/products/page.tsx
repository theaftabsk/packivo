'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui/Pagination';

interface Customer {
  id: string;
  customerName: string;
}

interface Product {
  id: string;
  name: string;
  customerId: string;
  customer?: Customer;
  boxSizeLength: number;
  boxSizeWidth: number;
  boxSizeHeight: number;
  duplexSize: string;
  kraftSize: string;
  plyType: 'THREE_PLY' | 'FIVE_PLY';
  printingMode: string;
  colorCount: number;
  finishType?: string;
  ups: number;
  hasPartition: boolean;
  printingDetails?: string;
  specialColorCode?: string;
  finishSize?: string;
  cartonTopPaperType?: string;
  cartonTopPaperGsm?: number;
  cartonFlutingPaperType?: string;
  cartonFlutingPaperGsm?: number;
  cartonBackingPaperType?: string;
  cartonBackingPaperGsm?: number;
  partitionSize?: string;
  partitionPly?: string;
  partitionUps?: string;
  partitionTopPaperType?: string;
  partitionTopPaperGsm?: number;
  partitionFlutingPaperType?: string;
  partitionFlutingPaperGsm?: number;
  partitionBackingPaperType?: string;
  partitionBackingPaperGsm?: number;
  partitionImage?: string;
  productImage?: string;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = () => ({
  name: '',
  customerId: '',
  customerName: '',
  boxPly: '3',
  boxSizeStr: '',
  duplexSize: '',
  kraftSize: '',
  printingDetails: 'Printed',
  printingMode: 'Offset',
  colorCount: '1',
  specialColorCode: '',
  finishType: 'Gloss',
  finishSize: '',
  ups: '1 sheet 1 Ups',
  cartonTopPaperType: 'Duplex',
  cartonTopPaperGsm: '',
  cartonFlutingPaperType: 'Kraft',
  cartonFlutingPaperGsm: '',
  cartonBackingPaperType: 'Kraft',
  cartonBackingPaperGsm: '',
  partitionDetails: 'Not Applicable',
  partitionSize: '',
  partitionPly: '3',
  partitionUps: '1 sheet 1 Ups',
  partitionTopPaperType: 'Kraft',
  partitionTopPaperGsm: '',
  partitionFlutingPaperType: 'Kraft',
  partitionFlutingPaperGsm: '',
  partitionBackingPaperType: 'Kraft',
  partitionBackingPaperGsm: '',
  partitionImage: '',
  productImage: '',
  remarks: '',
  isActive: true,
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [plyFilter, setPlyFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [pageErr, setPageErr] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  const debouncedSearch = useDebounce(search, 300);

  // Autocomplete state
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        ...(customerFilter !== 'all' && { customerId: customerFilter }),
      });
      const [prodRes, custData] = await Promise.all([
        api.get(`/products?${q.toString()}`),
        api.get('/customers'),
      ]);
      const prodData = prodRes as any;
      if (prodData && prodData.success) {
        setProducts(prodData.data || []);
        setMeta(prodData.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setProducts(Array.isArray(prodRes) ? prodRes : []);
      }
      setCustomers(Array.isArray(custData) ? custData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load products master');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, customerFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerFilter, plyFilter]);

  // Click outside to close customer dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setCustSearch('');
    setFormErr('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    const boxSizeStr = p.boxSizeLength && p.boxSizeWidth && p.boxSizeHeight
      ? `${p.boxSizeLength} x ${p.boxSizeWidth} x ${p.boxSizeHeight}`
      : '';
    setForm({
      name: p.name,
      customerId: p.customerId,
      customerName: p.customer?.customerName || '',
      boxPly: p.plyType === 'FIVE_PLY' ? '5' : '3',
      boxSizeStr,
      duplexSize: p.duplexSize,
      kraftSize: p.kraftSize,
      printingDetails: p.printingDetails || 'Printed',
      printingMode: p.printingMode,
      colorCount: String(p.colorCount),
      specialColorCode: p.specialColorCode || '',
      finishType: p.finishType || 'Gloss',
      finishSize: p.finishSize || '',
      ups: p.ups === 1 ? '1 sheet 1 Ups' : String(p.ups),
      cartonTopPaperType: p.cartonTopPaperType || 'Duplex',
      cartonTopPaperGsm: p.cartonTopPaperGsm ? String(p.cartonTopPaperGsm) : '',
      cartonFlutingPaperType: p.cartonFlutingPaperType || 'Kraft',
      cartonFlutingPaperGsm: p.cartonFlutingPaperGsm ? String(p.cartonFlutingPaperGsm) : '',
      cartonBackingPaperType: p.cartonBackingPaperType || 'Kraft',
      cartonBackingPaperGsm: p.cartonBackingPaperGsm ? String(p.cartonBackingPaperGsm) : '',
      partitionDetails: p.hasPartition ? 'Applicable' : 'Not Applicable',
      partitionSize: p.partitionSize || '',
      partitionPly: p.partitionPly === '5-ply' ? '5' : '3',
      partitionUps: p.partitionUps || '1 sheet 1 Ups',
      partitionTopPaperType: p.partitionTopPaperType || 'Kraft',
      partitionTopPaperGsm: p.partitionTopPaperGsm ? String(p.partitionTopPaperGsm) : '',
      partitionFlutingPaperType: p.partitionFlutingPaperType || 'Kraft',
      partitionFlutingPaperGsm: p.partitionFlutingPaperGsm ? String(p.partitionFlutingPaperGsm) : '',
      partitionBackingPaperType: p.partitionBackingPaperType || 'Kraft',
      partitionBackingPaperGsm: p.partitionBackingPaperGsm ? String(p.partitionBackingPaperGsm) : '',
      partitionImage: p.partitionImage || '',
      productImage: p.productImage || '',
      remarks: p.remarks || '',
      isActive: p.isActive,
    });
    setCustSearch(p.customer?.customerName || '');
    setFormErr('');
    setShowModal(true);
  };

  const handleImageUpload = (field: 'productImage' | 'partitionImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { setFormErr('Product / Job Name is required'); return; }
    if (!form.customerId) { setFormErr('Customer / Buyer selection is required'); return; }
    if (!form.boxSizeStr.trim()) { setFormErr('Box Size (in mm) is required'); return; }

    // Parse Box Size: e.g. "330 x 270 x 190"
    const sizeMatch = form.boxSizeStr.match(/(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)/i);
    if (!sizeMatch) {
      setFormErr('Invalid Box Size format. Please write like: 330 x 270 x 190');
      return;
    }

    const boxSizeLength = Number(sizeMatch[1]);
    const boxSizeWidth = Number(sizeMatch[2]);
    const boxSizeHeight = Number(sizeMatch[3]);

    setSaving(true);
    setFormErr('');

    const hasPartition = form.partitionDetails === 'Applicable';

    const parseUps = (upsStr: string) => {
      const match = upsStr.match(/(\d+)\s+sheet\s+(\d+)\s+Ups/i);
      if (match) return Number(match[2]);
      const num = Number(upsStr);
      return isNaN(num) ? 1 : num;
    };

    const payload = {
      name: form.name.trim(),
      customerId: form.customerId,
      boxSizeLength,
      boxSizeWidth,
      boxSizeHeight,
      duplexSize: form.duplexSize.trim(),
      kraftSize: form.kraftSize.trim(),
      plyType: form.boxPly === '5' ? 'FIVE_PLY' : 'THREE_PLY',
      printingDetails: form.printingDetails,
      printingMode: form.printingMode,
      colorCount: Number(form.colorCount),
      specialColorCode: form.specialColorCode.trim() || undefined,
      finishType: form.finishType,
      finishSize: form.finishSize.trim() || undefined,
      ups: parseUps(form.ups),
      hasPartition,
      cartonTopPaperType: form.cartonTopPaperType,
      cartonTopPaperGsm: form.cartonTopPaperGsm ? Number(form.cartonTopPaperGsm) : undefined,
      cartonFlutingPaperType: form.cartonFlutingPaperType,
      cartonFlutingPaperGsm: form.cartonFlutingPaperGsm ? Number(form.cartonFlutingPaperGsm) : undefined,
      cartonBackingPaperType: form.cartonBackingPaperType,
      cartonBackingPaperGsm: form.cartonBackingPaperGsm ? Number(form.cartonBackingPaperGsm) : undefined,
      partitionSize: hasPartition ? form.partitionSize.trim() || undefined : undefined,
      partitionPly: hasPartition ? (form.partitionPly === '5' ? '5-ply' : '3-ply') : undefined,
      partitionUps: hasPartition ? form.partitionUps : undefined,
      partitionTopPaperType: hasPartition ? form.partitionTopPaperType : undefined,
      partitionTopPaperGsm: hasPartition && form.partitionTopPaperGsm ? Number(form.partitionTopPaperGsm) : undefined,
      partitionFlutingPaperType: hasPartition ? form.partitionFlutingPaperType : undefined,
      partitionFlutingPaperGsm: hasPartition && form.partitionFlutingPaperGsm ? Number(form.partitionFlutingPaperGsm) : undefined,
      partitionBackingPaperType: hasPartition ? form.partitionBackingPaperType : undefined,
      partitionBackingPaperGsm: hasPartition && form.partitionBackingPaperGsm ? Number(form.partitionBackingPaperGsm) : undefined,
      partitionImage: hasPartition ? form.partitionImage || undefined : undefined,
      productImage: form.productImage || undefined,
      remarks: form.remarks.trim() || undefined,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      fetchProducts();
    } catch (e: any) {
      setFormErr(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteId}`);
      setDeleteId(null);
      fetchProducts();
    } catch (e: any) {
      setPageErr(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Product Name', 'Customer', 'Box Length', 'Box Width', 'Box Height', 'Ply Type',
      'Duplex Sheet Size', 'Kraft Sheet Size', 'Printing Details', 'Printing Mode', 'Colors',
      'Carton Finish', 'Carton Finish Size', 'Carton Ups', 'Top Paper', 'Top GSM',
      'Fluting Paper', 'Fluting GSM', 'Backing Paper', 'Backing GSM', 'Has Partition',
      'Partition Size', 'Partition Ply', 'Partition Ups', 'Status', 'Remarks'
    ];

    const rows = [
      headers,
      ...filtered.map(p => [
        p.name, p.customer?.customerName || '', p.boxSizeLength, p.boxSizeWidth, p.boxSizeHeight, p.plyType,
        p.duplexSize, p.kraftSize, p.printingDetails || 'Printed', p.printingMode, p.colorCount,
        p.finishType || 'Not Applicable', p.finishSize || '', p.ups, p.cartonTopPaperType || '', p.cartonTopPaperGsm || '',
        p.cartonFlutingPaperType || '', p.cartonFlutingPaperGsm || '', p.cartonBackingPaperType || '', p.cartonBackingPaperGsm || '',
        p.hasPartition ? 'Yes' : 'No', p.partitionSize || '', p.partitionPly || '', p.partitionUps || '',
        p.isActive ? 'Active' : 'Inactive', p.remarks || ''
      ])
    ];

    const blob = new Blob([rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product_specifications.csv';
    a.click();
  };

  const filtered = products.filter(p => {
    return plyFilter === 'all' ||
      (plyFilter === '3' && p.plyType === 'THREE_PLY') ||
      (plyFilter === '5' && p.plyType === 'FIVE_PLY');
  });

  const autocompleteCustomers = customers.filter(c =>
    c.customerName.toLowerCase().includes(custSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Product & Job Specifications</h2>
          <p className="text-xs text-gray-500 mt-0.5">{meta.totalItems} products specs registered</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Import CSV
          </button>
          <button onClick={openAdd} id="btn-add-product"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            + Add New
          </button>
        </div>
      </div>

      {/* Error */}
      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Search / Filter Bar */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input id="product-search" type="text" placeholder="Search product name, sheet size..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer">
          <option value="all">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.customerName}</option>
          ))}
        </select>
        <select value={plyFilter} onChange={e => setPlyFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer">
          <option value="all">All Ply Types</option>
          <option value="3">3-ply</option>
          <option value="5">5-ply</option>
        </select>
        <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
          Filter
        </button>
        <span className="text-xs text-gray-600 ml-auto">
          Showing <span className="text-gray-400 font-medium">{filtered.length}</span> of {meta.totalItems}
        </span>
      </div>

      {/* Grid Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                {['PRODUCT / JOB NAME', 'CUSTOMER', 'BOX SIZE (IN MM)', 'PLY', 'PARTITION', 'ACTIONS'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-600">Loading product specs…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-xs text-gray-600">No specifications found. <button onClick={openAdd} className="text-emerald-400 hover:underline">+ Add new</button></p>
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.025] transition-colors group">
                  {/* Product/Job Name */}
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/master-data/products/${p.id}`} className="text-left group/btn focus:outline-none block cursor-pointer">
                      <div className="font-semibold text-emerald-400 group-hover/btn:text-emerald-300 group-hover/btn:underline leading-tight">{p.name}</div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">SPEC-{p.id.slice(0, 8).toUpperCase()}</div>
                    </Link>
                  </td>
                  {/* Customer */}
                  <td className="px-4 py-3 text-gray-300">
                    {p.customer?.customerName || <span className="text-gray-700">—</span>}
                  </td>
                  {/* Box Size */}
                  <td className="px-4 py-3 text-gray-300 font-mono">
                    {p.boxSizeLength && p.boxSizeWidth && p.boxSizeHeight
                      ? `${p.boxSizeLength} x ${p.boxSizeWidth} x ${p.boxSizeHeight}`
                      : '—'
                    }
                  </td>
                  {/* Ply */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${p.plyType === 'FIVE_PLY' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                      {p.plyType === 'FIVE_PLY' ? '5-ply' : '3-ply'}
                    </span>
                  </td>
                  {/* Partition */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${p.hasPartition ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-white/5'}`}>
                      {p.hasPartition ? 'Applicable' : 'Not Applicable'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button id={`btn-edit-${p.id}`} onClick={() => openEdit(p)} title="Edit"
                        className="p-1.5 rounded bg-white/5 hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-300 transition-colors cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button id={`btn-del-${p.id}`} onClick={() => setDeleteId(p.id)} title="Delete"
                        className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            currentPage={meta.currentPage}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            itemsPerPage={meta.itemsPerPage}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {/* ══════════════════ MODAL: ADD / EDIT SPECIFICATIONS ══════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl flex flex-col gap-4">
            
            {/* Form Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-100">
                {editingId ? 'Edit Product Specification' : 'Add New Product Spec'}
              </h3>
              <button onClick={() => setShowModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formErr && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formErr}
              </div>
            )}

            <div className="space-y-4 py-1 text-xs">
              
              {/* Product / Job Name */}
              <div>
                <label className={lbl}>Product / Job Name <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. AMIN KIMIA DATES"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inp} />
              </div>

              {/* Customer / Buyer (Autocomplete Search Input) */}
              <div className="relative" ref={dropdownRef}>
                <label className={lbl}>Customer / Buyer <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Type at least 3 characters to search customer..."
                  value={custSearch}
                  onFocus={() => setShowCustDropdown(true)}
                  onChange={e => {
                    setCustSearch(e.target.value);
                    setShowCustDropdown(true);
                    // Clear select id if changed
                    setForm(f => ({ ...f, customerId: '', customerName: '' }));
                  }}
                  className={inp} />
                {showCustDropdown && custSearch.trim().length >= 3 && (
                  <div className="absolute z-[9999] left-0 right-0 mt-1 rounded-lg bg-[#0c1220] border border-white/10 max-h-48 overflow-y-auto shadow-2xl divide-y divide-white/5">
                    {autocompleteCustomers.length === 0 ? (
                      <div className="p-3 text-gray-500 text-center">No customer found</div>
                    ) : (
                      autocompleteCustomers.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, customerId: c.id, customerName: c.customerName }));
                            setCustSearch(c.customerName);
                            setShowCustDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-600/10 text-gray-200 hover:text-emerald-400 transition-colors">
                          {c.customerName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Box Ply */}
              <div>
                <label className={lbl}>Box Ply <span className="text-red-400">*</span></label>
                <select value={form.boxPly} onChange={e => setForm(f => ({ ...f, boxPly: e.target.value }))}
                  className={inp}>
                  <option value="3">3</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Box Size & Duplex Sheet Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Box Size (in mm) <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="e.g. 350x250x150"
                    value={form.boxSizeStr} onChange={e => setForm(f => ({ ...f, boxSizeStr: e.target.value }))}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Duplex Sheet Size (in inches)</label>
                  <input type="text" placeholder="e.g. 38x29"
                    value={form.duplexSize} onChange={e => setForm(f => ({ ...f, duplexSize: e.target.value }))}
                    className={inp} />
                </div>
              </div>

              {/* Kraft Sheet Size & Printing Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Kraft Sheet Size (in inches)</label>
                  <input type="text" placeholder="e.g. 38x52"
                    value={form.kraftSize} onChange={e => setForm(f => ({ ...f, kraftSize: e.target.value }))}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Printing Details <span className="text-red-400">*</span></label>
                  <select value={form.printingDetails} onChange={e => setForm(f => ({ ...f, printingDetails: e.target.value }))}
                    className={inp}>
                    <option value="Printed">Printed</option>
                    <option value="Unprinted">Unprinted</option>
                  </select>
                </div>
              </div>

              {/* Printing Mode & No of Colour */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Printing Mode <span className="text-red-400">*</span></label>
                  <select value={form.printingMode} onChange={e => setForm(f => ({ ...f, printingMode: e.target.value }))}
                    className={inp}>
                    <option value="Offset">Offset</option>
                    <option value="Flexo">Flexo</option>
                    <option value="Screen">Screen</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>No of Colour <span className="text-red-400">*</span></label>
                  <select value={form.colorCount} onChange={e => setForm(f => ({ ...f, colorCount: e.target.value }))}
                    className={inp}>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Special Colour Code & Carton Finish */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Special Colour Code</label>
                  <input type="text" placeholder="e.g. Pantone 300C"
                    value={form.specialColorCode} onChange={e => setForm(f => ({ ...f, specialColorCode: e.target.value }))}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Carton Finish <span className="text-red-400">*</span></label>
                  <select value={form.finishType} onChange={e => setForm(f => ({ ...f, finishType: e.target.value }))}
                    className={inp}>
                    <option value="Gloss">Gloss</option>
                    <option value="Matt">Matt</option>
                    <option value="Varnished">Varnished</option>
                    <option value="Drippoff">Drippoff</option>
                    <option value="Full uv">Full uv</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
              </div>

              {/* Carton Finish Size & Carton Ups */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Carton Finish Size (in inches)</label>
                  <input type="text" placeholder="e.g. 15x20"
                    value={form.finishSize} onChange={e => setForm(f => ({ ...f, finishSize: e.target.value }))}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Carton Ups <span className="text-red-400">*</span></label>
                  <select value={form.ups} onChange={e => setForm(f => ({ ...f, ups: e.target.value }))}
                    className={inp}>
                    <option value="1 sheet 1 Ups">1 sheet 1 Ups</option>
                    <option value="2">2 Ups</option>
                    <option value="3">3 Ups</option>
                    <option value="4">4 Ups</option>
                  </select>
                </div>
              </div>

              {/* Add Product Image */}
              <div>
                <label className={lbl}>Add Product Image</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={e => handleImageUpload('productImage', e)}
                    className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-gray-300 file:hover:bg-white/20 file:cursor-pointer" />
                  {form.productImage && (
                    <span className="text-[10px] text-emerald-400 font-medium">✓ Image selected</span>
                  )}
                </div>
              </div>

              <hr className="border-white/5 my-2" />

              {/* Carton GSM Layer Configuration Header */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Carton GSM Layer Configuration</h4>
                
                <div className="space-y-2">
                  {/* Top Paper */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[11px] text-gray-400">Top Paper *</span>
                    <select value={form.cartonTopPaperType} onChange={e => setForm(f => ({ ...f, cartonTopPaperType: e.target.value }))}
                      className="bg-[#080c14] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 flex-1">
                      <option value="Duplex">Duplex</option>
                      <option value="Kraft">Kraft</option>
                    </select>
                    <input type="number" placeholder="GSM" value={form.cartonTopPaperGsm}
                      onChange={e => setForm(f => ({ ...f, cartonTopPaperGsm: e.target.value }))}
                      className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 w-24" />
                  </div>
                  {/* Fluting Paper */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[11px] text-gray-400">Fluting Paper *</span>
                    <select value={form.cartonFlutingPaperType} onChange={e => setForm(f => ({ ...f, cartonFlutingPaperType: e.target.value }))}
                      className="bg-[#080c14] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 flex-1">
                      <option value="Kraft">Kraft</option>
                      <option value="Duplex">Duplex</option>
                    </select>
                    <input type="number" placeholder="GSM" value={form.cartonFlutingPaperGsm}
                      onChange={e => setForm(f => ({ ...f, cartonFlutingPaperGsm: e.target.value }))}
                      className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 w-24" />
                  </div>
                  {/* Backing Paper */}
                  <div className="flex items-center gap-3">
                    <span className="w-20 text-[11px] text-gray-400">Backing Paper *</span>
                    <select value={form.cartonBackingPaperType} onChange={e => setForm(f => ({ ...f, cartonBackingPaperType: e.target.value }))}
                      className="bg-[#080c14] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 flex-1">
                      <option value="Kraft">Kraft</option>
                      <option value="Duplex">Duplex</option>
                    </select>
                    <input type="number" placeholder="GSM" value={form.cartonBackingPaperGsm}
                      onChange={e => setForm(f => ({ ...f, cartonBackingPaperGsm: e.target.value }))}
                      className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 w-24" />
                  </div>
                </div>
              </div>

              {/* Partition Details */}
              <div>
                <label className={lbl}>Partition Details *</label>
                <select value={form.partitionDetails} onChange={e => setForm(f => ({ ...f, partitionDetails: e.target.value }))}
                  className={inp}>
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="Applicable">Applicable</option>
                </select>
              </div>

              {/* PARTITION SPECIFICATIONS (INLINE - CONDITIONAL DRAW) */}
              {form.partitionDetails === 'Applicable' && (
                <div className="space-y-4 p-3 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 animate-fadeIn">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Partition Specifications</h4>
                  
                  {/* Partition size & Partition Ply */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Partition Sheet Size (in inches)</label>
                      <input type="text" placeholder="e.g. 10x15"
                        value={form.partitionSize} onChange={e => setForm(f => ({ ...f, partitionSize: e.target.value }))}
                        className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Partition Ply *</label>
                      <select value={form.partitionPly} onChange={e => setForm(f => ({ ...f, partitionPly: e.target.value }))}
                        className={inp}>
                        <option value="3">3</option>
                        <option value="5">5</option>
                      </select>
                    </div>
                  </div>

                  {/* Partition Ups & Partition Layout Image */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Partition Ups *</label>
                      <select value={form.partitionUps} onChange={e => setForm(f => ({ ...f, partitionUps: e.target.value }))}
                        className={inp}>
                        <option value="1 sheet 1 Ups">1 sheet 1 Ups</option>
                        <option value="2">2 Ups</option>
                        <option value="3">3 Ups</option>
                        <option value="4">4 Ups</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Add Partition Image</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="file" accept="image/*" onChange={e => handleImageUpload('partitionImage', e)}
                          className="text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-white/5 file:text-gray-400 file:hover:bg-white/10 file:cursor-pointer" />
                        {form.partitionImage && (
                          <span className="text-[9px] text-emerald-400 shrink-0 font-medium">✓ Uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Partition GSM config */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Partition GSM Layer Configuration</span>
                    
                    {/* Top Paper */}
                    <div className="flex items-center gap-3">
                      <span className="w-20 text-[11px] text-gray-400">Top Paper *</span>
                      <select value={form.partitionTopPaperType} onChange={e => setForm(f => ({ ...f, partitionTopPaperType: e.target.value }))}
                        className="bg-[#080c14] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 flex-1">
                        <option value="Kraft">Kraft</option>
                        <option value="Duplex">Duplex</option>
                      </select>
                      <input type="number" placeholder="GSM" value={form.partitionTopPaperGsm}
                        onChange={e => setForm(f => ({ ...f, partitionTopPaperGsm: e.target.value }))}
                        className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 w-24" />
                    </div>
                    {/* Fluting Paper */}
                    <div className="flex items-center gap-3">
                      <span className="w-20 text-[11px] text-gray-400">Fluting Paper *</span>
                      <select value={form.partitionFlutingPaperType} onChange={e => setForm(f => ({ ...f, partitionFlutingPaperType: e.target.value }))}
                        className="bg-[#080c14] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 flex-1">
                        <option value="Kraft">Kraft</option>
                        <option value="Duplex">Duplex</option>
                      </select>
                      <input type="number" placeholder="GSM" value={form.partitionFlutingPaperGsm}
                        onChange={e => setForm(f => ({ ...f, partitionFlutingPaperGsm: e.target.value }))}
                        className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 w-24" />
                    </div>
                    {/* Backing Paper */}
                    <div className="flex items-center gap-3">
                      <span className="w-20 text-[11px] text-gray-400">Backing Paper *</span>
                      <select value={form.partitionBackingPaperType} onChange={e => setForm(f => ({ ...f, partitionBackingPaperType: e.target.value }))}
                        className="bg-[#080c14] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 flex-1">
                        <option value="Kraft">Kraft</option>
                        <option value="Duplex">Duplex</option>
                      </select>
                      <input type="number" placeholder="GSM" value={form.partitionBackingPaperGsm}
                        onChange={e => setForm(f => ({ ...f, partitionBackingPaperGsm: e.target.value }))}
                        className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 w-24" />
                    </div>
                  </div>
                </div>
              )}

              {/* Active status checkmark */}
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-gray-200">Active status (Product is available for planning and jobs)</div>
                </div>
              </label>

              {/* Remarks */}
              <div>
                <label className={lbl}>Remarks</label>
                <textarea rows={2} placeholder="Special requirements, board colors..."
                  value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  className={`${inp} resize-none`} />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <button onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={save} disabled={saving} id="btn-save-product"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                {saving
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving Spec…</>
                  : editingId ? 'Save Spec' : 'Save Spec'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Product Specification"
        message="Are you sure you want to delete this product specification? This action cannot be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors';
