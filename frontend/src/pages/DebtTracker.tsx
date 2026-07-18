import { useEffect, useState } from 'react';
import { Wallet, ChevronRight, History, ChevronDown, ChevronUp, Download, X, Calendar, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { formatMoney, formatDate, statusStyles } from '../utils/format';

interface DebtSummary {
  customer_id: string;
  name: string;
  phone: string;
  total_balance: string;
  open_items: string;
  earliest_due_date: string | null;
}

type Period = 'today' | 'week' | 'month' | 'last_month' | 'custom';

function getPeriodDates(period: Period, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  const toLocalString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (period === 'today') {
    const t = toLocalString(now);
    return { from: t, to: t };
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: toLocalString(start), to: toLocalString(now) };
  }
  if (period === 'month') {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: toLocalString(now) };
  }
  if (period === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toLocalString(first), to: toLocalString(last) };
  }
  if (period === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  return { from: '', to: '' };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today',      label: 'Today' },
  { key: 'week',       label: 'This Week' },
  { key: 'month',      label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom',     label: 'Custom Range' },
];

export default function DebtTracker() {
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DebtSummary | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [paymentHistories, setPaymentHistories] = useState<Record<string, any[]>>({});
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Add custom debt states
  const [showAddDebtForm, setShowAddDebtForm] = useState(false);
  const [newDebtDescription, setNewDebtDescription] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');
  const [addingDebt, setAddingDebt] = useState(false);

  async function handleAddDebt() {
    if (!selected) return;
    const amount = Number(newDebtAmount);
    if (!newDebtDescription.trim()) {
      alert('Please enter a description for the debt.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Please enter a valid debt amount.');
      return;
    }
    setAddingDebt(true);
    try {
      await api.post('/transactions', {
        customer_id: selected.customer_id,
        module: 'product_sale',
        description: newDebtDescription.trim(),
        quantity: 1,
        unit_price: amount,
        amount_paid: 0,
        payment_status: 'not_paid',
        due_date: newDebtDueDate || null,
      });
      // Reset form
      setNewDebtDescription('');
      setNewDebtAmount('');
      setNewDebtDueDate('');
      setShowAddDebtForm(false);
      
      // Refresh modal and list
      const updatedSummary = {
        ...selected,
        total_balance: String(Number(selected.total_balance) + amount),
        open_items: String(Number(selected.open_items) + 1)
      };
      setSelected(updatedSummary);
      await openCustomer(updatedSummary);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add debt.');
    } finally {
      setAddingDebt(false);
    }
  }

  function load() {
    setLoading(true);
    const { from, to } = getPeriodDates(period, customFrom, customTo);
    const params: Record<string, string> = {};
    if (from) params.from = `${from}T00:00:00.000Z`;
    if (to)   params.to   = `${to}T23:59:59.999Z`;
    api.get('/transactions/debts/summary', { params })
      .then((res) => setDebts(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [period, customFrom, customTo]);

  async function openCustomer(d: DebtSummary) {
    setSelected(d);
    setPaymentHistories({});
    setExpandedHistories({});
    const pending = await api.get('/transactions', { params: { customer_id: d.customer_id, status: 'pending' } });
    const partial = await api.get('/transactions', { params: { customer_id: d.customer_id, status: 'partial' } });
    const allItems = [...pending.data, ...partial.data];
    setItems(allItems);
    const histories: Record<string, any[]> = {};
    await Promise.all(
      allItems.map(async (it: any) => {
        try {
          const { data } = await api.get(`/transactions/${it.id}/payments`);
          histories[it.id] = data;
        } catch {
          histories[it.id] = [];
        }
      })
    );
    setPaymentHistories(histories);
  }

  async function togglePaymentHistory(txId: string) {
    const nowExpanded = !expandedHistories[txId];
    setExpandedHistories((prev) => ({ ...prev, [txId]: nowExpanded }));
    if (nowExpanded && !paymentHistories[txId]) {
      try {
        const { data } = await api.get(`/transactions/${txId}/payments`);
        setPaymentHistories((prev) => ({ ...prev, [txId]: data }));
      } catch {
        setPaymentHistories((prev) => ({ ...prev, [txId]: [] }));
      }
    }
  }

  async function receivePayment(txId: string, full: boolean, balance: number) {
    const amount = full ? balance : Number(payAmount[txId] || 0);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (amount > balance) {
      alert(`Payment amount (${formatMoney(amount)}) cannot exceed the remaining balance (${formatMoney(balance)}).`);
      return;
    }
    setPaying(txId);
    try {
      await api.post(`/transactions/${txId}/payments`, { amount, method: 'cash' });
      const { data } = await api.get(`/transactions/${txId}/payments`);
      setPaymentHistories((prev) => ({ ...prev, [txId]: data }));
      if (selected) await openCustomer(selected);
      load();
      setPayAmount((prev) => ({ ...prev, [txId]: '' }));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setPaying(null);
    }
  }

  function downloadDebtReport(customer: DebtSummary) {
    const totalPaid = items.reduce((sum, it) => {
      const paid = (paymentHistories[it.id] || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      return sum + paid;
    }, 0);
    const totalBalance = Number(customer.total_balance);

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Debt Report - ${customer.name || customer.phone}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 30px; }
  .header-container { border-top: 5px solid #C1121F; margin-bottom: 20px; }
  .header-logo-row { display: flex; align-items: center; gap: 12px; background: #000; color: #fff; padding: 12px 20px; }
  .logo-circle { width: 42px; height: 42px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; border: 2px solid #C1121F; overflow: hidden; }
  .logo-circle img { height: 32px; object-fit: contain; }
  .company-title { font-size: 20px; font-weight: 900; }
  .contact-bar { background: #fff; border-top: 3px solid #C1121F; border-bottom: 3px solid #C1121F; text-align: center; padding: 6px 0; font-size: 9px; font-weight: bold; }
  .section-title { font-size: 13px; font-weight: bold; border-bottom: 2px solid #C1121F; padding-bottom: 4px; margin: 16px 0 8px; }
  .client-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .client-box { background: #f5f5f5; border-radius: 6px; padding: 10px 14px; font-size: 11px; flex: 1; margin-right: 12px; }
  .client-box:last-child { margin-right: 0; }
  .client-box strong { display: block; font-size: 13px; margin-bottom: 4px; }
  .tx-block { border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 16px; overflow: hidden; }
  .tx-title { background: #1a1a1a; color: #fff; padding: 8px 12px; font-weight: bold; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #000; color: #fff; font-size: 9px; font-weight: bold; padding: 7px 10px; text-align: left; }
  td { padding: 7px 10px; font-size: 10px; border-bottom: 1px solid #f0f0f0; }
  .tx-header td { background: #fafafa; font-weight: bold; }
  .payment-row td { font-size: 9px; }
  .no-payments { text-align: center; color: #999; padding: 12px; font-style: italic; }
  .footer { margin-top: 20px; border-top: 2px solid #C1121F; padding-top: 10px; font-size: 8px; color: #888; text-align: center; }
  @media print { body { margin: 10px; } }
</style></head>
<body>
<div class="header-container">
  <div class="header-logo-row">
    <div class="logo-circle"><img src="/logo.png" onerror="this.style.display='none'" /></div>
    <div>
      <div class="company-title">Litmus Tech Solutions</div>
      <div style="font-size:9px;opacity:0.7">Debt Statement &amp; Payment History</div>
    </div>
  </div>
  <div class="contact-bar">Tel: +254 723 005 182 | 0706 085 261 | Email: info@litmussolution.co.ke | www.litmussolution.co.ke</div>
</div>

<div class="section-title">Client Debt Statement</div>
<div class="client-row">
  <div class="client-box">
    <strong>${customer.name || 'Unnamed Customer'}</strong>
    Phone: ${customer.phone}<br>
    Open Transactions: ${customer.open_items}
  </div>
  <div class="client-box" style="text-align:right">
    <strong style="color:#C1121F;font-size:20px">KES ${Number(totalBalance).toLocaleString()}</strong>
    Total Outstanding Balance<br>
    <span style="color:#059669">Paid So Far: KES ${totalPaid.toLocaleString()}</span><br>
    Generated: ${new Date().toLocaleDateString('en-GB')}
  </div>
</div>

${items.map((it: any) => {
  const payments = paymentHistories[it.id] || [];
  const totalTxPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  return '<div class="tx-block">' +
    '<div class="tx-title">' +
      '<span>' + (it.description || 'Transaction') + '</span>' +
      '<span style="font-size:9px;opacity:0.7">' + new Date(it.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + '</span>' +
    '</div>' +
    '<table>' +
      '<thead><tr>' +
        '<th>Total Amount</th><th>Amount Paid</th><th>Balance Remaining</th><th>Due Date</th>' +
      '</tr></thead>' +
      '<tbody>' +
        '<tr class="tx-header">' +
          '<td>KES ' + Number(it.total_amount).toLocaleString() + '</td>' +
          '<td style="color:#059669">KES ' + Number(it.amount_paid).toLocaleString() + '</td>' +
          '<td style="color:#C1121F;font-weight:bold">KES ' + Number(it.balance).toLocaleString() + '</td>' +
          '<td>' + (it.due_date ? new Date(it.due_date).toLocaleDateString('en-GB') : '&mdash;') + '</td>' +
        '</tr>' +
      '</tbody>' +
    '</table>' +
    '<table style="margin-top:-1px;margin-bottom:16px">' +
      '<thead><tr>' +
        '<th>Payment Date &amp; Time</th><th>Amount Paid</th><th>Method</th><th>Received By</th>' +
      '</tr></thead>' +
      '<tbody>' +
      (payments.length === 0
        ? '<tr><td colspan="4" class="no-payments">No payments recorded for this transaction yet.</td></tr>'
        : payments.map((p: any) =>
            '<tr class="payment-row">' +
              '<td>' + new Date(p.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</td>' +
              '<td style="color:#059669;font-weight:bold">KES ' + Number(p.amount).toLocaleString() + '</td>' +
              '<td style="text-transform:capitalize">' + (p.method || 'cash') + '</td>' +
              '<td>' + (p.received_by_name || '&mdash;') + '</td>' +
            '</tr>'
          ).join('')
      ) +
      (payments.length > 0
        ? '<tr style="background:#f0fdf4;font-weight:bold;border-top:2px solid #d1fae5">' +
            '<td>Subtotal Paid (this transaction)</td>' +
            '<td style="color:#059669">KES ' + totalTxPaid.toLocaleString() + '</td>' +
            '<td colspan="2"></td>' +
          '</tr>'
        : '') +
      '</tbody>' +
    '</table>' +
    '</div>';
}).join('')}

<div style="margin-top:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-weight:bold;font-size:13px">TOTAL OUTSTANDING BALANCE</div>
  <div style="font-size:18px;font-weight:900;color:#C1121F">KES ${Number(totalBalance).toLocaleString()}</div>
</div>

<div class="footer">
  <div style="margin-bottom:4px">&bull; Internet installation &bull; Computer sales &amp; repair &bull; Software installation &bull; ICT consultancy &bull; Website design &bull; Graphic design &bull; Printing &amp; scanning &bull; Cyber services</div>
  <div>Generated by Litmus LOMS &bull; ${new Date().toLocaleString('en-GB')} &bull; Confidential Debt Statement</div>
</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debt-report-${(customer.name || customer.phone).replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalOutstanding = debts.reduce((sum, d) => sum + Number(d.total_balance), 0);
  const formatMoney_ = (v: any) => `KES ${Number(v || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

  return (
    <Layout title="Debt Tracker" subtitle="Nothing gets forgotten. Every shilling tracked with full payment history & downloadable debt statements.">

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${period === p.key ? 'bg-white text-litmus-red shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input-field text-xs py-1.5"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              className="input-field text-xs py-1.5"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}

        <button
          onClick={load}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-litmus-red hover:border-litmus-red/40 transition ml-auto"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Summary banner */}
      <div className="card mb-5 p-5 flex flex-wrap items-center gap-4">
        <div className="w-12 h-12 rounded-xl2 bg-red-50 flex items-center justify-center shrink-0">
          <Wallet size={22} className="text-litmus-red" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Total Outstanding Balance</div>
          <div className="text-2xl font-bold text-litmus-black">{formatMoney(totalOutstanding)}</div>
        </div>
        <div className="ml-auto text-sm text-gray-400">{debts.length} customer{debts.length !== 1 ? 's' : ''} owe money</div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Open Items</th>
                <th className="px-5 py-3 font-medium">Earliest Due</th>
                <th className="px-5 py-3 font-medium">Balance</th>
                <th className="px-5 py-3 font-medium text-center">Reminder</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">Loading debts…</td></tr>
              ) : debts.map((d) => {
                const rawPhone = d.phone.replace(/\D/g, '');
                const wa = rawPhone.startsWith('0') ? '254' + rawPhone.slice(1) : rawPhone;
                const name = d.name || 'Valued Customer';
                const balance = formatMoney(d.total_balance);
                const pendingCount = d.open_items;
                const msg = encodeURIComponent(
                  `Good day ${name},\n\nThis is a polite reminder from *Litmus Tech Solutions* that you have an outstanding balance of *${balance}* across ${pendingCount} unpaid transaction${pendingCount !== '1' ? 's' : ''}.\n\nKindly make your payment at your earliest convenience to avoid any inconvenience.\n\nThank you for your business! 🙏\n\nLitmus Tech Solutions\nTel: +254 723 005 182`
                );

                return (
                  <tr key={d.customer_id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer" onClick={() => openCustomer(d)}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-litmus-black">{d.name || 'Unnamed'}</div>
                      <div className="text-xs text-gray-400">{d.phone}</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{d.open_items}</td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(d.earliest_due_date)}</td>
                    <td className="px-5 py-3.5 font-semibold text-litmus-red">{formatMoney(d.total_balance)}</td>
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {d.phone ? (
                        <a
                          href={`https://wa.me/${wa}?text=${msg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition"
                          title="Quick Send WhatsApp Reminder"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          Send
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-300 inline" /></td>
                  </tr>
                );
              })}
              {!loading && debts.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">No outstanding debts for this period. 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Debt Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || 'Customer'} — Debt Breakdown`} maxWidth="max-w-5xl">
        {selected && (
          <div className="space-y-4">
            {/* Debt Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-gray-400">Total Charged</div>
                <div className="text-sm font-extrabold text-litmus-black mt-1">
                  {formatMoney_(items.reduce((s, it) => s + Number(it.total_amount), 0))}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-emerald-600">Total Paid</div>
                <div className="text-sm font-extrabold text-emerald-700 mt-1">
                  {formatMoney_(Object.values(paymentHistories).flat().reduce((s, p: any) => s + Number(p.amount), 0))}
                </div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-red-400">Balance Remaining</div>
                <div className="text-sm font-extrabold text-litmus-red mt-1">
                  {formatMoney_(selected.total_balance)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDebtForm(!showAddDebtForm)}
                className="inline-flex items-center gap-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                {showAddDebtForm ? 'Cancel New Debt' : '+ Add New Debt'}
              </button>
              {selected.phone && (() => {
                const rawPhone = selected.phone.replace(/\D/g, '');
                const wa = rawPhone.startsWith('0') ? '254' + rawPhone.slice(1) : rawPhone;
                const name = selected.name || 'Valued Customer';
                const balance = formatMoney(selected.total_balance);
                const pendingCount = items.length;
                const msg = encodeURIComponent(
                  `Good day ${name},\n\nThis is a polite reminder from *Litmus Tech Solutions* that you have an outstanding balance of *${balance}* across ${pendingCount} unpaid transaction${pendingCount !== 1 ? 's' : ''}.\n\nKindly make your payment at your earliest convenience to avoid any inconvenience.\n\nThank you for your continued business! 🙏\n\nLitmus Tech Solutions\nTel: +254 723 005 182`
                );
                return (
                  <a
                    href={`https://wa.me/${wa}?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    Send WhatsApp Reminder
                  </a>
                );
              })()}
              <button
                onClick={() => downloadDebtReport(selected)}
                className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
              >
                <Download size={13} /> Download Debt Statement
              </button>
            </div>

            {/* Collapsable Add Debt Form */}
            {showAddDebtForm && (
              <div className="bg-red-50/50 border border-red-200/60 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-litmus-red uppercase tracking-wider">Add Additional Debt Transaction</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Debt Description</label>
                    <input
                      type="text"
                      className="input-field text-xs py-1.5"
                      placeholder="e.g. Printer repair service, extra memory card"
                      value={newDebtDescription}
                      onChange={(e) => setNewDebtDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Outstanding Debt Amount (KES)</label>
                    <input
                      type="number"
                      className="input-field text-xs py-1.5"
                      placeholder="e.g. 3500"
                      value={newDebtAmount}
                      onChange={(e) => setNewDebtAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Due Date (Optional)</label>
                    <input
                      type="date"
                      className="input-field text-xs py-1.5"
                      value={newDebtDueDate}
                      onChange={(e) => setNewDebtDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDebtForm(false);
                      setNewDebtDescription('');
                      setNewDebtAmount('');
                      setNewDebtDueDate('');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={addingDebt || !newDebtDescription.trim() || !newDebtAmount}
                    onClick={handleAddDebt}
                    className="bg-litmus-red hover:bg-litmus-redHover text-white text-xs font-semibold px-4.5 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {addingDebt ? 'Adding...' : 'Confirm Add Debt'}
                  </button>
                </div>
              </div>
            )}

            {/* Transaction items with payment history */}
            {items.map((it) => (
              <div key={it.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Transaction Header */}
                <div className="bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100">
                  <div>
                    <div className="font-semibold text-litmus-black text-sm">{it.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Sold: {new Date(it.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`badge ${statusStyles[it.status]} self-start sm:self-center`}>{it.status}</span>
                </div>

                {/* Financial summary row */}
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-100 bg-white">
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase font-bold">Total Amount</div>
                    <div className="text-sm font-bold text-litmus-black">{formatMoney(it.total_amount)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase font-bold">Amount Paid</div>
                    <div className="text-sm font-bold text-emerald-600">{formatMoney(it.amount_paid)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 uppercase font-bold">Balance</div>
                    <div className="text-sm font-bold text-litmus-red">{formatMoney(it.balance)}</div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="bg-white">
                  <button
                    type="button"
                    onClick={() => togglePaymentHistory(it.id)}
                    className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:text-litmus-red transition font-semibold border-b border-gray-50"
                  >
                    <History size={12} />
                    {expandedHistories[it.id] ? 'Hide' : 'Show'} Payment History
                    {expandedHistories[it.id] ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                  </button>

                  {expandedHistories[it.id] && (
                    <div className="border-t border-gray-100 overflow-x-auto">
                      {(paymentHistories[it.id] || []).length === 0 ? (
                        <div className="text-xs text-gray-400 p-4 text-center">No payments recorded yet.</div>
                      ) : (
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[9px] uppercase text-gray-400 font-bold">
                              <th className="px-4 py-2 text-left">Date &amp; Time</th>
                              <th className="px-4 py-2 text-right">Amount Paid</th>
                              <th className="px-4 py-2 text-left">Method</th>
                              <th className="px-4 py-2 text-left">Received By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(paymentHistories[it.id] || []).map((p: any, idx: number) => (
                              <tr key={p.id} className={idx > 0 ? 'border-t border-gray-50' : ''}>
                                <td className="px-4 py-2.5 text-gray-600">
                                  {new Date(p.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{formatMoney(p.amount)}</td>
                                <td className="px-4 py-2.5 text-gray-500 capitalize">{p.method || 'cash'}</td>
                                <td className="px-4 py-2.5 text-gray-500">{p.received_by_name || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 font-bold bg-emerald-50/50">
                              <td className="px-4 py-2.5 text-gray-600">Total Paid</td>
                              <td className="px-4 py-2.5 text-right text-emerald-700">
                                {formatMoney((paymentHistories[it.id] || []).reduce((s: number, p: any) => s + Number(p.amount), 0))}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                {/* Receive Payment */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="number"
                    placeholder={`Max: ${formatMoney(it.balance)}`}
                    className="input-field text-sm flex-1"
                    value={payAmount[it.id] || ''}
                    onChange={(e) => setPayAmount({ ...payAmount, [it.id]: e.target.value })}
                    max={it.balance}
                    min="0"
                    step="0.01"
                  />
                  <button
                    disabled={paying === it.id || !payAmount[it.id] || Number(payAmount[it.id]) <= 0}
                    onClick={() => receivePayment(it.id, false, it.balance)}
                    className="btn-secondary whitespace-nowrap text-sm disabled:opacity-50"
                  >
                    Partial Payment
                  </button>
                  <button
                    disabled={paying === it.id || it.balance <= 0}
                    onClick={() => receivePayment(it.id, true, it.balance)}
                    className="btn-primary whitespace-nowrap text-sm disabled:opacity-50"
                  >
                    Full Payment ({formatMoney(it.balance)})
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-gray-400 text-center py-6">All settled for this customer. 🎉</p>}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
