import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart2, Search, Download, RefreshCw, Calendar, Filter,
  TrendingUp, CheckCircle, Clock, AlertTriangle, Pencil, X
} from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { formatMoney, formatDate } from '../utils/format';
import { buildSalesReportHtml } from '../utils/salesReportHtml';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface Transaction {
  id: string;
  description: string;
  module: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  served_by_name?: string;
  created_at: string;
  unit_price: number;
  quantity: number;
  due_date?: string;
}

function getPeriodDates(period: Period, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  if (period === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  if (period === 'today') {
    const today = toISO(now);
    return { from: today, to: today };
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: toISO(start), to: toISO(now) };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISO(start), to: toISO(now) };
  }
  if (period === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to: toISO(now) };
  }
  return { from: toISO(now), to: toISO(now) };
}

export default function Sales() {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>((searchParams.get('period') as Period) || 'today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Editing transaction state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    unit_price: 0,
    quantity: 1,
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { load(); }, [period, customFrom, customTo]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function load() {
    setLoading(true);
    const { from, to } = getPeriodDates(period, customFrom, customTo);
    api.get('/transactions', {
      params: {
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      }
    }).then((res) => {
      setTransactions(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  const filtered = transactions.filter((t) => {
    const matchSearch = !searchText || [t.description, t.customer_name, t.customer_phone].some(
      (v) => v?.toLowerCase().includes(searchText.toLowerCase())
    );
    const matchModule = !moduleFilter || t.module === moduleFilter;
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchModule && matchStatus;
  });

  const totalRevenue = filtered.reduce((s, t) => s + Number(t.amount_paid), 0);
  const totalSales = filtered.reduce((s, t) => s + Number(t.total_amount), 0);
  const outstanding = filtered.reduce((s, t) => s + Number(t.balance || 0), 0);
  const paidCount = filtered.filter((t) => t.status === 'paid').length;

  function downloadPDF() {
    const { from, to } = getPeriodDates(period, customFrom, customTo);
    const periodLabel = PERIODS.find(p => p.key === period)?.label || period;
    const html = buildSalesReportHtml(
      periodLabel,
      from,
      to,
      filtered,
      { totalRevenue, totalSales, outstanding, paidCount },
    );
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `litmus-sales-report-${from}-to-${to}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today (Daily)' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'custom', label: 'Custom Range' },
  ];

  function openEdit(t: Transaction) {
    setEditingTx(t);
    setEditForm({
      description: t.description,
      unit_price: Number(t.unit_price || 0),
      quantity: Number(t.quantity || 1),
      due_date: t.due_date ? t.due_date.slice(0, 10) : '',
    });
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTx) return;
    setSaving(true);
    try {
      await api.patch(`/transactions/${editingTx.id}`, editForm);
      showToast('Sale edited successfully!', 'success');
      setEditingTx(null);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'unsuccessful', 'error');
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(status: string) {
    if (status === 'paid') return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PAID</span>;
    if (status === 'partial') return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">PARTIAL</span>;
    return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">UNPAID</span>;
  }

  function moduleLabel(m: string) {
    if (m === 'cyber_service') return <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">CYBER</span>;
    if (m === 'product_sale') return <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">STORE</span>;
    return <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{m.replace('_', ' ').toUpperCase()}</span>;
  }

  return (
    <Layout title="Sales Ledger" subtitle="All transactions across cyber services and computer store, dynamically updated.">
      {/* Toast alert */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-between ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${period === p.key ? 'bg-white text-litmus-red shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input-field text-xs py-1.5" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" className="input-field text-xs py-1.5" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}

        <button onClick={load} className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-litmus-red hover:border-litmus-red/40 transition ml-auto">
          <RefreshCw size={14} />
        </button>
        <button onClick={downloadPDF} className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3 shadow-soft">
          <Download size={13} /> Export PDF Report
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Today's Revenue" , value: formatMoney(totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Sales Value', value: formatMoney(totalSales), icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Outstanding Balance', value: formatMoney(outstanding), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Completed (Paid)', value: `${paidCount} / ${filtered.length}`, icon: CheckCircle, color: 'text-litmus-red', bg: 'bg-red-50' },
        ].map((card) => (
          <div key={card.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
              <card.icon size={18} className={card.color} />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{card.label}</div>
              <div className={`text-lg font-extrabold ${card.color}`}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by customer or description…" className="input-field pl-9 text-sm" />
        </div>
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Modules</option>
          <option value="cyber_service">Cyber Services</option>
          <option value="product_sale">Computer Store</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Unpaid</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[850px]">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-semibold">Date & Time</th>
              <th className="px-5 py-3 font-semibold">Item / Description</th>
              <th className="px-5 py-3 font-semibold">Customer Details</th>
              <th className="px-5 py-3 font-semibold text-center">Type</th>
              <th className="px-5 py-3 font-semibold text-right">Total</th>
              <th className="px-5 py-3 font-semibold text-right">Paid</th>
              <th className="px-5 py-3 font-semibold text-right">Balance</th>
              <th className="px-5 py-3 font-semibold text-center">Status</th>
              <th className="px-5 py-3 font-semibold">Served By</th>
              <th className="px-5 py-3 font-semibold text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-xs text-gray-400">Loading sales…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-gray-400">
                  <BarChart2 className="mx-auto mb-2 text-gray-300" size={28} />
                  <div className="text-sm">No sales found for this period.</div>
                </td>
              </tr>
            ) : filtered.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition">
                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                  <div className="text-gray-700 font-semibold">{new Date(t.created_at).toLocaleDateString()}</div>
                  <div>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-litmus-black truncate max-w-[180px]">{t.description}</div>
                  <div className="text-[10px] text-gray-400">{t.quantity} unit{Number(t.quantity) !== 1 ? 's' : ''} x {formatMoney(t.unit_price)}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-xs text-gray-600">{t.customer_name || '—'}</div>
                  <div className="text-[10px] text-gray-400">{t.customer_phone || ''}</div>
                </td>
                <td className="px-5 py-3.5 text-center">{moduleLabel(t.module)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-litmus-black">{formatMoney(t.total_amount)}</td>
                <td className="px-5 py-3.5 text-right text-emerald-600 font-semibold">{formatMoney(t.amount_paid)}</td>
                <td className="px-5 py-3.5 text-right">
                  {Number(t.balance) > 0 ? <span className="text-litmus-red font-bold">{formatMoney(t.balance)}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-center">{statusBadge(t.status)}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{t.served_by_name || '—'}</td>
                <td className="px-5 py-3.5 text-center">
                  <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-litmus-red transition-all">
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/60 text-sm font-bold">
                <td colSpan={4} className="px-5 py-3 text-gray-500">Totals ({filtered.length} records)</td>
                <td className="px-5 py-3 text-right text-litmus-black">{formatMoney(totalSales)}</td>
                <td className="px-5 py-3 text-right text-emerald-600">{formatMoney(totalRevenue)}</td>
                <td className="px-5 py-3 text-right text-litmus-red">{formatMoney(outstanding)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Edit Sale Modal */}
      <Modal open={!!editingTx} onClose={() => setEditingTx(null)} title="Edit Sale Details">
        <form onSubmit={submitEdit} className="space-y-4">
          <div>
            <label className="label-sm">Description *</label>
            <input required className="input-field" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Quantity *</label>
              <input type="number" required min={1} className="input-field" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label-sm">Unit Price *</label>
              <input type="number" required min={0} className="input-field" value={editForm.unit_price} onChange={(e) => setEditForm({ ...editForm, unit_price: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label-sm">Due Date (for credit sales)</label>
            <input type="date" className="input-field" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
          </div>

          <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between font-bold text-sm">
            <span>New Total:</span>
            <span className="text-litmus-black">{formatMoney(editForm.quantity * editForm.unit_price)}</span>
          </div>

          <button disabled={saving} className="btn-primary w-full py-2.5">
            {saving ? 'Saving changes…' : 'Save Changes'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
