import { useEffect, useState } from 'react';
import { Search, Plus, Phone, Mail, MapPin, Star, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { Customer } from '../types';
import { formatMoney, formatDate, statusStyles } from '../utils/format';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState({ phone: '', name: '', email: '', business_name: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('/customers', { params: { search } })
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function viewCustomer(c: Customer) {
    const { data } = await api.get(`/customers/${c.id}`);
    setSelected(data);
  }

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/customers', form);
      setShowAdd(false);
      setForm({ phone: '', name: '', email: '', business_name: '', location: '', notes: '' });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Customers" subtitle="Every customer, every service, forever.">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone, name or business…"
            className="input-field pl-9"
          />
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Outstanding</th>
              <th className="px-5 py-3 font-medium">Transactions</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer" onClick={() => viewCustomer(c)}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-litmus-red/10 text-litmus-red font-bold flex items-center justify-center shrink-0">
                      {(c.name || c.phone).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-litmus-black flex items-center gap-1.5">
                        {c.name || 'Unnamed'}
                        {c.is_vip && <Star size={12} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <div className="text-xs text-gray-400">{c.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{c.email || '—'}</td>
                <td className="px-5 py-3.5 text-gray-500">{c.business_name || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={Number(c.outstanding_balance) > 0 ? 'text-litmus-red font-semibold' : 'text-gray-400'}>
                    {formatMoney(c.outstanding_balance || 0)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{c.total_transactions || 0}</td>
                <td className="px-5 py-3.5 text-right text-gray-300">›</td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10">
                  No customers found. Add your first customer to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Customer">
        <form onSubmit={saveCustomer} className="space-y-4">
          <div>
            <label className="label-sm">Phone Number *</label>
            <input required className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0722xxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Name</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Email</label>
              <input className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Business Name</label>
              <input className="input-field" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Location</label>
              <input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-sm">Notes</label>
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Save Customer'}
          </button>
        </form>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || selected?.phone || 'Customer'} maxWidth="max-w-2xl">
        {selected && (
          <div>
            <div className="flex flex-wrap gap-4 mb-6 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500"><Phone size={14} /> {selected.phone}</div>
              {selected.email && <div className="flex items-center gap-1.5 text-gray-500"><Mail size={14} /> {selected.email}</div>}
              {selected.location && <div className="flex items-center gap-1.5 text-gray-500"><MapPin size={14} /> {selected.location}</div>}
            </div>
            <h4 className="text-sm font-bold text-litmus-black mb-3 flex items-center gap-1.5">
              <Clock size={14} /> Customer Timeline
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(selected.timeline || []).map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <div>
                    <div className="text-sm font-medium text-litmus-black">{t.description}</div>
                    <div className="text-xs text-gray-400">{formatDate(t.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-litmus-black">{formatMoney(t.total_amount)}</div>
                    <span className={`badge ${statusStyles[t.status]}`}>{t.status}</span>
                  </div>
                </div>
              ))}
              {(!selected.timeline || selected.timeline.length === 0) && (
                <p className="text-sm text-gray-400">No services recorded yet.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
