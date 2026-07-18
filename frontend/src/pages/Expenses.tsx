import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, HelpCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { formatMoney, formatDate } from '../utils/format';

interface ExpenseItem {
  description: string;
  amount: number;
}

const DEFAULT_CATEGORIES = [
  'Lunch Allowance',
  'Transport Allowance',
  'Electricity bill',
  'Internet bill',
  'Out sourcing services',
  'Rent',
  'Stationery'
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form helper states
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('Lunch Allowance');
  const [customCategoryName, setCustomCategoryName] = useState<string>('');
  const [saveCustomToDropdown, setSaveCustomToDropdown] = useState<boolean>(false);

  const [form, setForm] = useState<{
    description: string;
    category: string;
    amount: number;
    spent_at: string;
    items: ExpenseItem[];
  }>({
    description: '',
    category: '',
    amount: 0,
    spent_at: '',
    items: [],
  });

  // Load business settings & expenses
  function load() {
    api.get('/expenses').then((res) => setExpenses(res.data));
    api.get('/settings').then((res) => setSettings(res.data)).catch(() => {});
  }

  useEffect(load, []);

  // Sync total amount with items sum
  useEffect(() => {
    if (form.items.length > 0) {
      const sum = form.items.reduce((s, it) => s + Number(it.amount || 0), 0);
      setForm((prev) => ({ ...prev, amount: sum }));
    }
  }, [form.items]);

  // Combine default categories with custom saved categories in DB settings
  const mergedCategories = [
    ...DEFAULT_CATEGORIES,
    ...(settings?.expense_categories || [])
  ];

  // Open Form for addition
  function openAddModal() {
    setEditingId(null);
    setSelectedCategoryType('Lunch Allowance');
    setCustomCategoryName('');
    setSaveCustomToDropdown(false);
    setForm({
      description: '',
      category: 'Lunch Allowance',
      amount: 0,
      spent_at: new Date().toLocaleDateString('en-CA'), // local date in YYYY-MM-DD
      items: [],
    });
    setShowForm(true);
  }

  // Open Form for editing
  function openEditModal(expense: any) {
    setEditingId(expense.id);
    const cat = expense.category || 'Lunch Allowance';
    const isStandard = mergedCategories.includes(cat);

    if (isStandard) {
      setSelectedCategoryType(cat);
      setCustomCategoryName('');
    } else {
      setSelectedCategoryType('__custom__');
      setCustomCategoryName(cat);
    }
    
    setSaveCustomToDropdown(false);
    setForm({
      description: expense.description || '',
      category: cat,
      amount: Number(expense.amount) || 0,
      spent_at: expense.spent_at ? expense.spent_at.slice(0, 10) : '',
      items: Array.isArray(expense.items) ? expense.items : [],
    });
    setShowForm(true);
  }

  // Submit form handler
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const finalCategory = selectedCategoryType === '__custom__' 
      ? customCategoryName.trim() || 'General Expense'
      : selectedCategoryType;

    const finalForm = {
      ...form,
      category: finalCategory,
    };

    try {
      // Save new custom category to settings if requested
      if (selectedCategoryType === '__custom__' && saveCustomToDropdown && customCategoryName.trim()) {
        const currentCustoms = settings?.expense_categories || [];
        if (!currentCustoms.includes(customCategoryName.trim())) {
          const updatedCustoms = [...currentCustoms, customCategoryName.trim()];
          await api.put('/settings', {
            ...settings,
            expense_categories: updatedCustoms
          });
        }
      }

      if (editingId) {
        await api.put(`/expenses/${editingId}`, finalForm);
      } else {
        await api.post('/expenses', finalForm);
      }

      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    load();
  }

  // Itemized breakdown utilities
  function addBreakdownItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', amount: 0 }]
    }));
  }

  function removeBreakdownItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  }

  function updateBreakdownItem(index: number, patch: Partial<ExpenseItem>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) => idx === index ? { ...it, ...patch } : it)
    }));
  }

  const totalExpensesSum = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <Layout title="Expenses" subtitle="Record and organize daily operational costs, allowances, and outsourcing services.">
      
      {/* Summary card & Add button */}
      <div className="flex items-center justify-between mb-5">
        <div className="card !p-4 flex items-center gap-3">
          <span className="text-xs text-gray-500 font-semibold">Total Expenses</span>
          <span className="text-xl font-bold text-litmus-red">{formatMoney(totalExpensesSum)}</span>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2 shadow-soft">
          <Plus size={16} /> Record Expense
        </button>
      </div>

      {/* Expenses Table */}
      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-5 py-3.5 font-medium">Description</th>
              <th className="px-5 py-3.5 font-medium">Category</th>
              <th className="px-5 py-3.5 font-medium">Date</th>
              <th className="px-5 py-3.5 font-medium">Breakdown</th>
              <th className="px-5 py-3.5 font-medium">Amount</th>
              <th className="px-5 py-3.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-5 py-3.5 font-medium text-litmus-black">
                  <div>{e.description}</div>
                  {e.category === 'Out sourcing services' && (
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">Outsourced task detail</div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-gray-500">
                  <span className="badge bg-gray-100 text-gray-700 capitalize text-xs">
                    {e.category || 'General'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{formatDate(e.spent_at)}</td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">
                  {Array.isArray(e.items) && e.items.length > 0 ? (
                    <div className="max-w-[200px] space-y-0.5">
                      {e.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between gap-2 border-b border-gray-50 pb-0.5 last:border-b-0">
                          <span className="truncate text-gray-400">{it.description || 'Item'}</span>
                          <span className="font-bold text-gray-600 shrink-0">{formatMoney(it.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-300 italic">No breakdown items</span>
                  )}
                </td>
                <td className="px-5 py-3.5 font-semibold text-litmus-black">{formatMoney(e.amount)}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2.5">
                    <button onClick={() => openEditModal(e)} className="text-gray-400 hover:text-blue-600 transition" title="Edit Expense">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(e.id)} className="text-gray-300 hover:text-litmus-red transition" title="Delete Expense">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-10">No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Expense Record' : 'Record New Expense'} maxWidth="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Expense Description *</label>
              <input required className="input-field" placeholder="e.g. Lunch for Dennis, Server hosting setup" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Category / Type</label>
              <select className="input-field" value={selectedCategoryType} onChange={(e) => setSelectedCategoryType(e.target.value)}>
                {mergedCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">Custom / Type your own...</option>
              </select>
            </div>
          </div>

          {/* Custom Category Fields */}
          {selectedCategoryType === '__custom__' && (
            <div className="bg-red-50/50 border border-red-200/50 rounded-xl p-4 space-y-2.5">
              <div>
                <label className="label-sm">Enter Custom Category Name *</label>
                <input required className="input-field" placeholder="e.g. Server Maintenance, Office Tea" value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer select-none">
                <input type="checkbox" className="rounded text-litmus-red focus:ring-litmus-red" checked={saveCustomToDropdown} onChange={(e) => setSaveCustomToDropdown(e.target.checked)} />
                <span>Save to standard dropdown arrow options for future entries</span>
              </label>
            </div>
          )}

          {/* Explanations warning / notes for specific categories */}
          {selectedCategoryType === 'Out sourcing services' && (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
              <HelpCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Outsourcing services</strong>
                Please provide detailed explanations in the description or breakdown below about what specific services were outsourced (e.g. network wiring, client laptop recovery help, motherboard micro-soldering).
              </div>
            </div>
          )}

          {selectedCategoryType === 'Stationery' && (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs rounded-xl p-3.5 flex items-start gap-2">
              <HelpCircle size={15} className="shrink-0 mt-0.5 text-blue-600" />
              <div>
                <strong className="block mb-0.5">Stationery Explanation</strong>
                Kindly detail the stationery items purchased (e.g., printing papers, folders, staples, pens) using the itemized breakdown below.
              </div>
            </div>
          )}

          {/* Itemized Cost Breakdown Section */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Itemized Cost Breakdown (Optional)</h4>
              <button type="button" onClick={addBreakdownItem} className="text-xs text-litmus-red font-bold hover:underline flex items-center gap-1">
                + Add Item
              </button>
            </div>
            
            {form.items.length === 0 ? (
              <div className="text-xs text-gray-400 italic">No breakdown items added. Enter a single total amount below.</div>
            ) : (
              <div className="space-y-2">
                {form.items.map((it, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      required
                      type="text"
                      placeholder="Item description / details"
                      className="input-field text-xs py-1.5 flex-1"
                      value={it.description}
                      onChange={(e) => updateBreakdownItem(index, { description: e.target.value })}
                    />
                    <input
                      required
                      type="number"
                      placeholder="Amount"
                      className="input-field text-xs py-1.5 w-28"
                      value={it.amount || ''}
                      onChange={(e) => updateBreakdownItem(index, { amount: Number(e.target.value) })}
                    />
                    <button type="button" onClick={() => removeBreakdownItem(index)} className="text-gray-300 hover:text-litmus-red transition p-1.5">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Expense Amount (KES) *</label>
              <input 
                required 
                type="number" 
                className="input-field disabled:bg-gray-100 disabled:text-gray-500 font-bold" 
                value={form.amount || ''} 
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                disabled={form.items.length > 0} 
                placeholder="e.g. 1500"
              />
              {form.items.length > 0 && (
                <span className="text-[10px] text-gray-400 font-semibold mt-1 block">Sum computed automatically from breakdown list.</span>
              )}
            </div>
            <div>
              <label className="label-sm">Transaction Date</label>
              <input type="date" className="input-field" value={form.spent_at} onChange={(e) => setForm({ ...form, spent_at: e.target.value })} />
            </div>
          </div>

          <button disabled={saving} className="btn-primary w-full shadow-soft text-sm mt-3">
            {saving ? 'Saving Expense...' : (editingId ? 'Save Changes' : 'Confirm Expense')}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
