import { useEffect, useState } from 'react';
import {
  BarChart2, Search, Download, RefreshCw, Calendar, Filter,
  TrendingUp, ArrowUpRight, Package, Monitor, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { load(); }, [period, customFrom, customTo]);

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
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Sales Report - ${periodLabel}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 25px; }
  .header-container { border-top: 5px solid #C1121F; margin-bottom: 18px; }
  .header-logo-row { display: flex; align-items: center; gap: 12px; background: #000; color: #fff; padding: 10px 18px; }
  .logo-circle { width: 38px; height: 38px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid #C1121F; overflow: hidden; }
  .logo-circle img { height: 28px; object-fit: contain; }
  .company-title { font-size: 18px; font-weight: 900; }
  .contact-bar { background: #fff; border-top: 3px solid #C1121F; border-bottom: 3px solid #C1121F; text-align: center; padding: 5px; font-size: 8px; font-weight: bold; }
  .report-title { font-size: 14px; font-weight: bold; margin: 12px 0 4px; }
  .period-info { font-size: 9px; color: #666; margin-bottom: 12px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .summary-card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px; text-align: center; }
  .summary-card label { display: block; font-size: 8px; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; }
  .summary-card .val { font-size: 13px; font-weight: 900; }
  .val-green { color: #059669; }
  .val-red { color: #C1121F; }
  .val-blue { color: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #000; color: #fff; font-size: 9px; font-weight: bold; padding: 7px 8px; text-align: left; border-right: 1px solid #333; }
  th:last-child { border-right: none; }
  td { padding: 7px 8px; font-size: 9px; border-bottom: 1px solid #eee; border-right: 1px solid #f0f0f0; }
  td:last-child { border-right: none; }
  tr:nth-child(even) td { background: #fafafa; }
  .tfoot-row td { background: #f0f0f0; font-weight: bold; font-size: 10px; border-top: 2px solid #000; }
  .badge-paid { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: bold; }
  .badge-partial { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: bold; }
  .badge-unpaid { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: bold; }
  .footer { margin-top: 20px; border-top: 2px solid #C1121F; padding-top: 10px; font-size: 8px; color: #888; text-align: center; }
  @media print { body { margin: 10px; } }
</style></head>
<body>
<div class="header-container">
  <div class="header-logo-row">
    <div class="logo-circle"><img src="/logo.png" onerror="this.style.display='none'" /></div>
    <div>
      <div class="company-title">Litmus Tech Solutions</div>
      <div style="font-size:8px;opacity:0.7">Sales &amp; Revenue Report</div>
    </div>
  </div>
  <div class="contact-bar">Tel: +254 723 005 182 | 0706 085 261 | Email: info@litmussolution.co.ke | www.litmussolution.co.ke</div>
</div>

<div class="report-title">Sales Report — ${periodLabel}</div>
<div class="period-info">Period: ${from} to ${to} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-GB')}</div>

<div class="summary-grid">
  <div class="summary-card">
    <label>Total Revenue (Paid)</label>
    <div class="val val-green">KES ${totalRevenue.toLocaleString()}</div>
  </div>
  <div class="summary-card">
    <label>Total Sales Value</label>
    <div class="val val-blue">KES ${totalSales.toLocaleString()}</div>
  </div>
  <div class="summary-card">
    <label>Outstanding</label>
    <div class="val val-red">KES ${outstanding.toLocaleString()}</div>
  </div>
  <div class="summary-card">
    <label>Paid / Total</label>
    <div class="val">${paidCount} / ${filtered.length}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th><th>Date &amp; Time</th><th>Item / Service</th><th>Customer</th>
      <th>Type</th><th style="text-align:right">Total</th>
      <th style="text-align:right">Paid</th><th style="text-align:right">Balance</th>
      <th>Status</th><th>Served By</th>
    </tr>
  </thead>
  <tbody>
    ${filtered.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${new Date(t.created_at).toLocaleDateString('en-GB')}<br><small>${new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small></td>
      <td>${t.description}</td>
      <td>${t.customer_name || '—'}<br><small style="color:#888">${t.customer_phone || ''}</small></td>
      <td>${t.module === 'cyber_service' ? 'Cyber' : t.module === 'product_sale' ? 'Store' : t.module}</td>
      <td style="text-align:right">KES ${Number(t.total_amount).toLocaleString()}</td>
      <td style="text-align:right;color:#059669">KES ${Number(t.amount_paid).toLocaleString()}</td>
      <td style="text-align:right;color:${Number(t.balance) > 0 ? '#C1121F' : '#999'}">
        ${Number(t.balance) > 0 ? 'KES ' + Number(t.balance).toLocaleString() : '—'}
      </td>
      <td><span class="badge-${t.status === 'paid' ? 'paid' : t.status === 'partial' ? 'partial' : 'unpaid'}">${t.status.toUpperCase()}</span></td>
      <td>${t.served_by_name || '—'}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot-row">
      <td colspan="5">TOTALS (${filtered.length} records)</td>
      <td style="text-align:right">KES ${totalSales.toLocaleString()}</td>
      <td style="text-align:right;color:#059669">KES ${totalRevenue.toLocaleString()}</td>
      <td style="text-align:right;color:#C1121F">KES ${outstanding.toLocaleString()}</td>
      <td colspan="2"></td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  <div>• Internet installation • Computer sales &amp; repair • Software installation • ICT consultancy • Website design • Graphic design • Printing &amp; scanning • Cyber services</div>
  <div style="margin-top:4px">Generated by Litmus LOMS &bull; Confidential Sales Report</div>
</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `litmus-sales-report-${from}-to-${to}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'custom', label: 'Custom' },
  ];

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
    <Layout title="Sales" subtitle="All transactions across cyber services and computer store, filtered by period.">
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
        <button onClick={downloadPDF} className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3">
          <Download size={13} /> Export PDF Report
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Revenue', value: formatMoney(totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Sales Value', value: formatMoney(totalSales), icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Outstanding', value: formatMoney(outstanding), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
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
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by item, customer…" className="input-field pl-9 text-sm" />
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
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3 font-semibold">Date & Time</th>
              <th className="px-5 py-3 font-semibold">Item</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold text-center">Type</th>
              <th className="px-5 py-3 font-semibold text-right">Total</th>
              <th className="px-5 py-3 font-semibold text-right">Paid</th>
              <th className="px-5 py-3 font-semibold text-right">Balance</th>
              <th className="px-5 py-3 font-semibold text-center">Status</th>
              <th className="px-5 py-3 font-semibold">Served By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-xs text-gray-400">Loading sales…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-gray-400">
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
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Layout>
  );
}
