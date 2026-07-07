import { useEffect, useState } from 'react';
import {
  Plus,
  Download,
  Trash2,
  Eye,
  Send,
  Settings as SettingsIcon,
  Calendar,
  Search,
  User as UserIcon,
  Briefcase,
  MapPin,
  Mail,
  ChevronLeft,
  X,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { Invoice, Customer, Product } from '../types';
import { formatMoney, formatDate, statusStyles } from '../utils/format';

interface CustomItem {
  name: string;
  description: string;
  qty: number;
  price: number;
  discount: number;
  tax: number;
}

export default function Invoices() {
  // Navigation / View states
  const [view, setView] = useState<'list' | 'create'>('list');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Create Form states
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  
  // Customer selection states
  const [customerId, setCustomerId] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerBusiness, setManualCustomerBusiness] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [manualCustomerEmail, setManualCustomerEmail] = useState('');
  const [manualCustomerLocation, setManualCustomerLocation] = useState('');

  // Items state
  const [items, setItems] = useState<CustomItem[]>([
    { name: 'Printing', description: 'A4 Black & White', qty: 50, price: 10, discount: 0, tax: 0 },
    { name: 'Scanning', description: 'Scan to PDF', qty: 10, price: 50, discount: 0, tax: 0 },
    { name: 'Binding', description: 'Spiral Binding', qty: 2, price: 150, discount: 0, tax: 0 },
    { name: 'Passport Photos', description: '4 pcs', qty: 4, price: 100, discount: 0, tax: 0 },
  ]);

  // Notes & terms states
  const [notes, setNotes] = useState('Thank you for choosing Litmus Solutions.');
  const [termsConds, setTermsConds] = useState(
    "1. Payment is due on or before the due date.\n2. Late payments may attract additional charges.\n3. Thank you for choosing Litmus Solutions."
  );

  // General billing calculation states
  const [discountVal, setDiscountVal] = useState(0);
  const [discountType, setDiscountType] = useState<'KES' | '%'>('KES');
  const [taxRate, setTaxRate] = useState(0); // Default 0% VAT

  // UI state
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null); // tracks which saved invoice is being previewed
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefix, setPrefix] = useState('INV-2026-');

  // Load backend details
  function load() {
    api.get('/invoices').then((res) => {
      setInvoices(res.data);
    });
    api.get('/customers').then((res) => setCustomers(res.data));
    api.get('/products').then((res) => setProducts(res.data));
  }

  useEffect(() => {
    load();
    // Get invoice settings for prefix
    api.get('/settings').then((res) => {
      if (res.data) {
        if (res.data.invoice_prefix) {
          setPrefix(res.data.invoice_prefix);
        }
        if (res.data.tax_rate !== undefined) {
          setTaxRate(Number(res.data.tax_rate));
        }
      }
    }).catch(() => {});
  }, []);

  // Update dynamic invoice number preview based on list length
  useEffect(() => {
    const matchingCount = invoices.filter(inv => inv.invoice_number.startsWith(prefix)).length;
    const nextNum = prefix + String(matchingCount + 1).padStart(3, '0');
    setInvoiceNumber(nextNum);
  }, [invoices, prefix, view]);

  // Calculations
  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.price), 0);
  const calculatedDiscount = discountType === 'KES' ? discountVal : (subtotal * discountVal) / 100;
  const calculatedTax = (subtotal - calculatedDiscount) * (taxRate / 100);
  const total = subtotal - calculatedDiscount + calculatedTax;

  // Selected customer object for preview display
  const selectedCustomerObj = customers.find((c) => c.id === customerId);

  // Helper to add manual row
  function addRow() {
    setItems((prev) => [...prev, { name: '', description: '', qty: 1, price: 0, discount: 0, tax: 0 }]);
  }

  function updateItem(idx: number, patch: Partial<CustomItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Add selected products from picker
  function addProductToInvoice(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        name: product.name,
        description: product.sku ? `SKU: ${product.sku}` : 'Laptop Accessories',
        qty: 1,
        price: product.selling_price,
        discount: 0,
        tax: 0,
      },
    ]);
    setShowProductPicker(false);
  }

  // Submit invoice payload
  async function handleSave(status: 'draft' | 'unpaid' | 'paid') {
    let finalCustomerId = customerId;

    if (isManualCustomer) {
      if (!manualCustomerName && !manualCustomerBusiness) {
        alert('Please enter a customer name or business name.');
        return;
      }
      
      setSaving(true);
      try {
        // Auto-generate phone if empty
        const finalPhone = manualCustomerPhone.trim() || `WALKIN-${Date.now()}`;
        const custRes = await api.post('/customers', {
          phone: finalPhone,
          name: manualCustomerName.trim() || undefined,
          business_name: manualCustomerBusiness.trim() || undefined,
          email: manualCustomerEmail.trim() || undefined,
          location: manualCustomerLocation.trim() || undefined,
        });
        finalCustomerId = custRes.data.id;
      } catch (err: any) {
        console.error(err);
        alert(err?.response?.data?.message || 'Error creating manual customer profile.');
        setSaving(false);
        return;
      }
    }

    if (!finalCustomerId) {
      alert('Please select a customer or switch to manual entry.');
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: finalCustomerId,
        due_date: dueDate || undefined,
        items: items.map(it => ({
          name: it.name,
          description: it.description || '',
          qty: Number(it.qty) || 1,
          price: Number(it.price) || 0,
          discount: Number(it.discount) || 0,
          tax: Number(it.tax) || 0
        })),
        discount: calculatedDiscount,
        vat_rate: taxRate,
        terms: termsConds,
        status: status,
      };

      const res = await api.post('/invoices', payload);
      
      // Reset & go back
      setView('list');
      load();
      // Clear fields
      setCustomerId('');
      setIsManualCustomer(false);
      setManualCustomerName('');
      setManualCustomerBusiness('');
      setManualCustomerPhone('');
      setManualCustomerEmail('');
      setManualCustomerLocation('');
      setDiscountVal(0);
      setDueDate('');
      setReference('');
      setShowPreviewModal(false);

      // Offer immediate download after creation
      if (status !== 'draft') {
        downloadPdf(res.data);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf(inv: Invoice) {
    const res = await api.get(`/invoices/${inv.id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${inv.invoice_number}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Filtered products list
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <Layout title={view === 'list' ? 'Invoices' : undefined}>
      {view === 'list' ? (
        <>
          <div className="flex justify-end mb-5">
            <button onClick={() => setView('create')} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Create Invoice
            </button>
          </div>

          <div className="card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Invoice #</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="px-5 py-3.5 font-medium text-litmus-black">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5 text-gray-500">{inv.customer_name || 'Walk-in'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-5 py-3.5 font-semibold text-litmus-black">{formatMoney(inv.total)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${statusStyles[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          // Store the full invoice object for status display
                          setPreviewInvoice(inv);
                          setInvoiceNumber(inv.invoice_number);
                          setInvoiceDate(inv.issue_date.split('T')[0]);
                          setDueDate(inv.due_date ? inv.due_date.split('T')[0] : '');
                          setNotes(inv.terms || '');
                          setTermsConds(inv.terms || '');
                          setItems(inv.items.map(it => ({
                            name: it.name,
                            description: (it as any).description || '',
                            qty: it.qty,
                            price: it.price,
                            discount: (it as any).discount || 0,
                            tax: (it as any).tax || 0
                          })));
                          setDiscountVal(inv.discount);
                          setIsManualCustomer(true);
                          setManualCustomerName(inv.customer_name || '');
                          setManualCustomerPhone(inv.customer_phone || '');
                          setManualCustomerLocation('');
                          setShowPreviewModal(true);
                        }}
                        className="text-gray-400 hover:text-litmus-red transition"
                        title="Quick Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button onClick={() => downloadPdf(inv)} className="text-gray-400 hover:text-litmus-red transition">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-10">
                      No invoices yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Single Column cleaner Invoice Creation View (Preview popup is shown on demand) */
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Breadcrumbs & Header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="cursor-pointer hover:text-litmus-red transition" onClick={() => setView('list')}>
                Invoices
              </span>
              <span>&gt;</span>
              <span className="text-gray-600 font-medium">Create Invoice</span>
            </div>
            <h1 className="text-2xl font-extrabold text-litmus-black mt-1">Create Invoice</h1>
            <p className="text-gray-400 text-sm">Generate a new invoice for your customer</p>
          </div>

          <div className="space-y-6">
            {/* Customer Information & Invoice Details row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Customer Information Card */}
              <div className="card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">Customer Information</h2>
                    <button
                      type="button"
                      onClick={() => setIsManualCustomer(!isManualCustomer)}
                      className="text-xs text-litmus-red font-semibold hover:underline flex items-center gap-1"
                    >
                      {isManualCustomer ? 'Select Saved' : '+ New Customer / Company'}
                    </button>
                  </div>

                  {isManualCustomer ? (
                    <div className="space-y-3">
                      <div>
                        <label className="label-sm">Name</label>
                        <input
                          type="text"
                          placeholder="Enter customer name"
                          className="input-field py-2"
                          value={manualCustomerName}
                          onChange={(e) => setManualCustomerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label-sm">Company / Business</label>
                        <input
                          type="text"
                          placeholder="Enter company name"
                          className="input-field py-2"
                          value={manualCustomerBusiness}
                          onChange={(e) => setManualCustomerBusiness(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label-sm">Phone</label>
                          <input
                            type="text"
                            placeholder="Phone"
                            className="input-field py-2"
                            value={manualCustomerPhone}
                            onChange={(e) => setManualCustomerPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label-sm">Email</label>
                          <input
                            type="email"
                            placeholder="Email"
                            className="input-field py-2"
                            value={manualCustomerEmail}
                            onChange={(e) => setManualCustomerEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label-sm">Location / Address</label>
                        <input
                          type="text"
                          placeholder="Nairobi, Kenya"
                          className="input-field py-2"
                          value={manualCustomerLocation}
                          onChange={(e) => setManualCustomerLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="label-sm">Select Customer *</label>
                        <select
                          className="input-field"
                          value={customerId}
                          onChange={(e) => setCustomerId(e.target.value)}
                        >
                          <option value="">Select Customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name || c.business_name} ({c.phone})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedCustomerObj ? (
                        <div className="border border-red-50 bg-red-50/10 rounded-xl p-3.5 flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-litmus-red/10 text-litmus-red flex items-center justify-center font-bold text-sm shrink-0">
                            <UserIcon size={18} />
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="font-bold text-gray-800">
                              {selectedCustomerObj.name || 'Walk-in'}
                            </div>
                            {selectedCustomerObj.business_name && (
                              <div className="text-gray-500 flex items-center gap-1">
                                <Briefcase size={12} /> {selectedCustomerObj.business_name}
                              </div>
                            )}
                            <div className="text-gray-500">{selectedCustomerObj.phone}</div>
                            {selectedCustomerObj.email && (
                              <div className="text-gray-500 flex items-center gap-1">
                                <Mail size={12} /> {selectedCustomerObj.email}
                              </div>
                            )}
                            {selectedCustomerObj.location && (
                              <div className="text-gray-500 flex items-center gap-1">
                                <MapPin size={12} /> {selectedCustomerObj.location}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-xs text-gray-400">
                          Select customer from dropdown or add one manually above
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Details Card */}
              <div className="card">
                <h2 className="text-sm font-bold text-gray-800 mb-4">Invoice Details</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-sm">Invoice Number *</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="input-field pr-9 font-medium"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <SettingsIcon size={15} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Invoice Date *</label>
                      <div className="relative">
                        <input
                          type="date"
                          className="input-field"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-sm">Due Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          className="input-field"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label-sm">Reference (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. PO #, Order ID"
                        className="input-field"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Items Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800">Items</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="border border-red-200 text-litmus-red bg-red-50/40 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProductPicker(true)}
                    className="border border-gray-200 hover:bg-gray-50 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    + Add from Products
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-400 font-medium">
                      <th className="py-2.5 w-8">#</th>
                      <th className="py-2.5 min-w-[150px] pr-2">Item / Service</th>
                      <th className="py-2.5 min-w-[150px] pr-2">Description</th>
                      <th className="py-2.5 w-16 pr-2">Qty</th>
                      <th className="py-2.5 w-24 pr-2">Unit Price (KES)</th>
                      <th className="py-2.5 w-20 pr-2">Discount</th>
                      <th className="py-2.5 w-20 pr-2">Tax</th>
                      <th className="py-2.5 w-24 text-right pr-2">Amount (KES)</th>
                      <th className="py-2.5 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const lineTotal = Number(it.qty) * Number(it.price);
                      return (
                        <tr key={idx} className="border-b border-gray-50 group">
                          <td className="py-3 text-gray-400 font-medium">{idx + 1}</td>
                          <td className="py-3 pr-2">
                            <input
                              type="text"
                              className="w-full border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-litmus-red"
                              value={it.name}
                              onChange={(e) => updateItem(idx, { name: e.target.value })}
                              placeholder="Service/Item Name"
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <input
                              type="text"
                              className="w-full border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-litmus-red"
                              value={it.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              placeholder="Details..."
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <input
                              type="number"
                              className="w-full border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-litmus-red text-center"
                              value={it.qty || ''}
                              onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <input
                              type="number"
                              className="w-full border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-litmus-red text-right"
                              value={it.price || ''}
                              onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                            />
                          </td>
                          <td className="py-3 pr-2">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                className="w-full border border-gray-200 rounded pl-2 pr-5 py-1.5 focus:outline-none focus:ring-1 focus:ring-litmus-red text-center"
                                value={it.discount || 0}
                                onChange={(e) => updateItem(idx, { discount: Number(e.target.value) })}
                              />
                              <span className="absolute right-1.5 text-[10px] text-gray-400 font-semibold">%</span>
                            </div>
                          </td>
                          <td className="py-3 pr-2">
                            <select
                              className="w-full border border-gray-200 rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-litmus-red text-center"
                              value={it.tax}
                              onChange={(e) => updateItem(idx, { tax: Number(e.target.value) })}
                            >
                              <option value="0">0%</option>
                              <option value="16">16%</option>
                            </select>
                          </td>
                          <td className="py-3 text-right pr-2 font-semibold text-gray-800">
                            {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="text-gray-300 hover:text-litmus-red transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Terms + Summary cards split row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Notes & Terms Columns (Span 2) */}
              <div className="md:col-span-2 space-y-4">
                {/* Notes */}
                <div className="card">
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Notes</label>
                  <textarea
                    placeholder="Add any notes or special instructions..."
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs h-16 focus:outline-none focus:ring-1 focus:ring-litmus-red"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Terms */}
                <div className="card">
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Terms &amp; Conditions</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-litmus-red font-mono"
                    value={termsConds}
                    onChange={(e) => setTermsConds(e.target.value)}
                  />
                </div>
              </div>

              {/* Subtotals & Final Summary Card (Span 1) */}
              <div className="card flex flex-col justify-between p-5 space-y-4">
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-800">
                      KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Discount Input in summary */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-semibold block">Discount</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        className="w-full border border-gray-200 rounded px-2 py-1 text-center"
                        value={discountVal || ''}
                        onChange={(e) => setDiscountVal(Number(e.target.value))}
                      />
                      <select
                        className="border border-gray-200 rounded text-[11px] px-1"
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'KES' | '%')}
                      >
                        <option value="KES">KES</option>
                        <option value="%">%</option>
                      </select>
                    </div>
                  </div>

                  {/* Tax configuration in summary */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-semibold block">Tax (VAT)</label>
                    <select
                      className="w-full border border-gray-200 rounded px-2 py-1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                    >
                      <option value="0">VAT (0%)</option>
                      <option value="16">VAT (16%)</option>
                    </select>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-gray-500">
                    <span>Tax Amount ({taxRate}%)</span>
                    <span>
                      KES {calculatedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="text-[10px] uppercase font-bold tracking-wide text-gray-400 mb-0.5">Total</div>
                  <div className="text-xl font-extrabold text-litmus-red">
                    KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom control buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-500 font-medium px-4 py-2.5 rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-lg text-xs transition disabled:opacity-50"
                >
                  Save as Draft
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition"
                >
                  <Eye size={14} /> Preview Invoice
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('unpaid')}
                  disabled={saving}
                  className="bg-litmus-red hover:bg-litmus-redHover text-white font-semibold px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  <Send size={13} /> Save &amp; Send
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl2 shadow-soft border border-black/5 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Add Item from Products</h3>
              <button
                type="button"
                onClick={() => setShowProductPicker(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-50">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-litmus-red"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="border border-gray-100 rounded-lg p-3 flex items-center justify-between hover:bg-red-50/5 hover:border-red-100 transition cursor-pointer"
                  onClick={() => addProductToInvoice(prod)}
                >
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-gray-800 truncate">{prod.name}</div>
                    <div className="text-[10px] text-gray-400">
                      Category: {prod.category} | SKU: {prod.sku || '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-litmus-red">
                      {formatMoney(prod.selling_price)}
                    </div>
                    <div className="text-[10px] text-gray-400">Stock: {prod.quantity} units</div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-8">
                  No active products found matching your search.
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowProductPicker(false)}
                className="border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 text-xs font-medium px-4 py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview POPUP Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl2 shadow-soft border border-black/5 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Invoice Preview</h3>
                  {previewInvoice && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-extrabold text-litmus-black">{previewInvoice.invoice_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        previewInvoice.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : previewInvoice.status === 'overdue'
                          ? 'bg-red-100 text-red-700 animate-pulse'
                          : previewInvoice.status === 'unpaid'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : previewInvoice.status === 'partial'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {previewInvoice.status === 'unpaid' ? '⚠ UNPAID' : previewInvoice.status === 'overdue' ? '🔴 OVERDUE' : previewInvoice.status === 'paid' ? '✓ PAID' : previewInvoice.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setShowPreviewModal(false); setPreviewInvoice(null); }}
                  className="bg-white hover:bg-gray-50 text-[10px] font-semibold text-gray-600 border border-gray-200 rounded px-2.5 py-1.5 transition"
                >
                  Edit Further
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('unpaid')}
                  className="bg-litmus-red hover:bg-litmus-redHover text-white text-[10px] font-bold rounded px-3 py-1.5 flex items-center gap-1 transition shadow"
                >
                  Save &amp; Send
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPreviewModal(false); setPreviewInvoice(null); }}
                  className="text-gray-400 hover:text-gray-600 transition p-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* High fidelity invoice sheet preview inside the scrollable modal */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
              <div className="bg-white border border-gray-200/60 rounded-xl shadow-soft p-8 text-gray-800 text-[10px] leading-relaxed relative overflow-hidden select-none max-w-xl mx-auto">
                
                {/* Red stripe header */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-litmus-red" />
                
                {/* INVOICE banner */}
                <div className="absolute top-0 right-8 bg-litmus-red text-white py-2.5 px-5 font-bold text-center rounded-b-md shadow-sm">
                  <div className="text-[7px] uppercase tracking-wider opacity-90">Invoice</div>
                  <div className="text-[10px] font-extrabold">{invoiceNumber || 'INV-2026-000'}</div>
                </div>

                {/* Company details */}
                <div className="flex items-start gap-2.5 mt-5 mb-6">
                  {/* Small logo placeholder */}
                  <div className="w-9 h-9 rounded bg-litmus-black border border-litmus-red flex items-center justify-center shrink-0">
                    <span className="text-litmus-red font-extrabold text-lg">L</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-none">Litmus Solutions</h4>
                    <p className="text-[8px] text-gray-400 mt-1">Cyber Services &amp; Laptop Store</p>
                  </div>
                </div>

                {/* From / Bill to Grid */}
                <div className="grid grid-cols-2 gap-6 border-t border-b border-gray-100 py-4 mb-6">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-gray-400 font-bold uppercase block tracking-wider mb-1.5">From:</span>
                    <div className="font-bold text-gray-850 text-[9px]">Litmus Solutions</div>
                    <div className="text-gray-500">Cyber Services &amp; Laptop Store</div>
                    <div className="text-gray-500">P.O Box 12345, Nairobi, Kenya</div>
                    <div className="text-gray-500">Phone: 0722 123 456</div>
                    <div className="text-gray-500">Email: info@litmussolutions.co.ke</div>
                    <div className="text-gray-500">Website: www.litmussolutions.co.ke</div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[8px] text-gray-400 font-bold uppercase block tracking-wider mb-1.5">Bill To:</span>
                    {isManualCustomer ? (
                      <>
                        <div className="font-bold text-gray-805 text-[9px]">{manualCustomerName || 'Walk-in Customer'}</div>
                        {manualCustomerBusiness && <div className="text-gray-700 font-semibold">{manualCustomerBusiness}</div>}
                        {manualCustomerPhone && <div className="text-gray-500">{manualCustomerPhone}</div>}
                        {manualCustomerEmail && <div className="text-gray-500">{manualCustomerEmail}</div>}
                        {manualCustomerLocation && <div className="text-gray-500">{manualCustomerLocation}</div>}
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-gray-805 text-[9px]">
                          {selectedCustomerObj?.name || 'Walk-in Customer'}
                        </div>
                        {selectedCustomerObj?.business_name && (
                          <div className="text-gray-700 font-semibold">{selectedCustomerObj.business_name}</div>
                        )}
                        {selectedCustomerObj?.phone && <div className="text-gray-500">{selectedCustomerObj.phone}</div>}
                        {selectedCustomerObj?.email && <div className="text-gray-500">{selectedCustomerObj.email}</div>}
                        {selectedCustomerObj?.location && (
                          <div className="text-gray-500">{selectedCustomerObj.location}</div>
                        )}
                      </>
                    )}

                    <div className="pt-2.5 text-[8px] text-gray-400 flex flex-col gap-0.5 border-t border-gray-50 mt-2">
                      <div>
                        <strong className="text-gray-600">Invoice Date:</strong> {invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                      <div>
                        <strong className="text-gray-600">Due Date:</strong> {dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items table */}
                <table className="w-full text-left text-[8px] mb-5">
                  <thead>
                    <tr className="bg-litmus-red text-white font-bold uppercase tracking-wider">
                      <th className="p-2 w-6 rounded-l">#</th>
                      <th className="p-2">Item / Service</th>
                      <th className="p-2 w-8 text-center">Qty</th>
                      <th className="p-2 w-16 text-right">Unit Price</th>
                      <th className="p-2 w-12 text-center">Discount</th>
                      <th className="p-2 w-10 text-center">Tax</th>
                      <th className="p-2 w-18 text-right rounded-r">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const lineTotal = Number(it.qty) * Number(it.price);
                      return (
                        <tr key={idx} className="border-b border-gray-100 text-gray-700">
                          <td className="p-2 text-gray-400 font-medium">{idx + 1}</td>
                          <td className="p-2">
                            <div className="font-bold text-gray-900">{it.name || 'Untitled Item'}</div>
                            {it.description && <div className="text-gray-400 text-[7px] leading-snug mt-0.5">{it.description}</div>}
                          </td>
                          <td className="p-2 text-center">{it.qty}</td>
                          <td className="p-2 text-right">KES {Number(it.price).toFixed(2)}</td>
                          <td className="p-2 text-center">{it.discount || 0}%</td>
                          <td className="p-2 text-center">{it.tax || 0}%</td>
                          <td className="p-2 text-right font-bold text-gray-900">
                            KES {lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals & Notes Section */}
                <div className="flex justify-between items-start gap-6 mt-6">
                  {/* Left Notes */}
                  <div className="w-1/2 space-y-3.5">
                    {notes && (
                      <div>
                        <div className="font-bold text-gray-700 text-[8px] uppercase tracking-wide">Notes:</div>
                        <p className="text-gray-500 text-[8px] leading-relaxed mt-0.5">{notes}</p>
                      </div>
                    )}
                    {termsConds && (
                      <div>
                        <div className="font-bold text-gray-700 text-[8px] uppercase tracking-wide">Terms &amp; Conditions:</div>
                        <p className="text-gray-500 text-[7px] leading-relaxed mt-0.5 whitespace-pre-wrap">{termsConds}</p>
                      </div>
                    )}
                  </div>

                  {/* Right subtotal & signature */}
                  <div className="w-1/2 flex flex-col items-end space-y-4">
                    
                    {/* Totals details */}
                    <div className="w-full space-y-1.5 text-[8px] border-b border-gray-100 pb-2">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal:</span>
                        <span className="font-bold text-gray-800">KES {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Discount:</span>
                        <span className="font-bold text-gray-800">KES {calculatedDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Tax ({taxRate}%):</span>
                        <span className="font-bold text-gray-800">KES {calculatedTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-litmus-black text-white font-bold p-2 rounded shadow-sm">
                        <span>Total:</span>
                        <span>KES {total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Authorized Signature */}
                    <div className="text-right pt-1.5">
                      <div className="font-semibold text-gray-400 text-[7px] uppercase tracking-wide mb-1">Authorized Signature</div>
                      <svg width="75" height="25" viewBox="0 0 100 40" className="inline-block text-gray-800">
                        <path
                          d="M10 25 C 20 5, 25 35, 35 15 C 45 -5, 50 40, 60 20 C 70 5, 75 30, 90 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="border-t border-gray-200 mt-1 w-20 ml-auto" />
                    </div>

                  </div>
                </div>

                {/* Footer bar */}
                <div className="bg-litmus-red text-white flex items-center justify-between p-2 mt-6 -mx-8 -mb-8 rounded-b-xl text-[7px]">
                  <div className="flex gap-2">
                    <span>Facebook</span>
                    <span>Twitter</span>
                    <span>WhatsApp</span>
                  </div>
                  <span className="font-bold">Powered by Litmus Solutions</span>
                </div>

              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-150 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="border border-gray-200 text-gray-650 bg-white hover:bg-gray-50 text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
