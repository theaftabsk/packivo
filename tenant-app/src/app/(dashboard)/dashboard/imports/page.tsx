'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface ImportBatchLog {
  id: string;
  userId: string;
  action: string;
  details: string; // JSON: { batchId, module, recordIds, recordCount }
  timestamp: string;
}

interface DBField {
  key: string;
  label: string;
  required: boolean;
}

const MODULE_FIELDS: Record<string, DBField[]> = {
  vendor: [
    { key: 'vendorName', label: 'Vendor Name', required: true },
    { key: 'vendorCode', label: 'Vendor Code', required: true },
    { key: 'contactPerson', label: 'Contact Person', required: false },
    { key: 'mobile', label: 'Mobile Number', required: false },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'gstNumber', label: 'GST Number', required: false },
    { key: 'suppliedMaterials', label: 'Supplied Materials (comma separated)', required: false },
    { key: 'remarks', label: 'Remarks', required: false },
  ],
  customer: [
    { key: 'customerName', label: 'Customer Name', required: true },
    { key: 'customerCode', label: 'Customer Code', required: true },
    { key: 'contactPerson', label: 'Contact Person', required: false },
    { key: 'mobile', label: 'Mobile Number', required: false },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'gstNumber', label: 'GST Number', required: false },
    { key: 'billingAddress', label: 'Billing Address', required: false },
    { key: 'shippingAddress', label: 'Shipping Address', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'state', label: 'State', required: false },
    { key: 'remarks', label: 'Remarks', required: false },
  ],
  product: [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'customerName', label: 'Customer Name / Code', required: true },
    { key: 'boxSizeLength', label: 'Length (Inches/mm)', required: true },
    { key: 'boxSizeWidth', label: 'Width (Inches/mm)', required: true },
    { key: 'boxSizeHeight', label: 'Height (Inches/mm)', required: true },
    { key: 'duplexSize', label: 'Duplex Size (e.g. 36x25)', required: true },
    { key: 'kraftSize', label: 'Kraft Size (e.g. 34x24)', required: true },
    { key: 'plyType', label: 'Ply Type (3-ply / 5-ply)', required: true },
    { key: 'printingMode', label: 'Printing Mode (Offset/Screen/Flexo)', required: false },
    { key: 'colorCount', label: 'Color Count', required: false },
    { key: 'finishType', label: 'Finish Type (Gloss/Matt/UV)', required: false },
    { key: 'ups', label: 'Units Per Sheet (Ups)', required: false },
    { key: 'hasPartition', label: 'Has Partition (true/false)', required: false },
    { key: 'remarks', label: 'Remarks', required: false },
  ],
  duplexPurchase: [
    { key: 'vendorName', label: 'Vendor Name / Code', required: true },
    { key: 'challanNo', label: 'Delivery Challan #', required: true },
    { key: 'gsm', label: 'Paper GSM', required: true },
    { key: 'size', label: 'Paper Size (e.g. 34x25)', required: true },
    { key: 'quantitySheets', label: 'Quantity (Sheets)', required: true },
    { key: 'weightKg', label: 'Weight (Kg)', required: true },
    { key: 'rate', label: 'Rate (Per Sheet/Kg)', required: true },
    { key: 'purchaseDate', label: 'Purchase Date (YYYY-MM-DD)', required: false },
    { key: 'deliveredTo', label: 'Delivered To Branch', required: false },
    { key: 'remarks', label: 'Remarks', required: false },
  ],
  plyPurchase: [
    { key: 'vendorName', label: 'Vendor Name / Code', required: true },
    { key: 'rollSize', label: 'Roll Size (Inches/cm)', required: true },
    { key: 'gsm', label: 'Paper GSM', required: true },
    { key: 'weightKg', label: 'Weight (Kg)', required: true },
    { key: 'rate', label: 'Rate (Per Kg)', required: true },
    { key: 'challanNo', label: 'Challan Number', required: false },
    { key: 'invoiceNo', label: 'Invoice Number', required: false },
    { key: 'deliveredTo', label: 'Delivered To Branch', required: false },
    { key: 'paperType', label: 'Paper Type (Natural/Golden)', required: false },
    { key: 'qtyRolls', label: 'Quantity of Rolls', required: false },
    { key: 'purchaseDate', label: 'Purchase Date (YYYY-MM-DD)', required: false },
    { key: 'remarks', label: 'Remarks', required: false },
  ],
  dispatch: [
    { key: 'challanNo', label: 'Delivery Challan #', required: true },
    { key: 'customerName', label: 'Customer Name / Code', required: true },
    { key: 'productName', label: 'Product Name', required: true },
    { key: 'qtyDispatched', label: 'Quantity (Cartons)', required: true },
    { key: 'invoiceNo', label: 'Invoice Number', required: false },
    { key: 'vehicleNo', label: 'Vehicle Number', required: false },
    { key: 'lrNo', label: 'L.R. Number (Bilty)', required: false },
    { key: 'transporterName', label: 'Transporter Name', required: false },
    { key: 'dispatchDate', label: 'Dispatch Date (YYYY-MM-DD)', required: false },
  ],
};

const MODULE_NAMES: Record<string, string> = {
  vendor: 'Vendor Master',
  customer: 'Customer Master',
  product: 'Product Master',
  duplexPurchase: 'Duplex Purchases',
  plyPurchase: 'Ply Purchases',
  dispatch: 'Sales Dispatches',
};

export default function ExcelImportsPage() {
  const [history, setHistory] = useState<ImportBatchLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pageErr, setPageErr] = useState('');

  // Form selections
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV parsing & mapping state
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // dbFieldKey -> csvHeader

  // Execution states
  const [processing, setProcessing] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rollbackLogId, setRollbackLogId] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setPageErr('');
    try {
      const logs = await api.get<ImportBatchLog[]>('/imports/history');
      setHistory(Array.isArray(logs) ? logs : []);
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to load import transaction history.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setFormErr('File size exceeds the 4MB limit.');
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setFormErr('');
      }
    }
  };

  // Safe manual CSV parser to avoid PapaParse dependency issues
  const parseCSVText = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    return lines
      .map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      })
      .filter(row => row.some(cell => cell.length > 0));
  };

  const handleParseHeaders = () => {
    if (!selectedModule) { setFormErr('Please select a target import module.'); return; }
    if (!selectedFile) { setFormErr('Please select a CSV file to upload.'); return; }

    setFormErr('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVText(text);

      if (rows.length < 2) {
        setFormErr('The selected CSV file does not contain enough data (headers + rows required).');
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      setCsvHeaders(headers);
      setCsvRows(dataRows);

      // Perform auto-mapping (match header names to DB fields case-insensitively)
      const autoMap: Record<string, string> = {};
      const fields = MODULE_FIELDS[selectedModule];

      fields.forEach(field => {
        const cleanKey = field.key.toLowerCase();
        const cleanLabel = field.label.toLowerCase();

        // Check exact match or containing label match
        const matchedHeader = headers.find(h => {
          const cleanH = h.toLowerCase().replace(/[\s_-]/g, '');
          return (
            cleanH === cleanKey ||
            cleanH === cleanLabel.replace(/[\s_-]/g, '') ||
            cleanLabel.includes(cleanH) ||
            cleanH.includes(cleanKey)
          );
        });

        if (matchedHeader) {
          autoMap[field.key] = matchedHeader;
        } else {
          autoMap[field.key] = '';
        }
      });

      setMappings(autoMap);
      setIsMappingMode(true);
    };

    reader.readAsText(selectedFile);
  };

  const handleMappingChange = (dbKey: string, csvHeader: string) => {
    setMappings(prev => ({
      ...prev,
      [dbKey]: csvHeader,
    }));
  };

  const handleImport = async () => {
    // Check required fields
    const fields = MODULE_FIELDS[selectedModule];
    for (const f of fields) {
      if (f.required && !mappings[f.key]) {
        setFormErr(`Database field '${f.label}' is required. Please map it to a CSV header.`);
        return;
      }
    }

    setProcessing(true);
    setFormErr('');
    setSuccessMsg('');

    // Construct JSON items
    const items = csvRows.map(row => {
      const item: Record<string, any> = {};
      fields.forEach(f => {
        const csvHeader = mappings[f.key];
        if (csvHeader) {
          const headerIdx = csvHeaders.indexOf(csvHeader);
          if (headerIdx !== -1) {
            item[f.key] = row[headerIdx];
          }
        }
      });
      return item;
    });

    const batchId = `IMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id || 'sys';

      const response = await api.post<{ recordCount: number; batchId: string }>(
        `/imports/upload/${selectedModule}`,
        {
          userId,
          batchId,
          items,
        }
      );

      setSuccessMsg(`Successfully imported ${response.recordCount} records (Batch: ${response.batchId})`);
      setIsMappingMode(false);
      setSelectedFile(null);
      setSelectedModule('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadHistory();
    } catch (e: any) {
      setFormErr(e?.message || 'Inward import failed. Please verify column values and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const confirmRollback = async () => {
    if (!rollbackLogId) return;
    setRollingBack(true);
    setFormErr('');
    setSuccessMsg('');

    try {
      const res = await api.post<{ count: number }>(`/imports/rollback/${rollbackLogId}`, {});
      setSuccessMsg(`Successfully rolled back import batch and deleted ${res.count} associated records.`);
      setRollbackLogId(null);
      loadHistory();
    } catch (e: any) {
      setPageErr(e?.message || 'Failed to rollback import batch.');
    } finally {
      setRollingBack(false);
    }
  };

  const getLogDetails = (log: ImportBatchLog) => {
    try {
      const details = JSON.parse(log.details);
      return {
        batchId: details.batchId || '—',
        module: MODULE_NAMES[details.module] || details.module || '—',
        recordCount: details.recordCount || 0,
      };
    } catch (e) {
      return { batchId: '—', module: '—', recordCount: 0 };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div>
        <h2 className="text-lg font-bold text-gray-100 tracking-tight">Excel / CSV Import Center</h2>
        <p className="text-xs text-gray-500 mt-0.5">Bulk ingest master datasets and purchase ledgers with transaction rollback support</p>
      </div>

      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2.5 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: UPLOAD NEW DATA */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card rounded-xl p-5 border border-white/5 bg-[#0e1726]/30 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">UPLOAD NEW DATA</span>
            </div>

            {formErr && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-3 py-2 rounded-lg flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formErr}
              </div>
            )}

            {!isMappingMode ? (
              <div className="space-y-4 text-xs">
                {/* Select module dropdown */}
                <div>
                  <label className={lbl}>SELECT IMPORT MODULE *</label>
                  <select
                    value={selectedModule}
                    onChange={e => { setSelectedModule(e.target.value); setFormErr(''); }}
                    className={inp}
                  >
                    <option value="">-- Select Target --</option>
                    <option value="vendor">Vendor Master</option>
                    <option value="customer">Customer Master</option>
                    <option value="product">Product Master</option>
                    <option value="duplexPurchase">Duplex Purchases</option>
                    <option value="plyPurchase">Ply Purchases</option>
                    <option value="dispatch">Sales Dispatches</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">Specify which database table you wish to insert records into.</p>
                </div>

                {/* Drag / Drop file dropzone */}
                <div>
                  <label className={lbl}>SELECT CSV / EXCEL FILE *</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/5 hover:border-indigo-500/30 rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 bg-black/15 hover:bg-black/25 transition-all cursor-pointer group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv"
                      className="hidden"
                    />
                    <svg className="w-7 h-7 text-gray-600 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <div className="text-center">
                      {selectedFile ? (
                        <p className="text-gray-300 font-semibold font-mono text-[11px] truncate max-w-[200px]">
                          {selectedFile.name}
                        </p>
                      ) : (
                        <p className="text-gray-400 group-hover:text-gray-300 transition-colors font-medium">
                          Click to select a CSV file
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-0.5 font-medium">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'CSV or Excel formats only (Max 4MB)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parse Headers Button */}
                <button
                  type="button"
                  onClick={handleParseHeaders}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Parse Headers & Map Columns
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs animate-fadeIn">
                {/* Back Link */}
                <button
                  type="button"
                  onClick={() => setIsMappingMode(false)}
                  className="text-gray-500 hover:text-indigo-400 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  &larr; Reselect File
                </button>

                {/* Active settings headers box */}
                <div className="border border-indigo-500/10 rounded-xl p-3 bg-indigo-500/[0.02] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">MAPPING SCHEMATIC</span>
                    <span className="text-[9.5px] font-bold text-gray-500 uppercase font-mono">
                      Module: {MODULE_NAMES[selectedModule]}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">Map the database fields on the left to your CSV column headers.</p>
                </div>

                {/* Mapping Controls Grid */}
                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {MODULE_FIELDS[selectedModule].map(field => (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-300">
                          {field.label} {field.required && <span className="text-red-400 font-bold">*</span>}
                        </span>
                      </div>
                      <select
                        value={mappings[field.key] || ''}
                        onChange={e => handleMappingChange(field.key, e.target.value)}
                        className="w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        <option value="">-- Skip Field --</option>
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Import Buttons */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsMappingMode(false)}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={processing}
                    className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {processing ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ingesting...</>
                    ) : (
                      'Upload & Import Data'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: IMPORT HISTORY & ROLLBACK LEDGER */}
        <div className="lg:col-span-7">
          <div className="glass-card rounded-xl p-5 border border-white/5 bg-[#0e1726]/30 flex flex-col justify-between h-full min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">IMPORT HISTORY & ROLLBACK LEDGER</span>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed leading-5">
                All import batches are logged as database transaction snapshots. If you mapped columns incorrectly or uploaded duplicate data, click <strong className="text-red-400">Rollback</strong> to remove all records associated with that batch.
              </p>

              {/* Batches Table */}
              <div className="border border-white/5 rounded-xl overflow-hidden mt-2 bg-black/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/25 border-b border-white/5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="px-4 py-2.5">BATCH ID / TOKEN</th>
                        <th className="px-4 py-2.5">IMPORT DATE / TIME</th>
                        <th className="px-4 py-2.5 text-center">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {loadingHistory ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-gray-500 font-medium">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                              <span>Loading import history…</span>
                            </div>
                          </td>
                        </tr>
                      ) : history.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span className="font-semibold text-gray-600">No import batches found in audit logs.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        history.map(log => {
                          const details = getLogDetails(log);
                          return (
                            <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                              {/* Token */}
                              <td className="px-4 py-3 font-mono font-bold text-gray-200">
                                <div className="text-[11.5px] text-gray-200 font-bold">{details.batchId}</div>
                                <div className="text-[9.5px] text-gray-500 font-normal mt-0.5">
                                  Module: <span className="font-semibold text-indigo-400">{details.module}</span> | Count: <span className="font-semibold text-emerald-400">{details.recordCount}</span>
                                </div>
                              </td>
                              {/* Import Date */}
                              <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">
                                {new Date(log.timestamp).toLocaleString(undefined, {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setRollbackLogId(log.id)}
                                  disabled={processing || rollingBack}
                                  className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-500 text-red-400 hover:text-white font-bold rounded text-[10px] transition-all cursor-pointer disabled:opacity-40"
                                >
                                  Rollback
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-gray-500 font-semibold py-2 text-right border-t border-white/5 mt-5">
              TOTAL BATCHES LOGGED: {history.length}
            </div>
          </div>
        </div>

      </div>
      {/* Rollback confirmation modal */}
      <ConfirmModal
        isOpen={rollbackLogId !== null}
        title="Rollback Import Batch"
        message="Are you absolutely sure you want to rollback this import batch? This will permanently delete all ingested records and revert inventory stock updates."
        loading={rollingBack}
        onConfirm={confirmRollback}
        onCancel={() => setRollbackLogId(null)}
      />
    </div>
  );
}

const lbl = 'block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer';
