import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Monitor,
  Laptop,
  Boxes,
  FileText,
  Wallet,
  MessageSquareText,
  CalendarDays,
  BarChart3,
  Receipt,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

// Map each nav item to its required permission key (undefined = always visible)
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: undefined },
  { to: '/customers', label: 'Customers', icon: Users, permission: undefined },
  { to: '/tasks', label: 'Tasks & Reminders', icon: ClipboardCheck, permission: undefined },
  { to: '/cyber-services', label: 'Cyber Services', icon: Monitor, permission: undefined },
  { to: '/laptop-store', label: 'Laptop Store', icon: Laptop, permission: 'inventory' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory' },
  { to: '/invoices', label: 'Invoices', icon: FileText, permission: 'invoices' },
  { to: '/debt-tracker', label: 'Debt Tracker', icon: Wallet, permission: 'debt_tracker' },
  { to: '/bulk-sms', label: 'Bulk SMS', icon: MessageSquareText, permission: 'sms' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, permission: undefined },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, permission: 'expenses' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, permission: 'settings' },
];

export default function Sidebar() {
  const { user } = useAuth();

  // Owner/admin see everything. Other roles are filtered by permissions array.
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const userPermissions: string[] = user?.permissions || [];

  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true; // always visible (Dashboard, Customers, Tasks, Calendar)
    if (isOwnerOrAdmin) return true;   // owners/admins bypass filters
    return userPermissions.includes(item.permission);
  });

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-litmus-black flex flex-col">
      <div className="px-5 py-6 border-b border-white/10">
        <Logo variant="dark" showTagline size="sm" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 space-y-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl2 hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-litmus-red flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(user?.name || 'U').charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-semibold truncate">{user?.name || 'User'}</div>
            <div className="text-gray-400 text-xs capitalize truncate">{user?.role || 'staff'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
