'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  customerName: string;
  shippingAddress?: string;
}

interface Product {
  id: string;
  name: string;
  plyType: 'THREE_PLY' | 'FIVE_PLY';
}

interface FinishedGoodsStock {
  id: string;
  productId: string;
  totalStock: number;
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
  productId: string;
  qtyDispatched: number;
  dispatchDate: string;
}

export default function CreateDispatchPage() {
  const router = useRouter();

  // API Lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<FinishedGoodsStock[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Form Fields
  const [dispatchDate, setDispatchDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [qtyDispatched, setQtyDispatched] = useState('');

  // Logistics
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [remarks, setRemarks] = useState('');

  // Execution states
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const [customersData, productsData, stocksData, jobsData, dispatchesData] = await Promise.all([
        api.get<Customer[]>('/customers'),
        api.get<Product[]>('/products'),
        api.get<FinishedGoodsStock[]>('/finished-goods/stock'),
        api.get<ProductionJob[]>('/production/jobs'),
        api.get<Dispatch[]>('/dispatch'),
      ]);

      setCustomers(Array.isArray(customersData) ? customersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setDispatches(Array.isArray(dispatchesData) ? dispatchesData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to initialize dispatch details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Find stock details for selected product
  const getProductStock = (prodId: string): number => {
    const stockItem = stocks.find(s => s.productId === prodId);
    return stockItem ? stockItem.totalStock : 0;
  };

  // Find oldest completed batch code with remaining stock (FIFO)
  const getOldestBatchCodeWithStock = (prodId: string): string | null => {
    const productJobs = jobs
      .filter(j => j.productId === prodId && j.status === 'COMPLETED')
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

    const productDispatches = dispatches
      .filter(d => d.productId === prodId)
      .sort((a, b) => new Date(a.dispatchDate).getTime() - new Date(b.dispatchDate).getTime());

    // Tracks dispatch allocations
    const dispatchAllocation: Record<string, number> = {};
    productJobs.forEach(j => {
      dispatchAllocation[j.id] = 0;
    });

    let dispatchIdx = 0;
    let dispatchRem = productDispatches[0] ? productDispatches[0].qtyDispatched : 0;

    productJobs.forEach(job => {
      let jobRem = job.producedQty;
      while (jobRem > 0 && dispatchIdx < productDispatches.length) {
        const d = productDispatches[dispatchIdx];
        const consume = Math.min(jobRem, dispatchRem);
        dispatchAllocation[job.id] += consume;
        jobRem -= consume;
        dispatchRem -= consume;
        if (dispatchRem <= 0) {
          dispatchIdx++;
          dispatchRem = productDispatches[dispatchIdx] ? productDispatches[dispatchIdx].qtyDispatched : 0;
        }
      }
    });

    // Find first job that still has remaining stock
    const oldestJobWithStock = productJobs.find(job => {
      const remaining = job.producedQty - dispatchAllocation[job.id];
      return remaining > 0;
    });

    if (oldestJobWithStock) {
      return oldestJobWithStock.jobCardNo.replace('PROD-', 'FG-B-');
    }
    return null;
  };

  // Auto-fill shipping address when customer changes
  const handleCustomerChange = (cId: string) => {
    setCustomerId(cId);
    const cust = customers.find(c => c.id === cId);
    if (cust && cust.shippingAddress) {
      setDeliveryAddress(cust.shippingAddress);
    } else {
      setDeliveryAddress('');
    }
  };

  // Auto-fill challan code when product changes
  const handleProductChange = (pId: string) => {
    setProductId(pId);
    if (!pId) {
      setChallanNo('');
      return;
    }

    const batchCode = getOldestBatchCodeWithStock(pId);
    if (batchCode) {
      // Append a random 3-digit tag to make it unique per dispatch transaction
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setChallanNo(`CH-${batchCode}-${randomSuffix}`);
    } else {
      // Fallback unique delivery challan format if no stock/batch found
      const dateTag = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setChallanNo(`CH-DISP-${dateTag}-${randomSuffix}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNo.trim()) { setFormErr('Invoice Number is required'); return; }
    if (!customerId) { setFormErr('Buyer is required'); return; }
    if (!productId) { setFormErr('Finished Product Name is required'); return; }
    if (!challanNo.trim()) { setFormErr('Finished Product Challan Number is required'); return; }
    if (!qtyDispatched.trim() || isNaN(Number(qtyDispatched)) || Number(qtyDispatched) <= 0) {
      setFormErr('Dispatch Quantity must be a positive number'); return;
    }

    const available = getProductStock(productId);
    const qty = Number(qtyDispatched);
    if (qty > available) {
      setFormErr(`Insufficient finished goods stock. Available: ${available} boxes.`);
      return;
    }

    setSaving(true);
    setFormErr('');

    const payload = {
      invoiceNo: invoiceNo.trim(),
      challanNo: challanNo.trim(),
      customerId,
      productId,
      qtyDispatched: qty,
      vehicleNo: vehicleNo.trim() || undefined,
      lrNo: lrNo.trim() || undefined,
      transporterName: transporterName.trim() || undefined,
      dispatchDate: new Date(dispatchDate).toISOString(),
    };

    try {
      await api.post('/dispatch', payload);
      router.push('/dashboard/sales/dispatch');
    } catch (e: any) {
      setFormErr(e?.message || 'Failed to log Carton Dispatch.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Initializing Sales Dispatch form…</span>
      </div>
    );
  }

  const selectedProductStock = productId ? getProductStock(productId) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Breadcrumb link */}
      <div>
        <Link
          href="/dashboard/sales/dispatch"
          className="text-xs text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          &larr; Back to List
        </Link>
      </div>

      <form onSubmit={handleSave} className="glass-card rounded-2xl p-6 border border-white/5 bg-[#0e1726]/40 backdrop-blur-md shadow-2xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-gray-100 tracking-tight">Sales Invoicing & Dispatch Details</h2>
          <p className="text-xs text-gray-500 mt-0.5">Record outer carton delivery challans and log invoice details</p>
        </div>

        {formErr && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formErr}
          </div>
        )}

        {pageErr && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {pageErr}
          </div>
        )}

        {/* Primary Invoice Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Dispatch Date */}
          <div>
            <label className={lbl}>DISPATCH DATE *</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={e => setDispatchDate(e.target.value)}
              required
              className={inp}
            />
          </div>

          {/* Invoice Number */}
          <div>
            <label className={lbl}>INVOICE NUMBER *</label>
            <input
              type="text"
              placeholder="e.g. INV/2026/001"
              value={invoiceNo}
              onChange={e => setInvoiceNo(e.target.value)}
              required
              className={inp}
            />
          </div>

          {/* Customer */}
          <div>
            <label className={lbl}>BUYER NAME *</label>
            <select
              value={customerId}
              onChange={e => handleCustomerChange(e.target.value)}
              required
              className={inp}
            >
              <option value="">Select Buyer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
          </div>

          {/* Finished Product */}
          <div>
            <label className={lbl}>FINISHED PRODUCT NAME *</label>
            <select
              value={productId}
              onChange={e => handleProductChange(e.target.value)}
              required
              className={inp}
            >
              <option value="">Select Finished Product Stock...</option>
              {products.map(p => {
                const stock = getProductStock(p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {stock})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Challan Number */}
          <div>
            <label className={lbl}>FINISHED PRODUCT CHALLAN NUMBER *</label>
            <input
              type="text"
              placeholder="Auto-filled from selected product stock"
              value={challanNo}
              onChange={e => setChallanNo(e.target.value)}
              required
              className={inp}
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Auto-allocated batch code reference. Can be overridden manually.
            </p>
          </div>

          {/* Dispatch Quantity */}
          <div>
            <label className={lbl}>DISPATCH QTY (CARTONS) *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 500"
              value={qtyDispatched}
              onChange={e => setQtyDispatched(e.target.value)}
              required
              className={inp}
            />
            {productId && (
              <p className={`text-[10px] mt-1 font-semibold ${selectedProductStock === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                Available Stock: {selectedProductStock.toLocaleString()} boxes
              </p>
            )}
          </div>
        </div>

        {/* Separator line */}
        <div className="border-t border-white/5 pt-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            LOGISTICS & SHIPPING DETAILS
          </h3>
        </div>

        {/* Logistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Transporter Name */}
          <div>
            <label className={lbl}>TRANSPORTER NAME</label>
            <input
              type="text"
              placeholder="e.g. SafeExpress, VRL Logistics"
              value={transporterName}
              onChange={e => setTransporterName(e.target.value)}
              className={inp}
            />
          </div>

          {/* Vehicle Number */}
          <div>
            <label className={lbl}>VEHICLE NUMBER</label>
            <input
              type="text"
              placeholder="e.g. MH-04-GP-8899"
              value={vehicleNo}
              onChange={e => setVehicleNo(e.target.value)}
              className={inp}
            />
          </div>

          {/* LR Number */}
          <div>
            <label className={lbl}>L.R. NUMBER (BILTY)</label>
            <input
              type="text"
              placeholder="e.g. LR-99881"
              value={lrNo}
              onChange={e => setLrNo(e.target.value)}
              className={inp}
            />
          </div>

          {/* Delivery Address */}
          <div className="md:col-span-3">
            <label className={lbl}>DELIVERY ADDRESS</label>
            <textarea
              rows={2}
              placeholder="Shipping destination address"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Remarks */}
          <div className="md:col-span-3">
            <label className={lbl}>REMARKS</label>
            <textarea
              rows={2}
              placeholder="Any invoice notes, delivery remarks"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5">
          <Link
            href="/dashboard/sales/dispatch"
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Logging...</>
            ) : (
              'Log Dispatch Invoicing'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
