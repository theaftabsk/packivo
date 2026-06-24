"use client";

import React, { useState } from "react";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordValidationErrors, setPasswordValidationErrors] = useState<string[]>([]);

  const checkPasswordStrength = (pass: string) => {
    const errors: string[] = [];
    if (pass.length < 8) errors.push("At least 8 characters long");
    if (!/[A-Z]/.test(pass)) errors.push("At least one uppercase letter");
    if (!/[a-z]/.test(pass)) errors.push("At least one lowercase letter");
    if (!/\d/.test(pass)) errors.push("At least one number");
    setPasswordValidationErrors(errors);
    return errors.length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (!checkPasswordStrength(password)) {
      setError("Password does not meet all security requirements.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/auth/register-tenant", { companyName, adminName, email, password });
      window.location.href = `/login?registered=true&email=${encodeURIComponent(email)}`;
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  const strength = password ? (4 - passwordValidationErrors.length) : 0;
  const strengthColors = ["#e2e8f0", "#ef4444", "#f59e0b", "#10b981", "#10b981"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen flex font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f8fafc" }}>

      {/* LEFT BRANDING */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)" }}
      >
        <div style={{ position: "absolute", top: -100, right: -100, width: 360, height: 360, borderRadius: "50%", background: "rgba(99,102,241,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 280, height: 280, borderRadius: "50%", background: "rgba(6,182,212,0.08)", pointerEvents: "none" }} />

        {/* Brand text */}
        <div className="relative z-10">
          <span style={{ fontWeight: 900, fontSize: 20, color: "white", letterSpacing: "2px", textTransform: "uppercase" }}>PACKIVO</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div>
            <div style={{ display: "inline-block", background: "rgba(99,102,241,0.2)", border: "1px solid rgba(165,180,252,0.3)", borderRadius: 100, padding: "4px 14px", fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 16, letterSpacing: "0.3px" }}>
              ✦ 14-Day Free Trial
            </div>
            <h1 style={{ fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: 800, color: "white", lineHeight: 1.2, letterSpacing: "-0.8px", marginBottom: 14 }}>
              Set up your factory<br />workspace in minutes
            </h1>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
              Create your isolated tenant workspace and invite your team. Full access to all ERP modules from day one.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { step: "01", title: "Register your factory", desc: "One-time setup takes under 2 minutes" },
              { step: "02", title: "Add your master data", desc: "Import vendors, customers, products via Excel" },
              { step: "03", title: "Start recording operations", desc: "Live stock, production & dispatch tracking" },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#a5b4fc", flexShrink: 0 }}>
                  {item.step}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "white", marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
          © 2025 Packivo ERP · Secure cloud · GST-compliant
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-[420px] py-8">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span style={{ fontWeight: 900, fontSize: 18, color: "#1e293b", letterSpacing: "2px", textTransform: "uppercase" }}>PACKIVO</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 5 }}>Create your workspace</h2>
            <p style={{ fontSize: 13.5, color: "#64748b" }}>Register your factory and get started for free</p>
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

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* Row: Company + Admin */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Company Name</label>
                <input
                  type="text" required value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Apex Cartons Ltd"
                  style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white", color: "#0f172a", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Admin Full Name</label>
                <input
                  type="text" required value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="John Doe"
                  style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white", color: "#0f172a", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Work Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourfactory.com"
                style={{ width: "100%", padding: "10px 14px", fontSize: 13.5, border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white", color: "#0f172a", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => { setPassword(e.target.value); checkPasswordStrength(e.target.value); }}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 44px 10px 14px", fontSize: 13.5, border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white", color: "#0f172a", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                  {showPassword
                    ? <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 100, background: i <= strength ? strengthColors[strength] : "#e2e8f0", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  {passwordValidationErrors.length > 0 ? (
                    <div style={{ fontSize: 11.5, color: "#94a3b8", display: "flex", flexWrap: "wrap", gap: "3px 12px" }}>
                      {passwordValidationErrors.map((e, i) => <span key={i}>· {e}</span>)}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11.5, color: "#10b981", fontWeight: 600 }}>✓ Strong password</span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"} required value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px 44px 10px 14px", fontSize: 13.5, border: `1.5px solid ${confirmPassword && password !== confirmPassword ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 9, background: "white", color: "#0f172a", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                  onFocus={(e) => e.target.style.borderColor = "#6366f1"}
                  onBlur={(e) => e.target.style.borderColor = confirmPassword && password !== confirmPassword ? "#fca5a5" : "#e2e8f0"}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                  {showConfirm
                    ? <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <span style={{ fontSize: 11.5, color: "#ef4444", marginTop: 4, display: "block" }}>Passwords do not match</span>
              )}
              {confirmPassword && password === confirmPassword && (
                <span style={{ fontSize: 11.5, color: "#10b981", marginTop: 4, display: "block" }}>✓ Passwords match</span>
              )}
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
                marginTop: 4,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Creating workspace...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Register Factory — Free
                </>
              )}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Already registered?</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>

          <a
            href="/login"
            style={{ display: "block", width: "100%", padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#4f46e5", textDecoration: "none", border: "1.5px solid #c7d2fe", borderRadius: 11, background: "#eef2ff", transition: "all 0.2s" }}
          >
            Sign In to your account →
          </a>

          <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 16, lineHeight: 1.6 }}>
            By registering you agree to our Terms of Service and Privacy Policy.<br/>
            No credit card required · Cancel anytime
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
