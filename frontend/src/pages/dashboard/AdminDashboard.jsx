import { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  TicketIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 30_000; // 30 s — well within the 60 s requirement

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d',   label: 'Last 7 days' },
  { value: '30d',  label: 'Last 30 days' },
];

const STATUS_COLORS = {
  new:              '#7c3aed',
  open:             '#2563eb',
  in_progress:      '#0891b2',
  pending_customer: '#d97706',
  escalated:        '#dc2626',
  resolved:         '#16a34a',
  closed:           '#64748b',
};

const SLA_COLORS = {
  onTrack:  '#16a34a',
  atRisk:   '#d97706',
  breached: '#dc2626',
  paused:   '#64748b',
  none:     '#e2e8f0',
};

// ── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-4">
    <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
      <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/**
 * SLA Tracking Panel
 * Shows a horizontal stacked bar + legend breakdown of open tickets by SLA status.
 */
const SlaPanel = ({ slaBreakdown, slaComplianceRate }) => {
  const bd = slaBreakdown || { onTrack: 0, atRisk: 0, breached: 0, paused: 0, none: 0 };
  const total = Object.values(bd).reduce((s, v) => s + v, 0);

  const segments = [
    { key: 'onTrack',  label: 'On Track',  color: SLA_COLORS.onTrack  },
    { key: 'atRisk',   label: 'At Risk',   color: SLA_COLORS.atRisk   },
    { key: 'breached', label: 'Breached',  color: SLA_COLORS.breached },
    { key: 'paused',   label: 'Paused',    color: SLA_COLORS.paused   },
    { key: 'none',     label: 'No SLA',    color: SLA_COLORS.none     },
  ].filter((s) => bd[s.key] > 0);

  const pct = (n) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">SLA Tracking</h2>
          <p className="text-xs text-slate-400 mt-0.5">Open tickets by SLA status</p>
        </div>
        {/* Overall compliance badge */}
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{slaComplianceRate ?? '—'}%</p>
          <p className="text-xs text-slate-400">compliance (all time)</p>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No open tickets</p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-6 rounded-full overflow-hidden gap-px mb-4">
            {segments.map((s) => (
              <div
                key={s.key}
                title={`${s.label}: ${bd[s.key]} (${pct(bd[s.key])}%)`}
                style={{ width: `${pct(bd[s.key])}%`, backgroundColor: s.color }}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {segments.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs text-slate-600 truncate">
                  {s.label}
                  <span className="font-semibold ml-1 text-slate-900">{bd[s.key]}</span>
                  <span className="text-slate-400 ml-1">({pct(bd[s.key])}%)</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const RangeFilter = ({ value, onChange }) => (
  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
    {RANGE_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          value === opt.value
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const RefreshIndicator = ({ lastRefreshed, onRefresh, isLoading }) => {
  const fmt = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span>Updated {fmt}</span>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh now"
        className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
      >
        <ArrowPathIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

// ── Skeleton loaders ─────────────────────────────────────────────────────────

const Skeleton = ({ className }) => (
  <div className={`bg-slate-100 rounded-lg animate-pulse ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-56" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
    </div>
    <Skeleton className="h-36" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const [data, setData]               = useState(null);
  const [range, setRange]             = useState('7d');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const intervalRef                   = useRef(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await axiosInstance.get('/dashboard/admin', { params: { range } });
      setData(res.data.data);
      setLastRefreshed(new Date());
    } catch {
      // Only toast on manual / foreground fetches to avoid spamming during polling
      if (!isBackground) toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  // Fetch immediately when range changes, then poll every 30 s
  useEffect(() => {
    fetchData(false);

    intervalRef.current = setInterval(() => fetchData(true), REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  const m = data || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time overview of support operations</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <RefreshIndicator
            lastRefreshed={lastRefreshed}
            onRefresh={() => fetchData(false)}
            isLoading={refreshing}
          />
          <RangeFilter value={range} onChange={setRange} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={`Tickets (${RANGE_OPTIONS.find((o) => o.value === range)?.label})`}
          value={m.totalTickets?.toLocaleString() ?? '—'}
          icon={TicketIcon}
          color="bg-blue-500"
          sub="Created in selected period"
        />
        <MetricCard
          title="Open Tickets"
          value={m.openTickets ?? '—'}
          icon={ClockIcon}
          color="bg-orange-500"
          sub="Not yet resolved or closed"
        />
        <MetricCard
          title="Resolved Today"
          value={m.resolvedToday ?? '—'}
          icon={CheckCircleIcon}
          color="bg-green-500"
          sub={`Avg ${m.avgResolutionHours ?? '—'}h to resolve`}
        />
        <MetricCard
          title="SLA Compliance"
          value={`${m.slaComplianceRate ?? '—'}%`}
          icon={ExclamationTriangleIcon}
          color="bg-purple-500"
          sub="% of tickets not breached"
        />
      </div>

      {/* SLA Tracking Panel */}
      <SlaPanel
        slaBreakdown={m.slaBreakdown}
        slaComplianceRate={m.slaComplianceRate}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            Ticket Volume
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            {RANGE_OPTIONS.find((o) => o.value === range)?.label}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={m.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Tickets by Status</h2>
          <p className="text-xs text-slate-400 mb-4">All time distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={m.byStatus || []}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ status, percent }) =>
                  percent > 0.04 ? `${status} ${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {(m.byStatus || []).map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority breakdown + Top agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By priority */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Tickets by Priority</h2>
          <p className="text-xs text-slate-400 mb-4">All time</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={m.byPriority || []} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="priority" type="category" tick={{ fontSize: 11 }} width={64} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(m.byPriority || []).map((entry) => (
                  <Cell
                    key={entry.priority}
                    fill={
                      entry.priority === 'critical' ? '#dc2626' :
                      entry.priority === 'high'     ? '#f97316' :
                      entry.priority === 'medium'   ? '#eab308' : '#64748b'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top agents */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Top Agents</h2>
          <p className="text-xs text-slate-400 mb-4">Resolved tickets this month</p>
          {(m.topAgents || []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
          ) : (
            <ul className="space-y-3">
              {(m.topAgents || []).map((agent, i) => (
                <li key={agent.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                    {agent.name?.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{agent.name}</p>
                  </div>
                  <span className="text-sm font-bold text-green-600">{agent.resolved}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
