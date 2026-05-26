import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const schema = yup.object({
  newPassword: yup.string()
    .min(8, 'At least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Must include upper, lower, number, special char')
    .required(),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required(),
});

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ newPassword }) => {
    try {
      await axiosInstance.post('/auth/reset-password', { token, newPassword });
      toast.success('Password reset successfully!');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset failed. Link may have expired.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600">Invalid or missing reset token.</p>
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-blue-600 underline text-sm mt-2 block">Request new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-blue-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <ShieldCheckIcon className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">New Password</h1>
          <p className="text-blue-300 text-sm mt-1">Choose a strong password</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input type="password" {...register('newPassword')} placeholder="••••••••"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.newPassword ? 'border-red-400' : 'border-slate-300'}`} />
              {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
              <input type="password" {...register('confirmPassword')} placeholder="••••••••"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-400' : 'border-slate-300'}`} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting}
              className="w-full h-10 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-60">
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
