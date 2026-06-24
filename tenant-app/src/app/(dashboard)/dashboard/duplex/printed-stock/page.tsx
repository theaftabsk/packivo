'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
}

interface Product {
  id: string;
  name: string;
  duplexSize: string;
  cartonTopPaperGsm?: number;
}

interface PrintJob {
  id: string;
  jobNo: string;
  productId: string;
  product: Product;
  printerId: string;
  printer: Vendor;
  plannedQty: number;
  issuedSheets: number;
  returnedSheets: number;
  availableStock: number;
  cuttingSize?: string;
  status: 'PENDING' | 'ISSUED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface DuplexPurchase {
  id: string;
  challanNo: string;
  gsm: number;
  size: string;
}

export default function PrintedStockPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [purchases, setPurchases] = useState<DuplexPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Adjust Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const [jobsData, purchasesData] = await Promise.all([
        api.get<PrintJob[]>('/printing/jobs'),
        api.get<DuplexPurchase[]>('/duplex/purchases'),
      ]);
      // Only show completed jobs since they are the ones that have printed sheets
      const completedJobs = (Array.isArray(jobsData) ? jobsData : []).filter(
        j => j.status === 'COMPLETED'
      );
      setJobs(completedJobs);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load printed stock details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper: Find original vendor challan
  const getOriginalVendorChallan = (job: PrintJob) => {
    const jobSizeNorm = job.product.duplexSize?.replace(/\s+/g, '').toLowerCase() || '';
    const jobGsm = job.product.cartonTopPaperGsm;
    const match = purchases.find(p => {
      const pSizeNorm = p.size?.replace(/\s+/g, '').toLowerCase() || '';
      return pSizeNorm === jobSizeNorm && p.gsm === jobGsm;
    });
    return match?.challanNo || 'CH-9081'; // Fallback to seeder default
  };

  const openAdjustModal = (job: PrintJob) => {
    setSelectedJob(job);
    setAdjustmentQty('');
    setReason('');
    setFormErr('');
    setShowAdjustModal(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedJob) return;
    if (!adjustmentQty.trim() || isNaN(Number(adjustmentQty))) {
      setFormErr('Adjustment quantity must be a valid number'); return;
    }
    if (!reason.trim()) {
      setFormErr('Reason for adjustment is required'); return;
    }

    const qty = Number(adjustmentQty);
    if (selectedJob.availableStock + qty < 0) {
      setFormErr(`Insufficient stock. Resulting stock cannot be negative. Current stock is ${selectedJob.availableStock}`);
      return;
    }

    setSaving(true);
    setFormErr('');

    try {
      await api.post(`/printing/jobs/${selectedJob.id}/adjust`, {
        adjustmentQty: qty,
        reason: reason.trim(),
      });
      setShowAdjustModal(false);
      fetchData();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to apply adjustment.');
    } finally {
      setSaving(false);
    }
  };

  // Filter Logic
  const filtered = jobs.filter(j => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      j.jobNo.toLowerCase().includes(query) ||
      j.product.name.toLowerCase().includes(query) ||
      (j.printer?.vendorName.toLowerCase().includes(query) ?? false) ||
      getOriginalVendorChallan(j).toLowerCase().includes(query);

    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Printed Duplex Stock</h2>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} printed jobs in stock ledger</p>
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

      {/* Search Filter */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input type="text" placeholder="Search challan, product..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
          Search
        </button>
      </div>

      {/* Grid Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">INTERNAL CHALLAN</th>
                <th className="px-4 py-3">ORIGINAL VENDOR CHALLAN</th>
                <th className="px-4 py-3">PRODUCT / JOB NAME</th>
                <th className="px-4 py-3">SHEET & CUTTING SIZES</th>
                <th className="px-4 py-3 text-right">INWARD QTY</th>
                <th className="px-4 py-3 text-right">AVAILABLE STOCK</th>
                <th className="px-4 py-3">PRINTER</th>
                <th className="px-4 py-3">RECEIVED DATE</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading printed sheet ledger…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-600">
                    No printed duplex stock found.
                  </td>
                </tr>
              ) : filtered.map(job => (
                <tr key={job.id} className="hover:bg-white/[0.015] transition-colors">
                  {/* Internal Challan */}
                  <td className="px-4 py-3.5 font-bold text-gray-300 font-mono">
                    {job.jobNo}
                  </td>
                  {/* Original Vendor Challan */}
                  <td className="px-4 py-3.5 text-gray-400 font-mono">
                    {getOriginalVendorChallan(job)}
                  </td>
                  {/* Product / Job Name */}
                  <td className="px-4 py-3.5 text-gray-200 font-semibold">
                    {job.product.name}
                  </td>
                  {/* Sheet & Cutting Sizes */}
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5">
                      <div className="text-gray-300">Sheet: {job.product.duplexSize}</div>
                      <div className="text-[10px] text-gray-500 font-semibold font-mono">Cut: {job.cuttingSize || '—'}</div>
                    </div>
                  </td>
                  {/* Inward Qty */}
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-gray-400">
                    {job.returnedSheets.toLocaleString()}
                  </td>
                  {/* Available Stock */}
                  <td className="px-4 py-3.5 text-right font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      job.availableStock === 0
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : job.availableStock < job.returnedSheets * 0.2
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                    }`}>
                      {job.availableStock.toLocaleString()}
                    </span>
                  </td>
                  {/* Printer */}
                  <td className="px-4 py-3.5 text-gray-400">
                    {job.printer?.vendorName}
                  </td>
                  {/* Received Date */}
                  <td className="px-4 py-3.5 text-gray-400 font-mono">
                    {new Date(job.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5 text-center">
                    <button onClick={() => openAdjustModal(job)}
                      className="px-3 py-1 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-[10.5px] font-semibold transition-all cursor-pointer">
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════ ADJUST STOCK MODAL ══════════════════ */}
      {showAdjustModal && selectedJob && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAdjustModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-md border border-white/10 shadow-2xl flex flex-col gap-4 animate-fadeIn">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-100">Adjust Printed Duplex Stock</h3>
              <button onClick={() => setShowAdjustModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                ✕
              </button>
            </div>

            {formErr && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formErr}
              </div>
            )}

            <div className="space-y-4 py-1 text-xs">
              <div className="border border-white/5 rounded-xl p-3 bg-black/10 flex flex-col gap-1.5 text-[11px] text-gray-400">
                <div>
                  <span className="text-gray-500">Internal Challan: </span>
                  <span className="font-bold text-gray-200 font-mono">{selectedJob.jobNo}</span>
                </div>
                <div>
                  <span className="text-gray-500">Product Job: </span>
                  <span className="font-semibold text-gray-200">{selectedJob.product.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Stock: </span>
                  <span className="font-bold text-emerald-400 font-mono">{selectedJob.availableStock.toLocaleString()} sheets</span>
                </div>
              </div>

              <div>
                <label className={lbl}>ADJUSTMENT QUANTITY <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. 100 or -100" value={adjustmentQty}
                  onChange={e => setAdjustmentQty(e.target.value)}
                  className={inp} />
                <p className="text-[10px] text-gray-500 mt-1 font-medium">
                  Input a positive number to add stock, or negative number to reduce stock.
                </p>
              </div>

              <div>
                <label className={lbl}>REASON FOR ADJUSTMENT <span className="text-red-400">*</span></label>
                <textarea rows={2} placeholder="e.g. Audit correction, damage in storage"
                  value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <button onClick={() => setShowAdjustModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleAdjustStock} disabled={saving} id="btn-submit-adjust"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                {saving
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  : 'Confirm Adjustment'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
