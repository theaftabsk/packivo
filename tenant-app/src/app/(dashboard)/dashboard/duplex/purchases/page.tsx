'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui/Pagination';

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  suppliedMaterials: string[];
}

interface Product {
  id: string;
  name: string;
  duplexSize: string;
  cartonTopPaperGsm?: number;
}

interface DuplexPurchase {
  id: string;
  challanNo: string;
  gsm: number;
  size: string;
  quantitySheets: number;
  weightKg: number;
  rate: number;
  purchaseDate: string;
  deliveredTo?: string;
  invoicePath?: string;
  remarks?: string;
  vendorId: string;
  vendor?: Vendor;
  latestPrintDate?: string;
  totalQtyUsed?: number;
  balanceStock: number;
  consumptionHistory: {
    date: string;
    type: string;
    details?: string;
    qtyUsed: number | null;
    balanceStock: number;
  }[];
}

interface PurchaseItemInput {
  size: string;
  gsm: string;
  quantitySheets: string;
  weightKg: string;
  rate: string;
  remarks: string;
}

export default function DuplexPurchasesPage() {
  const [purchases, setPurchases] = useState<DuplexPurchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');

  // Collapsible rows state
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Add Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Form Fields
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [challanNo, setChallanNo] = useState('');
  const [deliveredTo, setDeliveredTo] = useState('Main Box Plant');
  const [remarks, setRemarks] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<string | null>(null);

  const [items, setItems] = useState<PurchaseItemInput[]>([
    { size: '', gsm: '', quantitySheets: '', weightKg: '', rate: '', remarks: '' },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
      });
      const [purchasesRes, vendorsData, productsData] = await Promise.all([
        api.get(`/duplex/purchases?${q.toString()}`),
        api.get('/vendors'),
        api.get('/products'),
      ]);
      const purchasesData = purchasesRes as any;
      if (purchasesData && purchasesData.success) {
        setPurchases(purchasesData.data || []);
        setMeta(purchasesData.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setPurchases(Array.isArray(purchasesRes) ? purchasesRes : []);
      }
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load purchase records.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Click outside to close vendor autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { size: '', gsm: '', quantitySheets: '', weightKg: '', rate: '', remarks: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemInput, value: string) => {
    setItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAdd = () => {
    setSelectedVendorId('');
    setVendorSearch('');
    setChallanNo('');
    setDeliveredTo('Main Box Plant');
    setRemarks('');
    setInvoiceFile(null);
    setItems([{ size: '', gsm: '', quantitySheets: '', weightKg: '', rate: '', remarks: '' }]);
    setFormErr('');
    setShowModal(true);
  };

  const save = async () => {
    if (!selectedVendorId) { setFormErr('Vendor selection is required'); return; }
    if (!challanNo.trim()) { setFormErr('Vendor Challan Number is required'); return; }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.size.trim()) { setFormErr(`Item #${i + 1} size is required (e.g. 38x29)`); return; }
      if (!item.gsm.trim() || isNaN(Number(item.gsm))) { setFormErr(`Item #${i + 1} GSM must be a number`); return; }
      if (!item.quantitySheets.trim() || isNaN(Number(item.quantitySheets))) { setFormErr(`Item #${i + 1} quantity sheets must be a number`); return; }
      if (!item.weightKg.trim() || isNaN(Number(item.weightKg))) { setFormErr(`Item #${i + 1} weight (kg) must be a number`); return; }
    }

    setSaving(true);
    setFormErr('');

    const payload = {
      purchaseDate,
      vendorId: selectedVendorId,
      challanNo: challanNo.trim(),
      deliveredTo,
      invoicePath: invoiceFile || undefined,
      items: items.map(item => ({
        size: item.size.trim(),
        gsm: Number(item.gsm),
        quantitySheets: Number(item.quantitySheets),
        weightKg: Number(item.weightKg),
        rate: item.rate.trim() ? Number(item.rate) : 0,
        remarks: item.remarks.trim() || undefined,
      })),
    };

    try {
      await api.post('/duplex/purchases', payload);
      setShowModal(false);
      fetchPurchases();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to save purchase details.');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Date of Purchase', 'Vendor Name', 'Delivered To', 'Vendor Challan No',
      'Paper Size', 'GSM', 'Weight (Kg)', 'Paper Qty', 'Printing Date',
      'Qty Used', 'Raw Material Stock'
    ];

    const rows = [
      headers,
      ...filtered.map(p => [
        new Date(p.purchaseDate).toLocaleDateString(),
        p.vendor?.vendorName || '',
        p.deliveredTo || '',
        p.challanNo,
        p.size,
        p.gsm,
        p.weightKg,
        p.quantitySheets,
        p.latestPrintDate ? new Date(p.latestPrintDate).toLocaleDateString() : '—',
        p.totalQtyUsed || '—',
        p.balanceStock
      ])
    ];

    const blob = new Blob([rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `duplex_purchases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter Logic
  const filtered = purchases.filter(p => {
    const matchesVendor = vendorFilter === 'all' || p.vendorId === vendorFilter;

    // Intended job matches if the print jobs consume from this purchase's size & GSM
    const matchesJob = jobFilter === 'all' || p.consumptionHistory.some(log =>
      log.type.toLowerCase().includes(jobFilter.toLowerCase())
    );

    return matchesVendor && matchesJob;
  });

  const autocompleteVendors = vendors.filter(v =>
    v.vendorName.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Duplex Purchase Details</h2>
          <p className="text-xs text-gray-500 mt-0.5">{meta.totalItems} inward purchases logged</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button onClick={openAdd} id="btn-add-purchase"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Duplex Purchase
          </button>
        </div>
      </div>

      {/* Error Info */}
      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input type="text" placeholder="Search vendor challan or paper size..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
          <option value="all">All Vendors</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.vendorName}</option>
          ))}
        </select>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
          <option value="all">All Intended Jobs</option>
          {products.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
        <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
          Filter
        </button>
      </div>

      {/* Grid Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">DATE OF PURCHASE</th>
                <th className="px-4 py-3">VENDOR NAME</th>
                <th className="px-4 py-3">DELIVERED TO</th>
                <th className="px-4 py-3">VENDOR CHALLAN NO</th>
                <th className="px-4 py-3">PAPER SIZE</th>
                <th className="px-4 py-3">PAPER QTY</th>
                <th className="px-4 py-3">PRINTING DATE</th>
                <th className="px-4 py-3">QTY USED</th>
                <th className="px-4 py-3">RAW MATERIAL STOCK</th>
                <th className="px-4 py-3">INVOICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading duplex inward deliveries…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs text-gray-600">
                    No purchase challan records found.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const isExpanded = expandedRows.includes(p.id);
                return (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-white/[0.015] transition-colors">
                      {/* Date of Purchase */}
                      <td className="px-4 py-3.5 text-gray-300 font-mono">
                        {new Date(p.purchaseDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      {/* Vendor Name */}
                      <td className="px-4 py-3.5 text-gray-200 font-semibold">{p.vendor?.vendorName}</td>
                      {/* Delivered To */}
                      <td className="px-4 py-3.5 text-gray-400">{p.deliveredTo || '—'}</td>
                      {/* Challan No */}
                      <td className="px-4 py-3.5 font-mono text-gray-200 font-bold">{p.challanNo}</td>
                      {/* Paper Size Details */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-100">Size: {p.size}</div>
                          <div className="text-[10px] text-gray-500">GSM: {p.gsm}</div>
                          <div className="text-[10px] text-gray-500">Weight: {p.weightKg.toLocaleString()} kg</div>
                        </div>
                      </td>
                      {/* Paper Qty */}
                      <td className="px-4 py-3.5 text-gray-200 font-mono font-semibold">{p.quantitySheets.toLocaleString()}</td>
                      {/* Printing Date */}
                      <td className="px-4 py-3.5 text-gray-400 font-mono">
                        {p.latestPrintDate
                          ? new Date(p.latestPrintDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'
                        }
                      </td>
                      {/* Qty Used */}
                      <td className="px-4 py-3.5 text-gray-400 font-mono">
                        {p.totalQtyUsed ? p.totalQtyUsed.toLocaleString() : '—'}
                      </td>
                      {/* Raw Material Stock Balance Pill (Collapsible row trigger) */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => toggleRow(p.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            p.balanceStock === 0
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : p.balanceStock < p.quantitySheets * 0.2
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                          }`}
                        >
                          <span className="font-mono">{p.balanceStock.toLocaleString()}</span>
                          <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                        </button>
                      </td>
                      {/* Invoice Link */}
                      <td className="px-4 py-3.5">
                        {p.invoicePath ? (
                          <a href={p.invoicePath} download={`invoice_${p.challanNo}`} className="text-emerald-400 hover:underline">
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Stock Consumption Log collapsible panel */}
                    {isExpanded && (
                      <tr className="bg-[#090f1d]/50">
                        <td colSpan={10} className="px-5 py-4">
                          <div className="border border-white/5 rounded-xl p-4 bg-[#090f1c] animate-fadeIn shadow-inner">
                            <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-white/5">
                              <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                STOCK CONSUMPTION HISTORY FOR CHALLAN: <span className="text-rose-400 font-mono">{p.challanNo}</span> (GSM: {p.gsm}, Size: {p.size})
                              </h4>
                              <button
                                onClick={() => toggleRow(p.id)}
                                className="text-[10px] text-gray-500 hover:text-white transition-colors cursor-pointer"
                              >
                                ✕ Collapse Details
                              </button>
                            </div>
                            {p.consumptionHistory && p.consumptionHistory.length > 0 ? (
                              <table className="w-full text-left text-[11px] divide-y divide-white/5">
                                <thead>
                                  <tr className="text-gray-500 text-[10px] font-bold tracking-wider uppercase">
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Type / Print Job Name</th>
                                    <th className="py-2 text-right">Qty Used</th>
                                    <th className="py-2 text-right">Balance Stock</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                  {p.consumptionHistory.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.01]">
                                      <td className="py-2.5 text-gray-400 font-mono">
                                        {new Date(log.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="py-2.5 text-gray-200">
                                        <div className="font-semibold">{log.type}</div>
                                        {log.details && <div className="text-[10px] text-gray-500 font-mono mt-0.5">{log.details}</div>}
                                      </td>
                                      <td className={`py-2.5 text-right font-mono font-semibold ${log.qtyUsed !== null && log.qtyUsed < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                        {log.qtyUsed !== null ? log.qtyUsed.toLocaleString() : '—'}
                                      </td>
                                      <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                                        {log.balanceStock.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-center py-4 text-xs text-gray-600">
                                No print job consumption logs recorded yet.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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

      {/* ══════════════════ ADD PURCHASE MODAL (MULTI-ITEM LOG) ══════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl flex flex-col gap-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-100">Log Duplex Inward Purchase</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Record a raw duplex paper delivery from a vendor. This increments raw duplex stock.</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formErr && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-shake">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formErr}
              </div>
            )}

            {/* Inward Details Form fields */}
            <div className="space-y-4 py-1 text-xs">
              
              <div className="border border-white/5 rounded-xl p-3 bg-black/10">
                <h4 className="text-[10px] font-bold form-section-header uppercase tracking-wider mb-2.5">CHALLAN HEADER INFORMATION</h4>
                
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Date of Purchase */}
                  <div>
                    <label className={lbl}>DATE OF PURCHASE <span className="text-red-400">*</span></label>
                    <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                      className={inp} />
                  </div>

                  {/* Vendor Autocomplete */}
                  <div className="relative" ref={dropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">VENDOR <span className="text-red-400">*</span></label>
                      <Link href="/dashboard/master-data/vendors" className="text-[9px] text-emerald-400 hover:underline">+ Add Vendor</Link>
                    </div>
                    <input type="text" placeholder="Type 3+ characters to search vendors..."
                      value={vendorSearch}
                      onFocus={() => setShowVendorDropdown(true)}
                      onChange={e => {
                        setVendorSearch(e.target.value);
                        setShowVendorDropdown(true);
                        setSelectedVendorId('');
                      }}
                      className={inp} />
                    {showVendorDropdown && vendorSearch.trim().length >= 3 && (
                      <div className="absolute z-[9999] left-0 right-0 mt-1 rounded-lg bg-[#0c1220] border border-white/10 max-h-48 overflow-y-auto shadow-2xl divide-y divide-white/5">
                        {autocompleteVendors.length === 0 ? (
                          <div className="p-3 text-gray-500 text-center">No vendor found</div>
                        ) : (
                          autocompleteVendors.map(v => (
                            <button key={v.id} type="button"
                              onClick={() => {
                                setSelectedVendorId(v.id);
                                setVendorSearch(v.vendorName);
                                setShowVendorDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-indigo-600/10 text-gray-200 hover:text-indigo-400 transition-colors">
                              {v.vendorName} ({v.vendorCode})
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 mt-3">
                  {/* Vendor Challan Number */}
                  <div>
                    <label className={lbl}>VENDOR CHALLAN NUMBER <span className="text-red-400">*</span></label>
                    <input type="text" placeholder="e.g. CH-9081"
                      value={challanNo} onChange={e => setChallanNo(e.target.value)}
                      className={inp} />
                  </div>

                  {/* Delivered To */}
                  <div>
                    <label className={lbl}>DELIVERED TO <span className="text-red-400">*</span></label>
                    <select value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)}
                      className={inp}>
                      <option value="Main Box Plant">Main Box Plant</option>
                      <option value="Pinnacle Packaging (Printer)">Pinnacle Packaging (Printer)</option>
                      <option value="Rainbow Printers (Printer)">Rainbow Printers (Printer)</option>
                    </select>
                  </div>
                </div>

                {/* Invoice Attachment */}
                <div className="mt-3">
                  <label className={lbl}>INVOICE ATTACHMENT (PDF/IMAGE, MAX 10MB)</label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*,application/pdf" onChange={handleInvoiceUpload}
                      className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-gray-300 file:hover:bg-white/20 file:cursor-pointer" />
                    {invoiceFile && (
                      <span className="text-[10px] text-emerald-400 font-medium">✓ File attached</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items configuration */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-white/5 rounded-xl p-3 bg-indigo-500/[0.01] flex flex-col gap-3 relative animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold form-section-header uppercase tracking-wider">ITEM #{idx + 1}</span>
                      {items.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItem(idx)}
                          className="text-[10px] text-red-400 hover:text-red-300 hover:underline cursor-pointer">
                          ✕ Remove Item
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className={lbl}>PAPER SIZE (INCHES) <span className="text-red-400">*</span></label>
                        <input type="text" placeholder="e.g. 38x29" value={item.size}
                          onChange={e => handleItemChange(idx, 'size', e.target.value)}
                          className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>GSM <span className="text-red-400">*</span></label>
                        <input type="text" placeholder="e.g. 230" value={item.gsm}
                          onChange={e => handleItemChange(idx, 'gsm', e.target.value)}
                          className={inp} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className={lbl}>PAPER QTY (SHEETS) <span className="text-red-400">*</span></label>
                        <input type="text" placeholder="e.g. 10000" value={item.quantitySheets}
                          onChange={e => handleItemChange(idx, 'quantitySheets', e.target.value)}
                          className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>TOTAL WEIGHT (KG) <span className="text-red-400">*</span></label>
                        <input type="text" placeholder="e.g. 240.50" value={item.weightKg}
                          onChange={e => handleItemChange(idx, 'weightKg', e.target.value)}
                          className={inp} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className={lbl}>PURCHASE RATE (PER SHEET / PER KG)</label>
                        <input type="text" placeholder="e.g. 15.50" value={item.rate}
                          onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                          className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>REMARKS / NOTE</label>
                        <input type="text" placeholder="Optional comments for this item..." value={item.remarks}
                          onChange={e => handleItemChange(idx, 'remarks', e.target.value)}
                          className={inp} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item helper */}
              <button type="button" onClick={handleAddItem}
                className="w-full py-2 rounded-lg border border-dashed border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                + Add Item
              </button>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <button onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={save} disabled={saving} id="btn-save-purchase"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                {saving
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding Duplex...</>
                  : 'Add Duplex Purchase'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold form-section-label uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
