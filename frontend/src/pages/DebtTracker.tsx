import { useEffect, useState } from 'react';
import { Wallet, ChevronRight } from 'lucide-react';
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

  function load() {
    setLoading(true);
    api.get('/transactions/debts/summary').then((res) => setDebts(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function openCustomer(d: DebtSummary) {
    setSelected(d);
    const { data } = await api.get('/transactions', { params: { customer_id: d.customer_id, status: 'pending' } });
    const partial = await api.get('/transactions', { params: { customer_id: d.customer_id, status: 'partial' } });
    setItems([...data, ...partial.data]);
  }

  async function receivePayment(txId: string, full: boolean, balance: number) {
    const amount = full ? balance : Number(payAmount[txId] || 0);
    if (!amount || amount <= 0) return;
    setPaying(txId);
    try {
      await api.post(`/transactions/${txId}/payments`, { amount, method: 'cash' });
      if (selected) await openCustomer(selected);
      load();
    } finally {
      setPaying(null);
    }
  }

  const totalOutstanding = debts.reduce((sum, d) => sum + Number(d.total_balance), 0);

  return (
    <Layout title="Debt Tracker" subtitle="Nothing gets forgotten. Every shilling is tracked.">
      <div className="card mb-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl2 bg-red-50 flex items-center justify-center">
          <Wallet size={22} className="text-litmus-red" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium">Total Outstanding Balance</div>
          <div className="text-2xl font-bold text-litmus-black">{formatMoney(totalOutstanding)}</div>
        </div>
        <div className="ml-auto text-sm text-gray-400">{debts.length} customers owe money</div>
      </div>

      <div className="card p-0 overflow-hidden">
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected?.name || 'Customer'} — Outstanding Items`} maxWidth="max-w-2xl">
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="border border-gray-100 rounded-xl2 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-litmus-black">{it.description}</div>
                  <div className="text-xs text-gray-400">{formatDate(it.created_at)}</div>
                </div>
                <span className={`badge ${statusStyles[it.status]}`}>{it.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">Total: {formatMoney(it.total_amount)} • Paid: {formatMoney(it.amount_paid)}</span>
                <span className="font-bold text-litmus-red">Balance: {formatMoney(it.balance)}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Partial amount"
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
          {items.length === 0 && <p className="text-sm text-gray-400 text-center py-6">All settled for this customer.</p>}
        </div>
      </Modal>
    </Layout>
  );
}
