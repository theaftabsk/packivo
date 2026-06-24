"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<any>("/dashboard/stats");
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load dashboard metrics.");
        // Redirect if auth token is missing or if we get an unauthorized error
        const token = localStorage.getItem("auth_token");
        if (!token || err.message?.toLowerCase().includes("unauthorized") || err.message?.toLowerCase().includes("auth")) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-400">Connecting to PostgreSQL database...</p>
      </div>
    );
  }

  // Extract variables from fetched API data
  const dashboardStats = stats?.stats || {
    rawDuplex: 0,
    printedDuplex: 0,
    threePlyStock: 0,
    fivePlyStock: 0,
    finishedGoods: 0,
    dispatchedThisMonth: 0,
    wastage: 120,
  };

  const lowStockAlerts = stats?.lowStockAlerts || [];
  const recentInwards = stats?.recentInwards || [];
  const recentSales = stats?.recentSales || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-100 tracking-tight">Factory Dashboard Overview</h2>
          <p className="text-xs text-gray-400 mt-1">Real-time carton box manufacturing records, stock levels, and calculations.</p>
        </div>
        <button 
          onClick={async () => {
            setLoading(true);
            try {
              const data = await api.get<any>("/dashboard/stats");
              setStats(data);
            } catch (err: any) {
              setError("Failed to refresh statistics.");
            } finally {
              setLoading(false);
            }
          }}
          className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
          </svg>
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Core Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* RAW DUPLEX */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-sky-400/20 group-hover:text-sky-400/40 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Raw Duplex Paper</div>
          <div className="text-2xl font-bold mt-2 text-sky-400 text-gradient">
            {dashboardStats.rawDuplex.toLocaleString()} <span className="text-xs text-gray-400 font-normal">Shts</span>
          </div>
          <Link href="/dashboard/duplex/purchases" className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-medium hover:underline mt-4">
            View purchases &rarr;
          </Link>
        </div>

        {/* PRINTED DUPLEX */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-emerald-400/20 group-hover:text-emerald-400/40 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Printed Duplex</div>
          <div className="text-2xl font-bold mt-2 text-emerald-400 text-gradient">
            {dashboardStats.printedDuplex.toLocaleString()} <span className="text-xs text-gray-400 font-normal">Shts</span>
          </div>
          <Link href="/dashboard/duplex/printed-stock" className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium hover:underline mt-4">
            View stock &rarr;
          </Link>
        </div>

        {/* 3-PLY BOARD */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-amber-500/20 group-hover:text-amber-500/40 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
            </svg>
          </div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">3-Ply Stock</div>
          <div className="text-2xl font-bold mt-2 text-amber-500 text-gradient">
            {dashboardStats.threePlyStock.toLocaleString()} <span className="text-xs text-gray-400 font-normal">Boards</span>
          </div>
          <Link href="/dashboard/kraft/calculations" className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium hover:underline mt-4">
            Ply calculator &rarr;
          </Link>
        </div>

        {/* 5-PLY BOARD */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-purple-500/20 group-hover:text-purple-500/40 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
            </svg>
          </div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">5-Ply Stock</div>
          <div className="text-2xl font-bold mt-2 text-purple-400 text-gradient">
            {dashboardStats.fivePlyStock.toLocaleString()} <span className="text-xs text-gray-400 font-normal">Boards</span>
          </div>
          <Link href="/dashboard/production/planning" className="inline-flex items-center gap-1 text-[10px] text-purple-400 font-medium hover:underline mt-4">
            Planning &rarr;
          </Link>
        </div>

        {/* FINISHED GOODS */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-red-500/20 group-hover:text-red-500/40 transition-colors">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Finished Goods</div>
          <div className="text-2xl font-bold mt-2 text-red-400 text-gradient">
            {dashboardStats.finishedGoods.toLocaleString()} <span className="text-xs text-gray-400 font-normal">Boxes</span>
          </div>
          <Link href="/dashboard/production/finished-goods" className="inline-flex items-center gap-1 text-[10px] text-red-400 font-medium hover:underline mt-4">
            View stock &rarr;
          </Link>
        </div>
      </div>

      {/* Sub Stat Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/15">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6a1 1 0 001-1v-4a1 1 0 00-.81-.68l-3-1a1 1 0 00-1.19.68L13 12M13 16h-4" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Dispatched This Month</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Total carton boxes delivered out of inventory</div>
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-400 text-gradient">
            {dashboardStats.dispatchedThisMonth.toLocaleString()}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-400 border border-red-500/15">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">Wastage This Month</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Duplex paper sheets and production cuts scrap</div>
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400 text-gradient">
            {dashboardStats.wastage.toLocaleString()} <span className="text-xs text-gray-400">sheets</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-amber-500 flex items-center gap-2 tracking-wide uppercase">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Low Stock Product Alerts
        </h3>
        {lowStockAlerts.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No low-stock carton product warnings at this time.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {lowStockAlerts.map((item: any, idx: number) => (
              <div key={idx} className={`border rounded-lg p-3 flex items-center justify-between ${item.color}`}>
                <div className="text-xs font-medium truncate pr-4">{item.name}</div>
                <div className="text-xs font-bold shrink-0">{item.stock} left</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inwards & Sales Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Inwards */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-sky-400 flex items-center gap-2 tracking-wide uppercase">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Recent Raw Materials Inward
            </h3>
            <Link href="/dashboard/duplex/purchases" className="text-[10px] text-gray-400 hover:text-indigo-400 font-semibold uppercase tracking-wider">Purchases &rarr;</Link>
          </div>
          <div className="border border-white/5 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/20 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3">Item Spec</th>
                  <th className="p-3">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentInwards.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500 italic">No recent inward entries found.</td>
                  </tr>
                ) : (
                  recentInwards.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="p-3 text-gray-400">{item.date}</td>
                      <td className="p-3 font-medium text-gray-200">{item.vendor}</td>
                      <td className="p-3 text-gray-300">{item.item}</td>
                      <td className="p-3 text-sky-400 font-semibold">{item.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Dispatch Sales */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-2 tracking-wide uppercase">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Dispatch & Invoice logs
            </h3>
            <Link href="/dashboard/sales/dispatch" className="text-[10px] text-gray-400 hover:text-indigo-400 font-semibold uppercase tracking-wider">Logistics &rarr;</Link>
          </div>
          <div className="border border-white/5 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/20 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500 italic">No recent sales invoices found.</td>
                  </tr>
                ) : (
                  recentSales.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="p-3 text-gray-400">{item.date}</td>
                      <td className="p-3 font-mono text-gray-300">{item.invoice}</td>
                      <td className="p-3 font-medium text-gray-200">{item.customer}</td>
                      <td className="p-3 text-gray-300">{item.product}</td>
                      <td className="p-3 text-emerald-400 font-semibold">{item.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
