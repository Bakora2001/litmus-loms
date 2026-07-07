import { Bell, ChevronDown, LogOut, ClipboardList, AlertTriangle, FileText, CheckCircle2, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

interface NotificationItem {
  id: string;
  type: 'task' | 'stock' | 'invoice';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  link: string;
}

const today = new Date().toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Notification states
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch real notification items from active DB metrics
  async function fetchNotifications() {
    try {
      const itemsList: NotificationItem[] = [];

      // 1. Get low stock products
      const { data: lowStock } = await api.get('/dashboard/low-stock');
      if (Array.isArray(lowStock)) {
        lowStock.forEach((p: any) => {
          itemsList.push({
            id: `stock-${p.id}`,
            type: 'stock',
            title: 'Low Stock Alert',
            description: `${p.name} has only ${p.quantity} units left! (Min: ${p.min_stock})`,
            severity: 'high',
            link: '/inventory',
          });
        });
      }

      // 2. Get pending tasks
      const { data: tasks } = await api.get('/tasks');
      if (Array.isArray(tasks)) {
        tasks
          .filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled')
          .slice(0, 5)
          .forEach((t: any) => {
            itemsList.push({
              id: `task-${t.id}`,
              type: 'task',
              title: `Task: ${t.priority.toUpperCase()} priority`,
              description: t.title + (t.deadline ? ` (Due: ${new Date(t.deadline).toLocaleDateString()})` : ''),
              severity: t.priority === 'critical' || t.priority === 'high' ? 'high' : 'medium',
              link: '/tasks',
            });
          });
      }

      // 3. Get unpaid invoices
      const { data: invoices } = await api.get('/invoices');
      if (Array.isArray(invoices)) {
        invoices
          .filter((inv: any) => inv.status === 'unpaid' || inv.status === 'overdue')
          .slice(0, 3)
          .forEach((inv: any) => {
            itemsList.push({
              id: `inv-${inv.id}`,
              type: 'invoice',
              title: `Unpaid Invoice: ${inv.invoice_number}`,
              description: `Amount KES ${Number(inv.total).toLocaleString()} remains unpaid by ${inv.customer_name || 'Walk-in'}`,
              severity: inv.status === 'overdue' ? 'high' : 'medium',
              link: '/invoices',
            });
          });
      }

      setNotifications(itemsList);
      setUnreadCount(itemsList.length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleNotificationClick(item: NotificationItem) {
    setNotificationsOpen(false);
    navigate(item.link);
  }

  function clearAll() {
    setUnreadCount(0);
    setNotifications([]);
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <header className="sticky top-0 z-20 bg-litmus-bg/95 backdrop-blur border-b border-black/5 shadow-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-3.5">

        {/* LEFT — Welcome greeting */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Sun size={13} className="text-amber-400" />
            {getGreeting()},
          </div>
          <div className="text-base font-extrabold text-litmus-black leading-tight truncate">
            {user?.name || 'Welcome back!'}
            {title && (
              <span className="text-gray-300 font-light mx-2">·</span>
            )}
            {title && <span className="text-sm font-semibold text-gray-500">{title}</span>}
          </div>
          {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>

        {/* RIGHT — Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Date badge */}
          <div className="hidden md:flex items-center gap-2 bg-litmus-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            <span className="text-gray-400 font-normal text-[10px]">Today</span>
            {today}
          </div>

          {/* Bell Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setMenuOpen(false);
              }}
              className="relative w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
            >
              <Bell size={17} className="text-litmus-black" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-litmus-red text-white text-[9px] font-bold rounded-full w-[17px] h-[17px] flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-black/5 py-2 z-30 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs font-bold text-gray-700">Notifications & Reminders</span>
                  {unreadCount > 0 && (
                    <button onClick={clearAll} className="text-[10px] text-litmus-red font-semibold hover:underline">
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-gray-400 space-y-1">
                      <CheckCircle2 className="mx-auto text-emerald-500 mb-1" size={24} />
                      <div className="font-semibold text-gray-700">All caught up!</div>
                      <div>No pending tasks or low stock alerts.</div>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 flex items-start gap-3 cursor-pointer transition"
                      >
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'stock' && <AlertTriangle size={14} className="text-orange-500" />}
                          {item.type === 'task' && <ClipboardList size={14} className="text-blue-500" />}
                          {item.type === 'invoice' && <FileText size={14} className="text-litmus-red" />}
                        </div>
                        <div className="text-[11px] leading-relaxed">
                          <div className="font-bold text-gray-800 flex items-center gap-1.5">
                            {item.title}
                            {item.severity === 'high' && (
                              <span className="bg-red-50 text-red-600 text-[8px] px-1 rounded font-bold uppercase tracking-wider">
                                Alert
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 mt-0.5">{item.description}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div
                  onClick={() => { setNotificationsOpen(false); navigate('/tasks'); }}
                  className="px-4 py-2 text-center text-xs font-semibold text-litmus-red hover:bg-red-50/50 cursor-pointer border-t border-gray-100"
                >
                  Manage All Tasks →
                </div>
              </div>
            )}
          </div>

          {/* User Avatar / Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen((v) => !v); setNotificationsOpen(false); }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition"
            >
              <div className="w-8 h-8 rounded-full bg-litmus-red flex items-center justify-center text-white text-sm font-bold">
                {(user?.name || 'U').charAt(0)}
              </div>
              <span className="text-sm font-semibold text-litmus-black hidden sm:block max-w-[100px] truncate">
                {firstName}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-black/5 py-2 z-30">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <div className="text-sm font-bold text-litmus-black truncate">{user?.name}</div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</div>
                  <span className="mt-1.5 inline-block text-[9px] font-bold uppercase tracking-wider bg-litmus-red/10 text-litmus-red px-2 py-0.5 rounded-full">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-litmus-red hover:bg-red-50 mt-1"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
