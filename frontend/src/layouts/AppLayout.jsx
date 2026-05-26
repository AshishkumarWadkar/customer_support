import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import {
  HomeIcon, TicketIcon, UsersIcon, ChartBarIcon,
  BookOpenIcon, Cog6ToothIcon, BellIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon,
  ShieldCheckIcon, UserGroupIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: HomeIcon, roles: ['SUPER_ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Tickets', path: ROUTES.TICKETS, icon: TicketIcon, roles: ['SUPER_ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Customers', path: ROUTES.CUSTOMERS, icon: UsersIcon, roles: ['SUPER_ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Knowledge Base', path: ROUTES.KNOWLEDGE_BASE, icon: BookOpenIcon, roles: ['SUPER_ADMIN', 'MANAGER', 'AGENT'] },
  { label: 'Reports', path: ROUTES.REPORTS, icon: ChartBarIcon, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { label: 'Teams', path: ROUTES.TEAMS, icon: UserGroupIcon, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { label: 'Audit Logs', path: ROUTES.AUDIT_LOGS, icon: ClipboardDocumentListIcon, roles: ['SUPER_ADMIN'] },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: Cog6ToothIcon, roles: ['SUPER_ADMIN', 'MANAGER', 'AGENT'] },
];

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center px-6 h-16 border-b border-blue-800">
        <ShieldCheckIcon className="h-8 w-8 text-blue-300" />
        <span className="ml-3 text-lg font-bold text-white">SupportDesk</span>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
               ${isActive
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'}`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User section */}
      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-blue-300 text-xs truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-blue-100 hover:bg-blue-800 rounded-md text-sm transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-blue-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 h-full bg-blue-900 z-50">
            <button
              className="absolute top-4 right-4 text-blue-300 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-md">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
