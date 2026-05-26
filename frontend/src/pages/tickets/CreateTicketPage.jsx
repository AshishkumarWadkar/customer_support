import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const schema = yup.object({
  subject: yup.string().min(5, 'Subject must be at least 5 characters').required('Subject is required'),
  description: yup.string().min(10, 'Description must be at least 10 characters').required(),
  priority: yup.string().required('Priority is required'),
  customerEmail: yup.string().email('Valid email required').required('Customer email is required'),
  customerName: yup.string().required('Customer name is required'),
});

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = async (data) => {
    try {
      const { data: res } = await axiosInstance.post('/tickets', data);
      toast.success(`Ticket ${res.data.ticket_number} created!`);
      navigate(ROUTES.TICKET_DETAIL(res.data.id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create ticket');
    }
  };

  const Field = ({ label, error, children, required }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(ROUTES.TICKETS)} className="p-2 hover:bg-slate-100 rounded-md">
          <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Ticket</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Customer Name" error={errors.customerName?.message} required>
              <input {...register('customerName')} placeholder="Alice Johnson"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerName ? 'border-red-400' : 'border-slate-300'}`} />
            </Field>
            <Field label="Customer Email" error={errors.customerEmail?.message} required>
              <input {...register('customerEmail')} placeholder="alice@company.com"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customerEmail ? 'border-red-400' : 'border-slate-300'}`} />
            </Field>
          </div>

          <Field label="Subject" error={errors.subject?.message} required>
            <input {...register('subject')} placeholder="Briefly describe the issue"
              className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.subject ? 'border-red-400' : 'border-slate-300'}`} />
          </Field>

          <Field label="Description" error={errors.description?.message} required>
            <textarea {...register('description')} rows={5} placeholder="Describe the issue in detail..."
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.description ? 'border-red-400' : 'border-slate-300'}`} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Priority" error={errors.priority?.message} required>
              <select {...register('priority')}
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.priority ? 'border-red-400' : 'border-slate-300'}`}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Category">
              <input {...register('category')} placeholder="Technical Issue, Billing..."
                className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting}
              className="px-6 h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
            </button>
            <button type="button" onClick={() => navigate(ROUTES.TICKETS)}
              className="px-6 h-10 border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketPage;
