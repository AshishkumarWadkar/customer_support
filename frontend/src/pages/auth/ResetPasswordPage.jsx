import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PASSWORD_CRITERIA = [
  { id: 'length',    label: 'At least 8 characters',      test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)',  test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)',  test: (p) => /[a-z]/.test(p) },
  { id: 'digit',     label: 'One number (0–9)',            test: (p) => /\d/.test(p) },
  { id: 'special',   label: 'One special character (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) },
];

const getStrengthColor = (met) => {
  if (met <= 1) return 'bg-red-500';
  if (met <= 2) return 'bg-orange-400';
  if (met <= 3) return 'bg-yellow-400';
  if (met === 4) return 'bg-blue-500';
  return 'bg-green-500';
};

const getStrengthLabel = (met) => {
  if (met <= 1) return 'Very weak';
  if (met <= 2) return 'Weak';
  if (met <= 3) return 'Fair';
  if (met === 4) return 'Good';
  return 'Strong';
};

const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;
  const met = PASSWORD_CRITERIA.filter((c) => c.test(password));
  const metCount = met.length;
  const color = getStrengthColor(metCount);

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bars */}
      <div className="flex gap-1">
        {PASSWORD_CRITERIA.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i < metCount ? color : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${metCount === 5 ? 'text-green-600' : 'text-slate-500'}`}>
        {getStrengthLabel(metCount)}
      </p>
      {/* Criteria checklist */}
      <ul className="space-y-1">
        {PASSWORD_CRITERIA.map((c) => {
          const passes = c.test(password);
          return (
            <li key={c.id} className={`flex items-center gap-1.5 text-xs ${passes ? 'text-green-600' : 'text-slate-400'}`}>
              {passes
                ? <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
                : <XCircleIcon className="h-3.5 w-3.5 shrink-0" />}
              {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const schema = yup.object({
  newPassword: yup.string()
    .min(8, 'At least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Must include upper, lower, number, special char (@$!%*?&)')
    .required('New password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your new password'),
});

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const watchedPassword = watch('newPassword', '');

  const onSubmit = async ({ newPassword, confirmPassword }) => {
    try {
      await axiosInstance.post('/auth/reset-password', { token, newPassword, confirmPassword });
      toast.success('Password reset successfully!');
      navigate(ROUTES.LOGIN);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset failed. Link may have expired.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-blue-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheckIcon className="h-6 w-6 text-red-500" />
            </div>
            <p className="font-semibold text-slate-800">Invalid or missing reset token</p>
            <p className="text-slate-500 text-sm">This link is invalid or has already been used.</p>
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="inline-block text-blue-600 text-sm hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
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
            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  {...register('newPassword')}
                  placeholder="••••••••"
                  className={`w-full h-10 px-3 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.newPassword ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
              )}
              <PasswordStrengthIndicator password={watchedPassword} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  className={`w-full h-10 px-3 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
