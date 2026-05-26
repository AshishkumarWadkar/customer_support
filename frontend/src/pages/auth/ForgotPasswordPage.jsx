import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../../api/axiosInstance';
import { ROUTES } from '../../constants/routes';
import { ShieldCheckIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const schema = yup.object({ email: yup.string().email().required('Email is required') });

const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ email }) => {
    try {
      await axiosInstance.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-blue-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <ShieldCheckIcon className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-blue-300 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <EnvelopeIcon className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-slate-700 font-medium">Check your email</p>
              <p className="text-slate-500 text-sm">If that email exists, we sent a reset link valid for 30 minutes.</p>
              <Link to={ROUTES.LOGIN} className="text-blue-600 text-sm hover:underline">Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input type="email" {...register('email')} placeholder="you@company.com"
                  className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-slate-300'}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full h-10 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-60">
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
              <p className="text-center text-sm text-slate-500">
                Remember your password? <Link to={ROUTES.LOGIN} className="text-blue-600 hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
