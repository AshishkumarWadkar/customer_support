import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  TicketIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';

const MetricCard = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {change !== undefined && (
          <p className={`text-xs mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last period
          </p>
        )}
      </div>
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

const STATUS_COLORS = {
  new: '#7c3aed', open: '#2563eb', in_progress: '#0891b2',
  pending_customer: '#d97706', escalated: '#dc2626',
  resolved: '#16a34a', closed: '#64748b',
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get('/dashboard/admin');
        setData(res.data.data);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Placeholder data for display if API not connected
  const metrics = data || {
    totalTickets: 1247,
    openTickets: 89,
    resolvedToday: 34,
    slaComplianceRate: 94.2,
    byStatus: [
      { status: 'new', count: 23 }, { status: 'open', count: 89 },
      { status: 'in_progress', count: 156 }, { status: 'resolved', count: 712 },
    ],
    trend: [
      { date: 'May 20', count: 42 }, { date: 'May 21', count: 38 },
      { date: 'May 22', count: 55 }, { date: 'May 23', count: 61 },
      { date: 'May 24', count: 48 }, { date: 'May 25', count: 52 },
      { date: 'May 26', count: 46 },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of support operations</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Tickets" value={metrics.totalTickets?.toLocaleString() || '—'} change={3.2} icon={TicketIcon} color="bg-blue-500" />
        <MetricCard title="Open Tickets" value={metrics.openTickets || '—'} change={-5.1} icon={ClockIcon} color="bg-orange-500" />
        <MetricCard title="Resolved Today" value={metrics.resolvedToday || '—'} change={12.4} icon={CheckCircleIcon} color="bg-green-500" />
        <MetricCard title="SLA Compliance" value={`${metrics.slaComplianceRate || 94}%`} change={1.8} icon={ExclamationTriangleIcon} color="bg-purple-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Ticket Volume (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={metrics.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Tickets by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={metrics.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {metrics.byStatus?.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
