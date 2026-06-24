"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../../lib/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    plan: string;
    status: string;
    emailVerified: boolean;
    trialStart: string;
    trialEnd: string;
    subscriptionStatus: string;
  };
  planDetails?: {
    id: string;
    name: string;
    price: number;
    maxUsers: number;
    maxFactories: number;
    features: string[];
  };
}

interface CompanySettings {
  companyName: string;
  gstinNumber: string;
  factoryAddress: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<CompanySettings>({
    companyName: "",
    gstinNumber: "",
    factoryAddress: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userProfile = await api.get<UserProfile>("/auth/me");
      setProfile(userProfile);

      const sysSettings = await api.get<any>("/settings");
      setCompany({
        companyName: sysSettings.companyName || userProfile.tenant.name || "",
        gstinNumber: sysSettings.gstinNumber || "",
        factoryAddress: sysSettings.factoryAddress || "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await api.patch("/settings", company);
      setSuccess(true);
      
      // Update local storage so that sidebar/header updates instantly on page reload
      localStorage.setItem("tenant_name", company.companyName);
      
      setTimeout(() => {
        setSuccess(false);
        // Reload to sync sidebars/layouts immediately
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save company information.");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0][0] || "U").toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/15";
      case "TENANT_ADMIN":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/15";
      case "PRODUCTION_USER":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/15";
      case "PURCHASE_USER":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15";
      case "DISPATCH_USER":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15";
      default:
        return "bg-gray-500/10 text-gray-400 border border-gray-500/15";
    }
  };

  const calculateDaysRemaining = (endStr: string) => {
    if (!endStr) return 0;
    const end = new Date(endStr).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-400">Loading profile details...</p>
      </div>
    );
  }

  const userInitials = profile ? getInitials(profile.name) : "U";
  const daysRemaining = profile?.tenant?.trialEnd ? calculateDaysRemaining(profile.tenant.trialEnd) : 0;
  const activePlanName = profile?.tenant?.subscriptionStatus || "TRIAL";

  const maxUsersText = profile?.planDetails
    ? (profile.planDetails.maxUsers >= 9999 ? "Unlimited" : `${profile.planDetails.maxUsers} Operators`)
    : "—";

  const maxFactoriesText = profile?.planDetails
    ? (profile.planDetails.maxFactories >= 9999 ? "Unlimited" : `${profile.planDetails.maxFactories} Plants`)
    : "—";

  const planFeaturesList = profile?.planDetails?.features || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-100">Workspace & Profile</h2>
        <p className="text-xs text-gray-400 mt-1">
          Manage your personal operator account details, update company identity information, and monitor plan subscriptions.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3.5 py-2.5 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3.5 py-2.5 rounded-lg">
          Profile changes saved! Reloading layout constants...
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Profile Info + Company Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User Account Info Card */}
          <div className="glass-card rounded-xl p-6 border border-white/5 bg-[#0e1726]/10 flex flex-col sm:flex-row gap-5 items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
              {userInitials}
            </div>
            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h3 className="text-md font-bold text-gray-100">{profile?.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase w-fit mx-auto sm:mx-0 ${getRoleBadgeColor(profile?.role || "")}`}>
                  {profile?.role === "TENANT_ADMIN" ? "ADMIN" : profile?.role?.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">{profile?.email}</p>
              <p className="text-[10px] text-gray-500 font-sans">
                Operator profile created on: {profile ? new Date(profile.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }) : "—"}
              </p>
            </div>
          </div>

          {/* Company Profile settings Card */}
          <form onSubmit={handleCompanySave} className="glass-card rounded-xl p-6 border border-white/5 bg-[#0e1726]/10 space-y-4">
            <div className="border-b border-white/5 pb-2.5">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Company Identity Settings</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">These values are printed on invoices, receipts, and challans.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Company Name */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Company / Factory Name *</label>
                <input
                  type="text"
                  required
                  value={company.companyName}
                  onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                  placeholder="e.g. Gigani Packaging Inc."
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* GSTIN Number */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">GSTIN Number</label>
                <input
                  type="text"
                  value={company.gstinNumber}
                  onChange={(e) => setCompany({ ...company, gstinNumber: e.target.value })}
                  placeholder="24XXXXXXXXXXXXX"
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Office Address */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Office / Factory Address *</label>
                <textarea
                  required
                  rows={3}
                  value={company.factoryAddress}
                  onChange={(e) => setCompany({ ...company, factoryAddress: e.target.value })}
                  placeholder="e.g. Plot 15, GIDC Industrial Estate, Umargam, Gujarat"
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-lg border border-indigo-500/20"
              >
                {saving ? "Saving Changes..." : "Save Profile Settings"}
              </button>
            </div>
          </form>

        </div>

        {/* Right Side: Subscription Details */}
        <div className="space-y-6">
          
          {/* Plan Details Card */}
          <div className="glass-card rounded-xl p-6 border border-white/5 bg-[#0e1726]/10 space-y-6">
            <div className="border-b border-white/5 pb-2.5">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Active Subscription</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Review your SaaS workspace limits and trial statuses.</p>
            </div>

            {/* Plan Display Badge */}
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
              <div>
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider font-semibold">Workspace Plan:</span>
                <span className="text-sm font-extrabold text-gray-100 tracking-wide uppercase">
                  {profile?.tenant?.plan || "PROFESSIONAL"}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/15`}>
                {activePlanName}
              </span>
            </div>

            {/* Trial timer count if applicable */}
            {profile?.tenant?.subscriptionStatus === "TRIAL" && (
              <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-semibold">7 Days Free Trial Period</span>
                  <span className="text-indigo-400 font-bold">{daysRemaining} days left</span>
                </div>
                {/* ProgressBar */}
                <div className="w-full bg-[#080c14] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, (daysRemaining / 7) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-mono pt-1">
                  <span>Start: {profile?.tenant?.trialStart ? new Date(profile.tenant.trialStart).toLocaleDateString() : ""}</span>
                  <span>End: {profile?.tenant?.trialEnd ? new Date(profile.tenant.trialEnd).toLocaleDateString() : ""}</span>
                </div>
              </div>
            )}

            {/* Resource Limit matrix */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Plan Resource Restrictions</span>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-black/10 border border-white/5 rounded-lg">
                  <span className="text-[10px] text-gray-500 block uppercase tracking-wider">User limit:</span>
                  <span className="text-gray-200 font-bold font-mono">{maxUsersText}</span>
                </div>
                <div className="p-3 bg-black/10 border border-white/5 rounded-lg">
                  <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Factory limit:</span>
                  <span className="text-gray-200 font-bold font-mono">{maxFactoriesText}</span>
                </div>
              </div>
            </div>

            {/* Feature limits listing */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Included Features:</span>
              <ul className="space-y-2 text-xs text-gray-300 font-sans">
                {planFeaturesList.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
