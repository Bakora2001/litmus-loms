import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, AlertCircle, CheckCircle2,
  FileText, Plus, Bell
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { priorityStyles } from '../utils/format';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

interface CalEvent {
  type: 'task' | 'invoice';
  label: string;
  priority: string;
  status?: string;
  time?: string;
  raw?: any;
}

const PRIORITY_CHIP: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', deadline: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const todayNum = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();

  useEffect(() => {
    api.get('/tasks').then((res) => setTasks(res.data));
    api.get('/invoices').then((res) => setInvoices(res.data));
  }, []);

  // Build event map
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    tasks.forEach((t) => {
      if (!t.deadline) return;
      const d = new Date(t.deadline);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = map[day] || [];
        map[day].push({
          type: 'task',
          label: t.title,
          priority: t.priority,
          status: t.status,
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          raw: t,
        });
      }
    });
    invoices.forEach((inv) => {
      if (!inv.due_date) return;
      const d = new Date(inv.due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = map[day] || [];
        map[day].push({
          type: 'invoice',
          label: `Invoice #${inv.invoice_number}`,
          priority: inv.status === 'overdue' ? 'critical' : 'medium',
          status: inv.status,
          raw: inv,
        });
      }
    });
    return map;
  }, [tasks, invoices, year, month]);

  // Upcoming events (next 14 days from today)
  const upcomingEvents = useMemo(() => {
    const events: { date: Date; label: string; type: string; priority: string; status?: string }[] = [];
    tasks.forEach((t) => {
      if (!t.deadline) return;
      const d = new Date(t.deadline);
      if (d >= today) events.push({ date: d, label: t.title, type: 'task', priority: t.priority, status: t.status });
    });
    invoices.forEach((inv) => {
      if (!inv.due_date) return;
      const d = new Date(inv.due_date);
      if (d >= today) events.push({ date: d, label: `Invoice #${inv.invoice_number}`, type: 'invoice', priority: inv.status === 'overdue' ? 'critical' : 'medium', status: inv.status });
    });
    return events.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
  }, [tasks, invoices]);

  // Today's tasks
  const todayTasks = tasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d.getDate() === todayNum && d.getMonth() === todayMonth && d.getFullYear() === todayYear;
  });

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  async function quickAddTask(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: newTask.title,
        deadline: newTask.deadline,
        priority: newTask.priority,
      });
      const res = await api.get('/tasks');
      setTasks(res.data);
      setNewTask({ title: '', deadline: '', priority: 'medium' });
      setShowAddTask(false);
    } finally {
      setSaving(false);
    }
  }

  // Mini calendar helpers
  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => { setCursor(new Date()); setSelectedDay(todayNum); };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <Layout title="Calendar" subtitle="Deadlines, tasks, and invoice due dates — all in one view.">
      <div className="flex gap-5 min-h-0">
        {/* Left Column — Mini Calendar + Filters + Today */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Mini Calendar */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-litmus-black">{MONTHS[month]} {year}</span>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-litmus-red hover:bg-red-50 transition">
                  <ChevronLeft size={13} />
                </button>
                <button onClick={nextMonth} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-litmus-red hover:bg-red-50 transition">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="text-center text-[8px] font-bold text-gray-400 py-1">{d[0]}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, idx) => {
                const isToday = d === todayNum && month === todayMonth && year === todayYear;
                const isSelected = d === selectedDay;
                const hasEvents = d ? (eventsByDay[d] || []).length > 0 : false;
                return (
                  <button
                    key={idx}
                    onClick={() => d && setSelectedDay(d === selectedDay ? null : d)}
                    className={`w-full aspect-square rounded-md text-[10px] font-medium flex flex-col items-center justify-center transition relative ${!d ? '' : isSelected ? 'bg-litmus-red text-white' : isToday ? 'bg-red-50 text-litmus-red font-bold border border-litmus-red/30' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {d || ''}
                    {hasEvents && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-litmus-red" />
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={goToday} className="mt-3 w-full text-[10px] font-semibold text-litmus-red bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition">
              Go to Today
            </button>
          </div>

          {/* Today's Tasks */}
          <div className="card p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-litmus-red" /> Today's Tasks
            </div>
            {todayTasks.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">No tasks due today</div>
            ) : todayTasks.slice(0, 4).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 mb-2 last:mb-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.priority === 'critical' ? 'bg-red-500' : t.priority === 'high' ? 'bg-orange-500' : 'bg-blue-400'}`} />
                <span className="text-xs text-gray-700 truncate">{t.title}</span>
              </div>
            ))}
          </div>

          {/* Quick Add Task */}
          <div className="card p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Add</div>
            {!showAddTask ? (
              <button onClick={() => setShowAddTask(true)} className="w-full btn-primary text-xs flex items-center justify-center gap-1.5 py-2">
                <Plus size={13} /> Add Task
              </button>
            ) : (
              <form onSubmit={quickAddTask} className="space-y-2">
                <input required className="input-field text-xs py-2" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title…" />
                <input type="datetime-local" className="input-field text-xs py-2" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} />
                <select className="input-field text-xs py-2" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddTask(false)} className="flex-1 text-xs border border-gray-200 rounded-lg py-2 text-gray-500 hover:bg-gray-50">Cancel</button>
                  <button disabled={saving} className="flex-1 btn-primary text-xs py-2">{saving ? '…' : 'Add'}</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Center — Main Month Calendar Grid */}
        <div className="flex-1 min-w-0">
          <div className="card p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-extrabold text-litmus-black text-lg">{MONTHS[month]} {year}</h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-litmus-red hover:border-litmus-red/40 transition">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={goToday} className="px-3 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:text-litmus-red hover:border-litmus-red/40 transition">Today</button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-litmus-red hover:border-litmus-red/40 transition">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-2.5 border-r border-gray-50 last:border-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7">
              {cells.map((d, idx) => {
                const isToday = d === todayNum && month === todayMonth && year === todayYear;
                const isSelected = d === selectedDay;
                const events = d ? (eventsByDay[d] || []) : [];
                return (
                  <div
                    key={idx}
                    onClick={() => d && setSelectedDay(d === selectedDay ? null : d)}
                    className={`min-h-[90px] border-r border-b border-gray-50 last-of-type:border-r-0 p-2 cursor-pointer transition ${d ? (isSelected ? 'bg-red-50' : 'hover:bg-gray-50/60') : 'bg-gray-50/30 cursor-default'}`}
                  >
                    {d && (
                      <>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${isToday ? 'bg-litmus-red text-white' : isSelected ? 'text-litmus-red' : 'text-gray-600'}`}>
                          {d}
                        </div>
                        <div className="space-y-0.5">
                          {events.slice(0, 2).map((ev, i) => (
                            <div
                              key={i}
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${ev.type === 'invoice' ? 'bg-purple-100 text-purple-700' : PRIORITY_CHIP[ev.priority] || 'bg-gray-100 text-gray-600'}`}
                            >
                              {ev.type === 'invoice' ? <FileText size={8} /> : <CheckCircle2 size={8} />}
                              <span className="truncate">{ev.label}</span>
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-[8px] text-gray-400 font-semibold pl-1">+{events.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events */}
          {selectedDay !== null && (
            <div className="card mt-4 p-4">
              <div className="font-bold text-litmus-black mb-3 text-sm">
                {selectedDay} {MONTHS[month]} {year} — {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
              </div>
              {selectedEvents.length === 0 ? (
                <div className="text-xs text-gray-400">No events on this day.</div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${ev.type === 'invoice' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                      {ev.type === 'invoice' ? <FileText size={14} className="text-purple-600 shrink-0" /> : <CheckCircle2 size={14} className="text-blue-600 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">{ev.label}</div>
                        {ev.time && <div className="text-[10px] text-gray-400">{ev.time}</div>}
                      </div>
                      {ev.priority && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${PRIORITY_CHIP[ev.priority]}`}>{ev.priority}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel — Upcoming Events */}
        <div className="w-56 shrink-0 space-y-4">
          <div className="card p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Bell size={11} className="text-litmus-red" /> Upcoming Events
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">No upcoming events</div>
            ) : upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2.5 mb-3 last:mb-0 pb-3 border-b border-gray-50 last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ev.type === 'invoice' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                  {ev.type === 'invoice' ? <FileText size={13} className="text-purple-600" /> : <CheckCircle2 size={13} className="text-blue-600" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{ev.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">
                    {ev.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block ${PRIORITY_CHIP[ev.priority]}`}>{ev.priority}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="card p-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">Legend</div>
            <div className="space-y-2">
              {[
                { color: 'bg-red-100 text-red-700', label: 'Critical Task' },
                { color: 'bg-orange-100 text-orange-700', label: 'High Priority' },
                { color: 'bg-blue-100 text-blue-700', label: 'Medium / Task' },
                { color: 'bg-purple-100 text-purple-700', label: 'Invoice Due' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${item.color.split(' ')[0]}`} />
                  <span className="text-[10px] text-gray-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
