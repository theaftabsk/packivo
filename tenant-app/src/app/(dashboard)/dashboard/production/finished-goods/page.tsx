'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  customerName: string;
}

interface Product {
  id: string;
  name: string;
  plyType: 'THREE_PLY' | 'FIVE_PLY';
  customer?: Customer;
}

interface ProductionJob {
  id: string;
  jobCardNo: string;
  productId: string;
  product: Product;
  targetQty: number;
  producedQty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedDate: string;
  completedDate?: string;
}

interface Dispatch {
  id: string;
  productId: string;
  qtyDispatched: number;
  dispatchDate: string;
}

interface FinishedGoodsStock {
  id: string;
  productId: string;
  totalStock: number;
  allocatedStock: number;
}

interface BatchStockRow {
  jobId: string;
  jobCardNo: string;
  productionDate: string;
  buyerName: string;
  productId: string;
  productName: string;
  plyType: string;
  qtyProduced: number;
  dateOfDispatch: string;
  qtyOfDispatch: number;
  stockOfFinalProduct: number;
}

export default function FinishedGoodsPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [stocks, setStocks] = useState<FinishedGoodsStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('all');

  // Adjust Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BatchStockRow | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const [jobsData, dispatchesData, stocksData, customersData] = await Promise.all([
        api.get<ProductionJob[]>('/production/jobs'),
        api.get<Dispatch[]>('/dispatch'),
        api.get<FinishedGoodsStock[]>('/finished-goods/stock'),
        api.get<Customer[]>('/customers'),
      ]);

      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setDispatches(Array.isArray(dispatchesData) ? dispatchesData : []);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load Finished Goods details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute FIFO batch stock mappings
  const getBatchRows = (): BatchStockRow[] => {
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
    const rows: BatchStockRow[] = [];

    // Group jobs by Product ID
    const productIds = Array.from(new Set(completedJobs.map(j => j.productId)));

    productIds.forEach(pId => {
      // Find jobs and dispatches for this product, sorted ascending by date to apply FIFO
      const productJobs = completedJobs.filter(j => j.productId === pId)
        .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
      
      const productDispatches = dispatches.filter(d => d.productId === pId)
        .sort((a, b) => new Date(a.dispatchDate).getTime() - new Date(b.dispatchDate).getTime());

      const productStock = stocks.find(s => s.productId === pId);
      const actualTotalStock = productStock ? productStock.totalStock : 0;

      // Track how much dispatch quantity is assigned to each job run
      const dispatchAllocation: Record<string, { qty: number; latestDate?: string }> = {};
      productJobs.forEach(j => {
        dispatchAllocation[j.id] = { qty: 0 };
      });

      let dispatchIdx = 0;
      let dispatchRem = productDispatches[0] ? productDispatches[0].qtyDispatched : 0;

      productJobs.forEach(job => {
        let jobRem = job.producedQty;
        while (jobRem > 0 && dispatchIdx < productDispatches.length) {
          const d = productDispatches[dispatchIdx];
          const consume = Math.min(jobRem, dispatchRem);
          dispatchAllocation[job.id].qty += consume;
          if (consume > 0) {
            dispatchAllocation[job.id].latestDate = d.dispatchDate;
          }
          jobRem -= consume;
          dispatchRem -= consume;
          if (dispatchRem <= 0) {
            dispatchIdx++;
            dispatchRem = productDispatches[dispatchIdx] ? productDispatches[dispatchIdx].qtyDispatched : 0;
          }
        }
      });

      // Calculate calculated totals vs actual database stock levels to apply difference adjustments to latest batch
      const totalProduced = productJobs.reduce((acc, cur) => acc + cur.producedQty, 0);
      const totalDispatched = productDispatches.reduce((acc, cur) => acc + cur.qtyDispatched, 0);
      const calculatedRemaining = totalProduced - totalDispatched;
      const difference = actualTotalStock - calculatedRemaining;

      productJobs.forEach((job, index) => {
        const isLatest = index === productJobs.length - 1;
        const allocatedDispatch = dispatchAllocation[job.id].qty;
        let finalStock = job.producedQty - allocatedDispatch;
        if (isLatest) {
          finalStock += difference;
        }

        // Safeguard negative remaining stock displays
        if (finalStock < 0) finalStock = 0;

        // Generate batch code from jobCardNo
        const batchNo = job.jobCardNo.replace('PROD-', 'FG-B-');

        const latestDispatchDateString = dispatchAllocation[job.id].latestDate
          ? new Date(dispatchAllocation[job.id].latestDate!).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
          : '—';

        rows.push({
          jobId: job.id,
          jobCardNo: batchNo,
          productionDate: job.plannedDate,
          buyerName: (job.product as any)?.customer?.customerName || 'Amin Foods',
          productId: job.productId,
          productName: job.product?.name,
          plyType: job.product?.plyType === 'THREE_PLY' ? '3-PLY' : '5-PLY',
          qtyProduced: job.producedQty,
          dateOfDispatch: latestDispatchDateString,
          qtyOfDispatch: allocatedDispatch,
          stockOfFinalProduct: finalStock,
        });
      });
    });

    // Sort finished batch rows descending by production date
    return rows.sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime());
  };

  const batchRows = getBatchRows();

  // Filter rows
  const filteredRows = batchRows.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      r.jobCardNo.toLowerCase().includes(query) ||
      r.productName.toLowerCase().includes(query) ||
      r.buyerName.toLowerCase().includes(query);

    const matchesBuyer = buyerFilter === 'all' || r.buyerName === buyerFilter;

    return matchesSearch && matchesBuyer;
  });

  const openAdjustModal = (row: BatchStockRow) => {
    setSelectedRow(row);
    setAdjustQty('');
    setReason('');
    setFormErr('');
    setShowAdjustModal(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedRow) return;
    if (!adjustQty.trim() || isNaN(Number(adjustQty)) || Number(adjustQty) === 0) {
      setFormErr('Adjustment quantity must be a non-zero number'); return;
    }
    if (!reason.trim()) {
      setFormErr('Reason for adjustment is required'); return;
    }

    const amt = Number(adjustQty);
    if (selectedRow.stockOfFinalProduct + amt < 0) {
      setFormErr(`Insufficient stock. Resulting stock cannot be negative. Current stock is ${selectedRow.stockOfFinalProduct}`);
      return;
    }

    setSaving(true);
    setFormErr('');

    try {
      // Find current user info
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || 'sys';

      await api.post(`/finished-goods/stock/${selectedRow.productId}/adjust`, {
        amount: amt,
        reason: reason.trim(),
        userId,
      });

      setShowAdjustModal(false);
      loadData();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to adjust Finished Goods stock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-100 tracking-tight">Finished Goods Stock (FG)</h2>
        <p className="text-xs text-gray-500 mt-0.5">{filteredRows.length} batches currently tracked in stock ledger</p>
      </div>

      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Filter Options */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search batch, product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <select
          value={buyerFilter}
          onChange={e => setBuyerFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
        >
          <option value="all">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.customerName}>{c.customerName}</option>
          ))}
        </select>

        <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
          Filter
        </button>
      </div>

      {/* Main Grid Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">PRODUCTION DATE</th>
                <th className="px-4 py-3">CHALLAN / BATCH NO</th>
                <th className="px-4 py-3">BUYER NAME</th>
                <th className="px-4 py-3">PRODUCT NAME</th>
                <th className="px-4 py-3 text-right">QTY PRODUCED</th>
                <th className="px-4 py-3">DATE OF DISPATCH</th>
                <th className="px-4 py-3 text-right">QTY OF DISPATCH</th>
                <th className="px-4 py-3 text-right">STOCK OF FINAL PRODUCT</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading Finished Goods stock…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-600">
                    No completed Finished Goods batches in stock ledger.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.015] transition-colors">
                    {/* Production Date */}
                    <td className="px-4 py-3.5 text-gray-400 font-mono">
                      {new Date(row.productionDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {/* Challan/Batch */}
                    <td className="px-4 py-3.5 font-bold text-gray-300 font-mono">
                      <div>{row.jobCardNo}</div>
                      <div className="text-[10px] text-gray-500 font-normal mt-0.5">Linked: PROD-{row.jobCardNo.split('-B-')[1]}</div>
                    </td>
                    {/* Buyer Name */}
                    <td className="px-4 py-3.5 text-gray-200 font-semibold">
                      {row.buyerName}
                    </td>
                    {/* Product Name */}
                    <td className="px-4 py-3.5 text-gray-300">
                      <div>{row.productName}</div>
                      <span className="inline-block px-1.5 py-0.5 bg-[#0f172a] text-indigo-400 border border-indigo-900 rounded text-[9.5px] font-bold mt-1 font-mono">
                        {row.plyType}
                      </span>
                    </td>
                    {/* Qty Produced */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-400">
                      {row.qtyProduced.toLocaleString()}
                    </td>
                    {/* Date of Dispatch */}
                    <td className="px-4 py-3.5 text-gray-400 font-mono">
                      {row.dateOfDispatch}
                    </td>
                    {/* Qty Dispatched */}
                    <td className="px-4 py-3.5 text-right font-mono text-gray-400">
                      {row.qtyOfDispatch.toLocaleString()}
                    </td>
                    {/* Stock of Final Product */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        row.stockOfFinalProduct === 0
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : row.stockOfFinalProduct < row.qtyProduced * 0.2
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                      }`}>
                        {row.stockOfFinalProduct.toLocaleString()}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => openAdjustModal(row)}
                        className="px-3 py-1 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-[10.5px] font-semibold transition-all cursor-pointer"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && selectedRow && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAdjustModal(false); }}
        >
          <div className="glass-card rounded-2xl p-5 w-full max-w-md border border-white/10 shadow-2xl flex flex-col gap-4 animate-fadeIn bg-[#0d1322]">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="text-sm font-bold text-gray-100">Adjust Finished Goods Stock</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
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
              <div className="border border-white/5 rounded-xl p-3 bg-black/15 flex flex-col gap-1.5 text-[11px] text-gray-400">
                <div>
                  <span className="text-gray-500">Challan / Batch: </span>
                  <span className="font-bold text-gray-200 font-mono">{selectedRow.jobCardNo}</span>
                </div>
                <div>
                  <span className="text-gray-500">Product: </span>
                  <span className="font-semibold text-gray-200">{selectedRow.productName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Stock: </span>
                  <span className="font-bold text-emerald-400 font-mono">{selectedRow.stockOfFinalProduct.toLocaleString()} units</span>
                </div>
              </div>

              <div>
                <label className={lbl}>ADJUSTMENT QUANTITY *</label>
                <input
                  type="text"
                  placeholder="e.g. 50 or -50"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className={inp}
                />
                <p className="text-[10px] text-gray-500 mt-1 font-medium">
                  Use positive numbers to add to stock, and negative numbers to subtract.
                </p>
              </div>

              <div>
                <label className={lbl}>REASON FOR ADJUSTMENT *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Warehouse Damage, Recount audit"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustStock}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                {saving ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : (
                  'Confirm Adjustment'
                )}
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
