"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "../../../lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };



  // Theme State
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(savedTheme);
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
  };

  const [userName, setUserName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");
  const [tenantName, setTenantName] = useState("Packivo");

  // Profile and Trial Block checks
  const [profileLoading, setProfileLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Manual payment form states
  const [selectedPlan, setSelectedPlan] = useState("STARTER");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const userProfile = await api.get<any>("/auth/me");
      setCurrentUser(userProfile);
      setTenantInfo(userProfile.tenant);
      
      // Update local storage names
      localStorage.setItem("user_name", userProfile.name);
      localStorage.setItem("user_email", userProfile.email);
      localStorage.setItem("tenant_name", userProfile.tenant.name);
      setUserName(userProfile.name);
      setUserEmail(userProfile.email);
      setTenantName(userProfile.tenant.name);
      setProfileLoading(false);
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
    }
    fetchProfile();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmittingPayment(true);

    if (!screenshotBase64) {
      setSubmitError("Please upload a payment screenshot receipt.");
      setSubmittingPayment(false);
      return;
    }

    try {
      await api.post("/billing/submit-manual-payment", {
        planId: selectedPlan,
        transactionId,
        screenshot: screenshotBase64,
      });
      // Re-fetch profile to refresh tenant subscriptionStatus to PENDING_APPROVAL
      await fetchProfile();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit payment receipt. Please try again.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === "Loading...") return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0][0] || "U").toUpperCase();
  };

  const initials = getInitials(userName);

  // Sidebar dropdown states
  const [masterDataOpen, setMasterDataOpen] = useState(true);
  const [duplexOpen, setDuplexOpen] = useState(true);
  const [kraftOpen, setKraftOpen] = useState(true);
  const [productionOpen, setProductionOpen] = useState(true);
  const [salesOpen, setSalesOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  // Notification / Profile dropdown states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const isActive = (path: string) => {
    return pathname === path 
      ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_12px_rgba(99,102,241,0.25)] scale-[1.01]" 
      : "text-gray-400 hover:text-gray-200 hover:bg-white/5 hover:border-white/5 border border-transparent transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]";
  };

  const isSubActive = (path: string) => {
    return pathname === path 
      ? "text-emerald-400 font-medium flex items-center gap-2 transition-all duration-200" 
      : "text-gray-400 hover:text-gray-200 flex items-center gap-2 transition-all duration-200 hover:translate-x-1";
  };

  const isParentActive = (paths: string[]) => {
    return paths.some(p => pathname.startsWith(p))
      ? "bg-white/5 text-gray-100 font-medium border border-white/5 shadow-sm"
      : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent";
  };

  const getRoleLabel = (role: string) => {
    if (!role) return "Operator";
    return role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  };



  // Subscription block check
  const isTrialExpired =
    tenantInfo &&
    tenantInfo.subscriptionStatus === "TRIAL" &&
    tenantInfo.trialEnd &&
    new Date() > new Date(tenantInfo.trialEnd);

  const isExpired = tenantInfo && tenantInfo.subscriptionStatus === "EXPIRED";
  const isPendingApproval = tenantInfo && tenantInfo.subscriptionStatus === "PENDING_APPROVAL";
  const isSuspended = tenantInfo && tenantInfo.status === "SUSPENDED";
  const isSuperAdmin = currentUser && currentUser.role === "SUPER_ADMIN";

  const isBlocked = !isSuperAdmin && (isTrialExpired || isExpired || isPendingApproval || isSuspended);

  const renderBlockScreen = () => {
    if (isSuspended) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Factory Account Suspended</h2>
          <p className="text-xs text-gray-400">
            Your access to GIGANI ERP has been suspended by the SaaS administrator. 
            Please contact customer support at <span className="text-indigo-400 font-semibold">support@gigani-erp.com</span> to resolve this issue.
          </p>
        </div>
      );
    }

    if (isPendingApproval) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Payment Under Review</h2>
          <p className="text-xs text-gray-400">
            Thank you! Your payment screenshot has been uploaded and is currently under review by our team.
          </p>
          <div className="w-full bg-[#0d1322] border border-white/5 p-4 rounded-xl text-left space-y-2">
            <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold">Submitted Ref Details:</span>
            <p className="text-xs text-gray-300">Tenant: <strong className="text-gray-100">{tenantInfo?.name}</strong></p>
            <p className="text-xs text-indigo-400 font-medium">Approval will be processed shortly.</p>
          </div>
        </div>
      );
    }

    // Trial Expired / Inactive Screen
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6 px-4">
        <div className="text-center space-y-2">
          <div className="inline-block bg-red-500/10 text-red-400 border border-red-500/15 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Action Required
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Your Free Trial Has Expired</h2>
          <p className="text-xs text-gray-400 max-w-lg mx-auto font-sans">
            To continue managing your packaging orders, stock levels, and production lines, select a plan below and upload your receipt screenshot.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className={`glass-card rounded-2xl p-6 border flex flex-col justify-between relative overflow-hidden ${selectedPlan === 'STARTER' ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5'}`}>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Starter Plan</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-extrabold text-white">₹2,999</span>
                  <span className="text-xs text-gray-400 ml-1">/ month</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Perfect for small packaging plants getting started.</p>
              <ul className="space-y-2.5 text-xs text-gray-300 pt-2 font-sans">
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  5 User Accounts
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Basic ERP Modules
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Limited monthly usage
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan('STARTER')}
              className={`w-full mt-6 py-2 rounded-lg text-xs font-semibold tracking-wider cursor-pointer transition-colors ${selectedPlan === 'STARTER' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              SELECT STARTER
            </button>
          </div>

          {/* Professional */}
          <div className={`glass-card rounded-2xl p-6 border flex flex-col justify-between relative overflow-hidden ${selectedPlan === 'PROFESSIONAL' ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5'}`}>
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-extrabold px-2.5 py-0.5 rounded-bl uppercase tracking-widest">
              POPULAR
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Professional Plan</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-extrabold text-white">₹5,999</span>
                  <span className="text-xs text-gray-400 ml-1">/ month</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">For mid-size active factories requiring full module suite.</p>
              <ul className="space-y-2.5 text-xs text-gray-300 pt-2 font-sans">
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  20 User Accounts
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Full ERP Modules
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Reports & Analytics
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Priority Support
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan('PROFESSIONAL')}
              className={`w-full mt-6 py-2 rounded-lg text-xs font-semibold tracking-wider cursor-pointer transition-colors ${selectedPlan === 'PROFESSIONAL' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              SELECT PROFESSIONAL
            </button>
          </div>

          {/* Enterprise */}
          <div className={`glass-card rounded-2xl p-6 border flex flex-col justify-between relative overflow-hidden ${selectedPlan === 'ENTERPRISE' ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5'}`}>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Enterprise Plan</h3>
                <div className="flex items-baseline mt-2">
                  <span className="text-3xl font-extrabold text-white">₹11,999</span>
                  <span className="text-xs text-gray-400 ml-1">/ month</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Complete, unlimited packaging solution with custom integrations.</p>
              <ul className="space-y-2.5 text-xs text-gray-300 pt-2 font-sans">
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Unlimited Users
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  All Features Included
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Priority Dedicated Support
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan('ENTERPRISE')}
              className={`w-full mt-6 py-2 rounded-lg text-xs font-semibold tracking-wider cursor-pointer transition-colors ${selectedPlan === 'ENTERPRISE' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            >
              SELECT ENTERPRISE
            </button>
          </div>
        </div>

        {/* Payment receipt form */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 max-w-xl mx-auto space-y-4">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-indigo-400">Manual Payment Activation</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Send the subscription fee of <strong className="text-white">₹{selectedPlan === 'STARTER' ? '2,999' : selectedPlan === 'PROFESSIONAL' ? '5,999' : '11,999'}</strong> to:</p>
            <p className="bg-black/35 p-2 rounded text-indigo-300 font-mono text-center select-all">UPI / Bank: pay@gigani-erp.com</p>
          </div>

          {submitError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3.5 py-2 rounded-lg">
              {submitError}
            </div>
          )}

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Selected Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50 animate-none"
              >
                <option value="STARTER">STARTER PLAN (₹2,999/mo)</option>
                <option value="PROFESSIONAL">PROFESSIONAL PLAN (₹5,999/mo)</option>
                <option value="ENTERPRISE">ENTERPRISE PLAN (₹11,999/mo)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Transaction ID / Reference Number</label>
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. TXN182294123"
                className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Upload Receipt Screenshot</label>
              <input
                type="file"
                required
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-300 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-500"
              />
              {screenshotBase64 && (
                <div className="mt-2 border border-white/5 rounded-lg overflow-hidden bg-black/20 p-2 max-h-32 flex justify-center">
                  <img src={screenshotBase64} alt="Receipt Preview" className="max-h-full object-contain" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingPayment}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {submittingPayment ? "SUBMITTING RECEIPT..." : "SUBMIT FOR REVIEW"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#080c14] text-[#f3f4f6] font-sans antialiased">
      {/* SIDEBAR - DESKTOP */}
      <aside
        className={`hidden lg:flex bg-[#0c1322] border-r border-white/5 flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex flex-col py-1">
          {/* Logo + Toggle Button */}
          <div className={`flex items-center border-b border-white/5 bg-[#090f1c] transition-all duration-300 ${
            sidebarCollapsed ? "justify-center p-3" : "justify-between p-4 pl-5"
          }`}>
            {!sidebarCollapsed && (
              <Link href="/dashboard" className="bg-white text-black font-extrabold px-3.5 py-1 text-sm tracking-widest rounded-sm transition-transform hover:scale-105">
                PACKIVO
              </Link>
            )}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all duration-200 cursor-pointer shrink-0"
            >
              {sidebarCollapsed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`space-y-1.5 transition-all duration-300 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
            {/* Dashboard Link */}
            <Link
              href="/dashboard"
              title="Dashboard"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard")}`}
            >
              <span className={`shrink-0 w-2 h-2 rounded-full transition-all duration-200 ${pathname === "/dashboard" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" : "bg-gray-500"}`}></span>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>

            {/* Master Data Menu */}
            <div>
              <button
                onClick={() => !sidebarCollapsed && setMasterDataOpen(!masterDataOpen)}
                title="Master Data"
                className={`w-full flex items-center rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${isParentActive(["/dashboard/master-data"])}`}
              >
                <span className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {!sidebarCollapsed && <span>Master Data</span>}
                </span>
                {!sidebarCollapsed && (
                  <svg className={`w-3.5 h-3.5 text-gray-400 transform transition-transform duration-200 ${masterDataOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {masterDataOpen && !sidebarCollapsed && (
                <div className="pl-4 py-1.5 space-y-2 border-l border-white/10 ml-5 mt-1.5 transition-all duration-200">
                  <Link href="/dashboard/master-data/vendors" className={`block text-xs transition-colors ${isSubActive("/dashboard/master-data/vendors")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/master-data/vendors" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Vendors
                  </Link>
                  <Link href="/dashboard/master-data/printers" className={`block text-xs transition-colors ${isSubActive("/dashboard/master-data/printers")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/master-data/printers" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Printers
                  </Link>
                  <Link href="/dashboard/master-data/customers" className={`block text-xs transition-colors ${isSubActive("/dashboard/master-data/customers")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/master-data/customers" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Customers / Buyers
                  </Link>
                  <Link href="/dashboard/master-data/products" className={`block text-xs transition-colors ${isSubActive("/dashboard/master-data/products")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/master-data/products" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Products / Jobs
                  </Link>
                </div>
              )}
            </div>

            {/* Duplex Details Menu */}
            <div>
              <button
                onClick={() => !sidebarCollapsed && setDuplexOpen(!duplexOpen)}
                title="Duplex Details"
                className={`w-full flex items-center rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${isParentActive(["/dashboard/duplex"])}`}
              >
                <span className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {!sidebarCollapsed && <span>Duplex Details</span>}
                </span>
                {!sidebarCollapsed && (
                  <svg className={`w-3.5 h-3.5 text-gray-400 transform transition-transform duration-200 ${duplexOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {duplexOpen && !sidebarCollapsed && (
                <div className="pl-4 py-1.5 space-y-2 border-l border-white/10 ml-5 mt-1.5 transition-all duration-200">
                  <Link href="/dashboard/duplex/purchases" className={`block text-xs transition-colors ${isSubActive("/dashboard/duplex/purchases")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/duplex/purchases" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Purchase Details
                  </Link>
                  <Link href="/dashboard/duplex/print-jobs" className={`block text-xs transition-colors ${isSubActive("/dashboard/duplex/print-jobs")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/duplex/print-jobs" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Printing Details
                  </Link>
                  <Link href="/dashboard/duplex/printed-stock" className={`block text-xs transition-colors ${isSubActive("/dashboard/duplex/printed-stock")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/duplex/printed-stock" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Printed Sheet
                  </Link>
                </div>
              )}
            </div>

            {/* Kraft Details Menu */}
            <div>
              <button
                onClick={() => !sidebarCollapsed && setKraftOpen(!kraftOpen)}
                title="Kraft Details"
                className={`w-full flex items-center rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${isParentActive(["/dashboard/kraft"])}`}
              >
                <span className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {!sidebarCollapsed && <span>Kraft Details</span>}
                </span>
                {!sidebarCollapsed && (
                  <svg className={`w-3.5 h-3.5 text-gray-400 transform transition-transform duration-200 ${kraftOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {kraftOpen && !sidebarCollapsed && (
                <div className="pl-4 py-1.5 space-y-2 border-l border-white/10 ml-5 mt-1.5 transition-all duration-200">
                  <Link href="/dashboard/kraft/purchases" className={`block text-xs transition-colors ${isSubActive("/dashboard/kraft/purchases")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/kraft/purchases" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Purchase Details
                  </Link>
                  <Link href="/dashboard/kraft/calculations" className={`block text-xs transition-colors ${isSubActive("/dashboard/kraft/calculations")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/kraft/calculations" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Lean Calculations
                  </Link>
                </div>
              )}
            </div>

            {/* Production Menu */}
            <div>
              <button
                onClick={() => !sidebarCollapsed && setProductionOpen(!productionOpen)}
                title="Production"
                className={`w-full flex items-center rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${isParentActive(["/dashboard/production"])}`}
              >
                <span className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  {!sidebarCollapsed && <span>Production</span>}
                </span>
                {!sidebarCollapsed && (
                  <svg className={`w-3.5 h-3.5 text-gray-400 transform transition-transform duration-200 ${productionOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              {productionOpen && !sidebarCollapsed && (
                <div className="pl-4 py-1.5 space-y-2 border-l border-white/10 ml-5 mt-1.5 transition-all duration-200">
                  <Link href="/dashboard/production/jobs" className={`block text-xs transition-colors ${isSubActive("/dashboard/production/jobs")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/production/jobs" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Production Jobs
                  </Link>
                  <Link href="/dashboard/production/finished-goods" className={`block text-xs transition-colors ${isSubActive("/dashboard/production/finished-goods")}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${pathname === "/dashboard/production/finished-goods" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-gray-600"}`}></span>
                    Finished Goods
                  </Link>
                </div>
              )}
            </div>

            {/* Sales / Dispatch Link */}
            <Link
              href="/dashboard/sales/dispatch"
              title="Sales / Dispatch"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard/sales/dispatch")}`}
            >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h6a1 1 0 001-1v-4a1 1 0 00-.81-.68l-3-1a1 1 0 00-1.19.68L13 12M13 16h-4" />
              </svg>
              {!sidebarCollapsed && <span>Sales / Dispatch</span>}
            </Link>

            {/* Reports Link */}
            <Link
              href="/dashboard/reports"
              title="Reports"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard/reports")}`}
            >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              {!sidebarCollapsed && <span>Reports</span>}
            </Link>

            {/* Excel Imports Link */}
            <Link
              href="/dashboard/imports"
              title="Excel Imports"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard/imports")}`}
            >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {!sidebarCollapsed && <span>Excel Imports</span>}
            </Link>

            {/* Administration Header */}
            {!sidebarCollapsed && (
              <div className="pt-5 pb-1.5 px-3 text-[9px] font-bold text-gray-500 tracking-wider uppercase">
                SYSTEM ADMINISTRATION
              </div>
            )}
            {sidebarCollapsed && <div className="pt-2 pb-1 border-t border-white/5 mx-1"></div>}

            {/* Formula Settings Link */}
            <Link
              href="/dashboard/administration/settings"
              title="Formula Settings"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard/administration/settings")}`}
            >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {!sidebarCollapsed && <span>Formula Settings</span>}
            </Link>

            {/* Users & Roles Link */}
            <Link
              href="/dashboard/administration/users"
              title="Users & Roles"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard/administration/users")}`}
            >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {!sidebarCollapsed && <span>Users & Roles</span>}
            </Link>

            {/* Audit Logs Link */}
            <Link
              href="/dashboard/administration/audit-logs"
              title="Audit Logs"
              className={`flex items-center rounded-xl text-sm transition-all duration-200 ${
                sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              } ${isActive("/dashboard/administration/audit-logs")}`}
            >
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!sidebarCollapsed && <span>Audit Logs</span>}
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer (Profile Context) */}
        <div className={`border-t border-white/5 bg-[#0a0f1c] transition-all duration-300 ${
          sidebarCollapsed ? "p-2" : "p-4"
        }`}>
          <Link
            href="/dashboard/profile"
            title={sidebarCollapsed ? userName : undefined}
            className={`block rounded-xl border border-white/5 bg-gradient-to-r from-[#0d1322]/80 to-[#161f36]/80 backdrop-blur-md hover:bg-white/5 hover:border-white/10 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.25)] ${
              sidebarCollapsed ? "p-2 flex justify-center" : "p-3"
            }`}
          >
            <div className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30 text-sm shadow-[0_0_12px_rgba(99,102,241,0.15)] shrink-0 animate-none">
                {initials}
              </div>
              {!sidebarCollapsed && (
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-gray-200 truncate">{userName}</p>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {currentUser ? getRoleLabel(currentUser.role) : "Operator"}
                    </span>
                    <span className="text-[9px] font-sans text-emerald-400 font-medium">
                      Active
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c1322] border-b border-white/5 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-white focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-lg text-indigo-400">PACKIVO ERP</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-gray-300 hover:text-white relative cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>


        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-50 transition-opacity">
          <div className="w-64 h-full bg-[#0c1322] border-r border-white/5 flex flex-col justify-between overflow-y-auto">
            <div className="p-4 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <span className="font-bold text-indigo-400">PACKIVO ERP</span>
                <button onClick={toggleMobileMenu} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-1.5" onClick={() => setMobileMenuOpen(false)}>
                <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive("/dashboard")}`}>Dashboard</Link>
                <div className="text-xs font-semibold text-gray-500 px-3 pt-3 uppercase">Master Data</div>
                <Link href="/dashboard/master-data/vendors" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Vendors</Link>
                <Link href="/dashboard/master-data/printers" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Printers</Link>
                <Link href="/dashboard/master-data/customers" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Customers</Link>
                <Link href="/dashboard/master-data/products" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Products / Spec Sheets</Link>
                
                <div className="text-xs font-semibold text-gray-500 px-3 pt-3 uppercase">Duplex Sheets</div>
                <Link href="/dashboard/duplex/purchases" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Purchases</Link>
                <Link href="/dashboard/duplex/print-jobs" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Print Jobs</Link>
                <Link href="/dashboard/duplex/printed-stock" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Printed Stock</Link>
                                <div className="text-xs font-semibold text-gray-500 px-3 pt-3 uppercase">Kraft Rolls</div>
                 <Link href="/dashboard/kraft/purchases" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Purchases</Link>
                 <Link href="/dashboard/kraft/calculations" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Ply Calculations</Link>

                <div className="text-xs font-semibold text-gray-500 px-3 pt-3 uppercase">Production</div>
                <Link href="/dashboard/production/jobs" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Production Jobs</Link>
                <Link href="/dashboard/production/finished-goods" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Finished Goods</Link>

                <div className="text-xs font-semibold text-gray-500 px-3 pt-3 uppercase">Sales</div>
                <Link href="/dashboard/sales/dispatch" className="block pl-6 py-1.5 text-xs text-gray-400 hover:text-white">Dispatch & Challan</Link>

                <div className="text-xs font-semibold text-gray-500 px-3 pt-3 uppercase">System</div>
                <Link href="/dashboard/reports" className="block pl-3 py-1.5 text-xs text-gray-400 hover:text-white">Reports & Analytics</Link>
                <Link href="/dashboard/imports" className="block pl-3 py-1.5 text-xs text-gray-400 hover:text-white">Excel Importer</Link>
                <Link href="/dashboard/administration/settings" className="block pl-3 py-1.5 text-xs text-gray-400 hover:text-white">Administration Settings</Link>
                <Link href="/dashboard/administration/users" className="block pl-3 py-1.5 text-xs text-gray-400 hover:text-white">Users & Roles</Link>
                <Link href="/dashboard/administration/audit-logs" className="block pl-3 py-1.5 text-xs text-gray-400 hover:text-white">Audit Logs</Link>
              </nav>
            </div>
            <div className="p-4 border-t border-white/5 bg-[#0a0f1c]" onClick={() => setMobileMenuOpen(false)}>
              <Link href="/dashboard/profile" className="block p-3 rounded-xl border border-white/5 bg-gradient-to-r from-[#0d1322]/80 to-[#161f36]/80 backdrop-blur-md hover:bg-white/5 hover:border-white/10 transition-all duration-200 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30 text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-200 truncate">{userName}</p>
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER - DESKTOP */}
        <header className="hidden lg:flex h-16 bg-[#0c1322] border-b border-white/5 items-center justify-end px-6 sticky top-0 z-30">
          {/* Right items */}
          <div className="flex items-center gap-4">
            {/* Tenant badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              Company: <strong className="font-semibold text-gray-100">{tenantName}</strong>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors relative cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>



            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setProfileDropdownOpen(!profileDropdownOpen); }}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md text-xs cursor-pointer"
              >
                {initials}
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0e1726] border border-white/5 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/5 bg-[#0d1322]">
                    <p className="text-xs font-semibold text-gray-200">{userName}</p>
                    <p className="text-[10px] text-indigo-400">{userEmail}</p>
                  </div>
                  <Link href="/dashboard/profile" className="block px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setProfileDropdownOpen(false)}>My Profile</Link>
                  <Link href="/dashboard/administration/settings" className="block px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setProfileDropdownOpen(false)}>Settings</Link>
                  <div className="border-t border-white/5 my-1"></div>
                  <Link href="/login" className="block px-4 py-2 text-xs text-red-400 hover:bg-white/5 hover:text-red-300" onClick={() => setProfileDropdownOpen(false)}>Sign Out</Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 mt-16 lg:mt-0 relative">
          {isBlocked ? renderBlockScreen() : children}
        </main>
      </div>
    </div>
  );
}
