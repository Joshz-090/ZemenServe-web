'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, KeyRound, ShieldAlert, CheckCircle, XCircle, Trash2, RefreshCw, AlertCircle, Mail, Shield, Check } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Chef' | 'Waiter';
  isActive: boolean;
  resetRequest?: {
    isPending: boolean;
    requestedAt?: string;
    userNote?: string;
  };
  createdAt?: string;
}

// Module-level Cache Memory for Instant 0ms Rendering (SWR Pattern)
let userCacheMemory: { users: UserData[]; pendingResetRequests: UserData[] } | null = null;

export function UserManagementPanel() {
  const [users, setUsers] = useState<UserData[]>(() => userCacheMemory?.users || []);
  const [pendingResetRequests, setPendingResetRequests] = useState<UserData[]>(() => userCacheMemory?.pendingResetRequests || []);
  const [loading, setLoading] = useState<boolean>(() => !userCacheMemory);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Add User Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Manager' | 'Cashier' | 'Chef' | 'Waiter'>('Cashier');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Reset Password Prompt State
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserData | null>(null);
  const [modalNewPassword, setModalNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsers = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Unable to connect to server or unauthorized request');
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      const fetchedUsers = data.users || [];
      const fetchedResetReqs = data.pendingResetRequests || [];

      // Update Cache Memory
      userCacheMemory = {
        users: fetchedUsers,
        pendingResetRequests: fetchedResetReqs,
      };

      setUsers(fetchedUsers);
      setPendingResetRequests(fetchedResetReqs);
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          phoneNumber: newPhone,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMsg(`User ${newName} created successfully!`);
      setShowAddModal(false);
      setNewUsername('');
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !modalNewPassword) return;

    setResettingPassword(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForReset.id,
          newPassword: modalNewPassword,
          clearResetRequest: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccessMsg(`Password for ${selectedUserForReset.username} has been updated.`);
      setSelectedUserForReset(null);
      setModalNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleUserStatus = async (user: UserData) => {
    // Instant Optimistic UI Update (0ms latency)
    const updatedStatus = !user.isActive;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: updatedStatus } : u))
    );

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          isActive: updatedStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Roll back on failure
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: user.isActive } : u))
        );
        throw new Error(data.error || 'Failed to update user status');
      }
      setSuccessMsg(`User ${user.name} status updated.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`Are you sure you want to delete user ${user.name}?`)) return;

    // Instant Optimistic Removal (0ms latency)
    setUsers((prev) => prev.filter((u) => u.id !== user.id));

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // Roll back on failure
        fetchUsers();
        throw new Error(data.error || 'Failed to delete user');
      }
      setSuccessMsg(`User ${user.name} deleted.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>User & Access Control Management</span>
          </h2>
          <p className="text-xs text-slate-400">
            Create system users, assign roles, and approve user password reset requests
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchUsers(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-slate-200">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-slate-200">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PENDING PASSWORD RESET REQUESTS BANNER */}
      {pendingResetRequests.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>{pendingResetRequests.length} Pending Password Reset Request(s)</span>
          </div>
          <div className="grid gap-3">
            {pendingResetRequests.map((reqUser) => (
              <div
                key={reqUser.id}
                className="bg-slate-900 border border-amber-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-sm">{reqUser.name}</span>
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-mono">
                      @{reqUser.username}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{reqUser.email}</span>
                    {reqUser.resetRequest?.userNote && (
                      <span className="text-slate-400 italic">• "{reqUser.resetRequest.userNote}"</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUserForReset(reqUser)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set New Password</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USERS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-200 text-sm">All System Users</h3>
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
            {users.length} Users Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Phone Number</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-850/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-100">{user.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">@{user.username}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-amber-400">{user.phoneNumber || '—'}</td>
                  <td className="px-6 py-4 text-slate-300">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-md font-medium text-[11px] border ${
                        user.role === 'Admin'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : user.role === 'Manager'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : user.role === 'Chef'
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleUserStatus(user)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        user.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Deactivated'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedUserForReset(user)}
                      className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg transition"
                      title="Reset Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    {user.username !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 bg-slate-800 hover:bg-red-500 text-slate-300 hover:text-white rounded-lg transition"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Create New System User</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Full Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Almaz Tadesse"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Phone Number * (New)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +251 911 223 344"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">System Role *</label>
                <select
                  value={newRole}
                  onChange={(e: any) => setNewRole(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Chef">Chef</option>
                  <option value="Waiter">Waiter</option>
                </select>
              </div>

              {newRole !== 'Waiter' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Username (Optional - defaults to phone)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Leave empty to use Phone Number"
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. user@hotel.com"
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Initial Password (Optional)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                  ✨ Waiters only require Full Name and Phone Number. All other fields are closed.
                </div>
              )}

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  {submittingUser ? 'Creating...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Reset Password for @{selectedUserForReset.username}</span>
              </h3>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <p className="text-xs text-slate-300">
                Set a new password for <span className="font-bold text-amber-400">{selectedUserForReset.name}</span>.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <input
                  type="password"
                  value={modalNewPassword}
                  onChange={(e) => setModalNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  {resettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
