import { useEffect, useState } from 'react';
import {
  Save,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Users,
  Settings2,
  BarChart2,
  X,
  ChevronDown,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const ALL_PERMISSIONS = [
  { key: 'expenses', label: 'View Expenses', icon: '💰', desc: 'Can see the Expenses / Cashbook module' },
  { key: 'profits', label: 'View Profits', icon: '📈', desc: 'Can see net profit figures on Dashboard' },
  { key: 'inventory', label: 'Manage Inventory', icon: '📦', desc: 'Can view and manage inventory items' },
  { key: 'invoices', label: 'Manage Invoices', icon: '🧾', desc: 'Can create, view and download invoices' },
  { key: 'sms', label: 'Bulk SMS', icon: '📱', desc: 'Can send SMS campaigns and view logs' },
  { key: 'settings', label: 'System Settings', icon: '⚙️', desc: 'Can edit business settings and user accounts' },
  { key: 'reports', label: 'Reports', icon: '📊', desc: 'Can access Reports & Analytics module' },
  { key: 'debt_tracker', label: 'Debt Tracker', icon: '🔴', desc: 'Can view and manage outstanding debts' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  attendant: 'bg-gray-100 text-gray-600',
  cashier: 'bg-amber-100 text-amber-700',
};

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
}

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'logs'>('profile');

  // Add user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'attendant',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  });
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Permissions editing
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);

  // Activity logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const isOwner = currentUser?.role === 'owner';

  useEffect(() => {
    api.get('/settings').then((res) => setSettings(res.data));
    loadUsers();
  }, []);

  function loadUsers() {
    api.get('/settings/users').then((res) => setUsers(res.data));
  }

  function loadLogs() {
    setLogsLoading(true);
    api.get('/settings/users/logs')
      .then((res) => setLogs(res.data))
      .finally(() => setLogsLoading(false));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put('/settings', settings);
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function addUser() {
    setAddingUser(true);
    setAddUserError('');
    try {
      await api.post('/settings/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'attendant', permissions: ALL_PERMISSIONS.map((p) => p.key) });
      setShowAddUser(false);
      loadUsers();
    } catch (err: any) {
      setAddUserError(err.response?.data?.message || 'Failed to add user.');
    } finally {
      setAddingUser(false);
    }
  }

  async function toggleUserStatus(u: StaffUser) {
    await api.put(`/settings/users/${u.id}`, { is_active: !u.is_active });
    loadUsers();
  }

  async function deleteUser(u: StaffUser) {
    if (!confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    await api.delete(`/settings/users/${u.id}`);
    loadUsers();
  }

  async function savePermissions(u: StaffUser, permissions: string[]) {
    await api.put(`/settings/users/${u.id}`, { permissions });
    setEditingPermissions(null);
    loadUsers();
  }

  function togglePermission(userId: string, permKey: string, current: string[]) {
    const updated = current.includes(permKey)
      ? current.filter((p) => p !== permKey)
      : [...current, permKey];
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, permissions: updated } : u))
    );
  }

  if (!settings) return <Layout title="Settings"><p className="text-gray-400 text-sm">Loading…</p></Layout>;

  return (
    <Layout title="Settings" subtitle="Business profile, user management and system access control.">

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit shadow-soft">
        {[
          { key: 'profile', label: 'Business Profile', icon: Settings2 },
          { key: 'users', label: 'Users & Permissions', icon: Users },
          { key: 'logs', label: 'Activity Logs', icon: BarChart2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'logs') loadLogs();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-litmus-red text-white shadow'
                  : 'text-gray-500 hover:text-litmus-red'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Business Profile ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={save} className="card space-y-5">
            <h3 className="font-bold text-litmus-black text-sm border-b border-gray-100 pb-3">Business Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-sm">Business Name</label>
                <input className="input-field" value={settings.business_name || ''} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} />
              </div>
              <div>
                <label className="label-sm">Currency</label>
                <input className="input-field" value={settings.currency || ''} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-sm">Tax / VAT Rate (%)</label>
                <input type="number" className="input-field" value={settings.tax_rate ?? 0} onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label-sm">Invoice Prefix</label>
                <input className="input-field" value={settings.invoice_prefix || ''} onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label-sm">SMS Sender ID</label>
              <input className="input-field" value={settings.sender_id || ''} onChange={(e) => setSettings({ ...settings, sender_id: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Theme Accent Colour</label>
              <div className="flex items-center gap-3">
                <input type="color" className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer" value={settings.theme_primary || '#C1121F'} onChange={(e) => setSettings({ ...settings, theme_primary: e.target.value })} />
                <span className="text-sm text-gray-500 font-mono">{settings.theme_primary}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                <Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}
              </button>
              {saved && <span className="text-sm text-emerald-600 font-semibold">Saved ✓</span>}
            </div>
          </form>

          <div className="card">
            <h3 className="font-bold text-litmus-black text-sm border-b border-gray-100 pb-3 mb-4">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-xs text-gray-500 py-2 border-b border-gray-50">
                <span>Business Name</span><span className="font-semibold text-gray-800">{settings.business_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 py-2 border-b border-gray-50">
                <span>Currency</span><span className="font-semibold text-gray-800">{settings.currency}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 py-2 border-b border-gray-50">
                <span>Tax Rate</span><span className="font-semibold text-gray-800">{settings.tax_rate}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 py-2 border-b border-gray-50">
                <span>Invoice Prefix</span><span className="font-semibold text-gray-800">{settings.invoice_prefix}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 py-2">
                <span>SMS Sender ID</span><span className="font-semibold text-gray-800">{settings.sender_id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Users & Permissions ── */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Add User Button */}
          {isOwner && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddUser(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <UserPlus size={15} /> Add New User
              </button>
            </div>
          )}

          {/* Add User Modal */}
          {showAddUser && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-litmus-black">Add New Staff User</h3>
                  <button onClick={() => { setShowAddUser(false); setAddUserError(''); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                    <X size={15} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {addUserError && (
                    <div className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2">{addUserError}</div>
                  )}
                  <div>
                    <label className="label-sm">Full Name</label>
                    <input className="input-field" placeholder="e.g. John Kamau" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label-sm">Email Address</label>
                    <input className="input-field" type="email" placeholder="john@litmussolutions.co.ke" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="label-sm">Password</label>
                    <div className="relative">
                      <input
                        className="input-field pr-10"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label-sm">Role</label>
                    <select className="input-field" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="attendant">Attendant</option>
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-sm mb-2 block">Module Access</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_PERMISSIONS.map((perm) => {
                        const checked = newUser.permissions.includes(perm.key);
                        return (
                          <button
                            key={perm.key}
                            type="button"
                            onClick={() => setNewUser({
                              ...newUser,
                              permissions: checked
                                ? newUser.permissions.filter((p) => p !== perm.key)
                                : [...newUser.permissions, perm.key],
                            })}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition text-left ${
                              checked ? 'border-litmus-red/40 bg-red-50 text-litmus-red' : 'border-gray-200 bg-white text-gray-500'
                            }`}
                          >
                            {checked ? <CheckSquare size={13} className="shrink-0" /> : <Square size={13} className="shrink-0" />}
                            <span>{perm.icon} {perm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-5 flex gap-3">
                  <button onClick={addUser} disabled={addingUser} className="btn-primary flex-1 text-sm">
                    {addingUser ? 'Creating…' : 'Create User'}
                  </button>
                  <button onClick={() => { setShowAddUser(false); setAddUserError(''); }} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className={`card p-4 transition ${!u.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${u.is_active ? 'bg-litmus-red' : 'bg-gray-400'}`}>
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-litmus-black text-sm flex items-center gap-2">
                        {u.name}
                        <span className={`badge text-[9px] font-bold capitalize ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                        {!u.is_active && <span className="badge bg-red-100 text-red-600 text-[9px]">Suspended</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                    </div>
                  </div>

                  {/* Actions — only owner can manage other users, not edit self */}
                  {isOwner && u.id !== currentUser?.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingPermissions(editingPermissions === u.id ? null : u.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition"
                      >
                        <ShieldCheck size={12} /> Permissions
                        <ChevronDown size={11} className={`transition ${editingPermissions === u.id ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          u.is_active
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {u.is_active ? (<><ShieldOff size={12} /> Suspend</>) : (<><RefreshCw size={12} /> Reactivate</>)}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions Panel */}
                {editingPermissions === u.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Module Access Permissions</h4>
                      <button
                        onClick={() => savePermissions(u, u.permissions)}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Save size={11} /> Save
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {ALL_PERMISSIONS.map((perm) => {
                        const checked = (u.permissions || []).includes(perm.key);
                        return (
                          <button
                            key={perm.key}
                            type="button"
                            onClick={() => togglePermission(u.id, perm.key, u.permissions || [])}
                            title={perm.desc}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition text-left ${
                              checked
                                ? 'border-litmus-red/40 bg-red-50 text-litmus-red'
                                : 'border-gray-200 bg-white text-gray-400'
                            }`}
                          >
                            {checked ? <CheckSquare size={12} className="shrink-0" /> : <Square size={12} className="shrink-0" />}
                            <span>{perm.icon} {perm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Permission Badges preview */}
                {editingPermissions !== u.id && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
                    {(u.permissions || []).map((p) => {
                      const meta = ALL_PERMISSIONS.find((a) => a.key === p);
                      return meta ? (
                        <span key={p} className="badge bg-gray-100 text-gray-500 text-[9px] font-medium px-2 py-0.5">
                          {meta.icon} {meta.label}
                        </span>
                      ) : null;
                    })}
                    {(!u.permissions || u.permissions.length === 0) && (
                      <span className="text-[10px] text-gray-400 italic">No module access granted</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <div className="card p-8 text-center text-gray-400">
                <Users className="mx-auto mb-2 text-gray-300" size={32} />
                <p className="text-sm">No users yet. Add your first staff member above.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Activity Logs ── */}
      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Staff Sales Activity Log
            </h3>
            <span className="text-[10px] text-gray-400">Last 1,000 transactions</span>
          </div>
          {logsLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading activity logs…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">Date & Time</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">Staff Member</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">Description</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">Module</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-2.5 text-gray-400">
                        {new Date(log.created_at).toLocaleDateString('en-GB')} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.served_by_name ? (
                          <div>
                            <div className="font-semibold text-gray-700">{log.served_by_name}</div>
                            <div className="text-gray-400 text-[9px]">{log.served_by_email}</div>
                          </div>
                        ) : <span className="text-gray-400 italic">Walk-in / System</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[220px] truncate">{log.description}</td>
                      <td className="px-4 py-2.5">
                        <span className="badge bg-gray-100 text-gray-500 capitalize text-[9px]">{log.module?.replace('_', ' ') || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-800">KES {Number(log.total_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No activity recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
