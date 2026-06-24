'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  type?: 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  type = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmBtnClass =
    type === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget && !loading) onCancel(); }}>
      <div className="glass-card rounded-2xl p-5 w-full max-w-sm border border-white/10 shadow-2xl space-y-4 transform transition-all duration-200 scale-100">
        
        {/* Title */}
        <h3 className="text-sm font-bold text-gray-100">
          {title}
        </h3>

        {/* Message */}
        <p className="text-xs text-gray-400 leading-relaxed font-sans">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-gray-400 hover:text-white font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${confirmBtnClass}`}
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
