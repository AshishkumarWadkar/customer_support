import { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER:     'bg-blue-100   text-blue-800',
  AGENT:       'bg-green-100  text-green-800',
  CUSTOMER:    'bg-slate-100  text-slate-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-700'}`}>
    {role?.replace('_', ' ')}
  </span>
);

// ── Confirmation Dialog ───────────────────────────────────────────────────────

const ConfirmDialog = ({ open, onClose, onConfirm, action, userName, roleName, onRoleChange, roles, loading }) => {
  if (!open) return null;

  const isAssign = action === 'assign';
  const colorBg  = isAssign ? 'bg-blue-100'  : 'bg-red-100';
  const colorTxt = isAssign ? 'text-blue-600' : 'text-red-600';
  const btnCls   = isAssign ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-full ${colorBg} flex items-center justify-center flex-shrink-0`}>
            {isAssign
              ? <ShieldCheckIcon className={`h-5 w-5 ${colorTxt}`} />
              : <ExclamationTriangleIcon className={`h-5 w-5 ${colorTxt}`} />
            }
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isAssign ? 'Assign Role' : 'Revoke Role'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">This takes effect immediately</p>
          </div>
        </div>

        {/* Role selector for assign action */}
        {isAssign && onRoleChange && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Select role to assign</label>
            <select
              value={roleName || ''}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— choose a role —</option>
              {(roles || []).map((r) => (
                <option key={r.id} value={r.name}>{r.name.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-4 mb-5 text-sm text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">User</span>
            <span className="font-medium">{userName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role</span>
            {roleName ? <RoleBadge role={roleName} /> : <span className="text-slate-400 italic">not selected</span>}
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Action</span>
            <span className={`font-semibold ${colorTxt}`}>
              {isAssign ? 'Assign' : 'Revoke'}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (isAssign && !roleName)}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors ${btnCls}`}
          >
            {loading ? 'Processing...' : isAssign ? 'Assign Role' : 'Revoke Role'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Bulk Confirm Dialog ───────────────────────────────────────────────────────

const BulkConfirmDialog = ({ open, onClose, onConfirm, action, count, roleName, loading }) => {
  if (!open) return null;
  const isAssign = action === 'assign';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-full ${isAssign ? 'bg-blue-100' : 'bg-red-100'} flex items-center justify-center flex-shrink-0`}>
            <UserGroupIcon className={`h-5 w-5 ${isAssign ? 'text-blue-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Bulk {isAssign ? 'Assign' : 'Revoke'} Role
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Affects {count} user{count !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 mb-5 text-sm text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Users selected</span>
            <span className="font-medium">{count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role</span>
            <RoleBadge role={roleName} />
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Action</span>
            <span className={`font-semibold ${isAssign ? 'text-blue-600' : 'text-red-600'}`}>
              {isAssign ? 'Assign to all' : 'Revoke from all'}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 transition-colors ${isAssign ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading ? 'Processing...' : `Confirm ${isAssign ? 'Assign' : 'Revoke'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Audit Log Panel ───────────────────────────────────────────────────────────

const AuditLogPanel = ({ open }) => {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', targetName: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo + 'T23:59:59';
      const res = await axiosInstance.get('/admin/audit-logs', { params });
      setLogs(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  if (!open) return null;

  const totalPages = Math.ceil(total / 10);

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <div className="bg-white rounded-xl border border-slate-200 mt-6">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Role Change Audit Log</h2>
          <p className="text-xs text-slate-400 mt-0.5">{total} entries</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setPage(1); }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setPage(1); }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="To"
          />
          <button onClick={fetchLogs} className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-slate-400 text-sm">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="py-12 flex items-center justify-center text-slate-400 text-sm">No audit entries found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Timestamp</th>
                <th className="px-6 py-3 text-left">Action</th>
                <th className="px-6 py-3 text-left">Target User</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                const isAssign = log.event_type === 'ROLE_ASSIGNED';
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isAssign ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isAssign ? <CheckCircleIcon className="h-3 w-3" /> : <XMarkIcon className="h-3 w-3" />}
                        {isAssign ? 'Assigned' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800">{log.target_name || '—'}</p>
                      <p className="text-xs text-slate-400">{log.target_email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <RoleBadge role={meta?.role} />
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800">{log.admin_name || '—'}</p>
                      <p className="text-xs text-slate-400">{log.admin_email}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const RoleManagementPage = () => {
  const { user: currentUser } = useAuth();

  // ── Data state ────────────────────────────────────────────────────────────
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [roles, setRoles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selected, setSelected]   = useState(new Set());
  const [bulkRole, setBulkRole]   = useState('');

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [dialog, setDialog]       = useState(null); // { action, userId, userName, roleName }
  const [bulkDialog, setBulkDialog] = useState(null); // { action, roleName }
  const [dialogLoading, setDialogLoading] = useState(false);

  // ── Audit log toggle ──────────────────────────────────────────────────────
  const [showAudit, setShowAudit] = useState(false);

  const LIMIT = 15;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter)      params.role   = roleFilter;
      const res = await axiosInstance.get('/admin/users', { params });
      setUsers(res.data.data);
      setTotal(res.data.meta.total);
    } catch {
      if (!isBackground) toast.error('Failed to load users. Please retry or contact support.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/admin/roles');
      setRoles(res.data.data);
    } catch {
      toast.error('Failed to load roles');
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);
  useEffect(() => { fetchUsers(false); }, [fetchUsers]);
  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter]);

  const totalPages = Math.ceil(total / LIMIT);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Single role ops ───────────────────────────────────────────────────────
  const openAssign = (u) => setDialog({ action: 'assign', userId: u.id, userName: `${u.first_name} ${u.last_name}`, roleName: '' });
  const openRevoke = (u) => setDialog({ action: 'revoke', userId: u.id, userName: `${u.first_name} ${u.last_name}`, roleName: u.role });

  const handleConfirm = async () => {
    if (!dialog.roleName && dialog.action === 'assign') {
      toast.error('Please select a role to assign');
      return;
    }
    setDialogLoading(true);
    try {
      const endpoint = `/admin/users/${dialog.userId}/roles/${dialog.action}`;
      const res = await axiosInstance.post(endpoint, { role: dialog.roleName });
      toast.success(res.data.message);
      setDialog(null);
      fetchUsers(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed. Please retry or contact support.';
      toast.error(msg);
    } finally {
      setDialogLoading(false);
    }
  };

  // ── Bulk ops ──────────────────────────────────────────────────────────────
  const openBulkAssign = () => {
    if (!bulkRole) { toast.error('Select a role first'); return; }
    setBulkDialog({ action: 'assign', roleName: bulkRole });
  };

  const openBulkRevoke = () => {
    if (!bulkRole) { toast.error('Select a role first'); return; }
    setBulkDialog({ action: 'revoke', roleName: bulkRole });
  };

  const handleBulkConfirm = async () => {
    setDialogLoading(true);
    try {
      const endpoint = `/admin/roles/bulk-${bulkDialog.action}`;
      const res = await axiosInstance.post(endpoint, {
        userIds: Array.from(selected),
        role: bulkDialog.roleName,
      });
      const { summary } = res.data.data;
      toast.success(`${summary.successCount} ${bulkDialog.action === 'assign' ? 'assigned' : 'revoked'}, ${summary.skippedCount} skipped`);
      setBulkDialog(null);
      setSelected(new Set());
      fetchUsers(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Bulk operation failed. Please retry or contact support.';
      toast.error(msg);
    } finally {
      setDialogLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Assign and revoke platform roles for all users</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(false)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAudit((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showAudit ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Audit Log
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>{r.name.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk toolbar (visible when users are selected) */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-blue-800">{selected.size} user{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>{r.name.replace('_', ' ')}</option>
              ))}
            </select>
            <button
              onClick={openBulkAssign}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Assign to all
            </button>
            <button
              onClick={openBulkRevoke}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Revoke from all
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors"
              title="Clear selection"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-slate-400 text-sm">
            <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <UserGroupIcon className="h-8 w-8" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Current Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${selected.has(u.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {u.first_name} {u.last_name}
                              {isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAssign(u)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => openRevoke(u)}
                            disabled={isSelf && u.role === 'SUPER_ADMIN'}
                            title={isSelf && u.role === 'SUPER_ADMIN' ? 'Cannot revoke your own admin role' : undefined}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} users
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
              </button>
              <span className="px-3 py-1.5 font-medium text-slate-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Panel */}
      <AuditLogPanel open={showAudit} />

      {/* Single op confirm dialog */}
      <ConfirmDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
        action={dialog?.action}
        userName={dialog?.userName}
        roleName={dialog?.roleName}
        onRoleChange={(r) => setDialog((d) => ({ ...d, roleName: r }))}
        roles={roles}
        loading={dialogLoading}
      />

      {/* Bulk op confirm dialog */}
      <BulkConfirmDialog
        open={!!bulkDialog}
        onClose={() => setBulkDialog(null)}
        onConfirm={handleBulkConfirm}
        action={bulkDialog?.action}
        count={selected.size}
        roleName={bulkDialog?.roleName}
        loading={dialogLoading}
      />
    </div>
  );
};

export default RoleManagementPage;
