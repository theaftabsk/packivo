"use client";

import React, { useState } from "react";
import { api } from "../../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #f0f4ff 0%, #f8fafc 50%, #f0fdfa 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Brand text */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontWeight: 900, fontSize: 20, color: "#1e293b", letterSpacing: "2px", textTransform: "uppercase" }}>PACKIVO</span>
        </div>

        {/* Card */}
        <div style={{ background: "white", borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 16px 48px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)", padding: "40px 36px" }}>
          {!sent ? (
            <>
              {/* Icon */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #eef2ff, #e0e7ff)", border: "2px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 0 6px rgba(99,102,241,0.06)" }}>
                  <svg width="26" height="26" fill="none" stroke="#6366f1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.4px", marginBottom: 6 }}>Forgot your password?</h2>
                <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6 }}>
                  Enter your registered email address and we'll send you a secure link to reset your password.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "11px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
                  <svg width="15" height="15" fill="none" stroke="#dc2626" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email Address</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourfactory.com"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#fafafa", color: "#0f172a", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "border-color 0.2s" }}
                    onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  style={{ width: "100%", padding: "13px", fontSize: 14.5, fontWeight: 700, color: "white", borderRadius: 11, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#a5b4fc" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", boxShadow: loading ? "none" : "0 6px 20px rgba(79,70,229,0.4)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Sending link...
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "2px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 0 6px rgba(16,185,129,0.08)" }}>
                <svg width="32" height="32" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>Check your inbox</h3>
              <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.65, marginBottom: 20 }}>
                We've sent a password reset link to <strong style={{ color: "#4f46e5" }}>{email}</strong>. The link will expire in 1 hour.
              </p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", fontSize: 12.5, color: "#64748b", lineHeight: 1.6, marginBottom: 24, textAlign: "left" }}>
                <strong>Didn't receive it?</strong> Check your spam/junk folder, or{" "}
                <button
                  onClick={() => setSent(false)}
                  style={{ color: "#4f46e5", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, fontSize: "inherit" }}
                >
                  try a different email
                </button>.
              </div>
            </div>
          )}

          {/* Back to login */}
          <div style={{ textAlign: "center", marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#64748b", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
              Back to Sign In
            </a>
          </div>
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
