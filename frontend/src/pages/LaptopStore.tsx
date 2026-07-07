import { useEffect, useState } from 'react';
import { Search, ShoppingCart, Laptop } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { Product } from '../types';
import { formatMoney } from '../utils/format';

const CATEGORIES = [
  'Laptops', 'Desktop PCs', 'Monitors', 'Printers', 'Keyboards', 'Mouse', 'Headsets',
  'Routers', 'Networking', 'Hard Drives', 'SSD', 'RAM', 'Chargers', 'Batteries',
  'Flash Drives', 'Adapters', 'Power Banks', 'Accessories', 'Software', 'Antivirus', 'Office Licenses',
];

export default function LaptopStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState({ customer_phone: '', quantity: 1, paid: true });
  const [saving, setSaving] = useState(false);

  function load() {
    api.get('/products', { params: { search, category: category || undefined } }).then((res) => setProducts(res.data));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  function openSell(p: Product) {
    setSelected(p);
    setForm({ customer_phone: '', quantity: 1, paid: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const total = form.quantity * Number(selected.selling_price);
      await api.post('/transactions', {
        module: 'product_sale',
        product_id: selected.id,
        description: selected.name,
        quantity: form.quantity,
        unit_price: selected.selling_price,
        amount_paid: form.paid ? total : 0,
        customer_phone: form.customer_phone || undefined,
      });
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Laptop Store" subtitle="Laptops, desktops, accessories — one shelf, fully tracked.">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="input-field pl-9" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((p) => (
          <div key={p.id} className="card flex flex-col gap-3">
            <div className="w-full h-24 rounded-lg bg-gray-50 flex items-center justify-center">
              <Laptop size={28} className="text-gray-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-litmus-black truncate">{p.name}</div>
              <div className="text-xs text-gray-400">{p.category}</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-litmus-black">{formatMoney(p.selling_price)}</span>
              <span className={`text-xs font-medium ${p.quantity <= p.min_stock ? 'text-litmus-red' : 'text-gray-400'}`}>
                {p.quantity} in stock
              </span>
            </div>
            <button onClick={() => openSell(p)} className="btn-primary text-sm flex items-center justify-center gap-2">
              <ShoppingCart size={14} /> Sell
            </button>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-16">
            No products found. Add stock from the Inventory page.
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Sell — ${selected?.name || ''}`}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label-sm">Customer Phone (optional)</label>
            <input className="input-field" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="0722xxxxxx" />
          </div>
          <div>
            <label className="label-sm">Quantity</label>
            <input
              type="number"
              min={1}
              max={selected?.quantity}
              className="input-field"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-500">Total</span>
            <span className="font-bold text-litmus-black">
              {formatMoney(form.quantity * Number(selected?.selling_price || 0))}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={form.paid} onChange={() => setForm({ ...form, paid: true })} /> Paid
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={!form.paid} onChange={() => setForm({ ...form, paid: false })} /> Not Paid (add to debt)
            </label>
          </div>
          <button disabled={saving} className="btn-primary w-full">{saving ? 'Recording sale…' : 'Complete Sale'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
