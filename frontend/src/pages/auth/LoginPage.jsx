import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(6, 'Password is required').required('Password is required'),
});

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const user = await login(data.email, data.password);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-blue-800 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <ShieldCheckIcon className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SupportDesk</h1>
          <p className="text-blue-300 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                {...register('email')}
                placeholder="you@company.com"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.email ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full h-10 px-3 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.password ? 'border-red-400' : 'border-slate-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPw ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Forgot */}
            <div className="flex justify-end">
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          Customer? <Link to={ROUTES.PORTAL_LOGIN} className="text-blue-200 underline">Go to Customer Portal</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
