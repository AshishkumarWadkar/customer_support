import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  new: 'bg-violet-100 text-violet-700',
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  pending_customer: 'bg-amber-100 text-amber-700',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
};

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const Badge = ({ value, map }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[value] || 'bg-slate-100 text-slate-600'}`}>
    {value?.replace(/_/g, ' ')}
  </span>
);

const TicketListPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', page: 1 });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      params.set('page', filters.page);
      params.set('limit', '20');

      const { data } = await axiosInstance.get(`/tickets?${params}`);
      setTickets(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchTickets, 300);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-slate-500 text-sm mt-1">{meta.total} total tickets</p>
        </div>
        <Link to={ROUTES.TICKET_CREATE}
          className="flex items-center gap-2 px-4 h-9 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" />
          New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}
          className="h-9 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {['new','open','in_progress','pending_customer','escalated','resolved','closed'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}
          className="h-9 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Priorities</option>
          {['critical','high','medium','low'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Ticket</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Subject</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden xl:table-cell">Assigned</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden xl:table-cell">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  No tickets found
                </td>
              </tr>
            ) : tickets.map((ticket) => (
              <tr key={ticket.id} onClick={() => navigate(ROUTES.TICKET_DETAIL(ticket.id))}
                className="hover:bg-slate-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{ticket.ticket_number}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900 line-clamp-1">{ticket.subject}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{ticket.customer_name}</td>
                <td className="px-4 py-3"><Badge value={ticket.status} map={STATUS_COLORS} /></td>
                <td className="px-4 py-3 hidden lg:table-cell"><Badge value={ticket.priority} map={PRIORITY_COLORS} /></td>
                <td className="px-4 py-3 text-slate-600 hidden xl:table-cell">
                  {ticket.agent_first ? `${ticket.agent_first} ${ticket.agent_last}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs hidden xl:table-cell">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={meta.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 h-8 border border-slate-300 rounded text-sm disabled:opacity-50 hover:bg-slate-50">
                Previous
              </button>
              <button disabled={meta.page >= meta.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 h-8 border border-slate-300 rounded text-sm disabled:opacity-50 hover:bg-slate-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketListPage;
