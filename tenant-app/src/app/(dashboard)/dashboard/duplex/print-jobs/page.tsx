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
  cartonTopPaperType?: string;
  printingMode?: string;
  colorCount?: number;
  finishType?: string;
  specialColorCode?: string;
  ups: number;
  hasPartition: boolean;
  partitionSize?: string;
  partitionPly?: string;
  partitionUps?: string;
  productImage?: string;
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
  cuttingSize?: string;
  expectedOutcomeImage?: string;
  remarks?: string;
  status: 'PENDING' | 'ISSUED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface DuplexPurchase {
  id: string;
  challanNo: string;
  gsm: number;
  size: string;
  vendor?: {
    vendorName: string;
  };
}

interface DuplexStock {
  id: string;
  gsm: number;
  size: string;
  qtySheets: number;
  type: 'RAW' | 'PRINTED';
}

export default function DuplexPrintJobsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<DuplexPurchase[]>([]);
  const [stocks, setStocks] = useState<DuplexStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [printerFilter, setPrinterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // Modals & Dialogs State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);

  // Saving states
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  // ══════════════════ ISSUE JOB FORM STATE ══════════════════
  const [jobNo, setJobNo] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [printerSearch, setPrinterSearch] = useState('');
  const [showPrinterDropdown, setShowPrinterDropdown] = useState(false);

  const [plannedQty, setPlannedQty] = useState('');
  const [issuedSheets, setIssuedSheets] = useState('');
  const [cuttingSize, setCuttingSize] = useState('');
  const [remarks, setRemarks] = useState('');
  const [outcomeImage, setOutcomeImage] = useState<string | null>(null);

  // Prefilled specs from selected product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ══════════════════ COMPLETE JOB FORM STATE ══════════════════
  const [returnedSheets, setReturnedSheets] = useState('');
  const [completeGsm, setCompleteGsm] = useState('');

  const productDropdownRef = useRef<HTMLDivElement>(null);
  const printerDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch static dropdown metadata once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [vendorsData, productsData, purchasesData, stockData] = await Promise.all([
          api.get('/vendors'),
          api.get('/products'),
          api.get('/duplex/purchases'),
          api.get('/duplex/stock'),
        ]);
        setVendors(Array.isArray(vendorsData) ? vendorsData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
        setStocks(Array.isArray(stockData) ? stockData : []);
      } catch (e: any) {
        console.error('Failed to load static metadata:', e);
      }
    };
    fetchMetadata();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(printerFilter !== 'all' && { printerId: printerFilter }),
      });
      const res: any = await api.get(`/printing/jobs?${q.toString()}`);
      if (res && res.success) {
        setJobs(res.data || []);
        setMeta(res.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setJobs(Array.isArray(res) ? res : []);
      }
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load printing jobs.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, printerFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, printerFilter]);

  // Autocomplete Click Outside Handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (printerDropdownRef.current && !printerDropdownRef.current.contains(event.target as Node)) {
        setShowPrinterDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update specs when product changes
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId) || null;
      setSelectedProduct(prod);
      if (prod) {
        setCuttingSize(prod.duplexSize || '');
        // Auto-calculate expected sheets (based on planned box quantity / ups)
        if (plannedQty && !isNaN(Number(plannedQty))) {
          const calculated = Math.ceil(Number(plannedQty) / prod.ups);
          // Add 5% waste padding as default
          setIssuedSheets(String(Math.ceil(calculated * 1.05)));
        }
      }
    } else {
      setSelectedProduct(null);
      setCuttingSize('');
    }
  }, [selectedProductId, products]);

  // Re-calculate sheets when plannedQty changes
  useEffect(() => {
    if (selectedProduct && plannedQty && !isNaN(Number(plannedQty))) {
      const calculated = Math.ceil(Number(plannedQty) / selectedProduct.ups);
      setIssuedSheets(String(Math.ceil(calculated * 1.05)));
    }
  }, [plannedQty, selectedProduct]);

  // Auto-generate Job No
  const generateJobNo = () => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    setJobNo(`G-PR-${randomSuffix}`);
  };

  const openIssueModal = () => {
    generateJobNo();
    setSelectedProductId('');
    setProductSearch('');
    setSelectedPrinterId('');
    setPrinterSearch('');
    setPlannedQty('');
    setIssuedSheets('');
    setCuttingSize('');
    setRemarks('');
    setOutcomeImage(null);
    setFormErr('');
    setShowIssueModal(true);
  };

  const handleOutcomeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOutcomeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIssueJob = async () => {
    if (!jobNo.trim()) { setFormErr('Job Number is required'); return; }
    if (!selectedProductId) { setFormErr('Product selection is required'); return; }
    if (!selectedPrinterId) { setFormErr('Printer selection is required'); return; }
    if (!plannedQty || isNaN(Number(plannedQty)) || Number(plannedQty) <= 0) {
      setFormErr('Planned Quantity must be a positive number'); return;
    }
    if (!issuedSheets || isNaN(Number(issuedSheets)) || Number(issuedSheets) <= 0) {
      setFormErr('Issued Sheets must be a positive number'); return;
    }

    // Live raw stock check before submission
    const rawStockAvailable = getAvailableRawStock();
    if (rawStockAvailable < Number(issuedSheets)) {
      setFormErr(`Insufficient RAW duplex stock. Available: ${rawStockAvailable.toLocaleString()} sheets.`);
      return;
    }

    setSaving(true);
    setFormErr('');

    const payload = {
      jobNo: jobNo.trim(),
      productId: selectedProductId,
      printerId: selectedPrinterId,
      plannedQty: Number(plannedQty),
      issuedSheets: Number(issuedSheets),
      gsm: selectedProduct?.cartonTopPaperGsm,
      cuttingSize: cuttingSize.trim() || undefined,
      remarks: remarks.trim() || undefined,
      expectedOutcomeImage: outcomeImage || undefined,
    };

    try {
      await api.post('/printing/jobs', payload);
      setShowIssueModal(false);
      fetchData();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to issue printing job.');
    } finally {
      setSaving(false);
    }
  };

  const openCompleteModal = (job: PrintJob) => {
    setSelectedJob(job);
    setReturnedSheets(String(job.issuedSheets));
    setCompleteGsm(String(job.product.cartonTopPaperGsm || ''));
    setFormErr('');
    setShowCompleteModal(true);
  };

  const handleCompleteJob = async () => {
    if (!selectedJob) return;
    if (!returnedSheets || isNaN(Number(returnedSheets)) || Number(returnedSheets) < 0) {
      setFormErr('Returned printed sheets count must be a number'); return;
    }
    if (!completeGsm || isNaN(Number(completeGsm)) || Number(completeGsm) <= 0) {
      setFormErr('GSM must be a valid number'); return;
    }

    setSaving(true);
    setFormErr('');

    try {
      await api.patch(`/printing/jobs/${selectedJob.id}/complete`, {
        returnedSheets: Number(returnedSheets),
        gsm: Number(completeGsm),
      });
      setShowCompleteModal(false);
      fetchData();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to complete printing job.');
    } finally {
      setSaving(false);
    }
  };

  const openChallan = (job: PrintJob) => {
    setSelectedJob(job);
    setShowChallanModal(true);
  };

  // Helper: Find Paper Vendor
  const getPaperVendor = (job: PrintJob) => {
    const jobSizeNorm = job.product.duplexSize?.replace(/\s+/g, '').toLowerCase() || '';
    const jobGsm = job.product.cartonTopPaperGsm;
    const match = purchases.find(p => {
      const pSizeNorm = p.size?.replace(/\s+/g, '').toLowerCase() || '';
      return pSizeNorm === jobSizeNorm && p.gsm === jobGsm;
    });
    return match?.vendor?.vendorName || 'VARDHAMAN PAPER MILLS';
  };

  // Helper: Get available raw stock
  const getAvailableRawStock = () => {
    if (!selectedProduct) return 0;
    const targetSize = selectedProduct.duplexSize;
    const targetGsm = selectedProduct.cartonTopPaperGsm;
    if (!targetSize || !targetGsm) return 0;

    const sizeNorm = targetSize.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase();
    const match = stocks.find(s => {
      const sSizeNorm = s.size.replace(/\s+/g, '').replace(/\*/g, 'x').toLowerCase();
      return sSizeNorm === sizeNorm && s.gsm === targetGsm && s.type === 'RAW';
    });
    return match ? match.qtySheets : 0;
  };

  // Autocomplete lists
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredPrinters = vendors.filter(v =>
    v.suppliedMaterials.includes('Printer') &&
    v.vendorName.toLowerCase().includes(printerSearch.toLowerCase())
  );

  // Table Filters Logic
  const filteredJobs = jobs;

  const exportCSV = () => {
    const headers = [
      'Job Date', 'Job Card No', 'Printer Name', 'Product Name',
      'Paper Vendor', 'Paper Size', 'Cutting Size', 'Printing Qty', 'Wastage Qty', 'Status'
    ];

    const rows = [
      headers,
      ...filteredJobs.map(j => {
        const wastage = j.status === 'COMPLETED' ? j.issuedSheets - j.returnedSheets : 0;
        return [
          new Date(j.createdAt).toLocaleDateString(),
          j.jobNo,
          j.printer?.vendorName || '',
          j.product.name,
          getPaperVendor(j),
          j.product.duplexSize,
          j.cuttingSize || '—',
          j.status === 'COMPLETED' ? j.returnedSheets : j.plannedQty,
          j.status === 'COMPLETED' ? wastage : '—',
          j.status
        ];
      })
    ];

    const blob = new Blob([rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `duplex_print_jobs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Printable Challan wrapper styles to hide sidebar when printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-challan-section, #print-challan-section * {
            visibility: visible;
          }
          #print-challan-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 1.5rem !important;
          }
          #print-challan-section button {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Duplex Printing Jobs</h2>
          <p className="text-xs text-gray-500 mt-0.5">{meta.totalItems} printing job cards issued</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button onClick={openIssueModal} id="btn-issue-print-job"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Issue New Print Job
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
          <input type="text" placeholder="Search job cards or products..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <select value={printerFilter} onChange={e => setPrinterFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
          <option value="all">All Printers</option>
          {vendors.filter(v => v.suppliedMaterials.includes('Printer')).map(v => (
            <option key={v.id} value={v.id}>{v.vendorName}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="ISSUED">Issued / Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Grid Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5 text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">JOB DATE</th>
                <th className="px-4 py-3">PRINTER NAME / CHALLAN</th>
                <th className="px-4 py-3">PRODUCT NAME / DETAILS</th>
                <th className="px-4 py-3">PAPER VENDOR</th>
                <th className="px-4 py-3">PAPER CONFIG</th>
                <th className="px-4 py-3">CUTTING SIZE</th>
                <th className="px-4 py-3 text-right">PRINTING QTY</th>
                <th className="px-4 py-3 text-right">WASTAGE QTY</th>
                <th className="px-4 py-3 text-center">STATUS</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading duplex printing jobs…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs text-gray-600">
                    No active duplex printing jobs found.
                  </td>
                </tr>
              ) : filteredJobs.map(job => {
                const wastage = job.status === 'COMPLETED' ? job.issuedSheets - job.returnedSheets : 0;
                return (
                  <tr key={job.id} className="hover:bg-white/[0.015] transition-colors">
                    {/* Job Date */}
                    <td className="px-4 py-3.5 text-gray-300 font-mono">
                      {new Date(job.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {/* Printer / Challan No */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-200">{job.printer?.vendorName}</div>
                        <div className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider">{job.jobNo}</div>
                      </div>
                    </td>
                    {/* Product Name */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-100">{job.product.name}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Offset | Finish: {job.product.finishType || 'None'}</div>
                      </div>
                    </td>
                    {/* Paper Vendor (Calculated dynamically) */}
                    <td className="px-4 py-3.5 text-gray-300 font-medium">{getPaperVendor(job)}</td>
                    {/* Paper Size / GSM */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-gray-200">Size: {job.product.duplexSize}</div>
                        <div className="text-[10px] text-gray-500 font-bold">GSM: {job.product.cartonTopPaperGsm}</div>
                      </div>
                    </td>
                    {/* Cutting Size */}
                    <td className="px-4 py-3.5 font-mono text-gray-400 font-semibold">{job.cuttingSize || '—'}</td>
                    {/* Printing Qty */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-200">
                      {job.status === 'COMPLETED' ? job.returnedSheets.toLocaleString() : '—'}
                      {job.status !== 'COMPLETED' && <span className="text-[10px] font-normal text-gray-500 block">Est: {job.plannedQty.toLocaleString()}</span>}
                    </td>
                    {/* Wastage Qty */}
                    <td className={`px-4 py-3.5 text-right font-mono font-bold ${wastage > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {job.status === 'COMPLETED' ? wastage.toLocaleString() : '—'}
                    </td>
                    {/* Status badge */}
                    <td className="px-4 py-3.5 text-center">
                      {job.status === 'COMPLETED' ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            COMPLETED
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono block">Finished</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.08)]">
                          ISSUED
                        </span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {job.status !== 'COMPLETED' && (
                          <button onClick={() => openCompleteModal(job)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shadow-md shadow-emerald-500/10">
                            Complete Job
                          </button>
                        )}
                        <button onClick={() => openChallan(job)}
                          className="px-2.5 py-1 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer">
                          Challan Ticket
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* ══════════════════ ISSUE NEW PRINT JOB MODAL ══════════════════ */}
      {showIssueModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowIssueModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-100">Issue New Print Job</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Allocate raw duplex stock to a printer for offset printing.</p>
              </div>
              <button onClick={() => setShowIssueModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              <div className="border border-white/5 rounded-xl p-3 bg-black/10 grid grid-cols-2 gap-3.5">
                {/* Job Card No */}
                <div>
                  <label className={lbl}>JOB CARD NUMBER <span className="text-red-400">*</span></label>
                  <div className="flex gap-1.5">
                    <input type="text" value={jobNo} onChange={e => setJobNo(e.target.value)}
                      className={inp} placeholder="e.g. G-PR-00009" />
                    <button type="button" onClick={generateJobNo}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                      Regen
                    </button>
                  </div>
                </div>

                {/* Printer Autocomplete */}
                <div className="relative" ref={printerDropdownRef}>
                  <label className={lbl}>PRINTER (VENDOR) <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Search offset printers..."
                    value={printerSearch}
                    onFocus={() => setShowPrinterDropdown(true)}
                    onChange={e => {
                      setPrinterSearch(e.target.value);
                      setShowPrinterDropdown(true);
                      setSelectedPrinterId('');
                    }}
                    className={inp} />
                  {showPrinterDropdown && (
                    <div className="absolute z-[9999] left-0 right-0 mt-1 rounded-lg bg-[#0c1220] border border-white/10 max-h-40 overflow-y-auto shadow-2xl divide-y divide-white/5">
                      {filteredPrinters.length === 0 ? (
                        <div className="p-3 text-gray-500 text-center">No printer vendors found</div>
                      ) : (
                        filteredPrinters.map(v => (
                          <button key={v.id} type="button"
                            onClick={() => {
                              setSelectedPrinterId(v.id);
                              setPrinterSearch(v.vendorName);
                              setShowPrinterDropdown(false);
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

              {/* Product Autocomplete */}
              <div className="relative" ref={productDropdownRef}>
                <label className={lbl}>TARGET PRODUCT <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Search product configurations..."
                  value={productSearch}
                  onFocus={() => setShowProductDropdown(true)}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setShowProductDropdown(true);
                    setSelectedProductId('');
                  }}
                  className={inp} />
                {showProductDropdown && (
                  <div className="absolute z-[9999] left-0 right-0 mt-1 rounded-lg bg-[#0c1220] border border-white/10 max-h-40 overflow-y-auto shadow-2xl divide-y divide-white/5">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-gray-500 text-center">No products found</div>
                    ) : (
                      filteredProducts.map(p => (
                        <button key={p.id} type="button"
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch(p.name);
                            setShowProductDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-600/10 text-gray-200 hover:text-indigo-400 transition-colors">
                          {p.name} (GSM: {p.cartonTopPaperGsm} | Size: {p.duplexSize})
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Product Specifications Read-Only Box */}
              {selectedProduct && (
                <div className="border border-indigo-500/10 rounded-xl p-3 bg-indigo-500/[0.02] flex flex-col gap-2 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">PRODUCT SPECIFICATIONS</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-bold font-mono">
                      UPS: {selectedProduct.ups}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-[11px] text-gray-400">
                    <div>
                      <span className="block text-[9px] text-gray-500 font-semibold uppercase">PAPER SIZE</span>
                      <span className="font-semibold text-gray-200 font-mono">{selectedProduct.duplexSize}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-semibold uppercase">GSM TYPE</span>
                      <span className="font-semibold text-gray-200">{selectedProduct.cartonTopPaperGsm} GSM ({selectedProduct.cartonTopPaperType || 'Duplex'})</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-semibold uppercase">PRINT MODE</span>
                      <span className="font-semibold text-gray-200">{selectedProduct.printingMode || 'Offset'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-semibold uppercase">COLORS</span>
                      <span className="font-semibold text-gray-200">{selectedProduct.colorCount} Colors {selectedProduct.specialColorCode && `(${selectedProduct.specialColorCode})`}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-semibold uppercase">FINISH TYPE</span>
                      <span className="font-semibold text-gray-200">{selectedProduct.finishType || 'None'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 font-semibold uppercase">PARTITIONS</span>
                      <span className="font-semibold text-gray-200">{selectedProduct.hasPartition ? `Yes (${selectedProduct.partitionSize})` : 'No'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantities & Cutting details */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={lbl}>PRINTING QUANTITY (Planned Box Qty) <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="e.g. 2000" value={plannedQty}
                    onChange={e => setPlannedQty(e.target.value)}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>TOTAL SHEETS TO ISSUE <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Calculated sheets..." value={issuedSheets}
                    onChange={e => setIssuedSheets(e.target.value)}
                    className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={lbl}>CUSTOM CUTTING SIZE</label>
                  <input type="text" placeholder="e.g. 18.5x29" value={cuttingSize}
                    onChange={e => setCuttingSize(e.target.value)}
                    className={inp} />
                </div>
                {/* Stock Allocation Badge */}
                {selectedProduct && (
                  <div className="flex flex-col justify-end">
                    <div className="mb-0.5">
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">STOCK VERIFICATION</label>
                    </div>
                    {(() => {
                      const avail = getAvailableRawStock();
                      const req = Number(issuedSheets) || 0;
                      const hasEnough = avail >= req;
                      return (
                        <div className={`p-2 rounded-lg border text-center transition-all ${
                          hasEnough
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          <div className="font-bold text-[11px] uppercase tracking-wide">
                            {hasEnough ? '✓ Allocation Matches!' : '⚠️ Stock Shortage!'}
                          </div>
                          <div className="text-[10px] mt-0.5 font-mono">
                            Available RAW: {avail.toLocaleString()} shts | {hasEnough ? `Safe to issue` : `Short: ${(req - avail).toLocaleString()} sheets`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Outcome Visual Layout Image override */}
              <div>
                <label className={lbl}>OUTCOME VISUAL LAYOUT IMAGE (OVERRIDE)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*" onChange={handleOutcomeImageUpload}
                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-gray-300 file:hover:bg-white/20 file:cursor-pointer" />
                  {outcomeImage && (
                    <span className="text-[10px] text-emerald-400 font-medium">✓ Custom layout attached</span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={lbl}>REMARKS / WORK DETAILS</label>
                <textarea rows={2} placeholder="Color requirements, lamination detail, layout instructions..."
                  value={remarks} onChange={e => setRemarks(e.target.value)}
                  className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <button onClick={() => setShowIssueModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleIssueJob} disabled={saving} id="btn-submit-print-job"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
                {saving
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Allocating Stock...</>
                  : 'Issue Job Card'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════ COMPLETE JOB MODAL ══════════════════ */}
      {showCompleteModal && selectedJob && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCompleteModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-md border border-white/10 shadow-2xl flex flex-col gap-4 animate-fadeIn">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-100">Log Printed Sheets Return</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Log returned printed sheets count for job <span className="text-indigo-400 font-bold">{selectedJob.jobNo}</span>.</p>
              </div>
              <button onClick={() => setShowCompleteModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
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
              <div className="border border-white/5 rounded-xl p-3 bg-black/10 grid grid-cols-2 gap-3 text-[11px] text-gray-400">
                <div>
                  <span className="block text-[9px] text-gray-500 uppercase">Product Name</span>
                  <span className="font-semibold text-gray-200">{selectedJob.product.name}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-500 uppercase">Issued Sheets</span>
                  <span className="font-bold text-gray-200 font-mono">{selectedJob.issuedSheets.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className={lbl}>SUCCESSFUL RETURNED PRINTED SHEETS <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. 1950" value={returnedSheets}
                  onChange={e => setReturnedSheets(e.target.value)}
                  className={inp} />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">
                  Wastage of {Number(selectedJob.issuedSheets) - (Number(returnedSheets) || 0)} sheets will be logged.
                </p>
              </div>

              <div>
                <label className={lbl}>CONFIRM GSM <span className="text-red-400">*</span></label>
                <input type="text" placeholder="e.g. 230" value={completeGsm}
                  onChange={e => setCompleteGsm(e.target.value)}
                  className={inp} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
              <button onClick={() => setShowCompleteModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleCompleteJob} disabled={saving} id="btn-submit-complete-job"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                {saving
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Completing...</>
                  : 'Complete Job'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════ PRINT CHALLAN TICKET DIALOG ══════════════════ */}
      {showChallanModal && selectedJob && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setShowChallanModal(false); }}>
          <div className="rounded-2xl bg-white text-black p-6 w-full max-w-2xl border border-gray-200 shadow-2xl flex flex-col gap-5 my-8 relative">
            
            <button onClick={() => setShowChallanModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer print:hidden">
              ✕
            </button>

            {/* Print Handoff Section */}
            <div id="print-challan-section" className="font-sans">
              
              {/* Challan Title Banner */}
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-3">
                <div>
                  <h1 className="text-xl font-extrabold tracking-widest text-gray-900">GIGANI PACKAGING</h1>
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-0.5">Offset Printing & Lamination Job Order</p>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold text-gray-500 uppercase">INTERNAL CHALLAN</div>
                  <div className="text-base font-black text-indigo-600 font-mono mt-0.5">{selectedJob.jobNo}</div>
                </div>
              </div>

              {/* Handoff Details */}
              <div className="grid grid-cols-2 gap-4 text-xs py-3 border-b border-gray-300">
                <div>
                  <div className="space-y-1.5">
                    <p><strong className="text-gray-500">Job Date:</strong> <span className="font-mono">{new Date(selectedJob.createdAt).toLocaleDateString()}</span></p>
                    <p><strong className="text-gray-500">Printer Co:</strong> <span className="font-bold">{selectedJob.printer?.vendorName}</span></p>
                    <p><strong className="text-gray-500">Printer Code:</strong> <span className="font-mono text-gray-700">{selectedJob.printer?.vendorCode}</span></p>
                  </div>
                </div>
                <div>
                  <div className="space-y-1.5">
                    <p><strong className="text-gray-500">Product Name:</strong> <span className="font-bold">{selectedJob.product.name}</span></p>
                    <p><strong className="text-gray-500">Intended Boxes:</strong> <span className="font-bold font-mono">{selectedJob.plannedQty.toLocaleString()} units</span></p>
                    <p><strong className="text-gray-500">UPS Configuration:</strong> <span className="font-mono text-gray-700">{selectedJob.product.ups} ups</span></p>
                  </div>
                </div>
              </div>

              {/* Material Breakdown */}
              <div className="py-3">
                <h3 className="text-[11px] font-extrabold text-gray-900 tracking-wider uppercase mb-2">1. RAW MATERIAL & DUPLEX STOCK ISSUED</h3>
                <table className="w-full text-left border border-gray-300 text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 border-b border-gray-300 uppercase text-[9px] font-bold tracking-wider">
                      <th className="px-3 py-2 border-r border-gray-300">Paper Vendor</th>
                      <th className="px-3 py-2 border-r border-gray-300">Paper Size</th>
                      <th className="px-3 py-2 border-r border-gray-300 text-center">GSM</th>
                      <th className="px-3 py-2 border-r border-gray-300 text-right">Sheets Issued</th>
                      <th className="px-3 py-2 text-right">Estimated Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-3 py-2 border-r border-gray-300 font-medium">{getPaperVendor(selectedJob)}</td>
                      <td className="px-3 py-2 border-r border-gray-300 font-mono">{selectedJob.product.duplexSize}</td>
                      <td className="px-3 py-2 border-r border-gray-300 text-center font-mono font-bold">{selectedJob.product.cartonTopPaperGsm}</td>
                      <td className="px-3 py-2 border-r border-gray-300 text-right font-mono font-black text-gray-900">{selectedJob.issuedSheets.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {(() => {
                          const sizeParts = selectedJob.product.duplexSize.toLowerCase().split('x');
                          if (sizeParts.length === 2) {
                            const length = parseFloat(sizeParts[0]);
                            const width = parseFloat(sizeParts[1]);
                            const gsm = selectedJob.product.cartonTopPaperGsm || 0;
                            // weight calculation: length * width * gsm * sheets / 1550000 / 1000
                            const calculated = (length * width * gsm * selectedJob.issuedSheets) / 1550000000;
                            return `${calculated.toFixed(2)} kg`;
                          }
                          return '—';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Target outcome details */}
              <div className="py-2">
                <h3 className="text-[11px] font-extrabold text-gray-900 tracking-wider uppercase mb-2">2. OUTPUT REQUIREMENTS & PRINTING CONFIG</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <p><strong className="text-gray-500">Printing Mode:</strong> <span className="font-semibold text-gray-800">{selectedJob.product.printingMode || 'Offset'}</span></p>
                  <p><strong className="text-gray-500">Colors:</strong> <span className="font-semibold text-gray-800">{selectedJob.product.colorCount} Colors {selectedJob.product.specialColorCode && `(${selectedJob.product.specialColorCode})`}</span></p>
                  <p><strong className="text-gray-500">Carton Finish Size:</strong> <span className="font-mono text-gray-800">{selectedJob.cuttingSize || 'Standard Cut'}</span></p>
                  <p><strong className="text-gray-500">Lamination / Finish:</strong> <span className="font-semibold text-gray-800">{selectedJob.product.finishType || 'Gloss Lamination'}</span></p>
                  <p><strong className="text-gray-500">Partition Sheet Details:</strong> <span className="text-gray-800">{selectedJob.product.hasPartition ? `${selectedJob.product.partitionSize} (${selectedJob.product.partitionPly})` : 'No Partitions'}</span></p>
                  <p><strong className="text-gray-500">Status Check:</strong> <span className={`font-bold ${selectedJob.status === 'COMPLETED' ? 'text-emerald-600' : 'text-indigo-600'}`}>{selectedJob.status}</span></p>
                </div>
                {selectedJob.remarks && (
                  <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs italic text-gray-700">
                    <strong>Layout Notes / Instruction:</strong> {selectedJob.remarks}
                  </div>
                )}
              </div>

              {/* Visual Layout Design Preview */}
              <div className="py-2">
                <h3 className="text-[11px] font-extrabold text-gray-900 tracking-wider uppercase mb-2">3. EXPECTED OUTCOME LAYOUT</h3>
                <div className="border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center p-4 bg-gray-50 max-h-56">
                  {selectedJob.expectedOutcomeImage || selectedJob.product.productImage ? (
                    <img src={selectedJob.expectedOutcomeImage || selectedJob.product.productImage}
                      alt="Expected Outcome Layout" className="max-h-48 object-contain" />
                  ) : (
                    <div className="text-center text-xs text-gray-400 py-6">
                      <svg className="w-10 h-10 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      No visual outcome blueprint uploaded. Standard lamination details apply.
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs font-semibold">
                <div className="border-t border-gray-400 pt-1.5">
                  <span className="block text-[10px] text-gray-500 uppercase">Issued By</span>
                  <span className="text-gray-800 text-[11px]">Factory Inventory</span>
                </div>
                <div className="border-t border-gray-400 pt-1.5">
                  <span className="block text-[10px] text-gray-500 uppercase">Received By (Printer)</span>
                  <span className="text-gray-800 text-[11px]">{selectedJob.printer?.vendorName}</span>
                </div>
                <div className="border-t border-gray-400 pt-1.5">
                  <span className="block text-[10px] text-gray-500 uppercase">Verified By</span>
                  <span className="text-gray-800 text-[11px]">Superintendent Admin</span>
                </div>
              </div>

            </div>

            {/* Dialog Action Buttons */}
            <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-gray-100 print:hidden">
              <button onClick={() => setShowChallanModal(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:text-black transition-colors cursor-pointer bg-white">
                Close
              </button>
              <button onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Challan
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
