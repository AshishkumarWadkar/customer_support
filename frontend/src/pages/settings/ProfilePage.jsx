import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .min(8, 'At least 8 characters required')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must include uppercase, lowercase, number, and special character (@$!%*?&)'
    )
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your new password'),
});

const PasswordInput = ({ label, register, name, error, show, onToggle }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        {...register(name)}
        placeholder="••••••••"
        className={`w-full h-10 px-3 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
  </div>
);

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { isSubmitting: isProfileSubmitting },
  } = useForm({
    defaultValues: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone || '',
      timezone: user?.timezone || 'UTC',
    },
  });

  // Change Password form
  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPwForm,
    formState: { errors: pwErrors, isSubmitting: isPwSubmitting },
  } = useForm({ resolver: yupResolver(passwordSchema) });

  const onProfileSubmit = async (data) => {
    try {
      await axiosInstance.put(`/users/${user.id}`, {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        timezone: data.timezone,
      });
      updateUser({ firstName: data.firstName, lastName: data.lastName });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      await axiosInstance.put('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      resetPwForm();
      setShowCurrentPw(false);
      setShowNewPw(false);
      setShowConfirmPw(false);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to change password';
      toast.error(message);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

      {/* Profile Details */}
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
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                {...registerProfile('firstName')}
                className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                {...registerProfile('lastName')}
                className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              {...registerProfile('phone')}
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <input
              {...registerProfile('timezone')}
              className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isProfileSubmitting}
            className="px-6 h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Password must be at least 8 characters with uppercase, lowercase, number, and special character.
          </p>
        </div>
        <form onSubmit={handlePwSubmit(onPasswordSubmit)} className="space-y-4">
          <PasswordInput
            label="Current Password"
            register={registerPw}
            name="currentPassword"
            error={pwErrors.currentPassword}
            show={showCurrentPw}
            onToggle={() => setShowCurrentPw((v) => !v)}
          />
          <PasswordInput
            label="New Password"
            register={registerPw}
            name="newPassword"
            error={pwErrors.newPassword}
            show={showNewPw}
            onToggle={() => setShowNewPw((v) => !v)}
          />
          <PasswordInput
            label="Confirm New Password"
            register={registerPw}
            name="confirmPassword"
            error={pwErrors.confirmPassword}
            show={showConfirmPw}
            onToggle={() => setShowConfirmPw((v) => !v)}
          />
          <button
            type="submit"
            disabled={isPwSubmitting}
            className="px-6 h-10 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {isPwSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
