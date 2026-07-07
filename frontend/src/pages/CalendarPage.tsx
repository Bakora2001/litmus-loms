import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { priorityStyles } from '../utils/format';

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    api.get('/tasks').then((res) => setTasks(res.data));
    api.get('/invoices').then((res) => setInvoices(res.data));
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const totalDays = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();

  const eventsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    tasks.forEach((t) => {
      if (!t.deadline) return;
      const d = new Date(t.deadline);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map[d.getDate()] = map[d.getDate()] || [];
        map[d.getDate()].push({ type: 'task', label: t.title, priority: t.priority });
      }
    });
    invoices.forEach((inv) => {
      if (!inv.due_date) return;
      const d = new Date(inv.due_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map[d.getDate()] = map[d.getDate()] || [];
        map[d.getDate()].push({ type: 'invoice', label: `Invoice ${inv.invoice_number} due`, priority: 'medium' });
      }
    });
    return map;
  }, [tasks, invoices, year, month]);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <Layout title="Calendar" subtitle="Deadlines, tasks and invoice due dates in one view.">
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-litmus-black text-lg">
            {cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, idx) => (
            <div
              key={idx}
              className={`min-h-[100px] rounded-lg border p-2 ${d ? 'border-gray-100 bg-white' : 'border-transparent'}`}
            >
              {d && (
                <>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5">{d}</div>
                  <div className="space-y-1">
                    {(eventsByDay[d] || []).slice(0, 3).map((ev, i) => (
                      <div key={i} className={`badge w-full truncate justify-start ${priorityStyles[ev.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {ev.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
