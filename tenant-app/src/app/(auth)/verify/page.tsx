"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function VerifyPage() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleVerification = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setSuccess(false);
        setMessage("Invalid verification link. No token provided.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/auth/verify?token=${token}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess(true);
          setMessage(data.message || "Email verified successfully!");
        } else {
          setSuccess(false);
          setMessage(data.message || "Verification failed. Link may be invalid or expired.");
        }
      } catch (err: any) {
        setSuccess(false);
        setMessage("Could not connect to verification server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };
    handleVerification();
  }, []);

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
      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: "white", letterSpacing: "-0.3px" }}>
              Pack<span style={{ color: "#c7d2fe" }}>ivo</span>
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Email Verification</p>
        </div>

        {/* Body */}
        <div style={{ padding: "40px 36px 36px", textAlign: "center" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "16px 0" }}>
              {/* Animated spinner */}
              <div style={{ position: "relative", width: 56, height: 56 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: "3px solid #e0e7ff",
                  borderTopColor: "#4f46e5",
                  animation: "spin 0.8s linear infinite",
                }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" fill="none" stroke="#6366f1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Verifying your account</h3>
                <p style={{ fontSize: 13.5, color: "#64748b" }}>Please wait while we validate your email link...</p>
              </div>
            </div>
          ) : success ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              {/* Success icon */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                border: "2px solid #6ee7b7",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 6px rgba(16,185,129,0.08)",
              }}>
                <svg width="32" height="32" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.3px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Email Verified!
                  <svg width="22" height="22" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                  </svg>
                </h3>
                <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>{message}</p>
              </div>
              {/* Trust signals */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", width: "100%", textAlign: "left" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Your workspace is ready</div>
                {["Full access to all ERP modules", "Stock, production & dispatch tracking", "Role-based team management"].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, fontSize: 13, color: "#475569" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="9" height="9" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    {t}
                  </div>
                ))}
              </div>
              <a
                href="/login"
                style={{
                  display: "block", width: "100%", padding: "13px", textAlign: "center",
                  fontSize: 14.5, fontWeight: 700, color: "white", textDecoration: "none",
                  borderRadius: 11, border: "none",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
                  transition: "all 0.2s",
                }}
              >
                Go to Dashboard →
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              {/* Error icon */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                border: "2px solid #fca5a5",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 0 6px rgba(239,68,68,0.06)",
              }}>
                <svg width="32" height="32" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.3px" }}>Verification Failed</h3>
                <p style={{ fontSize: 13.5, color: "#ef4444", lineHeight: 1.6 }}>{message}</p>
              </div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", width: "100%", fontSize: 12.5, color: "#92400e", lineHeight: 1.6 }}>
                <strong>Common reasons:</strong> Link expired (valid for 24 hours), already used, or copied incorrectly. Please register again to get a new link.
              </div>
              <a
                href="/register"
                style={{
                  display: "block", width: "100%", padding: "13px", textAlign: "center",
                  fontSize: 14.5, fontWeight: 700, color: "#4f46e5", textDecoration: "none",
                  borderRadius: 11, border: "1.5px solid #c7d2fe", background: "#eef2ff",
                  transition: "all 0.2s",
                }}
              >
                Register a New Account →
              </a>
              <a
                href="/login"
                style={{ fontSize: 13.5, color: "#64748b", textDecoration: "none", fontWeight: 500 }}
              >
                Back to Sign In
              </a>
            </div>
          )}
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
