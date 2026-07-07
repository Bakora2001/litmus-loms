export function formatMoney(value: number | string, currency = 'KES') {
  const n = Number(value || 0);
  return `${currency} ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-orange-50 text-orange-600',
  partial: 'bg-blue-50 text-blue-600',
  overdue: 'bg-red-50 text-litmus-red',
  draft: 'bg-gray-100 text-gray-600',
  unpaid: 'bg-orange-50 text-orange-600',
};

export const priorityStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-50 text-orange-600',
  critical: 'bg-red-50 text-litmus-red',
};
