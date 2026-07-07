import { useEffect, useState } from 'react';
import { Send, Users, MessageSquareText } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/client';
import { formatDateTime, formatMoney } from '../utils/format';

const TEMPLATES = [
  { label: 'Offers', text: 'Hi! Enjoy 10% off all cyber services this week at Litmus Solutions. Visit us today!' },
  { label: 'Holiday', text: 'Happy Holidays from Litmus Solutions! We are open all week to serve you.' },
  { label: 'Promotions', text: 'New laptop stock just arrived at Litmus Solutions. Come check out our best prices!' },
  { label: 'Receipts', text: 'Thank you for your payment. Your balance has been updated at Litmus Solutions.' },
  { label: 'Thank You', text: 'Thank you for choosing Litmus Solutions. We appreciate your business!' },
  { label: 'Birthday', text: 'Happy Birthday from all of us at Litmus Solutions! Enjoy a special gift on your next visit.' },
];

export default function BulkSMS() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('everyone');
  const [scheduledFor, setScheduledFor] = useState('');
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  function load() {
    api.get('/sms/campaigns').then((res) => setCampaigns(res.data));
    api.get('/sms/summary').then((res) => setSummary(res.data));
  }

  useEffect(load, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/sms/send', { message, audience, scheduled_for: scheduledFor || undefined });
      setMessage('');
      load();
    } finally {
      setSending(false);
    }
  }

  const charCount = message.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));

  return (
    <Layout title="Bulk SMS" subtitle="Reach every customer with one click.">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 card">
          <h3 className="font-bold text-litmus-black mb-4 flex items-center gap-2">
            <MessageSquareText size={17} className="text-litmus-red" /> Compose Message
          </h3>
          <form onSubmit={send} className="space-y-4">
            <div>
              <label className="label-sm">Audience</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'customers', label: 'Customers' },
                  { key: 'debtors', label: 'Debtors' },
                  { key: 'vip', label: 'VIP Customers' },
                  { key: 'everyone', label: 'Everyone' },
                ].map((a) => (
                  <button
                    type="button"
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      audience === a.key ? 'bg-litmus-red text-white border-litmus-red' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label-sm">Message</label>
              <textarea
                className="input-field"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message…"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{charCount} characters</span>
                <span>{smsCount} SMS • Est. cost {formatMoney(smsCount)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setMessage(t.text)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div>
              <label className="label-sm">Schedule (optional)</label>
              <input type="datetime-local" className="input-field" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>

            <button disabled={sending || !message} className="btn-primary w-full flex items-center justify-center gap-2">
              <Send size={15} /> {sending ? 'Sending…' : scheduledFor ? 'Schedule SMS' : 'Send Now'}
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <div className="card">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1">
              <Users size={13} /> Delivery Summary
            </div>
            <div className="text-2xl font-bold text-litmus-black">{summary?.total_sent ?? 0}</div>
            <div className="text-xs text-gray-400 mb-3">messages sent all-time</div>
            <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-3">
              <span className="text-gray-500">Total Cost</span>
              <span className="font-semibold text-litmus-black">{formatMoney(summary?.total_cost || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Failed</span>
              <span className="font-semibold text-litmus-red">{summary?.total_failed ?? 0}</span>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-litmus-black mb-3">Campaign History</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {campaigns.map((c) => (
                <div key={c.id} className="border-b border-gray-50 pb-3">
                  <div className="text-sm text-litmus-black line-clamp-2">{c.message}</div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                    <span className="capitalize">{c.audience} • {c.recipients_count} recipients</span>
                    <span className={`badge ${c.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : c.status === 'failed' ? 'bg-red-50 text-litmus-red' : 'bg-blue-50 text-blue-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-300 mt-0.5">{formatDateTime(c.created_at)}</div>
                </div>
              ))}
              {campaigns.length === 0 && <p className="text-sm text-gray-400">No campaigns sent yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
