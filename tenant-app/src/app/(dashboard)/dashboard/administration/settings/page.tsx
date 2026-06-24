'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Settings {
  companyName: string;
  gstinNumber: string;
  factoryAddress: string;
  formulaThreePly: string;
  formulaFivePly: string;
  lowStockThreshold: number;
  enableWhatsApp: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await api.get<Settings>('/settings');
        setSettings(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await api.patch('/settings', settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-100 tracking-tight">Formula Configuration Settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure dynamic Math Formula GSM factors applied system-wide for paper stock and raw calculations.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2.5 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Settings saved successfully!
        </div>
      )}

      {settings && (
        <form onSubmit={handleSave} className="glass-card rounded-xl p-5 border border-white/5 bg-[#0e1726]/30 space-y-6 text-xs">
          
          {/* Card Header Panel */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">CONFIGURE SYSTEM FORMULAS</span>
            <span className="text-[10px] font-bold text-red-400">Super Admin Only</span>
          </div>

          {/* Math Formula Specifications Group */}
          <div className="space-y-4 pt-1">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              MATH FORMULA SPECIFICATIONS
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 3-Ply Formula */}
              <div>
                <label className={lbl}>3-PLY LEAN GSM FACTOR *</label>
                <input
                  type="text"
                  value={settings.formulaThreePly}
                  onChange={e => setSettings({ ...settings, formulaThreePly: e.target.value })}
                  className={inp}
                  required
                />
                <p className="text-[9.5px] text-gray-500 mt-1 font-medium font-mono">
                  Default: gsm_t + (gsm_f * 1.5) + gsm_b
                </p>
              </div>

              {/* 5-Ply Formula */}
              <div>
                <label className={lbl}>5-PLY LEAN GSM FACTOR *</label>
                <input
                  type="text"
                  value={settings.formulaFivePly}
                  onChange={e => setSettings({ ...settings, formulaFivePly: e.target.value })}
                  className={inp}
                  required
                />
                <p className="text-[9.5px] text-gray-500 mt-1 font-medium font-mono">
                  Default: gsm_t + (gsm_f * 3.0) + gsm_b
                </p>
              </div>

              {/* Formula Formatting Notes */}
              <div className="md:col-span-2 border border-white/5 rounded-xl p-3 bg-black/15 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Formula Formatting Notes</span>
                <p className="text-gray-400 leading-normal">
                  Formulas support variables <span className="font-bold text-gray-300 font-mono">gsm_t</span> (Top GSM), <span className="font-bold text-gray-300 font-mono">gsm_f</span> (Fluting GSM), and <span className="font-bold text-gray-300 font-mono">gsm_b</span> (Bottom GSM) with basic operators (+, -, *, /, parentheses).
                </p>
                <p className="text-amber-500 font-semibold leading-normal">
                  WARNING: Changing these strings will affect new inwards calculations, existing logs remain unchanged.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] disabled:bg-emerald-950 text-white text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
