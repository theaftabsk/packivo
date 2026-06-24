"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../../../../lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { Pagination } from "@/components/ui/Pagination";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Inspection Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        actionFilter,
      });
      const res: any = await api.get(`/audit-logs?${q.toString()}`);
      if (res && res.success) {
        setLogs(res.data || []);
        setMeta(res.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setLogs(Array.isArray(res) ? res : []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load audit trail logs.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter]);

  const filteredLogs = logs;

  const getActionBadgeClasses = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
      case "UPDATE":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/15";
      case "DELETE":
        return "bg-red-500/10 text-red-400 border border-red-500/15";
      case "FINISHED_GOODS_ADJUST":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/15";
      case "IMPORT_BATCH":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/15";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/15";
    }
  };

  const formatActionName = (action: string) => {
    if (action === "FINISHED_GOODS_ADJUST") return "ADJUST STOCK";
    if (action === "IMPORT_BATCH") return "IMPORT BATCH";
    return action;
  };

  const getTableName = (log: any) => {
    try {
      const details = JSON.parse(log.details);
      if (details.tableName) return details.tableName;
      if (log.action === "FINISHED_GOODS_ADJUST") return "finished_goods_stock";
      if (log.action === "IMPORT_BATCH") return `imported_${details.module || "data"}`;
    } catch (e) {}
    return "unknown";
  };

  const getRecordId = (log: any) => {
    try {
      const details = JSON.parse(log.details);
      if (details.recordId) return details.recordId;
      if (details.productId) return details.productId.substring(0, 8) + "...";
      if (details.batchId) return details.batchId;
    } catch (e) {}
    return "—";
  };

  const openInspectionModal = (log: any) => {
    try {
      const parsedDetails = JSON.parse(log.details);
      setSelectedLog({
        ...log,
        parsedDetails,
      });
      setModalOpen(true);
    } catch (e) {
      setSelectedLog({
        ...log,
        parsedDetails: { raw: log.details },
      });
      setModalOpen(true);
    }
  };

  // Helper to format values for inspection
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-gray-500 italic">null</span>;
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-100">Security & Operations Audit Trail</h2>
          <p className="text-xs text-gray-400 mt-1">
            Track database writes, operator actions, material purchases, and system modifications within your workspace.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors border border-white/5 cursor-pointer shadow flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
          </svg>
          Refresh Logs
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0c1322] border border-white/5 p-4 rounded-xl">
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, table, user email or name..."
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="ADJUST">STOCK ADJUST</option>
            <option value="IMPORT">EXCEL IMPORT</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="glass-card rounded-xl p-6 border border-white/5 space-y-4 shadow-xl">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">Loading audit trail records...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl">
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-12">No audit log entries matching filters found.</p>
        ) : (
          <div className="border border-white/5 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/25 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Table Name</th>
                  <th className="p-3.5">Record ID</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    {/* Timestamp */}
                    <td className="p-3.5 text-gray-300 font-mono">
                      {new Date(log.timestamp).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })} {new Date(log.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </td>

                    {/* User */}
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-250 text-gray-200">{log.user?.name || "System"}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{log.user?.email || "system_daemon"}</div>
                    </td>

                    {/* Action */}
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getActionBadgeClasses(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>

                    {/* Table Name */}
                    <td className="p-3.5 font-mono text-gray-300">{getTableName(log)}</td>

                    {/* Record ID */}
                    <td className="p-3.5 font-mono text-gray-400 select-all">{getRecordId(log)}</td>

                    {/* Details Link */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openInspectionModal(log)}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline text-[11px] font-semibold cursor-pointer"
                      >
                        Inspect Values
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      {/* INSPECT VALUES MODAL */}
      {modalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-2xl glass-card rounded-2xl p-6 border border-white/10 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                Audit Log Value Inspection
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Log Metadata block */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-black/20 p-3.5 rounded-lg text-xs border border-white/5">
              <div>
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold">Timestamp:</span>
                <span className="text-gray-300 font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold">Action:</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getActionBadgeClasses(selectedLog.action)}`}>
                  {formatActionName(selectedLog.action)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold">Table:</span>
                <span className="text-gray-300 font-mono font-semibold">{getTableName(selectedLog)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold">Record ID:</span>
                <span className="text-gray-400 font-mono text-[11px] truncate block" title={getRecordId(selectedLog)}>
                  {getRecordId(selectedLog)}
                </span>
              </div>
            </div>

            {/* Old vs New Values changes visualization */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Modified Properties Detail:</h4>

              {/* Side-by-side or structured grid of changes */}
              <div className="max-h-[350px] overflow-y-auto border border-white/5 rounded-lg divide-y divide-white/5 bg-[#070b13]">
                {/* Check if details contains classic oldValues & newValues structure */}
                {selectedLog.parsedDetails &&
                (selectedLog.parsedDetails.oldValues !== undefined ||
                  selectedLog.parsedDetails.newValues !== undefined) ? (
                  (() => {
                    const oldObj = selectedLog.parsedDetails.oldValues || {};
                    const newObj = selectedLog.parsedDetails.newValues || {};
                    const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

                    if (keys.length === 0) {
                      return <p className="text-xs text-gray-500 p-4 text-center">No structural properties logged.</p>;
                    }

                    return keys.map((key) => {
                      const oldVal = oldObj[key];
                      const newVal = newObj[key];
                      const isChanged = oldVal !== newVal;

                      return (
                        <div key={key} className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          {/* Property key */}
                          <div className="font-semibold text-gray-300 font-mono flex items-center">
                            {key}
                            {isChanged && selectedLog.action === "UPDATE" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-2 animate-pulse" title="Changed"></span>
                            )}
                          </div>

                          {/* Old value box */}
                          <div className="p-2 rounded bg-red-950/20 border border-red-900/10 text-red-300 min-h-[30px] font-mono break-all">
                            <span className="text-[9px] text-red-500 font-semibold block uppercase tracking-wider mb-0.5">Before:</span>
                            {renderValue(oldVal)}
                          </div>

                          {/* New value box */}
                          <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/10 text-emerald-300 min-h-[30px] font-mono break-all">
                            <span className="text-[9px] text-emerald-500 font-semibold block uppercase tracking-wider mb-0.5">After:</span>
                            {renderValue(newVal)}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  /* Fallback to raw JSON log format */
                  <div className="p-4">
                    <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold mb-2">Raw payload trace:</span>
                    <pre className="text-xs text-gray-300 font-mono bg-black/40 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.parsedDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors shadow-lg cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
