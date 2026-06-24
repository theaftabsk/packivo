'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useDebounce } from '@/hooks/useDebounce';
import { Pagination } from '@/components/ui/Pagination';

interface Customer {
  id: string;
  customerCode: string;
  customerName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
}

const empty = () => ({
  customerName: '', contactPerson: '', mobile: '', email: '',
  gstNumber: '', billingAddress: '', shippingAddress: '',
  city: '', state: '', remarks: '', isActive: true,
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
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

  const fetchCustomers = useCallback(async () => {
    setLoading(true); setPageErr('');
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res: any = await api.get(`/customers?${q.toString()}`);
      if (res && res.success) {
        setCustomers(res.data || []);
        setMeta(res.meta || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 });
      } else {
        setCustomers(Array.isArray(res) ? res : []);
      }
    } catch (e: any) { setPageErr(e?.message || 'Failed to load customers'); }
    finally { setLoading(false); }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const openAdd = () => { setEditingId(null); setForm(empty()); setFormErr(''); setShowModal(true); };
  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      customerName: c.customerName, contactPerson: c.contactPerson || '',
      mobile: c.mobile || '', email: c.email || '', gstNumber: c.gstNumber || '',
      billingAddress: c.billingAddress || '', shippingAddress: c.shippingAddress || '',
      city: c.city || '', state: c.state || '', remarks: c.remarks || '', isActive: c.isActive,
    });
    setFormErr(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.customerName.trim()) { setFormErr('Customer Name required'); return; }
    setSaving(true); setFormErr('');
    const payload = {
      customerName: form.customerName.trim(),
      contactPerson: form.contactPerson || undefined,
      mobile: form.mobile || undefined,
      email: form.email || undefined,
      gstNumber: form.gstNumber || undefined,
      billingAddress: form.billingAddress || undefined,
      shippingAddress: form.shippingAddress || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      remarks: form.remarks || undefined,
      isActive: form.isActive,
    };
    try {
      if (editingId) await api.patch(`/customers/${editingId}`, payload);
      else await api.post('/customers', payload);
      setShowModal(false); fetchCustomers();
    } catch (e: any) { setFormErr(e?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteId}`);
      setDeleteId(null);
      fetchCustomers();
    } catch (e: any) {
      setPageErr(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Code', 'Name', 'Contact', 'Mobile', 'Email', 'GST', 'City', 'State', 'Status'],
      ...filtered.map(c => [
        c.customerCode, c.customerName, c.contactPerson || '', c.mobile || '',
        c.email || '', c.gstNumber || '', c.city || '', c.state || '',
        c.isActive ? 'Active' : 'Inactive',
      ]),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = 'customers.csv'; a.click();
  };

  const filtered = customers;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-100 tracking-tight">Customer / Buyer Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">{meta.totalItems} customers registered</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Import CSV
          </button>
          <button onClick={openAdd} id="btn-add-customer"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            + Add New
          </button>
        </div>
      </div>

      {/* Error */}
      {pageErr && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {pageErr}
        </div>
      )}

      {/* Search / Filter Bar */}
      <div className="glass-card rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input id="customer-search" type="text" placeholder="Search customer, contact, city..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#080c14] border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-[#080c14] border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
          Filter
        </button>
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
                {['CUSTOMER NAME', 'CONTACT PERSON', 'MOBILE & EMAIL', 'GST NUMBER', 'CITY / STATE', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-600">Loading customers…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-xs text-gray-600">No customers found. <button onClick={openAdd} className="text-emerald-400 hover:underline">+ Add new</button></p>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.025] transition-colors group">
                  {/* Customer Name */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-100 leading-tight">{c.customerName}</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{c.customerCode}</div>
                  </td>
                  {/* Contact */}
                  <td className="px-4 py-3 text-gray-300">
                    {c.contactPerson || <span className="text-gray-700">—</span>}
                  </td>
                  {/* Mobile & Email */}
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{c.mobile || '—'}</div>
                    {c.email && <div className="text-[11px] text-sky-400 mt-0.5">{c.email}</div>}
                  </td>
                  {/* GST */}
                  <td className="px-4 py-3 font-mono text-gray-400" style={{ fontSize: '12px' }}>
                    {c.gstNumber || <span className="text-gray-700">—</span>}
                  </td>
                  {/* City / State */}
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{c.city || '—'}</div>
                    {c.state && <div className="text-[11px] text-gray-500 mt-0.5">{c.state}</div>}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button id={`btn-edit-${c.id}`} onClick={() => openEdit(c)} title="Edit"
                        className="p-1.5 rounded bg-white/5 hover:bg-emerald-500/20 text-gray-500 hover:text-emerald-300 transition-colors cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button id={`btn-del-${c.id}`} onClick={() => setDeleteId(c.id)} title="Delete"
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

      {/* ══════════════════ MODAL ══════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-100">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formErr && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg mb-3 flex items-center gap-2">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formErr}
              </div>
            )}

            <div className="space-y-3">
              {/* Customer Name */}
              <div>
                <label className={lbl}>Customer Name <span className="text-red-400">*</span></label>
                <input id="field-customerName" type="text" placeholder="e.g. Jumani Implex"
                  value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  className={inp} />
              </div>

              {/* Contact & Mobile */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={lbl}>Contact Person</label>
                  <input id="field-contact" type="text" placeholder="e.g. Sanjay Jumani"
                    value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Mobile Number</label>
                  <input id="field-mobile" type="tel" placeholder="e.g. 9825678901"
                    value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} className={inp} />
                </div>
              </div>

              {/* Email & GST */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={lbl}>Email Address</label>
                  <input id="field-email" type="email" placeholder="e.g. orders@jumani.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>GST Number</label>
                  <input id="field-gst" type="text" placeholder="24FFFFC1234C1Z6"
                    value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                    className={`${inp} font-mono tracking-wide`} />
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <label className={lbl}>Billing Address</label>
                <textarea id="field-billing" rows={2} placeholder="Office / Billing address"
                  value={form.billingAddress} onChange={e => setForm(f => ({ ...f, billingAddress: e.target.value }))}
                  className={`${inp} resize-none`} />
              </div>

              {/* Shipping Address */}
              <div>
                <label className={lbl}>Shipping Address</label>
                <textarea id="field-shipping" rows={2} placeholder="Factory / Delivery warehouse address (Leave blank if same as billing)"
                  value={form.shippingAddress} onChange={e => setForm(f => ({ ...f, shippingAddress: e.target.value }))}
                  className={`${inp} resize-none`} />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={lbl}>City</label>
                  <input id="field-city" type="text" placeholder="e.g. Umargam"
                    value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>State</label>
                  <input id="field-state" type="text" placeholder="e.g. Gujarat"
                    value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inp} />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={lbl}>Remarks</label>
                <textarea id="field-remarks" rows={2} placeholder="Optional comments"
                  value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  className={`${inp} resize-none`} />
              </div>

              {/* Active status checkbox — matches screenshot */}
              <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-200">Active status</div>
                  <div className="text-[10px] text-gray-600">Customer is available for dispatches</div>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
              <button onClick={() => setShowModal(false)} id="btn-cancel-customer"
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-400 hover:text-white font-medium transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={save} disabled={saving} id="btn-save-customer"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5">
                {saving
                  ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                  : editingId ? 'Save Customer' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

const lbl = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1';
const inp = 'w-full bg-[#080c14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors';
