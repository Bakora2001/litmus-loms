import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', category: '', amount: 0, spent_at: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    api.get('/expenses').then((res) => setExpenses(res.data));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/expenses', form);
      setShowForm(false);
      setForm({ description: '', category: '', amount: 0, spent_at: '' });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/expenses/${id}`);
    load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <Layout title="Expenses" subtitle="Record daily operational costs for accurate profit reports.">
      <div className="flex items-center justify-between mb-5">
        <div className="card !p-4 flex items-center gap-3">
          <span className="text-xs text-gray-500">Total Expenses</span>
          <span className="text-lg font-bold text-litmus-black">{formatMoney(total)}</span>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-3.5 font-medium text-litmus-black">{e.description}</td>
                <td className="px-5 py-3.5 text-gray-500">{e.category || '—'}</td>
                <td className="px-5 py-3.5 text-gray-500">{formatDate(e.spent_at)}</td>
                <td className="px-5 py-3.5 font-semibold text-litmus-red">{formatMoney(e.amount)}</td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => remove(e.id)} className="text-gray-300 hover:text-litmus-red">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-10">No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Expense">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label-sm">Description *</label>
            <input required className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Category</label>
              <input className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Rent, Utilities" />
            </div>
            <div>
              <label className="label-sm">Amount *</label>
              <input required type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label-sm">Date</label>
            <input type="date" className="input-field" value={form.spent_at} onChange={(e) => setForm({ ...form, spent_at: e.target.value })} />
          </div>
          <button disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Add Expense'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
