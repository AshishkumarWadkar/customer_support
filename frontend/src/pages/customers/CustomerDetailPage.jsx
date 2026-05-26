import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get(`/customers/${id}`)
      .then(({ data }) => setCustomer(data.data))
      .catch(() => toast.error('Failed to load customer'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6"><div className="h-48 bg-slate-100 rounded-lg animate-pulse" /></div>;
  if (!customer) return <div className="p-6 text-slate-500">Customer not found.</div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(ROUTES.CUSTOMERS)} className="p-2 hover:bg-slate-100 rounded-md">
          <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{customer.first_name} {customer.last_name}</h1>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-400">Email</dt><dd className="font-medium text-blue-600">{customer.email}</dd></div>
          <div><dt className="text-slate-400">Phone</dt><dd>{customer.phone || '—'}</dd></div>
          <div><dt className="text-slate-400">Organization</dt><dd>{customer.org_name || '—'}</dd></div>
          <div><dt className="text-slate-400">Timezone</dt><dd>{customer.timezone}</dd></div>
          <div><dt className="text-slate-400">Created</dt><dd>{new Date(customer.created_at).toLocaleString()}</dd></div>
        </dl>
        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-400 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{customer.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailPage;
