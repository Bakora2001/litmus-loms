import { useEffect, useState } from 'react';
import {
  Plus,
  Printer,
  Paintbrush,
  Shirt,
  Flag,
  Package,
  ChevronRight,
  X,
  Trash2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { formatMoney } from '../utils/format';

interface Customer {
  id: string;
  name: string;
  phone: string;
  business_name?: string;
}

interface BrandingJob {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  job_type: string;
  description: string;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  materials_used: string;
  due_date: string | null;
  notes: string;
  status: 'Pending' | 'Designing' | 'Printing' | 'Completed' | 'Delivered' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

const JOB_TYPES = ['Flyer', 'Banner', 'T-Shirt', 'Business Card', 'Logo Design', 'Brochure', 'Poster', 'Cap/Hat', 'Mug', 'Sticker', 'Other'];

const STATUS_FLOW: BrandingJob['status'][] = ['Pending', 'Designing', 'Printing', 'Completed', 'Delivered'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  Pending:   { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: Clock },
  Designing: { color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     icon: Paintbrush },
  Printing:  { color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200', icon: Printer },
  Completed: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  Delivered: { color: 'text-green-700',   bg: 'bg-green-50 border-green-200',   icon: Package },
  Cancelled: { color: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200',     icon: X },
};

const JOB_ICONS: Record<string, any> = {
  Flyer:           Printer,
  Banner:          Flag,
  'T-Shirt':       Shirt,
  'Business Card': Package,
  'Logo Design':   Paintbrush,
  Other:           Package,
};

function getNextStatus(current: BrandingJob['status']): BrandingJob['status'] | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

const emptyForm = {
  customer_id: '',
  job_type: 'Flyer',
  description: '',
  quantity: 1,
  unit_cost: 0,
  selling_price: 0,
  materials_used: '',
  due_date: '',
  notes: '',
};

export default function BrandingServices() {
  const [jobs, setJobs] = useState<BrandingJob[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<BrandingJob | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BrandingJob | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  function load() {
    setLoading(true);
    api.get('/branding').then((res) => setJobs(res.data)).finally(() => setLoading(false));
    api.get('/customers').then((res) => setCustomers(res.data));
  }

  useEffect(load, []);

  function openNew() {
    setEditingJob(null);
    setForm({ ...emptyForm });
    setCustomerSearch('');
    setShowModal(true);
  }

  function openEdit(job: BrandingJob) {
    setEditingJob(job);
    setForm({
      customer_id: job.customer_id || '',
      job_type: job.job_type,
      description: job.description || '',
      quantity: job.quantity,
      unit_cost: job.unit_cost,
      selling_price: job.selling_price,
      materials_used: job.materials_used || '',
      due_date: job.due_date ? job.due_date.split('T')[0] : '',
      notes: job.notes || '',
    });
    const cust = customers.find(c => c.id === job.customer_id);
    setCustomerSearch(cust?.name || cust?.phone || '');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.job_type) return alert('Job type is required.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id || null,
        quantity: Number(form.quantity) || 1,
        unit_cost: Number(form.unit_cost) || 0,
        selling_price: Number(form.selling_price) || 0,
        due_date: form.due_date || null,
      };
      if (editingJob) {
        await api.put(`/branding/${editingJob.id}`, payload);
      } else {
        await api.post('/branding', payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save branding job.');
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus(job: BrandingJob) {
    const next = getNextStatus(job.status);
    if (!next) return;
    try {
      await api.patch(`/branding/${job.id}/status`, { status: next });
      load();
      if (selectedJob?.id === job.id) setSelectedJob({ ...job, status: next });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update status.');
    }
  }

  async function cancelJob(job: BrandingJob) {
    if (!window.confirm('Cancel this branding job?')) return;
    try {
      await api.patch(`/branding/${job.id}/status`, { status: 'Cancelled' });
      load();
      if (selectedJob?.id === job.id) setSelectedJob(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel job.');
    }
  }

  async function deleteJob(job: BrandingJob) {
    if (!window.confirm(`Delete job "${job.job_type} — ${job.description || 'untitled'}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/branding/${job.id}`);
      load();
      if (selectedJob?.id === job.id) setSelectedJob(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete job.');
    }
  }

  const filtered = jobs.filter(j => filterStatus === 'all' || j.status === filterStatus);

  // Stats
  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'Pending').length,
    inProgress: jobs.filter(j => ['Designing', 'Printing'].includes(j.status)).length,
    completed: jobs.filter(j => ['Completed', 'Delivered'].includes(j.status)).length,
    revenue: jobs.filter(j => ['Completed', 'Delivered'].includes(j.status))
      .reduce((s, j) => s + Number(j.selling_price) * j.quantity, 0),
  };

  const filteredCustomers = customers.filter(c =>
    !customerSearch ||
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    (c.business_name || '').toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 6);

  return (
    <Layout title="Branding Services">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-xs text-gray-400 uppercase font-bold mb-1">Total Jobs</div>
          <div className="text-2xl font-extrabold text-litmus-black">{stats.total}</div>
        </div>
        <div className="card p-4 text-center border-amber-100">
          <div className="text-xs text-amber-600 uppercase font-bold mb-1">Pending</div>
          <div className="text-2xl font-extrabold text-amber-600">{stats.pending}</div>
        </div>
        <div className="card p-4 text-center border-purple-100">
          <div className="text-xs text-purple-600 uppercase font-bold mb-1">In Progress</div>
          <div className="text-2xl font-extrabold text-purple-600">{stats.inProgress}</div>
        </div>
        <div className="card p-4 text-center border-emerald-100">
          <div className="text-xs text-emerald-600 uppercase font-bold mb-1">Revenue (Done)</div>
          <div className="text-lg font-extrabold text-emerald-600">{formatMoney(stats.revenue)}</div>
        </div>
      </div>

      {/* Filter Tabs + Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          {['all', ...STATUS_FLOW, 'Cancelled'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-white text-litmus-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s === 'all' ? 'All Jobs' : s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="btn-primary flex items-center gap-2 shadow-soft"
        >
          <Plus size={16} /> New Branding Job
        </button>
      </div>

      {/* Jobs List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading jobs...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Paintbrush size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No branding jobs {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}.</p>
            <button onClick={openNew} className="btn-primary mt-4 text-sm">Create First Job</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">Job Type</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium">Selling Price</th>
                  <th className="px-5 py-3 font-medium">Due Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.Pending;
                  const Icon = JOB_ICONS[job.job_type] || Package;
                  const nextStatus = getNextStatus(job.status);
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-litmus-red/10 flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-litmus-red" />
                          </div>
                          <div>
                            <div className="font-semibold text-litmus-black">{job.job_type}</div>
                            {job.description && <div className="text-xs text-gray-400 truncate max-w-[180px]">{job.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-700">{job.customer_name || '—'}</div>
                        <div className="text-xs text-gray-400">{job.customer_phone || ''}</div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{job.quantity}</td>
                      <td className="px-5 py-3.5 font-semibold text-litmus-black">{formatMoney(Number(job.selling_price) * job.quantity)}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {job.due_date ? new Date(job.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
                          <cfg.icon size={10} />
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {nextStatus && job.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => advanceStatus(job)}
                              className="text-xs font-semibold text-litmus-red hover:underline px-2 py-1 rounded hover:bg-red-50 transition"
                            >
                              → {nextStatus}
                            </button>
                          )}
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job Detail Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-xs" onClick={() => setSelectedJob(null)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">Branding Job</div>
                <h2 className="text-lg font-extrabold text-litmus-black mt-0.5">{selectedJob.job_type}</h2>
              </div>
              <button onClick={() => setSelectedJob(null)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              {/* Status Pipeline */}
              <div>
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-3">Progress</div>
                <div className="flex items-center gap-1">
                  {STATUS_FLOW.map((s, i) => {
                    const idx = STATUS_FLOW.indexOf(selectedJob.status);
                    const isDone = i <= idx;
                    const isCurrent = i === idx;
                    return (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`flex-1 h-1.5 rounded-full transition-all ${isDone ? 'bg-litmus-red' : 'bg-gray-100'}`} />
                        {i === STATUS_FLOW.length - 1 && (
                          <div className={`w-3 h-3 rounded-full border-2 transition-all ${isCurrent ? 'border-litmus-red bg-litmus-red' : isDone ? 'border-litmus-red bg-white' : 'border-gray-200 bg-white'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {STATUS_FLOW.map(s => (
                    <span key={s} className={`text-[8px] font-bold ${s === selectedJob.status ? 'text-litmus-red' : 'text-gray-300'}`}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Customer</div>
                  <div className="text-sm font-bold text-litmus-black mt-1">{selectedJob.customer_name || '—'}</div>
                  <div className="text-xs text-gray-400">{selectedJob.customer_phone || ''}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Due Date</div>
                  <div className="text-sm font-bold text-litmus-black mt-1">
                    {selectedJob.due_date ? new Date(selectedJob.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Quantity</div>
                  <div className="text-sm font-bold text-litmus-black mt-1">{selectedJob.quantity} units</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Total Revenue</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1">{formatMoney(Number(selectedJob.selling_price) * selectedJob.quantity)}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Unit Cost</div>
                  <div className="text-sm font-bold text-litmus-black mt-1">{formatMoney(selectedJob.unit_cost)}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[9px] text-gray-400 uppercase font-bold">Profit</div>
                  <div className="text-sm font-bold text-purple-600 mt-1">
                    {formatMoney((Number(selectedJob.selling_price) - Number(selectedJob.unit_cost)) * selectedJob.quantity)}
                  </div>
                </div>
              </div>

              {selectedJob.description && (
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Description</div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selectedJob.description}</p>
                </div>
              )}

              {selectedJob.materials_used && (
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Materials Used</div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selectedJob.materials_used}</p>
                </div>
              )}

              {selectedJob.notes && (
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Notes</div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selectedJob.notes}</p>
                </div>
              )}

              {/* WhatsApp update to customer */}
              {selectedJob.customer_phone && (
                <a
                  href={`https://wa.me/${selectedJob.customer_phone.replace(/\D/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(`Hello ${selectedJob.customer_name || 'there'},\n\nUpdate on your order:\n*${selectedJob.job_type}* (Qty: ${selectedJob.quantity}) — Status: *${selectedJob.status}*\n\nRegards,\nLitmus Tech Solutions`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition px-4 py-3 rounded-xl text-sm font-semibold border border-emerald-200 w-full justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                  Send Status Update via WhatsApp
                </a>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                {getNextStatus(selectedJob.status) && selectedJob.status !== 'Cancelled' && (
                  <button
                    type="button"
                    onClick={() => { advanceStatus(selectedJob); setSelectedJob(prev => prev ? { ...prev, status: getNextStatus(prev.status) as BrandingJob['status'] } : null); }}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    Mark as {getNextStatus(selectedJob.status)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedJob(null); openEdit(selectedJob); }}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Edit
                </button>
              </div>
              <div className="flex gap-2">
                {selectedJob.status !== 'Cancelled' && selectedJob.status !== 'Delivered' && (
                  <button
                    type="button"
                    onClick={() => cancelJob(selectedJob)}
                    className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 bg-white hover:border-red-200 px-3 py-2 rounded-lg transition"
                  >
                    Cancel Job
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteJob(selectedJob)}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-100 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingJob ? 'Edit Branding Job' : 'New Branding Job'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Job Type */}
          <div>
            <label className="label-sm">Job Type *</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {JOB_TYPES.map(t => {
                const Icon = JOB_ICONS[t] || Package;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, job_type: t }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${form.job_type === t ? 'bg-litmus-red text-white border-litmus-red' : 'bg-white text-gray-600 border-gray-200 hover:border-litmus-red/40'}`}
                  >
                    <Icon size={12} /> {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="label-sm">Customer (optional)</label>
            <input
              type="text"
              placeholder="Search customer by name or phone..."
              className="input-field py-2 mt-1"
              value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setForm(f => ({ ...f, customer_id: '' })); }}
            />
            {customerSearch && !form.customer_id && filteredCustomers.length > 0 && (
              <div className="border border-gray-100 rounded-xl mt-1 divide-y divide-gray-50 shadow-sm">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition"
                    onClick={() => { setForm(f => ({ ...f, customer_id: c.id })); setCustomerSearch(c.name || c.phone); }}
                  >
                    <span className="font-semibold">{c.name || c.business_name || 'Unnamed'}</span>
                    <span className="text-gray-400 ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="label-sm">Description</label>
            <input
              type="text"
              placeholder="e.g. 500 A5 flyers, full color, glossy"
              className="input-field py-2 mt-1"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Qty + Costs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Quantity</label>
              <input
                type="number"
                min="1"
                className="input-field py-2 mt-1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label-sm">Unit Cost (KES)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field py-2 mt-1"
                value={form.unit_cost}
                onChange={e => setForm(f => ({ ...f, unit_cost: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label-sm">Selling Price (KES)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field py-2 mt-1"
                value={form.selling_price}
                onChange={e => setForm(f => ({ ...f, selling_price: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Materials + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Materials Used</label>
              <input
                type="text"
                placeholder="e.g. Vinyl, Paper, Ink"
                className="input-field py-2 mt-1"
                value={form.materials_used}
                onChange={e => setForm(f => ({ ...f, materials_used: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-sm">Due Date</label>
              <input
                type="date"
                className="input-field py-2 mt-1"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label-sm">Notes</label>
            <textarea
              placeholder="Any special instructions or additional details..."
              className="input-field py-2 mt-1 resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Profit Preview */}
          {(form.selling_price > 0 || form.unit_cost > 0) && (
            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <div className="text-gray-400 font-bold uppercase text-[9px]">Total Cost</div>
                <div className="font-bold text-gray-700 mt-0.5">{formatMoney(form.unit_cost * form.quantity)}</div>
              </div>
              <div>
                <div className="text-gray-400 font-bold uppercase text-[9px]">Total Revenue</div>
                <div className="font-bold text-emerald-600 mt-0.5">{formatMoney(form.selling_price * form.quantity)}</div>
              </div>
              <div>
                <div className="text-gray-400 font-bold uppercase text-[9px]">Profit</div>
                <div className={`font-bold mt-0.5 ${(form.selling_price - form.unit_cost) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatMoney((form.selling_price - form.unit_cost) * form.quantity)}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingJob ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
