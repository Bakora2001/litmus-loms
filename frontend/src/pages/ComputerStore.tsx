import { useEffect, useState, useRef } from 'react';
import {
  Search, ShoppingCart, Monitor, Edit3, Trash2, ChevronDown,
  Package, Plus, AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { Product } from '../types';
import { formatMoney } from '../utils/format';

interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
}

type PaymentStatus = 'paid' | 'partial' | 'not_paid';

const CATEGORIES = [
  'Laptops', 'Desktop PCs', 'Monitors', 'Printers', 'Keyboards', 'Mouse', 'Headsets',
  'Routers', 'Networking', 'Hard Drives', 'SSD', 'RAM', 'Chargers', 'Batteries',
  'Flash Drives', 'Adapters', 'Power Banks', 'Accessories', 'Software', 'Antivirus', 'Office Licenses',
];

export default function ComputerStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Customer autocomplete
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // Sale form
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    quantity: 1,
    payment_status: 'paid' as PaymentStatus,
    amount_paid: '',
  });

  const [showCustomSell, setShowCustomSell] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    category: 'Accessories',
    unit_price: '',
    quantity: 1,
    payment_status: 'paid' as PaymentStatus,
    amount_paid: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });

  function openCustomSell() {
    setCustomForm({
      name: '',
      category: 'Accessories',
      unit_price: '',
      quantity: 1,
      payment_status: 'paid',
      amount_paid: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
    });
    setSelectedCustomer(null);
    setCustomerQuery('');
    setShowCustomSell(true);
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!customForm.name) {
      alert('Please enter a product or service name.');
      return;
    }
    const uPrice = Number(customForm.unit_price) || 0;
    const customTotal = customForm.quantity * uPrice;
    setSaving(true);
    try {
      await api.post('/transactions', {
        module: 'product_sale',
        product_id: undefined,
        description: `${customForm.category}: ${customForm.name}`,
        quantity: customForm.quantity,
        unit_price: uPrice,
        payment_status: customForm.payment_status,
        amount_paid: customForm.payment_status === 'paid' ? customTotal : customForm.payment_status === 'not_paid' ? 0 : Number(customForm.amount_paid),
        customer_id: selectedCustomer?.id || undefined,
        customer_phone: !selectedCustomer ? customForm.customer_phone : undefined,
        customer_name: !selectedCustomer ? customForm.customer_name : undefined,
        customer_email: !selectedCustomer ? customForm.customer_email : undefined,
      });
      setShowCustomSell(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete custom sale');
    } finally {
      setSaving(false);
    }
  }

  function load() {
    api.get('/products', { params: { search, category: category || undefined } }).then((res) => setProducts(res.data));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, category]);

  // Customer search debounced
  useEffect(() => {
    if (!customerQuery || customerQuery.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/customers', { params: { search: customerQuery } });
        setCustomerSuggestions(res.data.slice(0, 6));
        setShowSuggestions(true);
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setForm((f) => ({
      ...f,
      customer_phone: c.phone,
      customer_name: c.name || '',
      customer_email: c.email || '',
    }));
    setCustomerQuery(c.name || c.phone);
    setShowSuggestions(false);
  }

  function openSell(p: Product) {
    setSelected(p);
    setForm({ customer_name: '', customer_email: '', customer_phone: '', quantity: 1, payment_status: 'paid', amount_paid: '' });
    setSelectedCustomer(null);
    setCustomerQuery('');
  }

  const total = form.quantity * Number(selected?.selling_price || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.post('/transactions', {
        module: 'product_sale',
        product_id: selected.id,
        description: selected.name,
        quantity: form.quantity,
        unit_price: selected.selling_price,
        payment_status: form.payment_status,
        amount_paid: form.payment_status === 'paid' ? total : form.payment_status === 'not_paid' ? 0 : Number(form.amount_paid),
        customer_id: selectedCustomer?.id || undefined,
        customer_phone: !selectedCustomer ? form.customer_phone : undefined,
        customer_name: !selectedCustomer ? form.customer_name : undefined,
        customer_email: !selectedCustomer ? form.customer_email : undefined,
      });
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Computer Store" subtitle="Computers, accessories, electronics — all tracked and linked to customers.">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-lg">
          <div className="relative max-w-xs w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="input-field pl-9" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-auto text-sm">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={openCustomSell}
          className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-soft"
        >
          <Plus size={13} /> Sell Custom Item
        </button>
      </div>

      {/* Products Table */}
      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">SKU / Brand</th>
              <th className="px-5 py-3 font-semibold text-right">Buying Price</th>
              <th className="px-5 py-3 font-semibold text-right">Selling Price</th>
              <th className="px-5 py-3 font-semibold text-center">Stock</th>
              <th className="px-5 py-3 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <Package className="mx-auto mb-2 text-gray-300" size={28} />
                  <div className="text-sm">No products found. Add inventory to start selling.</div>
                </td>
              </tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-litmus-red/10 to-blue-50 flex items-center justify-center shrink-0">
                      <Monitor size={15} className="text-litmus-red" />
                    </div>
                    <div>
                      <div className="font-semibold text-litmus-black">{p.name}</div>
                      {p.warranty && <div className="text-[10px] text-gray-400">Warranty: {p.warranty}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">{p.category}</td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  <div>{p.sku || '—'}</div>
                  <div className="text-[10px]">{p.brand || ''}</div>
                </td>
                <td className="px-5 py-3.5 text-right text-gray-500">{formatMoney(p.buying_price)}</td>
                <td className="px-5 py-3.5 text-right font-bold text-litmus-black">{formatMoney(p.selling_price)}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${p.quantity <= 0 ? 'bg-red-50 text-red-600 border-red-200' : p.quantity <= p.min_stock ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {p.quantity} in stock
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => openSell(p)}
                    disabled={p.quantity <= 0}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 mx-auto disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={12} /> Sell
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sell Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Sell — ${selected?.name || ''}`}>
        <form onSubmit={submit} className="space-y-4">
          {/* Product info banner */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-litmus-red/10 flex items-center justify-center">
              <Monitor size={18} className="text-litmus-red" />
            </div>
            <div>
              <div className="font-semibold text-sm text-litmus-black">{selected?.name}</div>
              <div className="text-xs text-gray-400">{selected?.category} • {selected?.quantity} in stock</div>
            </div>
            <div className="ml-auto font-bold text-litmus-black">{formatMoney(selected?.selling_price || 0)}</div>
          </div>

          {/* Customer Search Autocomplete */}
          <div>
            <label className="label-sm">Customer (search or enter details below)</label>
            <div ref={customerRef} className="relative">
              <input
                className="input-field"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setSelectedCustomer(null);
                }}
                onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Type name or phone to search existing customers…"
              />
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  {customerSuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                    >
                      <div className="font-semibold text-sm text-litmus-black">{c.name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-400">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="mt-1.5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 font-semibold">{selectedCustomer.name || selectedCustomer.phone} (existing customer)</span>
                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }} className="ml-auto text-gray-400 hover:text-gray-600">
                  <Plus size={10} className="rotate-45" />
                </button>
              </div>
            )}
          </div>

          {/* If no existing customer selected, show new customer fields */}
          {!selectedCustomer && (
            <div className="space-y-3 border border-dashed border-gray-200 rounded-xl p-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Or Register New Customer</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-sm">Name</label>
                  <input className="input-field text-sm" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label className="label-sm">Phone</label>
                  <input className="input-field text-sm" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="0722xxxxxx" />
                </div>
              </div>
              <div>
                <label className="label-sm">Email</label>
                <input type="email" className="input-field text-sm" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="customer@email.com" />
              </div>
            </div>
          )}

          {/* Quantity */}
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

          {/* Total */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-500">Total Amount</span>
            <span className="font-extrabold text-lg text-litmus-black">{formatMoney(total)}</span>
          </div>

          {/* Payment Status — 3 options */}
          <div>
            <label className="label-sm">Payment Status</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {[
                { value: 'paid', label: 'Paid', icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-500' },
                { value: 'partial', label: 'Partial', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-500' },
                { value: 'not_paid', label: 'Not Paid', icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, payment_status: opt.value as PaymentStatus })}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 font-semibold text-xs transition ${form.payment_status === opt.value ? `${opt.bg} ${opt.border} ${opt.color}` : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                >
                  <opt.icon size={16} className={form.payment_status === opt.value ? opt.color : 'text-gray-300'} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Partial amount field */}
          {form.payment_status === 'partial' && (
            <div>
              <label className="label-sm">Amount Paid (partial)</label>
              <input
                type="number"
                min={1}
                max={total - 1}
                className="input-field"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                placeholder="Enter amount paid so far…"
                required
              />
              {Number(form.amount_paid) > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  Balance remaining: {formatMoney(total - Number(form.amount_paid))}
                </div>
              )}
            </div>
          )}

          <button disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <ShoppingCart size={16} />
            {saving ? 'Recording sale…' : 'Complete Sale'}
          </button>
        </form>
      </Modal>

      {/* Custom Sell Modal */}
      <Modal open={showCustomSell} onClose={() => setShowCustomSell(false)} title="Sell Custom Item / Repair Service">
        <form onSubmit={submitCustom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Category</label>
              <select
                className="input-field text-sm"
                value={customForm.category}
                onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Repairs">Repairs &amp; Services</option>
                <option value="Custom Spec">Custom Upgrades</option>
              </select>
            </div>
            <div>
              <label className="label-sm">Product / Service Name *</label>
              <input
                required
                className="input-field text-sm"
                value={customForm.name}
                onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                placeholder="e.g. Dell XPS Custom Charger / Screen Fix"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Unit Price (KES) *</label>
              <input
                type="number"
                required
                min={0}
                className="input-field text-sm"
                value={customForm.unit_price}
                onChange={(e) => setCustomForm({ ...customForm, unit_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label-sm">Quantity *</label>
              <input
                type="number"
                required
                min={1}
                className="input-field text-sm"
                value={customForm.quantity}
                onChange={(e) => setCustomForm({ ...customForm, quantity: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Customer Search Autocomplete */}
          <div>
            <label className="label-sm">Customer (search or enter details below)</label>
            <div ref={customerRef} className="relative">
              <input
                className="input-field text-sm"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setSelectedCustomer(null);
                }}
                onFocus={() => customerSuggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Type name or phone to search existing customers…"
              />
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  {customerSuggestions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                    >
                      <div className="font-semibold text-sm text-litmus-black">{c.name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-400">{c.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="mt-1.5 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700 font-semibold">{selectedCustomer.name || selectedCustomer.phone} (existing customer)</span>
                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }} className="ml-auto text-gray-400 hover:text-gray-600">
                  <Plus size={10} className="rotate-45" />
                </button>
              </div>
            )}
          </div>

          {/* Register new customer fields if none selected */}
          {!selectedCustomer && (
            <div className="space-y-3 border border-dashed border-gray-200 rounded-xl p-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Or Register New Customer</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label-sm">Name</label>
                  <input className="input-field text-sm" value={customForm.customer_name} onChange={(e) => setCustomForm({ ...customForm, customer_name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <label className="label-sm">Phone</label>
                  <input className="input-field text-sm" value={customForm.customer_phone} onChange={(e) => setCustomForm({ ...customForm, customer_phone: e.target.value })} placeholder="0722xxxxxx" />
                </div>
              </div>
              <div>
                <label className="label-sm">Email</label>
                <input type="email" className="input-field text-sm" value={customForm.customer_email} onChange={(e) => setCustomForm({ ...customForm, customer_email: e.target.value })} placeholder="customer@email.com" />
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-500">Total Amount</span>
            <span className="font-extrabold text-lg text-litmus-black">{formatMoney(customForm.quantity * (Number(customForm.unit_price) || 0))}</span>
          </div>

          {/* Payment Status — 3 options */}
          <div>
            <label className="label-sm">Payment Status</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {[
                { value: 'paid', label: 'Paid', icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-500' },
                { value: 'partial', label: 'Partial', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-500' },
                { value: 'not_paid', label: 'Not Paid', icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCustomForm({ ...customForm, payment_status: opt.value as PaymentStatus })}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 font-semibold text-xs transition ${customForm.payment_status === opt.value ? `${opt.bg} ${opt.border} ${opt.color}` : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                >
                  <opt.icon size={16} className={customForm.payment_status === opt.value ? opt.color : 'text-gray-300'} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Partial amount field */}
          {customForm.payment_status === 'partial' && (
            <div>
              <label className="label-sm">Amount Paid (partial)</label>
              <input
                type="number"
                min={1}
                max={(customForm.quantity * (Number(customForm.unit_price) || 0)) - 1}
                className="input-field text-sm"
                value={customForm.amount_paid}
                onChange={(e) => setCustomForm({ ...customForm, amount_paid: e.target.value })}
                placeholder="Enter amount paid so far…"
                required
              />
              {Number(customForm.amount_paid) > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  Balance remaining: {formatMoney((customForm.quantity * (Number(customForm.unit_price) || 0)) - Number(customForm.amount_paid))}
                </div>
              )}
            </div>
          )}

          <button disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <ShoppingCart size={16} />
            {saving ? 'Recording sale…' : 'Complete Sale'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
