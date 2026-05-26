import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CustomerListPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: 1, limit: 20 });
        if (search) params.set('search', search);
        const { data } = await axiosInstance.get(`/customers?${params}`);
        setCustomers(data.data || []);
        setMeta(data.meta || {});
      } catch { toast.error('Failed to load customers'); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">{meta.total || 0} customers</p>
        </div>
        <button onClick={() => navigate(ROUTES.CUSTOMER_CREATE)}
          className="flex items-center gap-2 px-4 h-9 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" /> New Customer
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search customers..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Organization</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({length: 4}).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : customers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">No customers found</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} onClick={() => navigate(ROUTES.CUSTOMER_DETAIL(c.id))}
                className="hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-900">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-blue-600">{c.email}</td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{c.org_name || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerListPage;
