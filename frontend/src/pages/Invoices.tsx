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
import litmusLogo from '../assets/litmus-logo.png';

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
  const [notes, setNotes] = useState('Thank you for choosing Litmus Tech Solutions.');
  const [termsConds, setTermsConds] = useState(
    "1. Payment is due on or before the due date.\n2. Late payments may attract additional charges.\n3. Thank you for choosing Litmus Tech Solutions."
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

  // Document Type state — invoice | quotation | receipt
  const [docType, setDocType] = useState<'invoice' | 'quotation' | 'receipt'>('invoice');

  // Editing state for invoices/quotations/receipts
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter states
  const [users, setUsers] = useState<any[]>([]);
  const [creatorFilter, setCreatorFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // Load backend details
  function load(typeFilter: 'invoice' | 'quotation' | 'receipt' = docType) {
    const params: any = { type: typeFilter };
    if (creatorFilter) params.created_by = creatorFilter;
    if (fromDateFilter) params.from_date = fromDateFilter;
    if (toDateFilter) params.to_date = toDateFilter;
    api.get('/invoices', { params }).then((res) => {
      setInvoices(res.data);
    });
    api.get('/customers').then((res) => setCustomers(res.data));
    api.get('/products').then((res) => setProducts(res.data));
    api.get('/settings/users').then((res) => setUsers(res.data)).catch(() => {});
  }

  useEffect(() => {
    load(docType);
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
  }, [docType, creatorFilter, fromDateFilter, toDateFilter]);

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
        type: docType,
      };

      let res;
      if (editingId) {
        res = await api.put(`/invoices/${editingId}`, payload);
      } else {
        res = await api.post('/invoices', payload);
      }
      
      // Reset & go back
      setView('list');
      setEditingId(null);
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
      alert(err?.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} ${docType}.`);
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf(inv: Invoice) {
    try {
      const res = await api.get(`/invoices/${inv.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      // Open in new tab so browser PDF viewer renders it
      const win = window.open(url, '_blank');
      if (!win) {
        // Fallback: force download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${inv.invoice_number}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      // Revoke after a delay so the new tab can load the blob
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to download PDF. Please try again.');
    }
  }

  // Filtered products list
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <Layout title={view === 'list' ? (docType === 'invoice' ? 'Invoices' : docType === 'receipt' ? 'Receipts' : 'Quotations') : undefined}>
      {view === 'list' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setDocType('invoice'); setView('list'); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${docType === 'invoice' ? 'bg-white text-litmus-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Invoices
              </button>
              <button
                type="button"
                onClick={() => { setDocType('quotation'); setView('list'); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${docType === 'quotation' ? 'bg-white text-litmus-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Quotations
              </button>
              <button
                type="button"
                onClick={() => { setDocType('receipt'); setView('list'); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${docType === 'receipt' ? 'bg-white text-litmus-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Receipts
              </button>
            </div>
            <button 
              type="button"
              onClick={() => { setView('create'); setEditingId(null); }} 
              className="btn-primary flex items-center gap-2 shadow-soft"
            >
              <Plus size={16} /> Create {docType === 'invoice' ? 'Invoice' : docType === 'quotation' ? 'Quotation' : 'Receipt'}
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-end gap-3 mb-4 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Created By</label>
              <select
                className="input-field text-xs py-1.5"
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
              >
                <option value="">All Staff</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">From Date</label>
              <input
                type="date"
                className="input-field text-xs py-1.5"
                value={fromDateFilter}
                onChange={(e) => setFromDateFilter(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">To Date</label>
              <input
                type="date"
                className="input-field text-xs py-1.5"
                value={toDateFilter}
                onChange={(e) => setToDateFilter(e.target.value)}
              />
            </div>
            {(creatorFilter || fromDateFilter || toDateFilter) && (
              <button
                type="button"
                onClick={() => { setCreatorFilter(''); setFromDateFilter(''); setToDateFilter(''); }}
                className="text-xs text-litmus-red font-semibold hover:underline pb-1"
              >
                ✕ Clear Filters
              </button>
            )}
          </div>

          <div className="card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">{docType === 'invoice' ? 'Invoice #' : docType === 'receipt' ? 'Receipt #' : 'Quotation #'}</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Created By</th>
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
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{(inv as any).creator_name || <span className="text-gray-300 italic">—</span>}</td>
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
                      No {docType === 'invoice' ? 'invoices' : 'quotations'} yet.
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
                {docType === 'invoice' ? 'Invoices' : 'Quotations'}
              </span>
              <span>&gt;</span>
              <span className="text-gray-600 font-medium">Create {docType === 'invoice' ? 'Invoice' : 'Quotation'}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-litmus-black mt-1">Create {docType === 'invoice' ? 'Invoice' : 'Quotation'}</h1>
            <p className="text-gray-400 text-sm">Generate a new {docType === 'invoice' ? 'invoice' : 'quotation'} for your customer</p>
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
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{(previewInvoice as any)?.type === 'quotation' || docType === 'quotation' ? 'Quotation Preview' : 'Invoice Preview'}</h3>
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
                
                {/* Diagonal watermark */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                  style={{ zIndex: 0 }}
                  aria-hidden
                >
                  <div
                    style={{
                      transform: 'rotate(-35deg)',
                      fontSize: '44px',
                      fontWeight: 900,
                      color: 'rgba(193,18,31,0.055)',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.08em',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    LITMUS TECH SOLUTIONS
                  </div>
                </div>

                {/* Document type banner */}
                <div className="absolute top-0 right-8 bg-litmus-red text-white py-2.5 px-5 font-bold text-center rounded-b-md shadow-sm" style={{ zIndex: 1 }}>
                  <div className="text-[7px] uppercase tracking-wider opacity-90">{docType === 'quotation' ? 'Quotation' : docType === 'receipt' ? 'Receipt' : 'Invoice'}</div>
                  <div className="text-[10px] font-extrabold">{invoiceNumber || (docType === 'quotation' ? 'QTN-2026-000' : docType === 'receipt' ? 'RCT-2026-000' : 'INV-2026-000')}</div>
                </div>

                {/* Company details */}
                <div className="flex items-start gap-2.5 mt-5 mb-6" style={{ position: 'relative', zIndex: 1 }}>
                  <img
                    src={litmusLogo}
                    alt="Litmus Logo"
                    className="w-9 h-9 object-contain rounded border border-gray-100 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-none">Litmus Tech Solutions</h4>
                    <p className="text-[8px] text-gray-400 mt-1">Technology for You</p>
                  </div>
                </div>

                {/* From / Bill to Grid */}
                <div className="grid grid-cols-2 gap-6 border-t border-b border-gray-100 py-4 mb-6">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-gray-400 font-bold uppercase block tracking-wider mb-1.5">From:</span>
                    <div className="font-bold text-gray-850 text-[9px]">Litmus Tech Solutions</div>
                    <div className="text-gray-500">Technology for You</div>
                    <div className="text-gray-500">P.O Box 33058-30100 Eldoret-Kenya</div>
                    <div className="text-gray-500">Phone: +254 723 005 182 / 0706 085 261</div>
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

                    {/* Served By */}
                    {previewInvoice && (previewInvoice as any).served_by_name && (
                      <div className="text-[8px] pt-2 text-gray-500">
                        <span className="font-bold text-gray-600">Served By:</span>{' '}
                        <span className="text-litmus-red font-semibold">{(previewInvoice as any).served_by_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer bar */}
                <div className="bg-litmus-red text-white flex items-center justify-between p-2 mt-6 -mx-8 -mb-8 rounded-b-xl text-[7px]">
                  <div className="flex gap-2">
                    <span>Facebook</span>
                    <span>Twitter</span>
                    <span>WhatsApp</span>
                  </div>
                  <span className="font-bold">Powered by Litmus Tech Solutions</span>
                </div>

              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-150 bg-gray-50 flex justify-between items-center gap-2">
              <div className="text-xs text-gray-400">
                {previewInvoice ? (
                  <span className={`font-bold ${previewInvoice.status === 'paid' ? 'text-emerald-600' : 'text-litmus-red'}`}>
                    {previewInvoice.status?.toUpperCase()}
                  </span>
                ) : 'Preview Mode'}
              </div>
              <div className="flex gap-2 flex-wrap">
                {previewInvoice && (previewInvoice as any).type === 'quotation' && (() => {
                  const phone = (previewInvoice.customer_phone || manualCustomerPhone || '').replace(/\D/g, '');
                  const name = previewInvoice.customer_name || manualCustomerName || 'Valued Customer';
                  const amount = formatMoney(previewInvoice.total);
                  const num = previewInvoice.invoice_number;
                  const msg = encodeURIComponent(
                    `Hello ${name},\n\nPlease find attached your Quotation *${num}* for *${amount}*.\n\nKindly review and confirm to proceed.\n\nRegards,\nLitmus Tech Solutions\n+254 723 005 182`
                  );
                  const waLink = `https://wa.me/${phone.startsWith('0') ? '254' + phone.slice(1) : phone}?text=${msg}`;
                  return (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                      Share via WhatsApp
                    </a>
                  );
                })()}
                {previewInvoice && (previewInvoice as any).type === 'quotation' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to convert this quotation to an invoice?')) {
                        try {
                          await api.post(`/invoices/${previewInvoice.id}/convert-to-invoice`);
                          alert('Converted to Invoice successfully! Re-routing to invoices list.');
                          setDocType('invoice');
                          setShowPreviewModal(false);
                          setPreviewInvoice(null);
                          load('invoice');
                        } catch (err: any) {
                          alert(err?.response?.data?.message || 'Conversion failed.');
                        }
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Convert to Invoice
                  </button>
                )}
                {previewInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(previewInvoice.id);
                      setInvoiceNumber(previewInvoice.invoice_number);
                      setInvoiceDate(previewInvoice.issue_date.split('T')[0]);
                      setDueDate(previewInvoice.due_date ? previewInvoice.due_date.split('T')[0] : '');
                      setNotes(previewInvoice.terms || '');
                      setTermsConds(previewInvoice.terms || '');
                      setItems(previewInvoice.items.map(it => ({
                        name: it.name,
                        description: (it as any).description || '',
                        qty: it.qty,
                        price: it.price,
                        discount: (it as any).discount || 0,
                        tax: (it as any).tax || 0
                      })));
                      setDiscountVal(previewInvoice.discount);
                      setCustomerId(previewInvoice.customer_id || '');
                      setIsManualCustomer(false);
                      setView('create');
                      setShowPreviewModal(false);
                    }}
                    className="border border-gray-200 text-gray-650 bg-white hover:bg-gray-50 text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="border border-gray-200 text-gray-650 bg-white hover:bg-gray-50 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  🖨️ Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inv = previewInvoice;
                    const status = inv?.status || 'unpaid';
                    const isPaid = status === 'paid';
                    const watermarkColor = isPaid ? '#10b981' : '#ef4444';
                    const watermarkText = isPaid ? 'PAID' : status === 'overdue' ? 'OVERDUE' : 'UNPAID';
                    const customerName = inv?.customer_name || (isManualCustomer ? (manualCustomerName || 'Walk-in Customer') : (customers.find(c => c.id === customerId)?.name || 'Walk-in Customer'));
                    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice ${invoiceNumber}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 30px; }
  .header-container { border-top: 5px solid #C1121F; margin-bottom: 20px; }
  .header-logo-row { display: flex; justify-content: space-between; align-items: center; background: #000; color: #fff; padding: 12px 20px; }
  .logo-block { display: flex; align-items: center; gap: 12px; }
  .logo-circle { width: 42px; height: 42px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid #C1121F; overflow: hidden; }
  .logo-circle img { height: 32px; object-fit: contain; }
  .company-title { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .contact-bar { background: #fff; border-top: 3px solid #C1121F; border-bottom: 3px solid #C1121F; text-align: center; padding: 6px 0; font-size: 9px; font-weight: bold; color: #000; }
  
  .info-row { display: flex; justify-content: space-between; margin-top: 25px; margin-bottom: 25px; align-items: flex-end; }
  .client-details { width: 45%; text-align: left; }
  .client-title { font-size: 12px; font-weight: bold; text-decoration: underline; margin-bottom: 6px; }
  .client-info { font-size: 11px; color: #333; line-height: 1.4; }
  .invoice-pill { background: #000; color: #fff; padding: 5px 25px; font-size: 13px; font-weight: bold; border-radius: 4px; letter-spacing: 1px; }
  .invoice-date { font-size: 11px; font-weight: bold; text-align: right; }
  
  .table-container { position: relative; min-height: 400px; border: 1.5px solid #000; border-radius: 0 0 12px 12px; overflow: hidden; margin-top: 15px; }
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 48px; font-weight: 900; color: rgba(0, 0, 0, 0.03); pointer-events: none; user-select: none; z-index: 0; white-space: nowrap; text-align: center; font-family: 'Arial Black', sans-serif; }
  .content-wrapper { position: relative; z-index: 1; }
  
  table.invoice-table { width: 100%; border-collapse: collapse; }
  table.invoice-table th { background: #000; color: #fff; font-size: 11px; font-weight: bold; padding: 10px; text-transform: uppercase; text-align: left; border-right: 1.5px solid #000; }
  table.invoice-table th:last-child { border-right: none; }
  table.invoice-table td { padding: 12px 10px; font-size: 11px; vertical-align: top; border-right: 1.5px solid #000; text-align: left; }
  table.invoice-table td:last-child { border-right: none; }
  
  .filler-row { height: 180px; }
  .totals-row { border-top: 1.5px solid #000; }
  .totals-row td { padding: 10px; font-weight: bold; font-size: 12px; }
  .payment-details-cell { font-size: 8px; color: #444; line-height: 1.3; }
  .invoice-number-red { font-size: 12px; color: #C1121F; font-weight: bold; margin-top: 6px; }
  
  .services-footer { margin-top: 25px; border-top: 2px solid #C1121F; padding-top: 12px; text-align: left; }
  .services-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 6px 30px; font-size: 9px; color: #333; font-weight: bold; }
</style></head>
<body>
<div class="header-container">
  <div class="header-logo-row">
    <div class="logo-block">
      <div class="logo-circle">
        <img src="/logo.png" onError="this.style.display='none'" />
      </div>
      <div class="company-title">Litmus Tech Solutions</div>
    </div>
  </div>
  <div class="contact-bar">
    Tel: +254 723 005 182 | 0706 085 261 | Email: info@litmussolution.co.ke | Website: www.litmussolution.co.ke
  </div>
</div>

<div class="info-row">
  <div class="client-details">
    <div class="client-title">Client Details</div>
    <div class="client-info">
      <strong>Name:</strong> ${customerName || 'Walk-in Customer'}<br>
      ${manualCustomerPhone ? `<strong>Phone:</strong> ${manualCustomerPhone}<br>` : ''}
      ${manualCustomerEmail ? `<strong>Email:</strong> ${manualCustomerEmail}` : ''}
    </div>
  </div>
  <div>
    <div class="invoice-pill">${(inv as any)?.type === 'quotation' ? 'QUOTATION' : 'INVOICE'}</div>
  </div>
  <div class="invoice-date">
    ${(inv as any)?.type === 'quotation' ? 'Quotation' : 'Invoice'} Date: ${invoiceDate ? invoiceDate.replace(/-/g, ' . ') : ' . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .'}
  </div>
</div>

<div class="table-container">
  <div class="watermark">${(inv as any)?.type === 'quotation' ? 'QUOTATION ONLY' : 'Litmus Tech Solutions'}</div>
  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width:10%">Qty</th>
        <th style="width:50%">Descriptions</th>
        <th style="width:20%">Unit Price</th>
        <th style="width:20%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it => `<tr>
        <td>${it.qty}</td>
        <td><strong>${it.name}</strong>${it.description ? `<br><small style="color:#666">${it.description}</small>` : ''}</td>
        <td>KES ${Number(it.price).toLocaleString()}</td>
        <td>KES ${(Number(it.qty) * Number(it.price)).toLocaleString()}</td>
      </tr>`).join('')}
      <tr class="filler-row">
        <td></td><td></td><td></td><td></td>
      </tr>
      <tr class="totals-row">
        <td class="payment-details-cell" colspan="2">
          <strong>PAYMENT DETAILS</strong> Business no: 222111 account no: 598379<br>
          Family Bank<br>
          Litmus Tech Solutions
          <div class="invoice-number-red">NO: ${invoiceNumber}</div>
        </td>
        <td style="text-align: center; vertical-align: middle; text-transform: uppercase;">Total</td>
        <td style="text-align: right; font-weight: bold; font-size: 12px; vertical-align: middle;">KES ${items.reduce((s, it) => s + it.qty * Number(it.price), 0).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="services-footer">
  <div class="services-grid">
    <div>• Internet installation and networking</div>
    <div>• Website design and development</div>
    <div>• Computer and laptop sales, repair, and maintenance</div>
    <div>• Graphic design and digital branding</div>
    <div>• Software installation and system support</div>
    <div>• Printing, photocopying, scanning, and document processing</div>
    <div>• ICT consultancy and technical support</div>
    <div>• Cyber services and online applications</div>
  </div>
</div>
</body></html>`;
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoice-${invoiceNumber}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  ⬇ Download HTML
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPreviewModal(false); setPreviewInvoice(null); }}
                  className="border border-gray-200 text-gray-650 bg-white hover:bg-gray-50 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
