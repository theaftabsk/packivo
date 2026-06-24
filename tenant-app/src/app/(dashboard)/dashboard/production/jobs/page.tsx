'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui/Pagination';

interface Customer {
  id: string;
  customerCode: string;
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
  ups: number;
  cartonTopPaperGsm?: number;
  cartonFlutingPaperGsm?: number;
  cartonBackingPaperGsm?: number;
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
  createdAt: string;
}

interface PrintJob {
  id: string;
  jobNo: string;
  productId: string;
  availableStock: number;
  product: {
    name: string;
  };
  printer?: {
    vendorName: string;
  };
}

interface KraftPurchase {
  id: string;
  challanNo?: string;
  gsm: number;
  rollSize: number;
  balanceStock: number;
  weightKg: number;
  vendor?: {
    vendorName: string;
  };
}

interface Settings {
  formulaThreePly: string;
  formulaFivePly: string;
}

export default function ProductionJobsPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [kraftPurchases, setKraftPurchases] = useState<KraftPurchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // List filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plyFilter, setPlyFilter] = useState('all');

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

  // Form toggle
  const [isFormView, setIsFormView] = useState(false);

  // ══════════════════ FORM STATES ══════════════════
  const [jobCardNo, setJobCardNo] = useState('');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Customer autocomplete
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Product select
  const [selectedProductId, setSelectedProductId] = useState('');

  // Editable Product Specs
  const [sheetLength, setSheetLength] = useState('0');
  const [sheetWidth, setSheetWidth] = useState('0');
  const [plyType, setPlyType] = useState<'3-Ply' | '5-Ply'>('3-Ply');
  const [dispatchQty, setDispatchQty] = useState('1000');
  const [topGsm, setTopGsm] = useState('0');
  const [flutingGsm, setFlutingGsm] = useState('0');
  const [backingGsm, setBackingGsm] = useState('0');

  // Consumptions Selection
  const [selectedPrintJobId, setSelectedPrintJobId] = useState('');
  const [selectedKraftPurchaseId, setSelectedKraftPurchaseId] = useState('');

  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch static dropdown metadata once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [customersData, productsData, printJobsData, purchasesData, settingsData] = await Promise.all([
          api.get<Customer[]>('/customers'),
          api.get<Product[]>('/products'),
          api.get<PrintJob[]>('/printing/jobs'),
          api.get<KraftPurchase[]>('/kraft/purchases'),
          api.get<Settings>('/settings'),
        ]);
        setCustomers(Array.isArray(customersData) ? customersData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setPrintJobs(Array.isArray(printJobsData) ? printJobsData : []);
        setKraftPurchases(Array.isArray(purchasesData) ? purchasesData : []);
        setSettings(settingsData);
      } catch (e: any) {
        console.error('Failed to load static metadata:', e);
      }
    };
    fetchMetadata();
  }, []);

  // Load Lists
  const loadData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(plyFilter !== 'all' && { plyType: plyFilter }),
      });
      const res: any = await api.get(`/production/jobs?${q.toString()}`);
      if (res && res.success) {
        setJobs(res.data || []);
        setMeta(res.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setJobs(Array.isArray(res) ? res : []);
      }
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to fetch production records.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, plyFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, plyFilter]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerFormView = () => {
    // Generate a job card number: PROD-YYYY-RAND
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setJobCardNo(`PROD-${year}-${rand}`);
    
    // Reset Form fields
    setProductionDate(new Date().toISOString().split('T')[0]);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setSelectedProductId('');
    setSheetLength('0');
    setSheetWidth('0');
    setPlyType('3-Ply');
    setDispatchQty('1000');
    setTopGsm('0');
    setFlutingGsm('0');
    setBackingGsm('0');
    setSelectedPrintJobId('');
    setSelectedKraftPurchaseId('');
    setRemarks('');
    setFormErr('');
    setIsFormView(true);
  };

  // Autocomplete Filter
  const filteredCustomers = customers.filter(c =>
    c.customerName.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Filtered Products for selected customer
  const customerProducts = products.filter(p => p.customerId === selectedCustomerId);

  // Selected Product Specs
  const currentProduct = products.find(p => p.id === selectedProductId);

  // Update form specifications when product is selected
  useEffect(() => {
    if (currentProduct) {
      // Parse sheet dimensions from product's duplexSize or kraftSize (e.g. "34x24")
      const dims = (currentProduct.kraftSize || '0x0').toLowerCase().split('x');
      setSheetLength(dims[0] || '0');
      setSheetWidth(dims[1] || '0');
      setPlyType(currentProduct.plyType === 'THREE_PLY' ? '3-Ply' : '5-Ply');
      setTopGsm(String(currentProduct.cartonTopPaperGsm || 0));
      setFlutingGsm(String(currentProduct.cartonFlutingPaperGsm || 0));
      setBackingGsm(String(currentProduct.cartonBackingPaperGsm || 0));

      // Reset allocations on product change
      setSelectedPrintJobId('');
      setSelectedKraftPurchaseId('');
    }
  }, [selectedProductId, currentProduct]);

  // Dynamic Completed Print Jobs (Batches) for selected product
  const productPrintJobs = printJobs.filter(
    pj => pj.productId === selectedProductId && pj.availableStock > 0
  );

  // Dynamic Kraft Purchases (Batches) matching current product GSM/roll size
  const productKraftPurchases = kraftPurchases.filter(kp => {
    if (!currentProduct) return false;
    const parts = (currentProduct.kraftSize || '0x0').toLowerCase().split('x');
    const widthInches = parts[0] ? parseFloat(parts[0]) : 0;
    return kp.gsm === Number(backingGsm) && kp.rollSize === widthInches && kp.balanceStock > 0;
  });

  // Fluting factor from active DB formulas
  const getFlutingMultiplier = () => {
    if (!settings) return plyType === '3-Ply' ? 1.5 : 3.0;
    const pattern = plyType === '3-Ply' ? settings.formulaThreePly : settings.formulaFivePly;
    const match = pattern.match(/F\s*\*\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : (plyType === '3-Ply' ? 1.5 : 3.0);
  };

  const currentFlutingFactor = getFlutingMultiplier();

  // Dynamic Lean GSM calculation
  const calculatedLeanGsm = (() => {
    const tVal = Number(topGsm) || 0;
    const fVal = Number(flutingGsm) || 0;
    const bVal = Number(backingGsm) || 0;

    if (plyType === '3-Ply') {
      return tVal + (fVal * currentFlutingFactor) + bVal;
    } else {
      return tVal + (fVal * currentFlutingFactor) + (bVal * 2);
    }
  })();

  // Dynamic Weight calculation: (Length * Width * Lean GSM * Qty) / 1,550,000
  const calculatedRawWeight = (() => {
    const l = Number(sheetLength) || 0;
    const w = Number(sheetWidth) || 0;
    const qtyVal = Number(dispatchQty) || 0;
    return (l * w * calculatedLeanGsm * qtyVal) / 1550 / 1000;
  })();

  // Dynamic Duplex Sheets calculation: Quantity / Product Ups
  const duplexSheetsRequired = (() => {
    const qtyVal = Number(dispatchQty) || 0;
    const upsVal = currentProduct?.ups || 1;
    return Math.ceil(qtyVal / upsVal);
  })();

  // Save/Create production job runs
  const handleSaveJob = async () => {
    if (!selectedProductId) { setFormErr('Product selection is required'); return; }
    if (!selectedPrintJobId) { setFormErr('Duplex stock batch selection is required'); return; }
    if (!selectedKraftPurchaseId) { setFormErr('Kraft stock batch selection is required'); return; }
    if (!dispatchQty.trim() || isNaN(Number(dispatchQty)) || Number(dispatchQty) <= 0) {
      setFormErr('Dispatch quantity must be a positive number'); return;
    }

    setSaving(true);
    setFormErr('');

    const payload = {
      jobCardNo,
      productId: selectedProductId,
      targetQty: Number(dispatchQty),
      gsm: Number(topGsm),
      backingGsm: Number(backingGsm),
      flutingGsm: Number(flutingGsm),
      printJobId: selectedPrintJobId,
      kraftPurchaseId: selectedKraftPurchaseId,
      plannedDate: productionDate,
      remarks: remarks.trim() || undefined,
      isCompleted: true, // Default to Create & Complete immediate execution
    };

    try {
      await api.post('/production/jobs', payload);
      setIsFormView(false);
      loadData();
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to plan production job. Make sure stock limits allow this run.');
    } finally {
      setSaving(false);
    }
  };

  // Filter Jobs listing table
  const filteredJobs = jobs;

  if (isFormView) {
    return (
      <div className="space-y-4">
        {/* Back navigation */}
        <div>
          <button
            onClick={() => setIsFormView(false)}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
          >
            ← Back to List
          </button>
        </div>

        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Plan New Production Job</h2>
          <p className="text-xs text-gray-500 mt-0.5">Plan and execute immediate stock consumes to manufacture Finished Goods.</p>
        </div>

        {formErr && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formErr}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Form Content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card rounded-xl p-5 border border-white/5 bg-[#090f1d]/50 space-y-5 text-xs">
              
              {/* Section 1: General Info */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  1. GENERAL INFORMATION & CUSTOMER
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Job card / Challan No */}
                  <div>
                    <label className={lbl}>CHALLAN NO. / JOB CARD</label>
                    <input type="text" value="Auto-Generated" disabled className={`${inp} bg-white/5 opacity-50 cursor-not-allowed`} />
                  </div>

                  {/* Production Date */}
                  <div>
                    <label className={lbl}>PRODUCTION DATE *</label>
                    <input
                      type="date"
                      value={productionDate}
                      onChange={e => setProductionDate(e.target.value)}
                      className={inp}
                    />
                  </div>

                  {/* Buyer Name autocomplete */}
                  <div className="relative" ref={customerDropdownRef}>
                    <label className={lbl}>BUYER NAME *</label>
                    <input
                      type="text"
                      placeholder="Type to search buyer..."
                      value={customerSearch}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomerId('');
                        setSelectedProductId('');
                        setShowCustomerDropdown(true);
                      }}
                      className={inp}
                    />
                    {showCustomerDropdown && customerSearch.trim().length > 0 && (
                      <div className="absolute z-[9999] left-0 right-0 mt-1 rounded-lg bg-[#0c1220] border border-white/10 max-h-48 overflow-y-auto shadow-2xl divide-y divide-white/5">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-3 text-gray-500 text-center">No customers found</div>
                        ) : (
                          filteredCustomers.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearch(c.customerName);
                                setShowCustomerDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-indigo-600/10 text-gray-200 hover:text-indigo-400 transition-colors"
                            >
                              {c.customerName} ({c.customerCode})
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Finished product */}
                  <div>
                    <label className={lbl}>FINISHED PRODUCT / JOB NAME *</label>
                    <select
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                      className={inp}
                      disabled={!selectedCustomerId}
                    >
                      <option value="">-- Choose Product --</option>
                      {customerProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className={lbl}>REMARKS / SPECIAL INSTRUCTIONS</label>
                  <textarea
                    rows={2}
                    placeholder="Add optional instructions..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Section 2: Product Specifications */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  2. PRODUCT SPECIFICATIONS (EDITABLE)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Sheet Length */}
                  <div>
                    <label className={lbl}>SHEET LENGTH (IN) *</label>
                    <input
                      type="text"
                      value={sheetLength}
                      onChange={e => setSheetLength(e.target.value)}
                      className={inp}
                    />
                  </div>

                  {/* Sheet Width */}
                  <div>
                    <label className={lbl}>SHEET WIDTH (IN) *</label>
                    <input
                      type="text"
                      value={sheetWidth}
                      onChange={e => setSheetWidth(e.target.value)}
                      className={inp}
                    />
                  </div>

                  {/* Ply Type */}
                  <div>
                    <label className={lbl}>PLY TYPE *</label>
                    <select
                      value={plyType}
                      onChange={e => setPlyType(e.target.value as any)}
                      className={inp}
                    >
                      <option value="3-Ply">3-Ply</option>
                      <option value="5-Ply">5-Ply</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className={lbl}>DISPATCH QTY (CARTONS) *</label>
                    <input
                      type="text"
                      value={dispatchQty}
                      onChange={e => setDispatchQty(e.target.value)}
                      className={inp}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-1">
                  {/* Top Paper GSM */}
                  <div>
                    <label className={lbl}>TOP PAPER GSM *</label>
                    <input
                      type="text"
                      value={topGsm}
                      onChange={e => setTopGsm(e.target.value)}
                      className={inp}
                    />
                  </div>

                  {/* Fluting GSM */}
                  <div>
                    <label className={lbl}>FLUTING GSM *</label>
                    <input
                      type="text"
                      value={flutingGsm}
                      onChange={e => setFlutingGsm(e.target.value)}
                      className={inp}
                    />
                  </div>

                  {/* Backing GSM */}
                  <div>
                    <label className={lbl}>BAKING / BACKING GSM *</label>
                    <input
                      type="text"
                      value={backingGsm}
                      onChange={e => setBackingGsm(e.target.value)}
                      className={inp}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Stock Allocation */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider border-b border-white/5 pb-1">
                  3. STOCK ALLOCATION (CONSUMPTIONS)
                </h4>

                {/* Duplex Sheets Stock Selection */}
                <div className="border border-white/5 rounded-xl p-3 bg-black/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-300">A. Printed Duplex Stock Selection</span>
                    {currentProduct && (
                      <span className="text-[9px] text-gray-500 font-semibold font-mono">UPS: {currentProduct.ups}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>SEARCH PRINTER NAME</label>
                      <input type="text" placeholder="Type to filter by Printer..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>SELECT DUPLEX STOCK BATCH *</label>
                      <select
                        value={selectedPrintJobId}
                        onChange={e => setSelectedPrintJobId(e.target.value)}
                        className={inp}
                        disabled={!selectedProductId}
                      >
                        <option value="">-- Choose Duplex Batch --</option>
                        {productPrintJobs.map(pj => (
                          <option key={pj.id} value={pj.id}>
                            {pj.jobNo} ({pj.availableStock.toLocaleString()} sheets) [Printer: {pj.printer?.vendorName || 'N/A'}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Kraft Paper Stock Selection */}
                <div className="border border-white/5 rounded-xl p-3 bg-black/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-300">B. Kraft Paper Stock Selection</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>SEARCH VENDOR NAME</label>
                      <input type="text" placeholder="Type to filter by Vendor..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>SELECT KRAFT STOCK BATCH *</label>
                      <select
                        value={selectedKraftPurchaseId}
                        onChange={e => setSelectedKraftPurchaseId(e.target.value)}
                        className={inp}
                        disabled={!selectedProductId}
                      >
                        <option value="">-- Choose Kraft Batch --</option>
                        {productKraftPurchases.map(kp => (
                          <option key={kp.id} value={kp.id}>
                            {kp.challanNo || 'CH-XXXX'} ({kp.balanceStock.toLocaleString()} kg) [Vendor: {kp.vendor?.vendorName || 'N/A'}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsFormView(false)}
                  className="px-3.5 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveJob}
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving run...
                    </>
                  ) : (
                    'Create & Complete Job'
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Live Calculations */}
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 border border-white/5 bg-[#090f1d]/50 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  LIVE CALCULATIONS
                </h3>
                <span className="text-[10px] text-gray-500 font-bold tracking-wider">{plyType.toUpperCase()}</span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Lean GSM */}
                <div className="border border-white/5 rounded-lg p-3 bg-black/25">
                  <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">LEAN GSM</span>
                  <span className="text-xl font-extrabold text-gray-200 font-mono tracking-tight block mt-0.5">
                    {calculatedLeanGsm}
                  </span>
                  <div className="text-[9.5px] text-gray-500 mt-1 font-mono">
                    Top: {topGsm} | Flute: {flutingGsm} (x{currentFlutingFactor.toFixed(1)}) | Backing: {backingGsm} {plyType === '5-Ply' ? '(x2)' : ''}
                  </div>
                </div>

                {/* Total Raw Weight */}
                <div className="border border-white/5 rounded-lg p-3 bg-black/25">
                  <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">TOTAL RAW WEIGHT</span>
                  <span className="text-xl font-extrabold text-indigo-400 font-mono tracking-tight block mt-0.5">
                    {calculatedRawWeight.toFixed(2)} kg
                  </span>
                  <div className="text-[9.5px] text-gray-500 mt-1 font-mono leading-relaxed truncate">
                    Formula: (L * W * Lean GSM * Qty) / 1,550,000 = {calculatedRawWeight.toFixed(2)} kg
                  </div>
                </div>

                {/* Duplex Sheets Required */}
                <div className="border border-white/5 rounded-lg p-3 bg-black/25 flex items-center justify-between">
                  <div>
                    <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">DUPLEX SHEETS REQUIRED</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono tracking-tight block mt-0.5">
                      {duplexSheetsRequired.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded font-mono">UPS: {currentProduct?.ups || 1}</span>
                </div>
              </div>

              {/* Disclaimer Notice */}
              <div className="bg-indigo-950/20 border border-indigo-900/20 rounded-lg p-2.5 flex items-start gap-1.5 mt-2">
                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[9.5px] text-indigo-400 leading-relaxed">
                  Stock adjustments are computed inside a database transaction with table locks. This ensures exact quantity audits without race conditions.
                </p>
              </div>
            </div>
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
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Production Planning & Jobs</h2>
          <p className="text-xs text-gray-500 mt-0.5">{meta.totalItems} active production runs logged</p>
        </div>
        <button
          onClick={triggerFormView}
          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Plan Production Job
        </button>
      </div>

      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search Job #, customer, product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={plyFilter}
          onChange={e => setPlyFilter(e.target.value)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
        >
          <option value="all">All Ply Types</option>
          <option value="THREE_PLY">3-Ply</option>
          <option value="FIVE_PLY">5-Ply</option>
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
                <th className="px-4 py-3">JOB NUMBER</th>
                <th className="px-4 py-3">CUSTOMER</th>
                <th className="px-4 py-3">PRODUCT / JOB ITEM</th>
                <th className="px-4 py-3">PLY TYPE</th>
                <th className="px-4 py-3 text-right">PLANNED QTY</th>
                <th className="px-4 py-3 text-right">PRODUCED QTY</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3">PRODUCTION DATE</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-600">Loading production runs…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-600">
                    No production jobs planned yet.
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => {
                  const wastage = job.targetQty - job.producedQty;
                  return (
                    <tr key={job.id} className="hover:bg-white/[0.015] transition-colors">
                      {/* Job Number */}
                      <td className="px-4 py-3.5 font-bold text-gray-200 font-mono">
                        {job.jobCardNo}
                      </td>
                      {/* Customer */}
                      <td className="px-4 py-3.5 text-gray-300 font-semibold">
                        {(job.product as any)?.customer?.customerName || 'Amin Foods'}
                      </td>
                      {/* Product */}
                      <td className="px-4 py-3.5 text-gray-400">
                        {job.product?.name}
                      </td>
                      {/* Ply Type */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0f172a] text-indigo-400 border border-indigo-900">
                          {job.product?.plyType === 'THREE_PLY' ? '3-PLY' : '5-PLY'}
                        </span>
                      </td>
                      {/* Planned Qty */}
                      <td className="px-4 py-3.5 text-right font-semibold font-mono text-gray-300">
                        {job.targetQty.toLocaleString()}
                      </td>
                      {/* Produced Qty */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="space-y-0.5">
                          <div className="font-mono text-gray-300 font-semibold">
                            {job.status === 'COMPLETED' ? job.producedQty.toLocaleString() : '—'}
                          </div>
                          {job.status === 'COMPLETED' && wastage > 0 && (
                            <div className="text-[9.5px] text-red-500 font-semibold font-mono">
                              wastage: {wastage.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : job.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]'
                            : 'bg-gray-500/10 text-gray-400 border border-white/5'
                        }`}>
                          {job.status.charAt(0) + job.status.slice(1).toLowerCase().replace('_', ' ')}
                        </span>
                      </td>
                      {/* Production Date */}
                      <td className="px-4 py-3.5 text-gray-400 font-mono">
                        {new Date(job.plannedDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <button className="px-2.5 py-1 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
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
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
