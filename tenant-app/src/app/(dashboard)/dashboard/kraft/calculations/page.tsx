'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Settings {
  formulaThreePly: string;
  formulaFivePly: string;
  lowStockThreshold: number;
  enableWhatsApp: boolean;
}

export default function KraftCalculationsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Simulator Inputs
  const [plyType, setPlyType] = useState<'3-Ply' | '5-Ply'>('3-Ply');
  const [qty, setQty] = useState<string>('1000');
  const [lengthIn, setLengthIn] = useState<string>('38');
  const [widthIn, setWidthIn] = useState<string>('52');
  const [ups, setUps] = useState<string>('1');

  // Liner & Flute GSM Configuration
  const [gsmT, setGsmT] = useState<string>('120');
  const [gsmF, setGsmF] = useState<string>('120');
  const [gsmB, setGsmB] = useState<string>('120');

  // Rate
  const [rate, setRate] = useState<string>('45');

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

  // Extraction of fluting factors from settings formula patterns
  const getFlutingFactor = (type: '3-Ply' | '5-Ply') => {
    if (!settings) return type === '3-Ply' ? 1.5 : 3.0;
    const formula = type === '3-Ply' ? settings.formulaThreePly : settings.formulaFivePly;
    const match = formula.match(/F\s*\*\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : (type === '3-Ply' ? 1.5 : 3.0);
  };

  const flutingFactor = getFlutingFactor(plyType);

  // Math Calculations
  const t = gsmT.trim() === '' ? 0 : Number(gsmT);
  const f = gsmF.trim() === '' ? 0 : Number(gsmF);
  const b = gsmB.trim() === '' ? 0 : Number(gsmB);

  const parsedQty = Number(qty) || 0;
  const parsedLength = Number(lengthIn) || 0;
  const parsedWidth = Number(widthIn) || 0;
  const parsedRate = Number(rate) || 0;

  // Lean GSM
  const leanGsm = plyType === '3-Ply' 
    ? t + (f * flutingFactor) + b 
    : t + (f * flutingFactor) + (b * 2);

  // Weight per sheet (kg/sheet)
  const weightPerSheet = (parsedLength * parsedWidth * leanGsm) / 1550 / 1000;

  // Total net weight (kg)
  const totalNetWeight = weightPerSheet * parsedQty;

  // Calculated Amount
  const calculatedAmount = totalNetWeight * parsedRate;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Loading calculation configs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-100 tracking-tight">Ply Calculations & Formulas</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Simulate corrugated board paper configurations and weight roll requirements.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Row 1: Math Specs and Active Configs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mathematical Specifications */}
        <div className="lg:col-span-2 glass-card rounded-xl p-4 border border-white/5 bg-[#090f1d]/50 space-y-3">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Mathematical Specifications
          </h3>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            The application uses standard packaging industry calculations for ply boards (corrugated sheets) consisting of Top Liner (T), Flute Paper (F), and Bottom Liner (B).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* 3-Ply Card */}
            <div className="border border-white/5 rounded-lg p-3 bg-black/25 flex flex-col gap-1.5">
              <span className="text-[9.5px] font-bold text-indigo-400 tracking-wider">3-PLY LEAN GSM FORMULA</span>
              <div className="font-mono text-gray-200 font-bold text-sm bg-black/40 px-2 py-1 rounded">
                T + (F * {flutingFactor.toFixed(1)}) + B
              </div>
              <span className="text-[10px] text-gray-500">
                Flute paper factor is {flutingFactor.toFixed(1)}x due to corrugation take-up factor.
              </span>
            </div>

            {/* 5-Ply Card */}
            <div className="border border-white/5 rounded-lg p-3 bg-black/25 flex flex-col gap-1.5">
              <span className="text-[9.5px] font-bold text-indigo-400 tracking-wider">5-PLY LEAN GSM FORMULA</span>
              <div className="font-mono text-gray-200 font-bold text-sm bg-black/40 px-2 py-1 rounded">
                T + (F * {getFlutingFactor('5-Ply').toFixed(1)}) + B * 2
              </div>
              <span className="text-[10px] text-gray-500">
                Flute paper factor is {getFlutingFactor('5-Ply').toFixed(1)}x due to double corrugation loops.
              </span>
            </div>
          </div>

          {/* Weight Formula Card */}
          <div className="border border-white/5 rounded-lg p-3 bg-black/25 flex flex-col gap-1.5">
            <span className="text-[9.5px] font-bold text-indigo-400 tracking-wider">WEIGHT PER SHEET FORMULA (KG)</span>
            <div className="font-mono text-gray-200 font-bold text-xs bg-black/40 px-2 py-1 rounded">
              (Length * Width * Lean GSM) / 1550 / 1000
            </div>
            <span className="text-[10px] text-gray-500">
              Dimensions in inches. 1550 is the conversion divisor to convert square inches to square meters, and 1000 converts grams to kilograms.
            </span>
          </div>
        </div>

        {/* Active Configs */}
        <div className="glass-card rounded-xl p-4 border border-white/5 bg-[#090f1d]/50 space-y-3">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Active Configs
          </h3>

          {settings && (
            <div className="space-y-3 pt-1 text-[11px]">
              {/* 3-Ply Config */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">3-PLY DB FORMULA PATTERN</span>
                <div className="font-mono text-amber-400 font-semibold bg-black/35 px-2 py-1.5 rounded border border-white/[0.03]">
                  {settings.formulaThreePly}
                </div>
              </div>

              {/* 5-Ply Config */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">5-PLY DB FORMULA PATTERN</span>
                <div className="font-mono text-amber-400 font-semibold bg-black/35 px-2 py-1.5 rounded border border-white/[0.03]">
                  {settings.formulaFivePly}
                </div>
              </div>

              <p className="text-[10px] text-gray-500 leading-relaxed pt-1.5">
                Formula strings can be configured by Super Admins in the settings panel, changing the multipliers dynamically system-wide.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Playground & Calculated Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Simulator Playground */}
        <div className="lg:col-span-2 glass-card rounded-xl p-4 border border-white/5 bg-[#090f1d]/50 space-y-4">
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Live Simulator Playground
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Ply Type */}
            <div>
              <label className={lbl}>PLY TYPE</label>
              <select 
                value={plyType} 
                onChange={e => setPlyType(e.target.value as any)}
                className={inp}
              >
                <option value="3-Ply">3-Ply</option>
                <option value="5-Ply">5-Ply</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className={lbl}>QUANTITY (SHEETS)</label>
              <input 
                type="text" 
                value={qty} 
                onChange={e => setQty(e.target.value)}
                className={inp}
              />
            </div>

            {/* Length */}
            <div>
              <label className={lbl}>LENGTH (INCHES)</label>
              <input 
                type="text" 
                value={lengthIn} 
                onChange={e => setLengthIn(e.target.value)}
                className={inp}
              />
            </div>

            {/* Width */}
            <div>
              <label className={lbl}>WIDTH (INCHES)</label>
              <input 
                type="text" 
                value={widthIn} 
                onChange={e => setWidthIn(e.target.value)}
                className={inp}
              />
            </div>

            {/* Ups */}
            <div>
              <label className={lbl}>UPS</label>
              <input 
                type="text" 
                value={ups} 
                onChange={e => setUps(e.target.value)}
                className={inp}
              />
            </div>

            {/* Purchase Rate */}
            <div>
              <label className={lbl}>PURCHASE RATE (PER KG)</label>
              <input 
                type="text" 
                value={rate} 
                onChange={e => setRate(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          {/* Liner & Flute GSM configuration */}
          <div className="border border-white/5 rounded-xl p-4 bg-black/15 space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              LINER & FLUTE GSM CONFIGURATION
            </h4>
            
            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* TOP (T) */}
              <div>
                <label className={lbl}>TOP (T)</label>
                <input 
                  type="text" 
                  value={gsmT} 
                  onChange={e => setGsmT(e.target.value)}
                  placeholder="Blank defaults to 0"
                  className={inp}
                />
              </div>

              {/* FLUTE (F) */}
              <div>
                <label className={lbl}>FLUTE (F)</label>
                <input 
                  type="text" 
                  value={gsmF} 
                  onChange={e => setGsmF(e.target.value)}
                  className={inp}
                />
              </div>

              {/* BOTTOM (B) */}
              <div>
                <label className={lbl}>BOTTOM (B)</label>
                <input 
                  type="text" 
                  value={gsmB} 
                  onChange={e => setGsmB(e.target.value)}
                  className={inp}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Outputs */}
        <div className="glass-card rounded-xl p-4 border border-white/5 bg-[#090f1d]/50 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Calculated Outputs
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-3">
              {/* Lean GSM Card */}
              <div className="border border-white/5 rounded-lg p-2.5 bg-black/25">
                <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">LEAN GSM</span>
                <span className="text-lg font-extrabold text-gray-200 font-mono tracking-tight">
                  {leanGsm}
                </span>
                <span className="block text-[8.5px] text-gray-500 font-semibold font-sans mt-0.5">g/m²</span>
              </div>

              {/* Weight Per Sheet Card */}
              <div className="border border-white/5 rounded-lg p-2.5 bg-black/25">
                <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">WEIGHT PER SHEET</span>
                <span className="text-[13px] font-extrabold text-gray-200 font-mono tracking-tight block truncate">
                  {weightPerSheet.toFixed(5)}
                </span>
                <span className="block text-[8.5px] text-gray-500 font-semibold font-sans mt-0.5">kg / sheet</span>
              </div>

              {/* Total Net Weight Card */}
              <div className="border border-white/5 rounded-lg p-2.5 bg-black/25">
                <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">TOTAL NET WEIGHT</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono tracking-tight block">
                  {totalNetWeight.toFixed(2)}
                </span>
                <span className="block text-[8.5px] text-gray-500 font-semibold font-sans mt-0.5">kg</span>
              </div>

              {/* Calculated Amount Card */}
              <div className="border border-white/5 rounded-lg p-2.5 bg-black/25">
                <span className="block text-[8.5px] font-bold text-gray-500 uppercase tracking-wider">CALCULATED AMOUNT</span>
                <span className="text-base font-extrabold text-indigo-400 font-mono tracking-tight block truncate">
                  ₹ {calculatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="block text-[8.5px] text-gray-500 font-semibold font-sans mt-0.5">@ ₹ {parsedRate}/kg</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="bg-indigo-950/20 border border-indigo-900/20 rounded-lg p-2 flex items-start gap-1.5 mt-2">
            <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[9.5px] text-indigo-400 leading-relaxed">
              Values computed here mimic the identical logic executed in backend transactions upon save in the Ply Inward screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
