"use client";

import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function SuperAdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("superadmin@packivo.com");
  const [password, setPassword] = useState("admin123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Sync token from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("super_admin_token");
      setToken(storedToken);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid login credentials.");
      }

      if (data.user.role !== "SUPER_ADMIN") {
        throw new Error("Access denied. You do not have Super Admin privileges.");
      }

      localStorage.setItem("super_admin_token", data.access_token);
      setToken(data.access_token);
    } catch (err: any) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>("/tenants");
      setTenants(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve tenants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTenants();
    }
  }, [token]);

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this subscription?")) return;
    try {
      await api.post(`/tenants/${id}/approve-subscription`);
      fetchTenants();
    } catch (err: any) {
      alert(err.message || "Failed to approve subscription.");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.post(`/tenants/${id}/toggle-status`);
      fetchTenants();
    } catch (err: any) {
      alert(err.message || "Failed to update tenant status.");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("super_admin_token");
    setToken(null);
    setTenants([]);
  };

  // Helper selectors
  const totalActive = tenants.filter(t => t.status === "ACTIVE" && t.subscriptionStatus !== "TRIAL").length;
  const totalTrials = tenants.filter(t => t.status === "ACTIVE" && t.subscriptionStatus === "TRIAL").length;
  const pendingApprovals = tenants.filter(t => t.subscriptionStatus === "PENDING_APPROVAL");
  const suspendedCount = tenants.filter(t => t.status === "SUSPENDED").length;

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If not authenticated, show login page
  if (!token) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl"></div>

        <div className="w-full max-w-md glass-card rounded-2xl p-8 relative z-10 space-y-6 shadow-2xl border border-white/5">
          <div className="text-center space-y-2">
            <div className="inline-block bg-indigo-600 text-white font-extrabold px-3 py-1 text-xs tracking-widest rounded-sm uppercase">
              SaaS Owner Panel
            </div>
            <h2 className="text-xl font-bold tracking-tight text-gray-100 mt-4">Sign In</h2>
            <p className="text-xs text-gray-400">Global SaaS Control Center</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@packivo.com"
                className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider transition-colors shadow-lg cursor-pointer"
            >
              {loginLoading ? "AUTHENTICATING..." : "SIGN IN"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#090d16] text-[#f3f4f6] font-sans antialiased">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0e1626] border-r border-white/5 flex flex-col justify-between shrink-0">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="p-5 flex items-center gap-3 border-b border-white/5 bg-[#0a0f1b]">
            <div className="bg-indigo-600 px-3 py-1.5 rounded-md font-bold text-sm tracking-wider uppercase border border-indigo-400/30">
              SaaS Owner Panel
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-600/10 text-indigo-400 font-medium text-sm border border-indigo-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Dashboard Control
            </a>
          </nav>
        </div>

        {/* Admin Card */}
        <div className="p-4 border-t border-white/5 bg-black/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
              G
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-200">SaaS Global Owner</div>
              <div className="text-[10px] text-gray-400">admin@gigani-erp.com</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs py-1.5 rounded border border-red-500/10 cursor-pointer text-center font-medium uppercase tracking-wider"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-16 bg-[#0e1626] border-b border-white/5 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold tracking-wide text-gray-100">SaaS Global Control Center</h1>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
              Super Admin View
            </span>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-5 relative overflow-hidden">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Paid Tenants</div>
              <div className="text-3xl font-bold mt-2 text-gray-100">{totalActive}</div>
            </div>

            <div className="glass-card rounded-xl p-5 relative overflow-hidden">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Trial Accounts</div>
              <div className="text-3xl font-bold mt-2 text-amber-500">{totalTrials}</div>
            </div>

            <div className="glass-card rounded-xl p-5 relative overflow-hidden">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Approvals</div>
              <div className="text-3xl font-bold mt-2 text-indigo-400">{pendingApprovals.length}</div>
            </div>

            <div className="glass-card rounded-xl p-5 relative overflow-hidden">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suspended Factories</div>
              <div className="text-3xl font-bold mt-2 text-rose-500">{suspendedCount}</div>
            </div>
          </div>

          {/* Pending manual payments screenshots */}
          {pendingApprovals.length > 0 && (
            <div className="glass-card rounded-xl p-5 space-y-4 border border-indigo-500/20">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                Pending Payment Screenshot Approvals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map((tenant: any) => {
                  const payment = tenant.subscriptions?.[0]?.payments?.[0];
                  const plan = tenant.subscriptions?.[0]?.plan;
                  return (
                    <div key={tenant.id} className="border border-white/5 rounded-xl bg-black/20 p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1 text-xs">
                        <p className="text-sm font-bold text-gray-200">{tenant.name}</p>
                        <p className="text-gray-450 text-gray-400">Plan Selected: <span className="text-gray-200 font-semibold">{plan?.name || "STARTER"} (₹{plan?.price || "2,999"})</span></p>
                        <p className="text-gray-450 text-gray-400">Transaction ID: <span className="text-indigo-400 font-mono font-semibold">{payment?.transactionId || "N/A"}</span></p>
                        <p className="text-gray-450 text-gray-400">Submitted: {payment?.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "N/A"}</p>
                      </div>

                      {payment?.screenshot && (
                        <div className="relative border border-white/5 rounded-lg overflow-hidden bg-black/40 h-28 flex items-center justify-center cursor-zoom-in" onClick={() => setSelectedScreenshot(payment.screenshot)}>
                          <img src={payment.screenshot} alt="Receipt" className="max-h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-xs text-white font-medium transition-opacity">
                            Click to Expand Receipt
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(tenant.id)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded text-xs tracking-wider uppercase cursor-pointer"
                        >
                          Approve Plan
                        </button>
                        <button
                          onClick={() => handleToggleStatus(tenant.id)}
                          className="px-3 bg-red-950/30 hover:bg-red-950/50 text-red-400 font-medium py-2 rounded text-xs uppercase cursor-pointer border border-red-500/10"
                        >
                          Suspend
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tenants Ledger */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">Registered Factory Tenants Ledger</h3>
              <input
                type="text"
                placeholder="Filter by factory name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 w-full md:w-64"
              />
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-gray-500">Loading factories ledger...</p>
              </div>
            ) : error ? (
              <p className="text-xs text-red-400 text-center py-4">{error}</p>
            ) : filteredTenants.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No factory tenants found matching filters.</p>
            ) : (
              <div className="border border-white/5 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-gray-400 border-b border-white/5 font-semibold">
                      <th className="p-3">Company Name</th>
                      <th className="p-3">Admin Email</th>
                      <th className="p-3">Plan Status</th>
                      <th className="p-3">Trial Expiry</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3 text-right">System Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map((tenant, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold text-gray-200">
                          {tenant.name}
                          <span className="block text-[10px] text-indigo-400 font-mono mt-0.5">{tenant.id}</span>
                        </td>
                        <td className="p-3 text-gray-300">{tenant.users?.[0]?.email || "No Admin User"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tenant.subscriptionStatus === "TRIAL" ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
                          }`}>
                            {tenant.subscriptionStatus}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400">
                          {tenant.trialEnd ? new Date(tenant.trialEnd).toLocaleDateString() : "N/A"}
                          {tenant.trialEnd && new Date() > new Date(tenant.trialEnd) && tenant.subscriptionStatus === "TRIAL" && (
                            <span className="ml-2 text-[9px] text-red-400 font-semibold bg-red-500/5 px-1 rounded">Expired</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                            tenant.emailVerified
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                              : "bg-red-500/10 text-red-400 border-red-500/15"
                          }`}>
                            {tenant.emailVerified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleToggleStatus(tenant.id)}
                            className={`px-3 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer border ${
                              tenant.status === "ACTIVE"
                                ? "bg-red-950/20 hover:bg-red-950/40 text-red-400 border-red-500/10"
                                : "bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border-emerald-500/10"
                            }`}
                          >
                            {tenant.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* LIGHTBOX FOR SCREENSHOT VIEW */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[9999] cursor-zoom-out" onClick={() => setSelectedScreenshot(null)}>
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-xl bg-[#090d16] border border-white/10 p-2 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
            <img src={selectedScreenshot} alt="Receipt Expanded" className="max-h-[80vh] object-contain" />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="mt-2 text-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold uppercase py-1 cursor-pointer"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

