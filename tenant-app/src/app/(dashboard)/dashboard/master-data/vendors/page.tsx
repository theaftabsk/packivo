'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui/Pagination';

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  suppliedMaterials: string[];
  remarks?: string;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_MATERIALS = ['Kraft', 'Duplex', 'FBB Board'];

const BADGE: Record<string, string> = {
  Kraft:       'bg-orange-500/15 text-orange-300 border border-orange-500/20',
  Duplex:      'bg-sky-500/15 text-sky-300 border border-sky-500/20',
  'FBB Board': 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  Printer:     'bg-purple-500/15 text-purple-300 border border-purple-500/20',
  'Co-Vendor': 'bg-red-500/15 text-red-300 border border-red-500/20',
};
const DBADGE = 'bg-gray-500/15 text-gray-300 border border-gray-500/20';

const empty = () => ({
  vendorName: '', contactPerson: '', mobile: '', email: '',
  gstNumber: '', suppliedMaterials: [] as string[], customMaterial: '', remarks: '', isActive: true,
});

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [extraMats, setExtraMats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [pageErr, setPageErr] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  const debouncedSearch = useDebounce(search, 300);

  const fetch = useCallback(async () => {
    setLoading(true); setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res: any = await api.get(`/vendors?${q.toString()}`);
      if (res && res.success) {
        setVendors(res.data || []);
        setMeta(res.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setVendors(Array.isArray(res) ? res : []);
      }
    }
    catch (e: any) { setPageErr(e?.message || 'Failed'); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const openAdd = () => { setEditingId(null); setForm(empty()); setExtraMats([]); setFormErr(''); setShowModal(true); };
  const openEdit = (v: Vendor) => {
    setEditingId(v.id);
    setExtraMats(v.suppliedMaterials.filter(m => !DEFAULT_MATERIALS.includes(m)));
    setForm({ vendorName: v.vendorName, contactPerson: v.contactPerson || '', mobile: v.mobile || '',
      email: v.email || '', gstNumber: v.gstNumber || '', suppliedMaterials: v.suppliedMaterials,
      customMaterial: '', remarks: v.remarks || '', isActive: v.isActive });
    setFormErr(''); setShowModal(true);
  };
  const toggle = (m: string) => setForm(f => ({
    ...f, suppliedMaterials: f.suppliedMaterials.includes(m)
      ? f.suppliedMaterials.filter(x => x !== m) : [...f.suppliedMaterials, m],
  }));
  const addCustom = () => {
    const val = form.customMaterial.trim(); if (!val) return;
    if (![...DEFAULT_MATERIALS, ...extraMats].includes(val)) setExtraMats(p => [...p, val]);
    if (!form.suppliedMaterials.includes(val))
      setForm(f => ({ ...f, suppliedMaterials: [...f.suppliedMaterials, val], customMaterial: '' }));
    else setForm(f => ({ ...f, customMaterial: '' }));
  };
  const save = async () => {
    if (!form.vendorName.trim()) { setFormErr('Vendor Name required'); return; }
    setSaving(true); setFormErr('');
    const p = { vendorName: form.vendorName.trim(), contactPerson: form.contactPerson || undefined,
      mobile: form.mobile || undefined, email: form.email || undefined,
      gstNumber: form.gstNumber || undefined, suppliedMaterials: form.suppliedMaterials,
      remarks: form.remarks || undefined, isActive: form.isActive };
    try {
      if (editingId) await api.patch(`/vendors/${editingId}`, p);
      else await api.post('/vendors', p);
      setShowModal(false); fetch();
    } catch (e: any) { setFormErr(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/vendors/${deleteId}`);
      setDeleteId(null);
      fetch();
    } catch (e: any) {
      setPageErr(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };
  const exportCSV = () => {
    const rows = [['Code','Name','Contact','Mobile','Email','GST','Materials','Status'],
      ...filtered.map(v => [v.vendorCode,v.vendorName,v.contactPerson||'',v.mobile||'',
        v.email||'',v.gstNumber||'',v.suppliedMaterials.join('; '),v.isActive?'Active':'Inactive'])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')],{type:'text/csv'}));
    a.download = 'vendors.csv'; a.click();
  };

  const filtered = vendors;

  const allMats = [...DEFAULT_MATERIALS, ...extraMats];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Vendor Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{meta.totalItems} vendors registered</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button onClick={openAdd} id="btn-add-vendor"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </button>
        </div>
      </div>

      {/* Error */}
      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Search bar */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input id="vendor-search" type="text" placeholder="Search name, mobile, GST..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
        </div>
        <select id="vendor-status-filter" value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-gray-600 ml-auto">
          Showing <span className="text-gray-400 font-medium">{filtered.length}</span> of {meta.totalItems}
        </span>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontSize: '13px' }}>
            <thead>
              <tr className="bg-black/20 border-b border-white/5">
                {['VENDOR NAME','CONTACT PERSON','MOBILE & EMAIL','GST NUMBER','MATERIALS','STATUS','ACTIONS'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-gray-600">Loading vendors…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-12 text-center">
                  <p className="text-[11px] text-gray-600">No vendors found. <button onClick={openAdd} className="text-indigo-400 hover:underline">+ Add new</button></p>
                </td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-white/[0.025] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-100 leading-tight">{v.vendorName}</div>
                    <div className="text-[11px] text-indigo-400 font-mono mt-0.5">{v.vendorCode}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {v.contactPerson || <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{v.mobile || '—'}</div>
                    {v.email && <div className="text-[10px] text-sky-400 mt-0.5">{v.email}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-400" style={{ fontSize: '12px' }}>
                    {v.gstNumber || <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.suppliedMaterials.length === 0
                        ? <span className="text-gray-700">—</span>
                        : v.suppliedMaterials.map(m => (
                          <span key={m} className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${BADGE[m] ?? DBADGE}`}>{m}</span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${v.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {v.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button id={`btn-edit-${v.id}`} onClick={() => openEdit(v)} title="Edit"
                        className="p-1.5 rounded bg-white/5 hover:bg-indigo-500/20 text-gray-500 hover:text-indigo-300 transition-colors cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button id={`btn-del-${v.id}`} onClick={() => setDeleteId(v.id)} title="Delete"
                        className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (
          <Pagination
            currentPage={meta.currentPage}
            totalPages={meta.totalPages}
            totalItems={meta.totalItems}
            itemsPerPage={meta.itemsPerPage}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {/* ═══════════════════════ MODAL ═══════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-100">
                {editingId ? 'Edit Vendor' : 'Add New Vendor'}
              </h3>
              <button onClick={() => setShowModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formErr && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formErr}
              </div>
            )}

            <div className="space-y-3">
              {/* Vendor Name */}
              <div>
                <label className={lbl}>Vendor Name <span className="text-red-400">*</span></label>
                <input id="field-vendorName" type="text" placeholder="e.g. Amar Paper Co"
                  value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
                  className={inp} />
              </div>

              {/* Contact & Mobile */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={lbl}>Contact Person</label>
                  <input id="field-contactPerson" type="text" placeholder="e.g. Rajesh Amar"
                    value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Mobile Number</label>
                  <input id="field-mobile" type="tel" placeholder="e.g. 9825123456"
                    value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className={inp} />
                </div>
              </div>

              {/* Email & GST */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={lbl}>Email Address</label>
                  <input id="field-email" type="email" placeholder="vendor@mail.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>GST Number</label>
                  <input id="field-gst" type="text" placeholder="24AAAAA0123A1Z1"
                    value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                    className={`${inp} font-mono tracking-wide`} />
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className={lbl}>Material Categories Supplied</label>
                <div className="bg-[#080c14] border border-white/5 rounded-xl p-3 space-y-2">
                  {allMats.map(m => (
                    <label key={m} className="flex items-center gap-2.5 cursor-pointer group/item" onClick={() => toggle(m)}>
                      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all shrink-0
                        ${form.suppliedMaterials.includes(m) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600 group-hover/item:border-gray-400'}`}>
                        {form.suppliedMaterials.includes(m) && (
                          <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs font-medium transition-colors ${form.suppliedMaterials.includes(m) ? 'text-gray-100' : 'text-gray-500 group-hover/item:text-gray-300'}`}>{m}</span>
                    </label>
                  ))}
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[9px] text-gray-600 font-semibold uppercase tracking-wider mb-1.5">Add Custom</p>
                    <div className="flex gap-1.5">
                      <input id="field-customMat" type="text" placeholder="e.g. Corrugated Roll"
                        value={form.customMaterial}
                        onChange={e => setForm(f => ({ ...f, customMaterial: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                        className="flex-1 bg-[#0d1322] border border-white/5 rounded-lg px-2.5 py-1 text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50" />
                      <button type="button" onClick={addCustom}
                        className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer">
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={lbl}>Remarks</label>
                <textarea id="field-remarks" placeholder="Optional comments" rows={2}
                  value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  className={`${inp} resize-none`} />
              </div>

              {/* Status toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-200">Active Status</div>
                  <div className="text-[10px] text-gray-600">Vendor is available for transactions</div>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
              <button onClick={() => setShowModal(false)} id="btn-cancel-vendor"
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-gray-400 hover:text-white font-medium transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={save} disabled={saving} id="btn-save-vendor"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-1.5">
                {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : (editingId ? 'Update Vendor' : 'Save Vendor')}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? This action cannot be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-colors';
