'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui/Pagination';

interface Customer {
  id: string;
  customerName: string;
}

interface Product {
  id: string;
  name: string;
  plyType: 'THREE_PLY' | 'FIVE_PLY';
}

interface ProductionJob {
  id: string;
  jobCardNo: string;
  productId: string;
  producedQty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedDate: string;
}

interface Dispatch {
  id: string;
  invoiceNo?: string;
  challanNo: string;
  customerId: string;
  customer?: Customer;
  productId: string;
  product?: Product;
  qtyDispatched: number;
  vehicleNo?: string;
  lrNo?: string;
  transporterName?: string;
  dispatchDate: string;
}

export default function DispatchListPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [fifoJobs, setFifoJobs] = useState<ProductionJob[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // FIFO computation states
  const [fifoDispatches, setFifoDispatches] = useState<Dispatch[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');

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

  // Details Modal state
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch static customers once
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customersData = await api.get<Customer[]>('/customers');
        setCustomers(Array.isArray(customersData) ? customersData : []);
      } catch (e) {
        console.error('Failed to load customers:', e);
      }
    };
    fetchCustomers();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        ...(customerFilter !== 'all' && { customerId: customerFilter }),
      });
      const res: any = await api.get(`/dispatch?${q.toString()}`);
      
      let dispatchList: Dispatch[] = [];
      if (res && res.success) {
        dispatchList = res.data || [];
        setMeta(res.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        dispatchList = Array.isArray(res) ? res : [];
      }
      setDispatches(dispatchList);

      // Fetch FIFO matching dependencies for the specific products on this page
      const uniqueProductIds = Array.from(new Set(dispatchList.map(d => d.productId).filter(Boolean)));
      if (uniqueProductIds.length > 0) {
        const fifoJobsPromises = uniqueProductIds.map(pid =>
          api.get<ProductionJob[]>(`/production/jobs?productId=${pid}`)
        );
        const fifoDispatchesPromises = uniqueProductIds.map(pid =>
          api.get<Dispatch[]>(`/dispatch?productId=${pid}`)
        );

        const [jobsResults, dispatchesResults] = await Promise.all([
          Promise.all(fifoJobsPromises),
          Promise.all(fifoDispatchesPromises),
        ]);

        const combinedJobs = jobsResults.flat().filter(Boolean);
        const combinedDispatches = dispatchesResults.flat().filter(Boolean);

        setFifoJobs(combinedJobs);
        setFifoDispatches(combinedDispatches);
      } else {
        setFifoJobs([]);
        setFifoDispatches([]);
      }
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load Sales Dispatch logs.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, customerFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerFilter]);

  // FIFO batch allocation logic to map dispatches back to production job card batches
  const getDispatchAllocatedBatches = (dispId: string, pId: string): string => {
    const productJobs = fifoJobs
      .filter(j => j.productId === pId && j.status === 'COMPLETED')
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

    const productDispatches = fifoDispatches
      .filter(d => d.productId === pId)
      .sort((a, b) => new Date(a.dispatchDate).getTime() - new Date(b.dispatchDate).getTime());

    // Run FIFO simulator matching
    const allocations: Record<string, string[]> = {};
    productDispatches.forEach(d => {
      allocations[d.id] = [];
    });

    let jobIdx = 0;
    let jobRem = productJobs[0] ? productJobs[0].producedQty : 0;

    productDispatches.forEach(disp => {
      let dispRem = disp.qtyDispatched;
      while (dispRem > 0 && jobIdx < productJobs.length) {
        const job = productJobs[jobIdx];
        const consume = Math.min(dispRem, jobRem);

        const batchCode = job.jobCardNo.replace('PROD-', 'FG-B-');
        if (consume > 0 && !allocations[disp.id].includes(batchCode)) {
          allocations[disp.id].push(batchCode);
        }

        dispRem -= consume;
        jobRem -= consume;

        if (jobRem <= 0) {
          jobIdx++;
          jobRem = productJobs[jobIdx] ? productJobs[jobIdx].producedQty : 0;
        }
      }
    });

    const list = allocations[dispId] || [];
    return list.length > 0 ? list.join(', ') : '—';
  };

  // Filtered dispatches
  const filteredDispatches = dispatches;

  const openDetailsModal = (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Sales Dispatch Logs (FG Outward)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {meta.totalItems} dispatch logs currently tracked in database
          </p>
        </div>
        <Link
          href="/dashboard/sales/dispatch/create"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Log Carton Dispatch
        </Link>
      </div>

      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Filter and search bar */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search Invoice, vehicle, product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <select
          value={customerFilter}
          onChange={e => setCustomerFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
        >
          <option value="all">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.customerName}</option>
          ))}
        </select>

        <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
          Filter
        </button>
      </div>

      {/* Data table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">INVOICE #</th>
                <th className="px-4 py-3">CUSTOMER</th>
                <th className="px-4 py-3">PRODUCT / CARTON ITEM</th>
                <th className="px-4 py-3">ALLOCATED BATCH</th>
                <th className="px-4 py-3 text-right">QTY DISPATCHED</th>
                <th className="px-4 py-3">TRANSPORTER / VEHICLE</th>
                <th className="px-4 py-3">DISPATCH DATE</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading dispatch ledger…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-gray-600">
                    No dispatches recorded matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDispatches.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.015] transition-colors">
                    {/* Invoice # */}
                    <td className="px-4 py-3.5 font-bold text-gray-300 font-mono">
                      {item.invoiceNo || '—'}
                    </td>
                    {/* Customer */}
                    <td className="px-4 py-3.5 text-gray-200 font-semibold">
                      {item.customer?.customerName || '—'}
                    </td>
                    {/* Product Name */}
                    <td className="px-4 py-3.5 text-gray-300">
                      <div>{item.product?.name || '—'}</div>
                      <span className="inline-block px-1.5 py-0.5 bg-[#0f172a] text-indigo-400 border border-indigo-900 rounded text-[9.5px] font-bold mt-1 font-mono">
                        {item.product?.plyType === 'THREE_PLY' ? '3-PLY' : '5-PLY'}
                      </span>
                    </td>
                    {/* Allocated Batch */}
                    <td className="px-4 py-3.5 font-mono text-xs">
                      <span className="inline-block px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-bold">
                        {getDispatchAllocatedBatches(item.id, item.productId)}
                      </span>
                    </td>
                    {/* Qty Dispatched */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-100">
                      {item.qtyDispatched.toLocaleString()}
                    </td>
                    {/* Transporter / Vehicle */}
                    <td className="px-4 py-3.5 text-gray-300 text-xs">
                      <div className="font-medium text-gray-400">Tpr: {item.transporterName || '—'}</div>
                      <div className="text-[10.5px] text-gray-500 font-mono mt-0.5">Veh: {item.vehicleNo || '—'}</div>
                    </td>
                    {/* Dispatch Date */}
                    <td className="px-4 py-3.5 text-gray-400 font-mono">
                      {new Date(item.dispatchDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => openDetailsModal(item)}
                        className="px-3 py-1 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-[10.5px] font-semibold transition-all cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            itemsPerPage={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedDispatch && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDetailsModal(false); }}
        >
          <div className="glass-card rounded-2xl p-5 w-full max-w-lg border border-white/10 shadow-2xl flex flex-col gap-4 animate-fadeIn bg-[#0d1322]">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-gray-100">Dispatch logistics details</h3>
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">ID: {selectedDispatch.id}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 py-1 text-xs text-gray-300">
              <div className="col-span-2 border border-white/5 rounded-xl p-3.5 bg-black/15 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Invoice Number:</span>
                  <span className="font-bold text-gray-200 font-mono">{selectedDispatch.invoiceNo || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Delivery Challan Number:</span>
                  <span className="font-bold text-gray-200 font-mono">{selectedDispatch.challanNo}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Dispatch Date:</span>
                  <span className="font-semibold text-gray-200 font-mono">
                    {new Date(selectedDispatch.dispatchDate).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Buyer Name</span>
                <p className="text-gray-200 font-bold mt-0.5">{selectedDispatch.customer?.customerName || '—'}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Finished Product</span>
                <p className="text-gray-200 font-semibold mt-0.5">{selectedDispatch.product?.name || '—'}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Quantity Dispatched</span>
                <p className="text-indigo-400 font-bold font-mono mt-0.5">{selectedDispatch.qtyDispatched.toLocaleString()} boxes</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Allocated Batch</span>
                <p className="text-gray-200 font-mono mt-0.5">
                  {getDispatchAllocatedBatches(selectedDispatch.id, selectedDispatch.productId)}
                </p>
              </div>

              <div className="border-t border-white/5 col-span-2 my-1"></div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Transporter Name</span>
                <p className="text-gray-200 mt-0.5">{selectedDispatch.transporterName || '—'}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Vehicle Number</span>
                <p className="text-gray-200 font-mono mt-0.5">{selectedDispatch.vehicleNo || '—'}</p>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">L.R. Number (Bilty)</span>
                <p className="text-gray-200 font-mono mt-0.5">{selectedDispatch.lrNo || '—'}</p>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Delivery Address</span>
                <p className="text-gray-200 mt-0.5 whitespace-pre-line leading-relaxed bg-black/10 p-2 rounded-lg border border-white/5">
                  {selectedDispatch.vehicleNo ? (selectedDispatch.customer as any)?.shippingAddress || '—' : '—'}
                </p>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Remarks / Notes</span>
                <p className="text-gray-400 italic mt-0.5 whitespace-pre-line leading-relaxed">
                  {selectedDispatch.vehicleNo ? 'No additional remarks.' : '—'}
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-2 pt-3 border-t border-white/5">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
