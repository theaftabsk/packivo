"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../../../lib/api";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function UsersAdministrationPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>("/users");
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (typeof window !== "undefined") {
      setCurrentUserEmail(localStorage.getItem("user_email") || "");
    }
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("VIEWER");
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(""); // Keep blank unless resetting
    setRole(user.role);
    setFormError("");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      if (editingUser) {
        // Edit User
        const payload: any = { name, email, role };
        if (password) {
          payload.password = password;
        }
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        // Add User
        if (!password) {
          throw new Error("Password is required for new accounts.");
        }
        await api.post("/users", { name, email, password, role });
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Operation failed. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteId}`);
      setDeleteId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  // Helper mapping for roles badges
  const getRoleBadgeClasses = (userRole: string) => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/15";
      case "TENANT_ADMIN":
      case "ADMIN":
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

  const formatRoleName = (userRole: string) => {
    if (userRole === "TENANT_ADMIN") return "ADMIN";
    if (userRole === "VIEWER") return "VIEWER / READ-ONLY";
    return userRole.replace("_", " ");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-100">User Accounts & Access Control</h2>
          <p className="text-xs text-gray-400 mt-1">
            Define system operators and assign role restrictions (Purchase, Production, Dispatch, Viewer, Admin, Super Admin).
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg border border-indigo-500/20 cursor-pointer w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          + Add Operator Account
        </button>
      </div>

      {/* Main Panel */}
      <div className="glass-card rounded-xl p-6 border border-white/5 space-y-4 shadow-xl">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-400">Loading user accounts ledger...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl">
            {error}
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-12">No operator accounts registered.</p>
        ) : (
          <div className="border border-white/5 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/25 text-gray-400 border-b border-white/5 font-semibold">
                  <th className="p-3.5">Operator Name</th>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Roles Assigned</th>
                  <th className="p-3.5">Date Added</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.email === currentUserEmail;
                  return (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                      <td className="p-3.5 font-semibold text-gray-200">{user.name}</td>
                      <td className="p-3.5 text-gray-400 font-mono">{user.email}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getRoleBadgeClasses(user.role)}`}>
                          {formatRoleName(user.role)}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-450 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })} {new Date(user.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-2.5 py-1 rounded text-[10px] font-semibold border border-indigo-500/15 cursor-pointer inline-flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                        {isSelf ? (
                          <span className="text-[10px] text-gray-500 font-semibold px-2.5 py-1 border border-white/5 bg-white/5 rounded inline-block cursor-default select-none">
                            Self profile
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteId(user.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1 rounded text-[10px] font-semibold border border-red-500/15 cursor-pointer inline-flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM DIALOG MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-white/10 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                {editingUser ? "Edit Operator Account" : "Add Operator Account"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3.5 py-2.5 rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Operator Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Admin Operator"
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. staff@gigani.com"
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">
                  {editingUser ? "Password (Leave blank to keep current)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Role Restrictions</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-white/5 bg-[#070b13] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="TENANT_ADMIN">ADMIN</option>
                  <option value="PURCHASE_USER">PURCHASE USER</option>
                  <option value="PRODUCTION_USER">PRODUCTION USER</option>
                  <option value="DISPATCH_USER">DISPATCH USER</option>
                  <option value="VIEWER">VIEWER / READ-ONLY</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-200 font-medium py-2 rounded-lg text-xs cursor-pointer border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? "Saving Operator..." : "Save Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Operator Account"
        message="Are you sure you want to delete this user operator? This action cannot be undone."
        loading={deleting}
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
