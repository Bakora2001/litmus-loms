import { useEffect, useState } from 'react';
import { Wallet, ChevronRight, History, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
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

export default function DebtTracker() {
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DebtSummary | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [paymentHistories, setPaymentHistories] = useState<Record<string, any[]>>({});
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  function load() {
    setLoading(true);
    api.get('/transactions/debts/summary').then((res) => setDebts(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function openCustomer(d: DebtSummary) {
    setSelected(d);
    setPaymentHistories({});
    setExpandedHistories({});
    const pending = await api.get('/transactions', { params: { customer_id: d.customer_id, status: 'pending' } });
    const partial = await api.get('/transactions', { params: { customer_id: d.customer_id, status: 'partial' } });
    // For each item, eagerly load payment history so it shows in the breakdown
    const allItems = [...pending.data, ...partial.data];
    setItems(allItems);
    // Load all payment histories upfront for the PDF/breakdown
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
    if (!amount || amount <= 0) return;
    setPaying(txId);
    try {
      await api.post(`/transactions/${txId}/payments`, { amount, method: 'cash' });
      const { data } = await api.get(`/transactions/${txId}/payments`);
      setPaymentHistories((prev) => ({ ...prev, [txId]: data }));
      if (selected) await openCustomer(selected);
      load();
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
  .client-box { width: 48%; }
  .client-label { font-size: 11px; font-weight: bold; text-decoration: underline; margin-bottom: 4px; }
  .summary-box { background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .summary-item label { display: block; font-size: 9px; color: #666; text-transform: uppercase; font-weight: bold; }
  .summary-item .val { font-size: 14px; font-weight: 900; }
  .val-red { color: #C1121F; }
  .val-green { color: #059669; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #000; color: #fff; font-size: 10px; font-weight: bold; padding: 8px; text-align: left; border-right: 1px solid #333; }
  th:last-child { border-right: none; }
  td { padding: 8px 8px; font-size: 10px; border-bottom: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; }
  td:last-child { border-right: none; }
  .payment-row td { background: #f0fdf4; }
  .tx-header { background: #fef9f9; font-weight: bold; }
  .no-payments { color: #999; font-style: italic; font-size: 10px; padding: 6px 8px; }
  .footer { margin-top: 30px; border-top: 2px solid #C1121F; padding-top: 12px; font-size: 9px; color: #666; text-align: center; }
  @media print { body { margin: 15px; } }
</style></head>
<body>
<div class="header-container">
  <div class="header-logo-row">
    <div class="logo-circle">
      <img src="/logo.png" onerror="this.style.display='none'" />
    </div>
    <div>
      <div class="company-title">Litmus Tech Solutions</div>
      <div style="font-size:9px;opacity:0.7">Debt Tracker Report</div>
    </div>
  </div>
  <div class="contact-bar">Tel: +254 723 005 182 | 0706 085 261 | Email: info@litmussolution.co.ke | www.litmussolution.co.ke</div>
</div>

<div class="client-row">
  <div class="client-box">
    <div class="client-label">Client Details</div>
    <div><strong>Name:</strong> ${customer.name || 'Unnamed Customer'}</div>
    <div><strong>Phone:</strong> ${customer.phone}</div>
    <div><strong>Open Items:</strong> ${customer.open_items}</div>
  </div>
  <div class="client-box" style="text-align:right">
    <div class="client-label">Report Details</div>
    <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    <div><strong>Time:</strong> ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
    <div style="margin-top:6px;display:inline-block;background:#C1121F;color:#fff;padding:3px 12px;border-radius:4px;font-weight:bold">DEBT STATEMENT</div>
  </div>
</div>

<div class="summary-box">
  <div class="summary-item">
    <label>Total Charged</label>
    <div class="val">${formatMoney(items.reduce((s, it) => s + Number(it.total_amount), 0))}</div>
  </div>
  <div class="summary-item">
    <label>Total Paid</label>
    <div class="val val-green">${formatMoney(totalPaid)}</div>
  </div>
  <div class="summary-item">
    <label>Balance Remaining</label>
    <div class="val val-red">${formatMoney(totalBalance)}</div>
  </div>
</div>

<div class="section-title">Transaction Breakdown</div>

${items.map(it => {
  const payments = paymentHistories[it.id] || [];
  const totalTxPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  return `
<table>
  <thead>
    <tr>
      <th colspan="4" style="background:#1a1a1a">
        ${it.description} &nbsp;|&nbsp; Date: ${new Date(it.created_at).toLocaleDateString('en-GB')}
        &nbsp;|&nbsp; Status: ${it.status.toUpperCase()}
      </th>
    </tr>
    <tr style="background:#333">
      <th>Total Charged</th><th>Total Paid</th><th>Balance</th><th>Due Date</th>
    </tr>
  </thead>
  <tbody>
    <tr class="tx-header">
      <td>${formatMoney(it.total_amount)}</td>
      <td style="color:#059669">${formatMoney(it.amount_paid)}</td>
      <td style="color:#C1121F;font-weight:bold">${formatMoney(it.balance)}</td>
      <td>${it.due_date ? new Date(it.due_date).toLocaleDateString('en-GB') : '—'}</td>
    </tr>
  </tbody>
</table>

<table style="margin-top:-1px;margin-bottom:16px">
  <thead>
    <tr>
      <th>Payment Date &amp; Time</th>
      <th>Amount Paid</th>
      <th>Payment Method</th>
      <th>Received By</th>
    </tr>
  </thead>
  <tbody>
    ${payments.length === 0
      ? `<tr><td colspan="4" class="no-payments">No payments recorded for this transaction yet.</td></tr>`
      : payments.map((p: any) => `
    <tr class="payment-row">
      <td>${new Date(p.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
      <td style="color:#059669;font-weight:bold">${formatMoney(p.amount)}</td>
      <td style="text-transform:capitalize">${p.method || 'cash'}</td>
      <td>${p.received_by_name || '—'}</td>
    </tr>`).join('')}
    ${payments.length > 0 ? `
    <tr style="background:#f0fdf4;font-weight:bold;border-top:2px solid #d1fae5">
      <td>Subtotal Paid (this transaction)</td>
      <td style="color:#059669">${formatMoney(totalTxPaid)}</td>
      <td colspan="2"></td>
    </tr>` : ''}
  </tbody>
</table>`;
}).join('')}

<div style="margin-top:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-weight:bold;font-size:13px">TOTAL OUTSTANDING BALANCE</div>
  <div style="font-size:18px;font-weight:900;color:#C1121F">${formatMoney(totalBalance)}</div>
</div>

<div class="footer">
  <div style="margin-bottom:4px">• Internet installation • Computer sales &amp; repair • Software installation • ICT consultancy • Website design • Graphic design • Printing &amp; scanning • Cyber services</div>
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

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Open Items</th>
              <th className="px-5 py-3 font-medium">Earliest Due</th>
              <th className="px-5 py-3 font-medium">Balance</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.customer_id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer" onClick={() => openCustomer(d)}>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-litmus-black">{d.name || 'Unnamed'}</div>
                  <div className="text-xs text-gray-400">{d.phone}</div>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{d.open_items}</td>
                <td className="px-5 py-3.5 text-gray-500">{formatDate(d.earliest_due_date)}</td>
                <td className="px-5 py-3.5 font-semibold text-litmus-red">{formatMoney(d.total_balance)}</td>
                <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-300 inline" /></td>
              </tr>
            ))}
            {!loading && debts.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-10">No outstanding debts. Great job! 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Debt Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || 'Customer'} — Debt Breakdown`} maxWidth="max-w-3xl">
        {selected && (
          <div className="space-y-4">
            {/* Debt Summary Header */}
            <div className="grid grid-cols-3 gap-3 mb-2">
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

            {/* Download Button */}
            <div className="flex justify-end">
              <button
                onClick={() => downloadDebtReport(selected)}
                className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
              >
                <Download size={13} /> Download Debt Statement
              </button>
            </div>

            {/* Transaction items with payment history */}
            {items.map((it) => (
              <div key={it.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Transaction Header */}
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <div>
                    <div className="font-semibold text-litmus-black text-sm">{it.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Sold: {new Date(it.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`badge ${statusStyles[it.status]}`}>{it.status}</span>
                </div>

                {/* Financial summary row */}
                <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-100 bg-white">
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

                {/* Payment History - Always shown as a table */}
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
                    <div className="border-t border-gray-100">
                      {(paymentHistories[it.id] || []).length === 0 ? (
                        <div className="text-xs text-gray-400 p-4 text-center">No payments recorded yet.</div>
                      ) : (
                        <table className="w-full text-xs">
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
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Enter partial amount…"
                    className="input-field text-sm"
                    value={payAmount[it.id] || ''}
                    onChange={(e) => setPayAmount({ ...payAmount, [it.id]: e.target.value })}
                  />
                  <button
                    disabled={paying === it.id}
                    onClick={() => receivePayment(it.id, false, it.balance)}
                    className="btn-secondary whitespace-nowrap text-sm"
                  >
                    Partial
                  </button>
                  <button
                    disabled={paying === it.id}
                    onClick={() => receivePayment(it.id, true, it.balance)}
                    className="btn-primary whitespace-nowrap text-sm"
                  >
                    Full Payment
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
