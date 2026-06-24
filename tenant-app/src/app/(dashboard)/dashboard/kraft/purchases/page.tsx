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

interface KraftPurchase {
  id: string;
  challanNo?: string;
  invoiceNo?: string;
  deliveredTo?: string;
  paperType?: string;
  qtyRolls: number;
  rollSize: number;
  gsm: number;
  weightKg: number;
  rate: number;
  remarks?: string;
  purchaseDate: string;
  vendorId: string;
  vendor?: Vendor;
  latestProductionDate?: string;
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

interface RollItemInput {
  gsm: string;
  paperType: string;
  rollSize: string;
  qtyRolls: string;
  weightKg: string; // Weight per roll
  remarks: string;
}

export default function KraftPurchasesPage() {
  const [purchases, setPurchases] = useState<KraftPurchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Collapsible rows state
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // View Toggle State: Grid view vs Creation Form view
  const [isFormView, setIsFormView] = useState(false);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [plyFilter, setPlyFilter] = useState('all'); // paperType filter

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

  // ══════════════════ CREATION FORM STATE ══════════════════
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const [deliveredTo, setDeliveredTo] = useState('GIGANI (Inhouse)');
  const [challanNo, setChallanNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const [items, setItems] = useState<RollItemInput[]>([
    { gsm: '', paperType: 'Natural', rollSize: '', qtyRolls: '1', weightKg: '', remarks: '' },
  ]);

  const vendorDropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
      });
      const [purchasesData, vendorsData] = await Promise.all([
        api.get<any>(`/kraft/purchases?${q.toString()}`),
        api.get<Vendor[]>('/vendors'),
      ]);
      if (purchasesData && purchasesData.success) {
        setPurchases(purchasesData.data || []);
        setMeta(purchasesData.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      }
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load Kraft purchase ledger.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Click outside to close vendor autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { gsm: '', paperType: 'Natural', rollSize: '', qtyRolls: '1', weightKg: '', remarks: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof RollItemInput, value: string) => {
    setItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const openFormView = () => {
    setSelectedVendorId('');
    setVendorSearch('');
    setDeliveredTo('GIGANI (Inhouse)');
    setChallanNo('');
    setInvoiceNo('');
    setRemarks('');
    setItems([{ gsm: '', paperType: 'Natural', rollSize: '', qtyRolls: '1', weightKg: '', remarks: '' }]);
    setFormErr('');
    setIsFormView(true);
  };

  const handleSavePurchase = async () => {
    if (!selectedVendorId) { setFormErr('Vendor selection is required'); return; }
    if (!challanNo.trim()) { setFormErr('Vendor Challan Number is required'); return; }
    if (!invoiceNo.trim()) { setFormErr('Invoice Number is required'); return; }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.gsm.trim() || isNaN(Number(item.gsm))) { setFormErr(`Product #${i + 1} GSM must be a number`); return; }
      if (!item.rollSize.trim() || isNaN(Number(item.rollSize))) { setFormErr(`Product #${i + 1} Roll Size must be a number`); return; }
      if (!item.qtyRolls.trim() || isNaN(Number(item.qtyRolls)) || Number(item.qtyRolls) <= 0) {
        setFormErr(`Product #${i + 1} Qty of Roll must be a positive number`); return;
      }
      if (!item.weightKg.trim() || isNaN(Number(item.weightKg)) || Number(item.weightKg) <= 0) {
        setFormErr(`Product #${i + 1} Weight per roll must be a positive number`); return;
      }
    }

    setSaving(true);
    setFormErr('');

    const payload = {
      purchaseDate,
      vendorId: selectedVendorId,
      challanNo: challanNo.trim(),
      invoiceNo: invoiceNo.trim(),
      deliveredTo,
      items: items.map(item => ({
        gsm: Number(item.gsm),
        paperType: item.paperType,
        rollSize: Number(item.rollSize),
        qtyRolls: Number(item.qtyRolls),
        weightKg: Number(item.weightKg), // backend will multiply weightKg * qtyRolls
        rate: 0,
        remarks: item.remarks.trim() || undefined,
      })),
    };

    try {
      await api.post('/kraft/purchases', payload);
      setIsFormView(false);
      fetchData();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to record Kraft inward purchase.');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Date of Purchase', 'Challan No', 'Vendor Name', 'Delivered To',
      'Roll Size', 'Qty of Roll', 'Roll GSM', 'Roll Total Weight',
      'Final Product Date', 'Weight Used', 'Weight Stock', 'Invoice'
    ];

    const rows = [
      headers,
      ...filtered.map(p => [
        new Date(p.purchaseDate).toLocaleDateString(),
        p.challanNo || '—',
        p.vendor?.vendorName || '',
        p.deliveredTo || '—',
        `${p.rollSize} in`,
        p.qtyRolls,
        p.gsm,
        p.weightKg,
        new Date(p.purchaseDate).toLocaleDateString(),
        '0.00 kg',
        `${p.weightKg.toFixed(2)} kg`,
        p.invoiceNo || '—'
      ])
    ];

    const blob = new Blob([rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kraft_purchases_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Autocomplete search lists
  const autocompleteVendors = vendors.filter(v =>
    v.vendorName.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // Filters logic
  const filtered = purchases.filter(p => {
    const matchesVendor = vendorFilter === 'all' || p.vendorId === vendorFilter;
    const matchesPly = plyFilter === 'all' || p.paperType === plyFilter;

    return matchesVendor && matchesPly;
  });

  if (isFormView) {
    return (
      <div className="space-y-4">
        {/* Back Link */}
        <div>
          <button onClick={() => setIsFormView(false)}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
            ← Back to Inward List
          </button>
        </div>

        {/* Kraft Form Header */}
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Kraft Purchase Details</h2>
          <p className="text-xs text-gray-500 mt-0.5">Record new Kraft roll purchases from vendors. Weights are automatically recorded.</p>
        </div>

        {formErr && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formErr}
          </div>
        )}

        {/* Form Container */}
        <div className="space-y-4 text-xs">
          {/* Header Info Card */}
          <div className="border border-white/5 rounded-xl p-4 bg-[#0a101d]">
            <h4 className="text-[10px] font-bold form-section-header uppercase tracking-wider mb-3">CHALLAN HEADER INFORMATION</h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Date of Purchase */}
              <div>
                <label className={lbl}>DATE OF PURCHASE *</label>
                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                  className={inp} />
              </div>

              {/* Vendor Autocomplete */}
              <div className="relative" ref={vendorDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">VENDOR *</label>
                  <Link href="/dashboard/master-data/vendors" className="text-[9px] text-indigo-400 hover:underline">+ Add Vendor</Link>
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

              {/* Delivered To */}
              <div>
                <label className={lbl}>DELIVERED TO / CO-VENDOR</label>
                <select value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)}
                  className={inp}>
                  <option value="GIGANI (Inhouse)">GIGANI (Inhouse)</option>
                  {vendors.filter(v => v.suppliedMaterials.includes('Co-Vendor')).map(v => (
                    <option key={v.id} value={`${v.vendorName} (Co-Vendor)`}>{v.vendorName} (Co-Vendor)</option>
                  ))}
                </select>
              </div>

              {/* Vendor Challan Number */}
              <div>
                <label className={lbl}>VENDOR CHALLAN NUMBER *</label>
                <input type="text" placeholder="e.g. CH-8892" value={challanNo}
                  onChange={e => setChallanNo(e.target.value)}
                  className={inp} />
              </div>

              {/* Invoice Number */}
              <div>
                <label className={lbl}>INVOICE NUMBER *</label>
                <input type="text" placeholder="e.g. INV-2091" value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className={inp} />
              </div>

              {/* Remarks */}
              <div>
                <label className={lbl}>REMARKS</label>
                <input type="text" placeholder="Note down any roll specifications, damage checks, or delivery notes..."
                  value={remarks} onChange={e => setRemarks(e.target.value)}
                  className={inp} />
              </div>
            </div>
          </div>

          {/* Kraft Items Section */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold form-section-header uppercase tracking-wider pl-1">KRAFT PAPER ROLL ITEMS</h4>
            {items.map((item, idx) => (
              <div key={idx} className="border border-white/5 rounded-xl p-4 bg-indigo-500/[0.01] flex flex-col gap-3 relative animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">PRODUCT #{idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)}
                      className="text-[10px] text-red-400 hover:text-red-300 hover:underline cursor-pointer">
                      ✕ Remove Product
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>PAPER GSM *</label>
                    <input type="text" placeholder="e.g. 120" value={item.gsm}
                      onChange={e => handleItemChange(idx, 'gsm', e.target.value)}
                      className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>PAPER TYPE *</label>
                    <select value={item.paperType}
                      onChange={e => handleItemChange(idx, 'paperType', e.target.value)}
                      className={inp}>
                      <option value="Natural">Natural</option>
                      <option value="Semi Kraft">Semi Kraft</option>
                      <option value="Golden Kraft">Golden Kraft</option>
                      <option value="Imported Kraft">Imported Kraft</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={lbl}>PAPER ROLLSIZE (IN INCHES) *</label>
                    <input type="text" placeholder="e.g. 38" value={item.rollSize}
                      onChange={e => handleItemChange(idx, 'rollSize', e.target.value)}
                      className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>QTY OF ROLL *</label>
                    <input type="text" placeholder="e.g. 1" value={item.qtyRolls}
                      onChange={e => handleItemChange(idx, 'qtyRolls', e.target.value)}
                      className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>PAPER ROLL WEIGHT (IN KG, PER EACH ROLL) *</label>
                    <input type="text" placeholder="e.g. 350.00" value={item.weightKg}
                      onChange={e => handleItemChange(idx, 'weightKg', e.target.value)}
                      className={inp} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Button */}
          <button type="button" onClick={handleAddItem}
            className="w-full py-2.5 rounded-lg border border-dashed border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 bg-[#0a101d]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Add another product
          </button>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
            <button onClick={() => setIsFormView(false)}
              className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={handleSavePurchase} disabled={saving} id="btn-save-kraft-purchase"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
              {saving
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving Kraft inward...</>
                : 'Save Kraft Purchase Details'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Ply Inward / Purchase Entry</h2>
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
          <button onClick={openFormView} id="btn-add-purchase"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Log Ply Inward
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
          <input type="text" placeholder="Search item, challan, invoice..."
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
        <select value={plyFilter} onChange={e => setPlyFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
          <option value="all">All Ply Types</option>
          <option value="Natural">Natural</option>
          <option value="Semi Kraft">Semi Kraft</option>
          <option value="Golden Kraft">Golden Kraft</option>
          <option value="Imported Kraft">Imported Kraft</option>
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
                <th className="px-4 py-3">CHALLAN NO</th>
                <th className="px-4 py-3">VENDOR NAME</th>
                <th className="px-4 py-3">DELIVERED TO</th>
                <th className="px-4 py-3">ROLL SIZE</th>
                <th className="px-4 py-3 text-right">QTY OF ROLL</th>
                <th className="px-4 py-3 text-center">ROLL GSM</th>
                <th className="px-4 py-3 text-right">ROLL TOTAL WEIGHT</th>
                <th className="px-4 py-3">FINAL PRODUCT DATE</th>
                <th className="px-4 py-3 text-right">WEIGHT USED</th>
                <th className="px-4 py-3 text-right">WEIGHT STOCK</th>
                <th className="px-4 py-3">INVOICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading Kraft roll inward entries…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-xs text-gray-600">
                    No inward purchases logged yet.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const perRollWeight = p.qtyRolls > 0 ? p.weightKg / p.qtyRolls : 0;
                const isExpanded = expandedRows.includes(p.id);
                return (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-white/[0.015] transition-colors">
                      {/* Date of Purchase */}
                      <td className="px-4 py-3.5 text-gray-300 font-mono">
                        {new Date(p.purchaseDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      {/* Challan No */}
                      <td className="px-4 py-3.5 font-mono text-gray-200 font-bold">
                        {p.challanNo || '—'}
                      </td>
                      {/* Vendor Name */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-200">{p.vendor?.vendorName}</div>
                          {p.remarks && <div className="text-[10px] text-gray-500 font-medium">{p.remarks}</div>}
                        </div>
                      </td>
                      {/* Delivered To */}
                      <td className="px-4 py-3.5 text-gray-400">
                        {p.deliveredTo || '—'}
                      </td>
                      {/* Roll Size */}
                      <td className="px-4 py-3.5 text-gray-200 font-mono">
                        {p.rollSize.toFixed(2)} in
                      </td>
                      {/* Qty of Roll */}
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-gray-300">
                        {p.qtyRolls}
                      </td>
                      {/* Roll GSM */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="space-y-0.5">
                          <div className="font-mono text-gray-200 font-semibold">{p.gsm} GSM</div>
                          <div className="text-[9.5px] text-gray-500 font-bold">{p.paperType || 'Natural'}</div>
                        </div>
                      </td>
                      {/* Roll Total Weight */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-gray-200">{p.weightKg.toLocaleString()} kg</div>
                          <div className="text-[9.5px] text-gray-500 font-mono">Per: {perRollWeight.toFixed(2)} kg</div>
                        </div>
                      </td>
                      {/* Final Product Date */}
                      <td className="px-4 py-3.5 text-gray-400 font-mono">
                        {new Date(p.purchaseDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      {/* Weight Used */}
                      <td className="px-4 py-3.5 text-right font-mono text-gray-400">
                        {p.totalQtyUsed !== undefined ? `${p.totalQtyUsed.toFixed(2)} kg` : '0.00 kg'}
                      </td>
                      {/* Weight Stock (Collapsible balance stock pill) */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => toggleRow(p.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 ml-auto transition-all cursor-pointer ${
                            p.balanceStock === 0
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : p.balanceStock < p.weightKg * 0.2
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                          }`}
                        >
                          <span className="font-mono">{p.balanceStock.toLocaleString()} kg</span>
                          <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                        </button>
                      </td>
                      {/* Invoice */}
                      <td className="px-4 py-3.5 font-mono text-gray-400">
                        {p.invoiceNo || '—'}
                      </td>
                    </tr>

                    {/* Stock Consumption Log collapsible panel */}
                    {isExpanded && (
                      <tr className="bg-[#090f1d]/50">
                        <td colSpan={12} className="px-5 py-4">
                          <div className="border border-white/5 rounded-xl p-4 bg-[#090f1c] animate-fadeIn shadow-inner">
                            <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-white/5">
                              <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                STOCK CONSUMPTION HISTORY FOR CHALLAN: <span className="text-rose-400 font-mono">{p.challanNo || '—'}</span> (GSM: {p.gsm}, Size: {p.rollSize} in)
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
                                    <th className="py-2">Type / Production Job Name</th>
                                    <th className="py-2 text-right">Weight Used</th>
                                    <th className="py-2 text-right">Balance Weight Stock</th>
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
                                        {log.qtyUsed !== null ? `${log.qtyUsed.toFixed(2)} kg` : '—'}
                                      </td>
                                      <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                                        {log.balanceStock.toFixed(2)} kg
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-center py-4 text-xs text-gray-600">
                                No production stock consumption logs recorded yet.
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
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold form-section-label uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
