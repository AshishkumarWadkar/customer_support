import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import { ROUTES } from './constants/routes';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const AppLayout = lazy(() => import('./layouts/AppLayout'));
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));
const TicketListPage = lazy(() => import('./pages/tickets/TicketListPage'));
const TicketDetailPage = lazy(() => import('./pages/tickets/TicketDetailPage'));
const CreateTicketPage = lazy(() => import('./pages/tickets/CreateTicketPage'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm text-slate-500">Loading...</span>
    </div>
  </div>
);

// Role-based dashboard redirect
const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  // All roles go to same dashboard page; it renders role-specific content
  return <AdminDashboard />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />

            {/* Auth routes */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* App routes — requires authentication */}
            <Route element={<PrivateRoute allowedRoles={['SUPER_ADMIN', 'MANAGER', 'AGENT']} />}>
              <Route element={<AppLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardRedirect />} />
                <Route path={ROUTES.TICKETS} element={<TicketListPage />} />
                <Route path={ROUTES.TICKET_CREATE} element={<CreateTicketPage />} />
                <Route path="/app/tickets/:id" element={<TicketDetailPage />} />
                <Route path={ROUTES.CUSTOMERS} element={<CustomerListPage />} />
                <Route path="/app/customers/:id" element={<CustomerDetailPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px' },
          success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
          error: { duration: 5000, iconTheme: { primary: '#ef4444', secondary: 'white' } },
        }}
      />
    </AuthProvider>
  );
};

export default App;
