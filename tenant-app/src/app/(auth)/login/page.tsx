"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@packivo.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("registered") === "true") {
        const registeredEmail = params.get("email");
        setSuccessMsg(
          `Account created! Check your inbox at ${registeredEmail || "your email"} for a verification link.`
        );
        if (registeredEmail) {
          setEmail(registeredEmail);
          setPassword("");
        }
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post<{ access_token: string; user: any }>("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user_name", response.user.name);
      localStorage.setItem("user_email", response.user.email);
      localStorage.setItem("user_role", response.user.role);
      localStorage.setItem("tenant_name", response.user.tenantName);

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* LEFT PANEL — branding */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)",
        }}
      >
        {/* Background decorations */}
        <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "rgba(99,102,241,0.15)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(6,182,212,0.1)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />

        {/* Brand text */}
        <div className="relative z-10">
          <span style={{ fontWeight: 900, fontSize: 20, color: "white", letterSpacing: "2px", textTransform: "uppercase" }}>PACKIVO</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, color: "white", lineHeight: 1.2, letterSpacing: "-0.8px", marginBottom: 16 }}>
              Smart ERP for<br />Packaging Factories
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
              Manage raw materials, production jobs, dispatch, and analytics — all from one powerful cloud platform.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              {
                icon: <svg width="17" height="17" fill="none" stroke="#a5b4fc" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
                text: "Real-time stock & inventory tracking"
              },
              {
                icon: <svg width="17" height="17" fill="none" stroke="#a5b4fc" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
                text: "Duplex, Kraft & production management"
              },
              {
                icon: <svg width="17" height="17" fill="none" stroke="#a5b4fc" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
                text: "Reports, audit logs & analytics"
              },
              {
                icon: <svg width="17" height="17" fill="none" stroke="#a5b4fc" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
                text: "Role-based access with audit trail"
              },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust signal */}
        <div className="relative z-10">
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>500+ factories trust Packivo</span>
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10" style={{ background: "#f8fafc" }}>
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span style={{ fontWeight: 900, fontSize: 18, color: "#1e293b", letterSpacing: "2px", textTransform: "uppercase" }}>PACKIVO</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: "#64748b" }}>Sign in to your factory dashboard</p>
          </div>

          {/* Success alert */}
          {successMsg && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span style={{ fontSize: 13, color: "#15803d", lineHeight: 1.5 }}>{successMsg}</span>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
              <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: "100%", padding: "11px 14px", fontSize: 14,
                  border: "1.5px solid #e2e8f0", borderRadius: 10,
                  background: "white", color: "#0f172a", outline: "none",
                  transition: "border-color 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: 12.5, color: "#6366f1", fontWeight: 500, textDecoration: "none" }}>
                  Forgot password?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "11px 44px 11px 14px", fontSize: 14,
                    border: "1.5px solid #e2e8f0", borderRadius: 10,
                    background: "white", color: "#0f172a", outline: "none",
                    transition: "border-color 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px", fontSize: 14.5, fontWeight: 700,
                color: "white", borderRadius: 11, border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#a5b4fc" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: loading ? "none" : "0 6px 20px rgba(79,70,229,0.4)",
                transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Signing in...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>New to Packivo?</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>

          <a
            href="/register"
            style={{
              display: "block", width: "100%", padding: "12px", textAlign: "center",
              fontSize: 14, fontWeight: 600, color: "#4f46e5", textDecoration: "none",
              border: "1.5px solid #c7d2fe", borderRadius: 11, background: "#eef2ff",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#e0e7ff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#eef2ff"; }}
          >
            Register your factory →
          </a>

          <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 20 }}>
            © 2025 Packivo ERP · Secure · Encrypted
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
