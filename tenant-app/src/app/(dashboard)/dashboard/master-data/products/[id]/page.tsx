'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';

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

export default function ProductDetailPage({ params }: { params: any }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Stock analysis state
  const [stockAnalysis, setStockAnalysis] = useState<any | null>(null);
  const [showStockAnalysis, setShowStockAnalysis] = useState(false);

  // Modal / Edit state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Autocomplete state
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Resolve params promise safely for Next.js compatibility
  useEffect(() => {
    if (params) {
      Promise.resolve(params).then((res) => {
        if (res?.id) setId(res.id);
      });
    }
  }, [params]);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setPageErr('');
    try {
      const [prodData, custData, stockData] = await Promise.all([
        api.get(`/products/${id}`),
        api.get('/customers'),
        api.get(`/products/${id}/stock-analysis`).catch(() => null),
      ]);
      setProduct(prodData as Product);
      setCustomers(Array.isArray(custData) ? custData as Customer[] : []);
      setStockAnalysis(stockData);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load product specifications');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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

  const openEdit = () => {
    if (!product) return;
    const boxSizeStr = product.boxSizeLength && product.boxSizeWidth && product.boxSizeHeight
      ? `${product.boxSizeLength} x ${product.boxSizeWidth} x ${product.boxSizeHeight}`
      : '';
    setForm({
      name: product.name,
      customerId: product.customerId,
      customerName: product.customer?.customerName || '',
      boxPly: product.plyType === 'FIVE_PLY' ? '5' : '3',
      boxSizeStr,
      duplexSize: product.duplexSize,
      kraftSize: product.kraftSize,
      printingDetails: product.printingDetails || 'Printed',
      printingMode: product.printingMode,
      colorCount: String(product.colorCount),
      specialColorCode: product.specialColorCode || '',
      finishType: product.finishType || 'Gloss',
      finishSize: product.finishSize || '',
      ups: product.ups === 1 ? '1 sheet 1 Ups' : String(product.ups),
      cartonTopPaperType: product.cartonTopPaperType || 'Duplex',
      cartonTopPaperGsm: product.cartonTopPaperGsm ? String(product.cartonTopPaperGsm) : '',
      cartonFlutingPaperType: product.cartonFlutingPaperType || 'Kraft',
      cartonFlutingPaperGsm: product.cartonFlutingPaperGsm ? String(product.cartonFlutingPaperGsm) : '',
      cartonBackingPaperType: product.cartonBackingPaperType || 'Kraft',
      cartonBackingPaperGsm: product.cartonBackingPaperGsm ? String(product.cartonBackingPaperGsm) : '',
      partitionDetails: product.hasPartition ? 'Applicable' : 'Not Applicable',
      partitionSize: product.partitionSize || '',
      partitionPly: product.partitionPly === '5-ply' ? '5' : '3',
      partitionUps: product.partitionUps || '1 sheet 1 Ups',
      partitionTopPaperType: product.partitionTopPaperType || 'Kraft',
      partitionTopPaperGsm: product.partitionTopPaperGsm ? String(product.partitionTopPaperGsm) : '',
      partitionFlutingPaperType: product.partitionFlutingPaperType || 'Kraft',
      partitionFlutingPaperGsm: product.partitionFlutingPaperGsm ? String(product.partitionFlutingPaperGsm) : '',
      partitionBackingPaperType: product.partitionBackingPaperType || 'Kraft',
      partitionBackingPaperGsm: product.partitionBackingPaperGsm ? String(product.partitionBackingPaperGsm) : '',
      partitionImage: product.partitionImage || '',
      productImage: product.productImage || '',
      remarks: product.remarks || '',
      isActive: product.isActive,
    });
    setCustSearch(product.customer?.customerName || '');
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
    if (!id) return;
    if (!form.name.trim()) { setFormErr('Product / Job Name is required'); return; }
    if (!form.customerId) { setFormErr('Customer / Buyer selection is required'); return; }
    if (!form.boxSizeStr.trim()) { setFormErr('Box Size (in mm) is required'); return; }

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
      await api.patch(`/products/${id}`, payload);
      setShowModal(false);
      fetchDetail();
    } catch (e: any) {
      setFormErr(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!product || !id) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      router.push('/dashboard/master-data/products');
    } catch (e: any) {
      setPageErr(e?.message || 'Delete failed');
      setShowConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-500 font-medium">Loading spec sheet…</span>
      </div>
    );
  }

  if (pageErr || !product) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex flex-col gap-2 max-w-lg mx-auto mt-10">
        <div className="font-bold text-sm">Error Loading Specifications</div>
        <p>{pageErr || 'Spec sheet details not found'}</p>
        <Link href="/dashboard/master-data/products" className="text-emerald-400 hover:underline mt-2 text-xs font-semibold">
          ← Back to Products List
        </Link>
      </div>
    );
  }

  const autocompleteCustomers = customers.filter(c =>
    c.customerName.toLowerCase().includes(custSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Visual Spec Sheet view */}
      <div className="glass-card rounded-2xl border border-white/10 shadow-2xl p-6 flex flex-col gap-4">
        
        {/* Spec Sheet Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-gray-100">{product.name}</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Spec ID: SPEC-{product.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openEdit}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Specifications
            </button>
            <button onClick={() => setShowConfirmDelete(true)}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Spec
            </button>
            <Link href="/dashboard/master-data/products"
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
              ← Back to Products List
            </Link>
          </div>
        </div>

        {/* Spec Sheet Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Columns Table (Left Side, 2 Columns) */}
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="w-full text-left border-collapse border border-white/5 text-[12px] bg-black/10">
              <tbody className="divide-y divide-white/5">
                {/* Basic Info */}
                <tr className="bg-white/[0.02]">
                  <td className="px-3 py-2.5 font-semibold text-gray-400 w-1/3">Product Name</td>
                  <td className="px-3 py-2.5 text-gray-100 font-bold">{product.name}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Buyer's Name</td>
                  <td className="px-3 py-2.5 text-gray-200">{product.customer?.customerName || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Box Size (in mm)</td>
                  <td className="px-3 py-2.5 text-gray-200 font-mono">
                    {product.boxSizeLength} x {product.boxSizeWidth} x {product.boxSizeHeight}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Duplex Sheet Size (in inches)</td>
                  <td className="px-3 py-2.5 text-gray-200 font-mono">{product.duplexSize || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Kraft Sheet Size (in inches)</td>
                  <td className="px-3 py-2.5 text-gray-200 font-mono">{product.kraftSize || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Printing Details</td>
                  <td className="px-3 py-2.5 text-gray-200">{product.printingDetails || 'Printed'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Printing Mode</td>
                  <td className="px-3 py-2.5 text-gray-200">{product.printingMode || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">No of Colour</td>
                  <td className="px-3 py-2.5 text-gray-200">{product.colorCount}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Special Colour Code</td>
                  <td className="px-3 py-2.5 text-gray-200 font-mono">{product.specialColorCode || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Carton Finish</td>
                  <td className="px-3 py-2.5 text-gray-200">{product.finishType || 'Not Applicable'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Carton Finish Size (in inches)</td>
                  <td className="px-3 py-2.5 text-gray-200 font-mono">{product.finishSize || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Carton UPS</td>
                  <td className="px-3 py-2.5 text-gray-200">{product.ups} sheet {product.ups} ups</td>
                </tr>
                <tr className="bg-white/[0.01]">
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Carton Paper Description</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-300 font-mono">
                    T: {product.cartonTopPaperGsm}({product.cartonTopPaperType?.toLowerCase()}) | 
                    F: {product.cartonFlutingPaperGsm}({product.cartonFlutingPaperType?.toLowerCase()}) | 
                    B: {product.cartonBackingPaperGsm}({product.cartonBackingPaperType?.toLowerCase()})
                  </td>
                </tr>
                <tr className="bg-white/[0.01]">
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Carton GSM Configurations</td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-400">
                    <div className="space-y-0.5">
                      <div>Top Paper: <span className="font-semibold text-gray-200">{product.cartonTopPaperType} ({product.cartonTopPaperGsm} GSM)</span></div>
                      <div>Fluting Paper: <span className="font-semibold text-gray-200">{product.cartonFlutingPaperType} ({product.cartonFlutingPaperGsm} GSM)</span></div>
                      <div>Backing Paper: <span className="font-semibold text-gray-200">{product.cartonBackingPaperType} ({product.cartonBackingPaperGsm} GSM)</span></div>
                    </div>
                  </td>
                </tr>

                {/* Partition Spec Block */}
                <tr className="bg-emerald-500/5">
                  <td className="px-3 py-2.5 font-semibold text-emerald-400">Partition Details</td>
                  <td className="px-3 py-2.5 text-emerald-400 font-bold">{product.hasPartition ? 'Applicable' : 'Not Applicable'}</td>
                </tr>
                {product.hasPartition && (
                  <>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-gray-400">Partition Sheet Size (in inches)</td>
                      <td className="px-3 py-2.5 text-gray-200 font-mono">{product.partitionSize || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-gray-400">Partition Ply</td>
                      <td className="px-3 py-2.5 text-gray-200">{product.partitionPly || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-gray-400">Partition UPS</td>
                      <td className="px-3 py-2.5 text-gray-200">{product.partitionUps || '—'}</td>
                    </tr>
                    <tr className="bg-white/[0.01]">
                      <td className="px-3 py-2.5 font-semibold text-gray-400">Partition Paper Description</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-300 font-mono">
                        T: {product.partitionTopPaperGsm}({product.partitionTopPaperType?.toLowerCase()}) | 
                        F: {product.partitionFlutingPaperGsm}({product.partitionFlutingPaperType?.toLowerCase()}) | 
                        B: {product.partitionBackingPaperGsm}({product.partitionBackingPaperType?.toLowerCase()})
                      </td>
                    </tr>
                    <tr className="bg-white/[0.01]">
                      <td className="px-3 py-2.5 font-semibold text-gray-400">Partition GSM Configurations</td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-400">
                        <div className="space-y-0.5">
                          <div>Top Paper: <span className="font-semibold text-gray-200">{product.partitionTopPaperType} ({product.partitionTopPaperGsm} GSM)</span></div>
                          <div>Fluting Paper: <span className="font-semibold text-gray-200">{product.partitionFlutingPaperType} ({product.partitionFlutingPaperGsm} GSM)</span></div>
                          <div>Backing Paper: <span className="font-semibold text-gray-200">{product.partitionBackingPaperType} ({product.partitionBackingPaperGsm} GSM)</span></div>
                        </div>
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Remarks</td>
                  <td className="px-3 py-2.5 text-gray-300 whitespace-pre-wrap">{product.remarks || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-gray-400">Status</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${product.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Layout Preview Pane (Right Side, 1 Column) */}
          <div className="flex flex-col gap-4">
            <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col gap-3">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">PRODUCT IMAGES / LAYOUTS</h4>
              <div className="w-full aspect-[4/3] rounded-lg bg-black/30 border border-white/5 flex items-center justify-center overflow-hidden">
                {product.productImage ? (
                  <img src={product.productImage} alt="Product Spec Layout" className="object-contain w-full h-full max-h-[300px]" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-gray-700">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[11px]">No product image uploaded yet</span>
                  </div>
                )}
              </div>
            </div>

            {product.hasPartition && (
              <div className="glass-card p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">PARTITION LAYOUT</h4>
                <div className="w-full aspect-[4/3] rounded-lg bg-black/30 border border-white/5 flex items-center justify-center overflow-hidden">
                  {product.partitionImage ? (
                    <img src={product.partitionImage} alt="Partition Layout" className="object-contain w-full h-full max-h-[300px]" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-gray-700">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[11px]">No partition image uploaded yet</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Stock & Raw Material Analysis (KNOW MORE) */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <button
            onClick={() => setShowStockAnalysis(!showStockAnalysis)}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-400 text-xs font-bold transition-colors focus:outline-none cursor-pointer"
          >
            <span className="text-[10px]">{showStockAnalysis ? '▼' : '▲'}</span>
            <span>KNOW MORE (Click to analyze raw materials & ready stocks)</span>
          </button>

          {showStockAnalysis && (
            <div className="mt-5 space-y-4 border-l-2 border-rose-500/20 pl-4 py-1 animate-fadeIn">
              
              {/* 1. Available Ready Product Stock */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">Available Ready Product Stock</h5>
                  {stockAnalysis?.finishedGoods?.totalStock > 0 ? (
                    <p className="text-xs text-gray-400 mt-1">
                      <span className="font-semibold text-emerald-400 font-mono">{stockAnalysis.finishedGoods.totalStock}</span> finished boxes in stock ({stockAnalysis.finishedGoods.allocatedStock} allocated for pending dispatches).
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">No finished ready boxes currently in stock.</p>
                  )}
                </div>
              </div>

              {/* 2. Raw Duplex Paper Stock */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">
                    Raw Duplex Paper Stock (Size: {stockAnalysis?.rawDuplex?.size || product.duplexSize})
                  </h5>
                  {stockAnalysis?.rawDuplex?.qtySheets > 0 ? (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      <span className="font-semibold text-blue-400">{stockAnalysis.rawDuplex.qtySheets}</span> sheets available in stock (GSM: {stockAnalysis.rawDuplex.gsm}).
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      No raw duplex paper in stock matching sheet size: {stockAnalysis?.rawDuplex?.size || product.duplexSize || '—'}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Printed Duplex Stock */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">Printed Duplex Stock (Ready for Production)</h5>
                  {stockAnalysis?.printedDuplex?.qtySheets > 0 ? (
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      <span className="font-semibold text-emerald-400">{stockAnalysis.printedDuplex.qtySheets}</span> printed sheets available for production.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">No printed duplex sheets available for this product.</p>
                  )}
                </div>
              </div>

              {/* 4. Backing Ply Board / Kraft Rolls */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">
                    Backing Ply Board / Kraft Rolls (Matching Size: {stockAnalysis?.kraftSize || product.kraftSize} | Type: {stockAnalysis?.plyType || (product.plyType === 'FIVE_PLY' ? '5-ply' : '3-ply')})
                  </h5>
                  {stockAnalysis?.kraftRolls?.length > 0 ? (
                    <div className="text-xs text-gray-400 mt-1 space-y-1 font-mono">
                      {stockAnalysis.kraftRolls.map((kr: any) => (
                        <div key={kr.id}>
                          • Kraft roll weight in stock: <span className="font-semibold text-amber-400">{kr.weightKg} kg</span> (Size: {kr.rollSize}", GSM: {kr.gsm}).
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      No ply board sheets in stock matching type and sheet size: {stockAnalysis?.kraftSize || product.kraftSize || '—'}
                    </p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Spec Sheet Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-white/10 mt-2 text-[10px] text-gray-600">
          <span>Date created: {new Date(product.createdAt).toLocaleDateString()}</span>
          <span>Packivo ERP Cloud Platform</span>
        </div>
      </div>

      {/* ══════════════════ EDIT MODAL ══════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl flex flex-col gap-4">
            
            {/* Form Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-100">Edit Product Specification</h3>
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

              {/* Carton GSM Layer Configuration */}
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

              {/* Active Toggle */}
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
                  : 'Save Spec'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Delete Product Specification"
        message="Are you sure you want to delete this product specification? This action cannot be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors';
