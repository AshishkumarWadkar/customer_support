import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone || '', timezone: user?.timezone || 'UTC' },
  });

  const onSubmit = async (data) => {
    try {
      const { data: res } = await axiosInstance.put(`/users/${user.id}`, {
        first_name: data.firstName, last_name: data.lastName, phone: data.phone, timezone: data.timezone,
      });
      updateUser({ firstName: data.firstName, lastName: data.lastName });
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-500 text-sm">{user?.role?.replace('_', ' ')}</p>
            <p className="text-slate-400 text-xs">{user?.email}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input {...register('firstName')} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input {...register('lastName')} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input {...register('phone')} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <input {...register('timezone')} className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={isSubmitting}
            className="px-6 h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
