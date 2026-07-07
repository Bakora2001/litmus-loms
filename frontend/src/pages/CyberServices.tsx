import { useEffect, useState } from 'react';
import { Search, Printer, Copy, ScanLine, Keyboard, Camera, BookOpen, Layers, FileBadge, Car, GraduationCap, HeartPulse, Wifi, ShieldCheck, Sparkles, Wrench, Monitor, MoreHorizontal } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { ServiceCatalogItem } from '../types';
import { formatMoney, formatDate } from '../utils/format';

const iconMap: Record<string, any> = {
  Printing: Printer,
  Photocopying: Copy,
  Scanning: ScanLine,
  Typing: Keyboard,
  'Passport Photos': Camera,
  Binding: BookOpen,
  Lamination: Layers,
  KRA: FileBadge,
  NTSA: Car,
  HELB: GraduationCap,
  SHA: HeartPulse,
  NSSF: HeartPulse,
  eCitizen: FileBadge,
  'Good Conduct': ShieldCheck,
  'CV Writing': FileBadge,
  'Graphic Design': Sparkles,
  'Email Services': Wifi,
  'Internet Browsing': Wifi,
  'Document Editing': FileBadge,
  'Software Installation': Wrench,
  'Windows Installation': Monitor,
  Others: MoreHorizontal,
};

export default function CyberServices() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [selected, setSelected] = useState<ServiceCatalogItem | null>(null);
  const [form, setForm] = useState({ customer_phone: '', quantity: 1, unit_price: 0, paid: true });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any | null>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    api.get('/services').then((res) => setServices(res.data));
    loadRecent();
  }, []);

  function loadRecent() {
    api.get('/transactions', { params: { module: 'cyber_service' } }).then((res) => setRecent(res.data.slice(0, 8)));
  }

  function openService(s: ServiceCatalogItem) {
    setSelected(s);
    setForm({ customer_phone: '', quantity: 1, unit_price: Number(s.default_price), paid: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const total = form.quantity * form.unit_price;
      await api.post('/transactions', {
        module: 'cyber_service',
        service_id: selected.id,
        description: selected.name,
        quantity: form.quantity,
        unit_price: form.unit_price,
        amount_paid: form.paid ? total : 0,
        customer_phone: form.customer_phone || undefined,
      });
      setSelected(null);
      loadRecent();
    } finally {
      setSaving(false);
    }
  }

  async function searchHistory(e: React.FormEvent) {
    e.preventDefault();
    setNotFound(false);
    setHistory(null);
    try {
      const { data } = await api.get(`/customers/phone/${searchPhone}`);
      setHistory(data);
    } catch {
      setNotFound(true);
    }
  }

  const grouped = services.reduce<Record<string, ServiceCatalogItem[]>>((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <Layout title="Cyber Services" subtitle="Click a service, record it, done.">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wide">{category.replace('_', ' ')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((s) => {
                  const Icon = iconMap[s.name] || MoreHorizontal;
                  return (
                    <button
                      key={s.id}
                      onClick={() => openService(s)}
                      className="card items-center flex flex-col gap-2 hover:border-litmus-red/40 hover:shadow-soft transition-all py-5"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                        <Icon size={18} className="text-litmus-red" />
                      </div>
                      <span className="text-xs font-semibold text-litmus-black text-center leading-tight">{s.name}</span>
                      <span className="text-[11px] text-gray-400">{formatMoney(s.default_price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <div className="card">
            <h3 className="font-bold text-litmus-black mb-3 flex items-center gap-2">
              <Search size={16} className="text-litmus-red" /> Smart Service History
            </h3>
            <form onSubmit={searchHistory} className="flex gap-2 mb-4">
              <input
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Phone number"
                className="input-field text-sm"
              />
              <button className="btn-primary text-sm shrink-0">Search</button>
            </form>
            {notFound && <p className="text-sm text-gray-400">No customer found with that phone number.</p>}
            {history && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                <div className="font-medium text-sm text-litmus-black">{history.name || history.phone}</div>
                {history.timeline.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                    <span className="text-gray-600">{t.description}</span>
                    <span className="font-semibold text-litmus-black">{formatMoney(t.total_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-bold text-litmus-black mb-3">Recently Recorded</h3>
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-litmus-black truncate">{r.description}</div>
                    <div className="text-xs text-gray-400">{r.customer_phone || 'Walk-in'} • {formatDate(r.created_at)}</div>
                  </div>
                  <span className="font-semibold text-litmus-black shrink-0">{formatMoney(r.total_amount)}</span>
                </div>
              ))}
              {recent.length === 0 && <p className="text-sm text-gray-400">No services recorded yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label-sm">Customer Phone (optional)</label>
            <input className="input-field" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="0722xxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Quantity</label>
              <input type="number" min={1} className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Price (each)</label>
              <input type="number" min={0} className="input-field" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-500">Total</span>
            <span className="font-bold text-litmus-black">{formatMoney(form.quantity * form.unit_price)}</span>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={form.paid} onChange={() => setForm({ ...form, paid: true })} /> Paid
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!form.paid} onChange={() => setForm({ ...form, paid: false })} /> Not Paid (add to debt)
            </label>
          </div>
          <button disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Record Service'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
