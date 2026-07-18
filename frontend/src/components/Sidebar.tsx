import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Monitor,
  ShoppingBag,
  Boxes,
  FileText,
  Wallet,
  MessageSquareText,
  CalendarDays,
  BarChart3,
  BarChart2,
  Receipt,
  Settings as SettingsIcon,
  Palette,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import litmusLogo from '../assets/litmus-logo.png';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: undefined },
  { to: '/customers', label: 'Customers', icon: Users, permission: undefined },
  { to: '/tasks', label: 'Tasks & Reminders', icon: ClipboardCheck, permission: undefined },
  { to: '/cyber-services', label: 'Cyber Services', icon: Monitor, permission: undefined },
  { to: '/computer-store', label: 'Computer Store', icon: ShoppingBag, permission: 'inventory' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory' },
  { to: '/invoices', label: 'Invoices', icon: FileText, permission: 'invoices' },
  { to: '/branding', label: 'Branding Services', icon: Palette, permission: undefined },
  { to: '/sales', label: 'Sales', icon: BarChart2, permission: 'reports' },
  { to: '/debt-tracker', label: 'Debt Tracker', icon: Wallet, permission: 'debt_tracker' },
  { to: '/bulk-sms', label: 'Bulk SMS', icon: MessageSquareText, permission: 'sms' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, permission: undefined },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, permission: 'expenses' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, permission: 'settings' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const userPermissions: string[] = user?.permissions || [];

  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (isOwnerOrAdmin) return true;
    return userPermissions.includes(item.permission);
  });

  return (
    <aside
      className={`fixed md:sticky top-0 bottom-0 left-0 z-40 w-64 bg-litmus-black flex flex-col transition-transform duration-300 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } h-screen shrink-0`}
    >
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <img
          src={litmusLogo}
          className="h-12 max-h-12 object-contain"
          alt="Litmus Logo"
        />
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose} // Auto-close sidebar on mobile menu navigation click
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
