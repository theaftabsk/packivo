'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  customerName: string;
  customerCode: string;
  shippingAddress?: string;
}

interface Product {
  id: string;
  name: string;
  plyType: 'THREE_PLY' | 'FIVE_PLY';
  boxSizeLength: number;
  boxSizeWidth: number;
  boxSizeHeight: number;
  duplexSize: string;
  finishSize?: string;
  cartonTopPaperGsm?: number;
  cartonTopPaperType?: string;
  customerId?: string;
  customer?: Customer;
  cartonFlutingPaperGsm?: number;
  cartonBackingPaperGsm?: number;
}

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  suppliedMaterials: string[];
}

interface DuplexStock {
  id: string;
  gsm: number;
  size: string;
  qtySheets: number;
  type: 'RAW' | 'PRINTED';
}

interface KraftStock {
  id: string;
  rollSize: number;
  gsm: number;
  weightKg: number;
}

interface FinishedGoodsStock {
  id: string;
  productId: string;
  totalStock: number;
  allocatedStock: number;
}

interface DuplexPurchase {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  challanNo: string;
  gsm: number;
  size: string;
  quantitySheets: number;
  weightKg: number;
  rate: number;
  purchaseDate: string;
  deliveredTo?: string;
  remarks?: string;
}

interface KraftPurchase {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  challanNo?: string;
  invoiceNo?: string;
  paperType?: string;
  qtyRolls: number;
  rollSize: number;
  gsm: number;
  weightKg: number;
  rate: number;
  purchaseDate: string;
  deliveredTo?: string;
  remarks?: string;
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
  status: 'PENDING' | 'ISSUED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  remarks?: string;
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

export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Raw data from endpoints
  const [duplexStock, setDuplexStock] = useState<DuplexStock[]>([]);
  const [kraftStock, setKraftStock] = useState<KraftStock[]>([]);
  const [fgStock, setFgStock] = useState<FinishedGoodsStock[]>([]);
  const [duplexPurchases, setDuplexPurchases] = useState<DuplexPurchase[]>([]);
  const [kraftPurchases, setKraftPurchases] = useState<KraftPurchase[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState('');
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [printerFilter, setPrinterFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageErr('');
    try {
      const [
        customersData,
        productsData,
        vendorsData,
        stockData,
        fgStockData,
        purchasesData,
        printJobsData,
        productionData,
        dispatchesData,
      ] = await Promise.all([
        api.get<Customer[]>('/customers'),
        api.get<Product[]>('/products'),
        api.get<Vendor[]>('/vendors'),
        api.get<{ duplex: DuplexStock[]; kraft: KraftStock[] }>('/reports/stock'),
        api.get<FinishedGoodsStock[]>('/finished-goods/stock'),
        api.get<{ duplex: DuplexPurchase[]; kraft: KraftPurchase[] }>('/reports/purchases'),
        api.get<PrintJob[]>('/printing/jobs'),
        api.get<ProductionJob[]>('/reports/production'),
        api.get<Dispatch[]>('/reports/dispatch'),
      ]);

      setCustomers(Array.isArray(customersData) ? customersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);

      if (stockData) {
        setDuplexStock(Array.isArray(stockData.duplex) ? stockData.duplex : []);
        setKraftStock(Array.isArray(stockData.kraft) ? stockData.kraft : []);
      }
      setFgStock(Array.isArray(fgStockData) ? fgStockData : []);

      if (purchasesData) {
        setDuplexPurchases(Array.isArray(purchasesData.duplex) ? purchasesData.duplex : []);
        setKraftPurchases(Array.isArray(purchasesData.kraft) ? purchasesData.kraft : []);
      }

      setPrintJobs(Array.isArray(printJobsData) ? printJobsData : []);
      setProductionJobs(Array.isArray(productionData) ? productionData : []);
      setDispatches(Array.isArray(dispatchesData) ? dispatchesData : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to initialize BI report metadata.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Utility to filter by date range
  const isWithinDateRange = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr).getTime();
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (date < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59').getTime();
      if (date > end) return false;
    }
    return true;
  };

  // Helper to trigger CSV file download
  const triggerCSVDownload = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row =>
        row.map(val => {
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // 1. Current Stock Ledger Report
  const exportStockLedger = () => {
    setExportingReportId('stock');
    setTimeout(() => {
      const headers = [
        'Material Category',
        'Specification/Size',
        'GSM',
        'Stock Available',
        'Unit',
        'Allocated Stock',
        'Stock Type'
      ];

      const rows: any[][] = [];

      // Raw & Printed Duplex
      duplexStock.forEach(s => {
        rows.push([
          'Duplex Board Sheets',
          s.size,
          s.gsm,
          s.qtySheets,
          'Sheets',
          0,
          s.type === 'RAW' ? 'Raw Material' : 'Printed Stock'
        ]);
      });

      // Kraft rolls
      kraftStock.forEach(s => {
        rows.push([
          'Kraft Paper Rolls',
          `${s.rollSize} inch`,
          s.gsm,
          s.weightKg.toFixed(2),
          'Kg',
          0,
          'Raw Material'
        ]);
      });

      // Finished goods
      fgStock.forEach(s => {
        const prod = products.find(p => p.id === s.productId);
        if (prod) {
          const dims = `${prod.boxSizeLength}x${prod.boxSizeWidth}x${prod.boxSizeHeight}`;
          rows.push([
            'Finished Outer Cartons',
            prod.name,
            prod.cartonTopPaperGsm || '—',
            s.totalStock,
            'Boxes',
            s.allocatedStock,
            `FG (${dims})`
          ]);
        }
      });

      triggerCSVDownload(
        `current_stock_ledger_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
      setExportingReportId(null);
    }, 400);
  };

  // 2. Material Flow & Ledger Report (Chronological transaction ledger)
  const exportMaterialFlow = () => {
    setExportingReportId('flow');
    setTimeout(() => {
      const headers = [
        'Date',
        'Reference #',
        'Transaction Type',
        'Material Details',
        'Party/Vendor/Buyer',
        'GSM',
        'Dimensions',
        'Inward Qty',
        'Outward Qty',
        'Remarks'
      ];

      const events: { date: Date; row: any[] }[] = [];

      // Duplex Inwards
      duplexPurchases.forEach(p => {
        if (isWithinDateRange(p.purchaseDate)) {
          if (vendorFilter === 'all' || p.vendorId === vendorFilter) {
            events.push({
              date: new Date(p.purchaseDate),
              row: [
                new Date(p.purchaseDate).toLocaleDateString(),
                p.challanNo,
                'Duplex Raw Inward',
                'Duplex Board Sheets',
                p.vendor?.vendorName || '—',
                p.gsm,
                p.size,
                p.quantitySheets,
                0,
                p.remarks || ''
              ]
            });
          }
        }
      });

      // Kraft Inwards
      kraftPurchases.forEach(p => {
        if (isWithinDateRange(p.purchaseDate)) {
          if (vendorFilter === 'all' || p.vendorId === vendorFilter) {
            events.push({
              date: new Date(p.purchaseDate),
              row: [
                new Date(p.purchaseDate).toLocaleDateString(),
                p.challanNo || p.invoiceNo || '—',
                'Kraft Roll Inward',
                p.paperType || 'Kraft roll',
                p.vendor?.vendorName || '—',
                p.gsm,
                `${p.rollSize} inch`,
                p.weightKg,
                0,
                p.remarks || ''
              ]
            });
          }
        }
      });

      // Print job transfers (Outward RAW sheets issued)
      printJobs.forEach(j => {
        if (isWithinDateRange(j.createdAt)) {
          if (productFilter === 'all' || j.productId === productFilter) {
            if (printerFilter === 'all' || j.printerId === printerFilter) {
              events.push({
                date: new Date(j.createdAt),
                row: [
                  new Date(j.createdAt).toLocaleDateString(),
                  j.jobNo,
                  'Duplex Printing Issue',
                  'Duplex Sheets (RAW)',
                  j.printer?.vendorName || '—',
                  j.product?.cartonTopPaperGsm || '—',
                  j.product?.duplexSize || '—',
                  0,
                  j.issuedSheets,
                  j.remarks || ''
                ]
              });

              if (j.status === 'COMPLETED') {
                events.push({
                  date: new Date(j.createdAt),
                  row: [
                    new Date(j.createdAt).toLocaleDateString(),
                    j.jobNo,
                    'Duplex Printing Receipt',
                    'Printed Duplex Sheets',
                    j.printer?.vendorName || '—',
                    j.product?.cartonTopPaperGsm || '—',
                    j.cuttingSize || j.product?.duplexSize || '—',
                    j.returnedSheets,
                    0,
                    'Completed Print Job'
                  ]
                });
              }
            }
          }
        }
      });

      // Production Jobs (Outward sheets consumed / Inward boxes produced)
      productionJobs.forEach(j => {
        const date = j.completedDate || j.plannedDate;
        if (isWithinDateRange(date)) {
          if (productFilter === 'all' || j.productId === productFilter) {
            if (customerFilter === 'all' || j.product?.customerId === customerFilter) {
              events.push({
                date: new Date(date),
                row: [
                  new Date(date).toLocaleDateString(),
                  j.jobCardNo,
                  'Manufacturing Complete',
                  `Cartons: ${j.product?.name}`,
                  j.product?.customer?.customerName || '—',
                  j.product?.cartonTopPaperGsm || '—',
                  j.product?.finishSize || '—',
                  j.producedQty,
                  0,
                  `Produced ${j.producedQty} boxes`
                ]
              });
            }
          }
        }
      });

      // Dispatches (Outward sales)
      dispatches.forEach(d => {
        if (isWithinDateRange(d.dispatchDate)) {
          if (productFilter === 'all' || d.productId === productFilter) {
            if (customerFilter === 'all' || d.customerId === customerFilter) {
              events.push({
                date: new Date(d.dispatchDate),
                row: [
                  new Date(d.dispatchDate).toLocaleDateString(),
                  d.challanNo,
                  'Sales Dispatch Outward',
                  `Cartons: ${d.product?.name}`,
                  d.customer?.customerName || '—',
                  d.product?.cartonTopPaperGsm || '—',
                  d.product?.finishSize || '—',
                  0,
                  d.qtyDispatched,
                  d.invoiceNo || 'Sales Delivery'
                ]
              });
            }
          }
        }
      });

      // Sort chronological
      events.sort((a, b) => b.date.getTime() - a.date.getTime());

      triggerCSVDownload(
        `material_flow_ledger_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        events.map(e => e.row)
      );
      setExportingReportId(null);
    }, 400);
  };

  // 3. Production Traceability (Genalogy Report matching dispatches to runs and inputs via FIFO)
  const exportTraceabilityReport = () => {
    setExportingReportId('trace');
    setTimeout(() => {
      const headers = [
        'Dispatch Date',
        'Invoice No',
        'Sales Challan #',
        'Customer Name',
        'Product Name',
        'Qty Dispatched (Boxes)',
        'Linked Production Runs',
        'Produced Qty (Boxes)',
        'Production Completion Date',
        'Printer Job Cards Mapped',
        'Printed Sheets Issued',
        'Offset Printer Vendor',
        'Duplex Board Suppliers',
        'Duplex Purchases Mapped',
        'Kraft Liner Gsm Configurations'
      ];

      const rows: any[][] = [];

      // Group completed production jobs & dispatches by product
      const targetProducts = products.filter(p => {
        const matchesProd = productFilter === 'all' || p.id === productFilter;
        const matchesCust = customerFilter === 'all' || p.customerId === customerFilter;
        return matchesProd && matchesCust;
      });

      targetProducts.forEach(prod => {
        const productJobs = productionJobs
          .filter(j => j.productId === prod.id && j.status === 'COMPLETED')
          .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

        const productDispatches = dispatches
          .filter(d => d.productId === prod.id && isWithinDateRange(d.dispatchDate))
          .sort((a, b) => new Date(a.dispatchDate).getTime() - new Date(b.dispatchDate).getTime());

        // Trace allocations via FIFO
        let jobIdx = 0;
        let jobRem = productJobs[0] ? productJobs[0].producedQty : 0;

        productDispatches.forEach(disp => {
          let dispRem = disp.qtyDispatched;
          const matchedJobs: typeof productJobs = [];

          while (dispRem > 0 && jobIdx < productJobs.length) {
            const job = productJobs[jobIdx];
            const consume = Math.min(dispRem, jobRem);

            if (consume > 0 && !matchedJobs.some(mj => mj.id === job.id)) {
              matchedJobs.push(job);
            }

            dispRem -= consume;
            jobRem -= consume;

            if (jobRem <= 0) {
              jobIdx++;
              jobRem = productJobs[jobIdx] ? productJobs[jobIdx].producedQty : 0;
            }
          }

          // Compile input material history for mapped production runs
          const runCardNos = matchedJobs.map(mj => mj.jobCardNo).join(', ') || '—';
          const runProducedQty = matchedJobs.reduce((acc, cur) => acc + cur.producedQty, 0);
          const runDates = matchedJobs.map(mj => mj.completedDate ? new Date(mj.completedDate).toLocaleDateString() : '—').join(', ') || '—';

          // Map production runs to printer jobs
          const runPrintJobs = printJobs.filter(pj => pj.productId === prod.id && pj.status === 'COMPLETED');
          const printCardNos = runPrintJobs.map(pj => pj.jobNo).join(', ') || '—';
          const printSheets = runPrintJobs.reduce((acc, cur) => acc + cur.issuedSheets, 0);
          const printVendors = Array.from(new Set(runPrintJobs.map(pj => pj.printer?.vendorName))).join(', ') || '—';

          // Map printing jobs to paper inward purchases
          const matchedDuplexPurchases = duplexPurchases.filter(dp =>
            dp.gsm === prod.cartonTopPaperGsm &&
            dp.size.replace(/\s+/g, '').toLowerCase() === prod.duplexSize?.replace(/\s+/g, '').toLowerCase()
          );
          const duplexSuppliers = Array.from(new Set(matchedDuplexPurchases.map(dp => dp.vendor?.vendorName))).join(', ') || '—';
          const duplexChallans = matchedDuplexPurchases.map(dp => dp.challanNo).join(', ') || '—';

          // Kraft config details
          const kraftConfig = `Top: ${prod.cartonTopPaperType || 'Duplex'}(${prod.cartonTopPaperGsm || 0}G), Fluting: Kraft(${prod.cartonFlutingPaperGsm || 0}G), Back: Kraft(${prod.cartonBackingPaperGsm || 0}G)`;

          rows.push([
            new Date(disp.dispatchDate).toLocaleDateString(),
            disp.invoiceNo || '—',
            disp.challanNo,
            disp.customer?.customerName || '—',
            prod.name,
            disp.qtyDispatched,
            runCardNos,
            runProducedQty,
            runDates,
            printCardNos,
            printSheets,
            printVendors,
            duplexSuppliers,
            duplexChallans,
            kraftConfig
          ]);
        });
      });

      triggerCSVDownload(
        `production_traceability_report_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
      setExportingReportId(null);
    }, 400);
  };

  // 4. Sales & Invoicing Log Report
  const exportSalesLog = () => {
    setExportingReportId('sales');
    setTimeout(() => {
      const headers = [
        'Dispatch Date',
        'Invoice #',
        'Delivery Challan #',
        'Customer Code',
        'Customer Name',
        'Product Name',
        'Ply Type',
        'Qty Dispatched (Cartons)',
        'Transporter Name',
        'Vehicle Number',
        'L.R. Number (Bilty)',
        'Delivery Address',
        'Remarks'
      ];

      const filtered = dispatches.filter(d => {
        if (!isWithinDateRange(d.dispatchDate)) return false;
        if (customerFilter !== 'all' && d.customerId !== customerFilter) return false;
        if (productFilter !== 'all' && d.productId !== productFilter) return false;
        return true;
      });

      const rows = filtered.map(d => [
        new Date(d.dispatchDate).toLocaleDateString(),
        d.invoiceNo || '—',
        d.challanNo,
        d.customer?.customerCode || '—',
        d.customer?.customerName || '—',
        d.product?.name || '—',
        d.product?.plyType === 'THREE_PLY' ? '3-PLY' : '5-PLY',
        d.qtyDispatched,
        d.transporterName || '—',
        d.vehicleNo || '—',
        d.lrNo || '—',
        (d.customer as any)?.shippingAddress || '—',
        ''
      ]);

      triggerCSVDownload(
        `sales_dispatch_log_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
      setExportingReportId(null);
    }, 400);
  };

  // 5. Vendor Inward Purchases Report
  const exportPurchasesReport = () => {
    setExportingReportId('purchases');
    setTimeout(() => {
      const headers = [
        'Purchase Date',
        'Vendor Name',
        'Material Type',
        'Challan/Invoice #',
        'GSM',
        'Size / Roll Size',
        'Quantity (Sheets/Rolls)',
        'Total Weight (Kg)',
        'Rate (INR)',
        'Total Amount (INR)',
        'Delivered To',
        'Remarks'
      ];

      const rows: any[][] = [];

      // Filtered duplex purchases
      duplexPurchases.forEach(p => {
        if (isWithinDateRange(p.purchaseDate)) {
          if (vendorFilter === 'all' || p.vendorId === vendorFilter) {
            rows.push([
              new Date(p.purchaseDate).toLocaleDateString(),
              p.vendor?.vendorName || '—',
              'Duplex Board Sheets',
              p.challanNo,
              p.gsm,
              p.size,
              p.quantitySheets,
              p.weightKg.toFixed(2),
              p.rate.toFixed(2),
              (p.weightKg * p.rate).toFixed(2),
              p.deliveredTo || '—',
              p.remarks || ''
            ]);
          }
        }
      });

      // Filtered kraft purchases
      kraftPurchases.forEach(p => {
        if (isWithinDateRange(p.purchaseDate)) {
          if (vendorFilter === 'all' || p.vendorId === vendorFilter) {
            rows.push([
              new Date(p.purchaseDate).toLocaleDateString(),
              p.vendor?.vendorName || '—',
              'Kraft Paper Rolls',
              p.challanNo || p.invoiceNo || '—',
              p.gsm,
              `${p.rollSize} inch`,
              p.qtyRolls,
              p.weightKg.toFixed(2),
              p.rate.toFixed(2),
              (p.weightKg * p.rate).toFixed(2),
              p.deliveredTo || '—',
              p.remarks || ''
            ]);
          }
        }
      });

      // Sort by date descending
      rows.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

      triggerCSVDownload(
        `vendor_inward_purchases_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
      setExportingReportId(null);
    }, 400);
  };

  // 6. Printer Wastage & Yield Report
  const exportPrinterWastage = () => {
    setExportingReportId('wastage');
    setTimeout(() => {
      const headers = [
        'Job Issue Date',
        'Job Card No',
        'Printer Vendor',
        'Target Product',
        'Board Size',
        'Paper GSM',
        'Issued Sheets',
        'Returned Sheets',
        'Planned Qty (Boxes)',
        'Wastage Sheets',
        'Wastage %',
        'Workflow Status'
      ];

      const filtered = printJobs.filter(j => {
        if (!isWithinDateRange(j.createdAt)) return false;
        if (printerFilter !== 'all' && j.printerId !== printerFilter) return false;
        if (productFilter !== 'all' && j.productId !== productFilter) return false;
        return true;
      });

      const rows = filtered.map(j => {
        const wastage = j.status === 'COMPLETED' ? j.issuedSheets - j.returnedSheets : 0;
        const wastePct = j.status === 'COMPLETED' && j.issuedSheets > 0
          ? ((wastage / j.issuedSheets) * 100).toFixed(2) + '%'
          : '—';

        return [
          new Date(j.createdAt).toLocaleDateString(),
          j.jobNo,
          j.printer?.vendorName || '—',
          j.product?.name || '—',
          j.product?.duplexSize || '—',
          j.product?.cartonTopPaperGsm || '—',
          j.issuedSheets,
          j.status === 'COMPLETED' ? j.returnedSheets : '—',
          j.plannedQty,
          j.status === 'COMPLETED' ? wastage : '—',
          wastePct,
          j.status
        ];
      });

      triggerCSVDownload(
        `printer_wastage_yield_${new Date().toISOString().split('T')[0]}.csv`,
        headers,
        rows
      );
      setExportingReportId(null);
    }, 400);
  };

  const isAnyExporting = exportingReportId !== null;

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div>
        <h2 className="text-lg font-bold text-gray-100 tracking-tight">Business Intelligence & Reports</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Generate exportable spreadsheets for auditing, compliance, and material flow tracking
        </p>
      </div>

      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* FILTER CONTROL CARD PANEL */}
      <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">SET FILTERS FOR EXPORTS BELOW</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
          {/* Start Date */}
          <div>
            <label className={lbl}>START DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inp}
            />
          </div>

          {/* End Date */}
          <div>
            <label className={lbl}>END DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inp}
            />
          </div>

          {/* Customer */}
          <div>
            <label className={lbl}>FILTER CUSTOMER</label>
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className={inp}
            >
              <option value="all">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className={lbl}>FILTER PRODUCT / JOB ITEM</label>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className={inp}
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className={lbl}>FILTER VENDOR</label>
            <select
              value={vendorFilter}
              onChange={e => setVendorFilter(e.target.value)}
              className={inp}
            >
              <option value="all">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.vendorName}</option>
              ))}
            </select>
          </div>

          {/* Printer */}
          <div>
            <label className={lbl}>FILTER PRINTER</label>
            <select
              value={printerFilter}
              onChange={e => setPrinterFilter(e.target.value)}
              className={inp}
            >
              <option value="all">All Printers</option>
              {vendors
                .filter(v => v.suppliedMaterials.includes('Printer'))
                .map(v => (
                  <option key={v.id} value={v.id}>{v.vendorName}</option>
                ))}
            </select>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 font-medium">
          ℹ️ Setting date ranges or selection limits will bound the exported data to avoid very large file generation.
        </p>
      </div>

      {/* REPORT SELECTOR GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Loading reports metadata…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Current Stock Ledger */}
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors bg-[#0e1726]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">CURRENT STOCK LEDGER</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Real-Time Inventory Status</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                Generates a comprehensive snapshot of all active warehouse holdings. Includes raw paper sheets, printed duplex job stocks, ply board bundles, and finished carton batches.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-5">
              <span className="text-[10.5px] font-mono text-gray-500 italic">No filters required</span>
              <button
                onClick={exportStockLedger}
                disabled={isAnyExporting}
                className="px-3.5 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {exportingReportId === 'stock' ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV</>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Material Flow & Ledger */}
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors bg-[#0e1726]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">MATERIAL FLOW & LEDGER</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Stock Movement History</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                Compiles chronological entries of inventory changes including raw acquisitions, printer transfers, material receipts, manufacturing consumption, sales, and manual adjustments.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-5">
              <span className="text-[10.5px] font-mono text-indigo-400 font-bold">Date filters apply</span>
              <button
                onClick={exportMaterialFlow}
                disabled={isAnyExporting}
                className="px-3.5 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {exportingReportId === 'flow' ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV</>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Production Traceability */}
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors bg-[#0e1726]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">PRODUCTION TRACEABILITY</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">End-to-End Box Genealogy</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                Traces sales invoice dispatches backward through manufacturing runs, allocated raw material batches, printer work orders, and source paper vendors. Essential for quality audits.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-5">
              <span className="text-[10.5px] font-mono text-indigo-400 font-bold">Filter by Product / Client</span>
              <button
                onClick={exportTraceabilityReport}
                disabled={isAnyExporting}
                className="px-3.5 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {exportingReportId === 'trace' ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV</>
                )}
              </button>
            </div>
          </div>

          {/* Card 4: Sales & Invoicing Log */}
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors bg-[#0e1726]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6a1 1 0 001-1v-4a1 1 0 00-.81-.68l-3-1a1 1 0 00-1.19.68L13 12M13 16h-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">SALES & INVOICING LOG</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Carton Box Dispatches</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                Compiles dispatch transactions, matching invoice values, customer shipping destinations, transporter billing records, and vehicle logs for external accounting or tax reconciliation.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-5">
              <span className="text-[10.5px] font-mono text-indigo-400 font-bold">All filters apply</span>
              <button
                onClick={exportSalesLog}
                disabled={isAnyExporting}
                className="px-3.5 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {exportingReportId === 'sales' ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV</>
                )}
              </button>
            </div>
          </div>

          {/* Card 5: Vendor Inward Purchases */}
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors bg-[#0e1726]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">VENDOR INWARD PURCHASES</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Duplex & Ply Purchase Logs</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                Compiles raw duplex paper and ply board material inward purchase transactions. Can be filtered by vendor and date range to audit supplier performance and billing.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-5">
              <span className="text-[10.5px] font-mono text-indigo-400 font-bold">Vendor & Date filters apply</span>
              <button
                onClick={exportPurchasesReport}
                disabled={isAnyExporting}
                className="px-3.5 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {exportingReportId === 'purchases' ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV</>
                )}
              </button>
            </div>
          </div>

          {/* Card 6: Printer Wastage & Yield */}
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors bg-[#0e1726]/30">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-200 tracking-wide uppercase">PRINTER WASTAGE & YIELD</h3>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Job Wastage Analysis</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed pt-1">
                Tracks duplex sheet quantity sent versus received at printing vendors. Details wastage percentages and status workflow per job. Filterable by printer and date range.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-5">
              <span className="text-[10.5px] font-mono text-indigo-400 font-bold">Printer & Date filters apply</span>
              <button
                onClick={exportPrinterWastage}
                disabled={isAnyExporting}
                className="px-3.5 py-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                {exportingReportId === 'wastage' ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Exporting</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export CSV</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = 'block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer';
