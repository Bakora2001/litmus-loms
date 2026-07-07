import { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, User, AlertCircle, Clock, CheckCircle2, ChevronRight, X, Trash2, Edit3 } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/client';
import { Task } from '../types';
import { formatDate, priorityStyles } from '../utils/format';

const COLUMNS: { key: Task['status']; label: string; bg: string; text: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', bg: 'bg-slate-50 border-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  { key: 'in_progress', label: 'In Progress', bg: 'bg-blue-50/50 border-blue-100/50', text: 'text-blue-700', dot: 'bg-blue-500' },
  { key: 'waiting', label: 'Waiting / Pending', bg: 'bg-amber-50/50 border-amber-100/50', text: 'text-amber-700', dot: 'bg-amber-500' },
  { key: 'completed', label: 'Completed', bg: 'bg-emerald-50/50 border-emerald-100/50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'cancelled', label: 'Cancelled', bg: 'bg-rose-50/40 border-rose-100/40', text: 'text-rose-600', dot: 'bg-rose-400' },
];

const emptyForm = { title: '', description: '', deadline: '', priority: 'medium', reminder_before: '1_day' };

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  // Selected task detail popup states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditingSelected, setIsEditingSelected] = useState(false);

  function load() {
    api.get('/tasks').then((res) => setTasks(res.data));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditingSelected && selectedTask) {
        // Update task
        await api.put(`/tasks/${selectedTask.id}`, form);
        setSelectedTask(null);
        setIsEditingSelected(false);
      } else {
        // Create task
        await api.post('/tasks', form);
      }
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to save task.');
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(id: string, status: Task['status']) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (selectedTask && selectedTask.id === id) {
      setSelectedTask((prev) => prev ? { ...prev, status } : null);
    }
    await api.patch(`/tasks/${id}/status`, { status });
  }

  async function deleteTask(id: string) {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await api.delete(`/tasks/${id}`);
      setSelectedTask(null);
      load();
    }
  }

  function handleCardClick(task: Task) {
    setSelectedTask(task);
    setIsEditingSelected(false);
  }

  function handleEditClick(task: Task) {
    setForm({
      title: task.title,
      description: task.description || '',
      deadline: task.deadline ? new Date(task.deadline).toISOString().substring(0, 16) : '',
      priority: task.priority,
      reminder_before: task.reminder_before || '1_day',
    });
    setIsEditingSelected(true);
    setShowForm(true);
  }

  return (
    <Layout title="Tasks &amp; Reminders" subtitle="Double click or drag tasks to rearrange statuses, click to view and toggle details.">
      <div className="flex justify-end mb-5">
        <button
          onClick={() => {
            setIsEditingSelected(false);
            setForm(emptyForm);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Task Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && updateTaskStatus(dragId, col.key)}
            className={`border rounded-xl2 p-4 min-h-[450px] flex flex-col ${col.bg} transition-colors`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${col.text}`}>{col.label}</h4>
              </div>
              <span className="text-[11px] font-bold text-gray-400 bg-white shadow-sm border border-gray-100 rounded-full px-2.5 py-0.5">
                {tasks.filter((t) => t.status === col.key).length}
              </span>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
              {tasks.filter((t) => t.status === col.key).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onClick={() => handleCardClick(t)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-red-100 transition cursor-pointer select-none relative group"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`badge uppercase tracking-wider text-[8px] px-2 py-0.5 font-bold ${priorityStyles[t.priority]}`}>
                      {t.priority}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(t);
                      }}
                      className="text-gray-300 hover:text-litmus-red opacity-0 group-hover:opacity-100 transition duration-150"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                  <div className="text-xs font-bold text-gray-800 leading-snug mb-1">{t.title}</div>
                  {t.description && (
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed mb-3">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    {t.client_name && (
                      <span className="text-[9px] text-gray-400 font-semibold truncate max-w-[100px]">
                        👤 {t.client_name}
                      </span>
                    )}
                    {t.deadline && (
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium ml-auto">
                        <CalendarIcon size={10} className="text-litmus-red" />
                        {new Date(t.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {tasks.filter((t) => t.status === col.key).length === 0 && (
                <div className="text-center py-10 border border-dashed border-gray-200/60 rounded-xl text-gray-400 text-[11px] leading-relaxed">
                  No tasks here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Details Dialog Modal (For reading & changing statuses quickly) */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl2 shadow-soft border border-black/5 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Task Details</span>
                <span className={`badge text-[9px] font-bold uppercase tracking-wider ${priorityStyles[selectedTask.priority]}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-left">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 leading-snug">{selectedTask.title}</h3>
                {selectedTask.deadline && (
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1 font-medium">
                    <Clock size={11} className="text-litmus-red" />
                    Due by: {new Date(selectedTask.deadline).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {selectedTask.description ? (
                <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Description</span>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">No description provided.</div>
              )}

              {/* Status Update Actions */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Update Status</span>
                <div className="flex flex-wrap gap-2">
                  {COLUMNS.map((col) => {
                    const isActive = selectedTask.status === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => updateTaskStatus(selectedTask.id, col.key)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
                          isActive
                            ? 'bg-litmus-black border-litmus-black text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client & Assigned Details */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50 text-[10px]">
                {selectedTask.client_name && (
                  <div>
                    <span className="text-gray-400 block font-medium">Client</span>
                    <span className="font-bold text-gray-700">{selectedTask.client_name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 block font-medium">Created Date</span>
                  <span className="font-bold text-gray-700">{new Date(selectedTask.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => deleteTask(selectedTask.id)}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
              >
                <Trash2 size={13} /> Delete Task
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEditClick(selectedTask)}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Edit Task
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="bg-litmus-black text-white hover:bg-black text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create or Edit) */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={isEditingSelected ? "Edit Task" : "New Task"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label-sm">Task Title *</label>
            <input required className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label-sm">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm">Deadline</label>
              <input type="datetime-local" className="input-field" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="label-sm">Priority</label>
              <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-sm">Reminder</label>
            <select className="input-field" value={form.reminder_before} onChange={(e) => setForm({ ...form, reminder_before: e.target.value })}>
              <option value="30_mins">30 mins before</option>
              <option value="1_hour">1 hour before</option>
              <option value="6_hours">6 hours before</option>
              <option value="1_day">1 day before</option>
              <option value="2_days">2 days before</option>
              <option value="1_week">1 week before</option>
            </select>
          </div>
          <button disabled={saving} className="btn-primary w-full text-xs">
            {saving ? 'Saving…' : isEditingSelected ? 'Update Task' : 'Create Task'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
