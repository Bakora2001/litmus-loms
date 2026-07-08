import { Bell, ChevronDown, LogOut, ClipboardList, AlertTriangle, FileText, CheckCircle2, Sun, Menu, Search, X, Phone, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
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

export default function Topbar({ title, subtitle, onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Customer quick-search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/customers', { params: { search: searchQuery } });
        setSearchResults(res.data.slice(0, 6));
        setSearchOpen(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3.5">

        {/* LEFT — Welcome greeting with hamburger menu */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg border border-gray-200 bg-white text-litmus-black hover:bg-gray-50 transition shrink-0"
            title="Toggle Menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Sun size={13} className="text-amber-400" />
              {getGreeting()},
            </div>
            <div className="text-sm md:text-base font-extrabold text-litmus-black leading-tight truncate">
              {user?.name || 'Welcome back!'}
              {title && (
                <span className="text-gray-300 font-light mx-2">·</span>
              )}
              {title && <span className="text-xs md:text-sm font-semibold text-gray-500">{title}</span>}
            </div>
            {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* CENTER — Customer Quick-Search */}
        <div ref={searchRef} className="hidden md:block relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder="Search customers…"
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-gray-200 bg-white focus:border-litmus-red/40 focus:ring-2 focus:ring-litmus-red/10 focus:outline-none transition"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={12} />
            </button>
          )}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wide">Customers</div>
              {searchResults.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => { navigate('/customers'); setSearchQuery(''); setSearchOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-litmus-red/10 flex items-center justify-center text-litmus-red text-[10px] font-bold shrink-0">
                    {(c.name || c.phone).substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-litmus-black truncate">{c.name || 'Unnamed'}</div>
                    <div className="text-[10px] text-gray-400">{c.phone}</div>
                  </div>
                  {Number(c.outstanding_balance) > 0 && (
                    <span className="text-[9px] font-bold text-litmus-red bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full shrink-0">
                      Owes KES {Number(c.outstanding_balance).toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
              <div className="px-4 py-2 border-t border-gray-100">
                <button onClick={() => { navigate('/customers'); setSearchQuery(''); setSearchOpen(false); }} className="text-[10px] font-semibold text-litmus-red hover:underline">View all customers →</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Actions */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
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
              <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-black/5 py-2 z-30 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs font-bold text-gray-700">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={clearAll} className="text-[10px] text-litmus-red font-semibold hover:underline">
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-[250px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-400 space-y-1">
                      <CheckCircle2 className="mx-auto text-emerald-500 mb-1" size={20} />
                      <div className="font-semibold text-gray-700">All caught up!</div>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 flex items-start gap-2.5 cursor-pointer transition"
                      >
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'stock' && <AlertTriangle size={13} className="text-orange-500" />}
                          {item.type === 'task' && <ClipboardList size={13} className="text-blue-500" />}
                          {item.type === 'invoice' && <FileText size={13} className="text-litmus-red" />}
                        </div>
                        <div className="text-[10px] leading-relaxed">
                          <div className="font-bold text-gray-800 flex items-center gap-1">
                            {item.title}
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
                  Manage All Tasks
                </div>
              </div>
            )}
          </div>

          {/* User Avatar / Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setMenuOpen((v) => !v); setNotificationsOpen(false); }}
              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition"
            >
              <div className="w-8 h-8 rounded-full bg-litmus-red flex items-center justify-center text-white text-sm font-bold">
                {(user?.name || 'U').charAt(0)}
              </div>
              <span className="text-xs font-semibold text-litmus-black hidden sm:block max-w-[70px] truncate">
                {firstName}
              </span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-black/5 py-2 z-30">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="text-xs font-bold text-litmus-black truncate">{user?.name}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">{user?.email}</div>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-litmus-red hover:bg-red-50 mt-1 text-left"
                >
                  <LogOut size={13} />
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
