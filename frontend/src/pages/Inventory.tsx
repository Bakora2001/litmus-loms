import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, AlertTriangle, Pencil, CheckCircle, X } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { Product } from '../types';
import { formatMoney, formatDate } from '../utils/format';

const emptyForm = {
  sku: '', barcode: '', name: '', category: '', brand: '',
  buying_price: 0, selling_price: 0, supplier: '', quantity: 0, min_stock: 3, warranty: '',
  serial_number: '',
};

export default function Inventory() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('low_stock') === 'true');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function load() {
    api.get('/products', { params: { search, low_stock: lowStockOnly || undefined } })
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }

  // Load when search or tab switches
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, lowStockOnly]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ ...emptyForm, ...p });
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
        showToast('Product updated successfully!', 'success');
      } else {
        await api.post('/products', form);
        showToast('Product added successfully!', 'success');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'unsuccessful';
      showToast(`Failed: ${errMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const lowStockCount = products.filter((p) => p.quantity <= p.min_stock).length;

  return (
    <Layout title="Inventory" subtitle="Every product, every stock level, tracked in real time.">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 flex items-center justify-between shadow-sm ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs and Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          {/* All Items vs Low Stock tab */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setLowStockOnly(false)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!lowStockOnly ? 'bg-white text-litmus-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              All Items
            </button>
            <button
              onClick={() => setLowStockOnly(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${lowStockOnly ? 'bg-white text-litmus-red shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Low Stock Alerts
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-litmus-red animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search SKU, name, barcode…" 
              className="input-field pl-9" 
            />
          </div>
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
              <th className="px-5 py-3 font-medium">Buying Price</th>
              <th className="px-5 py-3 font-medium">Selling Price</th>
              <th className="px-5 py-3 font-medium">Stock Levels</th>
              <th className="px-5 py-3 font-medium">Supplier Details</th>
              <th className="px-5 py-3 font-medium">Updated</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-litmus-black">{p.name}</div>
                  <div className="text-xs text-gray-400 flex flex-wrap gap-2 mt-0.5">
                    {p.sku && <span>SKU: {p.sku}</span>}
                    {p.barcode && <span>• Barcode: {p.barcode}</span>}
                    {p.serial_number && (
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        S/N: {p.serial_number}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{p.category}</td>
                <td className="px-5 py-3.5 text-gray-500">{formatMoney(p.buying_price)}</td>
                <td className="px-5 py-3.5 font-medium text-litmus-black">{formatMoney(p.selling_price)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full border ${
                    p.quantity <= 0 
                      ? 'bg-red-50 text-red-600 border-red-200' 
                      : p.quantity <= p.min_stock 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {p.quantity <= p.min_stock && <AlertTriangle size={12} className="animate-bounce" />}
                    {p.quantity} in stock
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{p.supplier || '—'}</td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(p.updated_at)}</td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-litmus-red transition-all">
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-12">
                  No products yet. Add your first product.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
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
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">SKU</label>
              <input className="input-field" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Barcode</label>
              <input className="input-field" value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Brand</label>
              <input className="input-field" value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Serial Number</label>
              <input className="input-field" value={form.serial_number || ''} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="e.g. S/N 98273618" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Buying Price</label>
              <input type="number" className="input-field" value={form.buying_price || ''} onChange={(e) => setForm({ ...form, buying_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Selling Price *</label>
              <input required type="number" className="input-field" value={form.selling_price || ''} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Warranty</label>
              <input className="input-field" value={form.warranty || ''} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="e.g. 1 year" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Quantity (Stock)</label>
              <input type="number" className="input-field" value={form.quantity || 0} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Minimum Stock Alert</label>
              <input type="number" className="input-field" value={form.min_stock || 3} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Supplier</label>
              <input className="input-field" value={form.supplier || ''} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
            </div>
          </div>
          
          <button disabled={saving} className="btn-primary w-full py-2.5">
            {saving ? 'Saving…' : editing ? 'Update Product' : 'Add Product'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
