import { useEffect, useState } from 'react';
import { Search, Plus, AlertTriangle, Pencil } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { Product } from '../types';
import { formatMoney, formatDate } from '../utils/format';

const emptyForm = {
  sku: '', barcode: '', name: '', category: '', brand: '',
  buying_price: 0, selling_price: 0, supplier: '', quantity: 0, min_stock: 3, warranty: '',
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get('/products', { params: { search, low_stock: lowStockOnly || undefined } }).then((res) => setProducts(res.data));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, lowStockOnly]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ ...p });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
      } else {
        await api.post('/products', form);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  const lowStockCount = products.filter((p) => p.quantity <= p.min_stock).length;

  return (
    <Layout title="Inventory" subtitle="Every product, every stock level, tracked in real time.">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU, name, barcode…" className="input-field pl-9" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only ({lowStockCount})
          </label>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Buying</th>
              <th className="px-5 py-3 font-medium">Selling</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Supplier</th>
              <th className="px-5 py-3 font-medium">Updated</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-litmus-black">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.sku || '—'}</div>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{p.category}</td>
                <td className="px-5 py-3.5 text-gray-500">{formatMoney(p.buying_price)}</td>
                <td className="px-5 py-3.5 font-medium text-litmus-black">{formatMoney(p.selling_price)}</td>
                <td className="px-5 py-3.5">
                  <span className={`flex items-center gap-1 font-semibold ${p.quantity <= p.min_stock ? 'text-litmus-red' : 'text-litmus-black'}`}>
                    {p.quantity <= p.min_stock && <AlertTriangle size={13} />}
                    {p.quantity}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{p.supplier || '—'}</td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(p.updated_at)}</td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-litmus-red">
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-10">No products yet. Add your first product.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Product' : 'Add Product'} maxWidth="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Product Name *</label>
              <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Category *</label>
              <input required className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">SKU</label>
              <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Barcode</label>
              <input className="input-field" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Brand</label>
              <input className="input-field" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Buying Price</label>
              <input type="number" className="input-field" value={form.buying_price} onChange={(e) => setForm({ ...form, buying_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Selling Price *</label>
              <input required type="number" className="input-field" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Warranty</label>
              <input className="input-field" value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Quantity</label>
              <input type="number" className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Minimum Stock</label>
              <input type="number" className="input-field" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Supplier</label>
              <input className="input-field" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
          </div>
          <button disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : editing ? 'Update Product' : 'Add Product'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
