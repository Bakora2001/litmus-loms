import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import Layout from '../components/Layout';
import api from '../api/client';
import { formatMoney } from '../utils/format';
import {
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Users,
  FileText,
  BarChart2,
  Filter,
} from 'lucide-react';

const DONUT_COLORS = ['#C1121F', '#1d1d1f', '#ef4444', '#f59e0b', '#6366f1', '#10b981', '#0ea5e9', '#a855f7'];

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
type ReportType = 'overview' | 'invoices' | 'debts' | 'services' | 'products' | 'customers';

const REPORT_TYPES: { value: ReportType; label: string; icon: any }[] = [
  { value: 'overview', label: 'Overview', icon: TrendingUp },
  { value: 'invoices', label: 'Invoice Report', icon: FileText },
  { value: 'debts', label: 'Debt Report', icon: AlertTriangle },
  { value: 'services', label: 'Services', icon: BarChart2 },
  { value: 'products', label: 'Products', icon: BarChart2 },
  { value: 'customers', label: 'Customers', icon: Users },
];

const statusColor: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  partial: 'bg-blue-100 text-blue-700',
  unpaid: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
};

// Custom donut label in centre
function DonutCenterLabel({ cx, cy, label, sub }: any) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize="13" fontWeight="800" fill="#1d1d1f">{label}</tspan>
      <tspan x={cx} dy="16" fontSize="9" fill="#9ca3af">{sub}</tspan>
    </text>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [topServices, setTopServices] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [debts, setDebts] = useState<any>(null);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [profit, setProfit] = useState<any>(null);
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [debtList, setDebtList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  // Compute date range from period
  function getDateRange() {
    const now = new Date();
    const toISO = (d: Date) => d.toISOString().slice(0, 10);
    if (period === 'custom' && fromDate && toDate) return { from: fromDate, to: toDate };
    if (period === 'daily') return { from: toISO(now), to: toISO(now) };
    if (period === 'weekly') {
      const start = new Date(now); start.setDate(now.getDate() - 7);
      return { from: toISO(start), to: toISO(now) };
    }
    if (period === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISO(start), to: toISO(now) };
    }
    return { from: `${now.getFullYear()}-01-01`, to: toISO(now) };
  }

  useEffect(() => {
    const { from, to } = getDateRange();
    const params = {
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
    };

    function loadData() {
      api.get('/reports/top-services', { params }).then((res) => setTopServices(res.data)).catch(() => {});
      api.get('/reports/top-products', { params }).then((res) => setTopProducts(res.data)).catch(() => {});
      api.get('/reports/debts').then((res) => setDebts(res.data)).catch(() => {});
      api.get('/reports/customers').then((res) => setCustomerStats(res.data)).catch(() => {});
      api.get('/reports/expenses-profit', { params }).then((res) => setProfit(res.data)).catch(() => {});
      api.get('/invoices', { params }).then((res) => setInvoiceList(res.data || [])).catch(() => {});
      api.get('/transactions/debts/summary').then((res) => setDebtList(res.data || [])).catch(() => {});
      api.get('/transactions', { params }).then((res) => setTransactions(res.data || [])).catch(() => {});
    }

    loadData();

    // Auto-refresh every 60 seconds
    const intervalId = setInterval(loadData, 60000);

    return () => clearInterval(intervalId);
  }, [period, fromDate, toDate]);

  // Build donut data for services
  const serviceDonutData = topServices.slice(0, 7).map((s: any) => ({
    name: s.name,
    value: Number(s.revenue) || Number(s.times_sold) || 0,
  }));

  // Build donut data for products
  const productDonutData = topProducts.slice(0, 7).map((p: any) => ({
    name: p.name,
    value: Number(p.revenue) || 0,
  }));

  // Invoice status donut
  const invoiceStatusCounts = invoiceList.reduce((acc: any, inv: any) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});
  const invoiceDonutData = Object.entries(invoiceStatusCounts).map(([name, value]) => ({ name, value }));

  // Customer breakdown donut
  const customerDonutData = [
    { name: 'Returning', value: customerStats?.returning_customers || 0 },
    { name: 'New (30d)', value: customerStats?.new_customers_30d || 0 },
    { name: 'Others', value: Math.max(0, (customerStats?.total_customers || 0) - (customerStats?.returning_customers || 0) - (customerStats?.new_customers_30d || 0)) },
  ].filter((d) => d.value > 0);

  // Overview profit/expense donut
  const profitDonutData = [
    { name: 'Net Profit', value: Math.max(0, profit?.profit || 0) },
    { name: 'Expenses', value: profit?.expenses || 0 },
  ];

  function downloadHTMLReport() {
    setDownloading(true);
    try {
      const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label || 'Report';
      const periodLabel = period === 'custom' ? `${fromDate} — ${toDate}` : period.charAt(0).toUpperCase() + period.slice(1);

      let bodyContent = '';

      if (reportType === 'overview') {
        bodyContent = `
          <h3 style="color:#C1121F;margin:24px 0 12px;font-size:14px;font-weight:700;">Business Overview</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
            <tr style="background:#C1121F;color:#fff;">
              <th style="padding:10px 14px;text-align:left;">Metric</th>
              <th style="padding:10px 14px;text-align:right;">Value</th>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:8px 14px;">Total Revenue</td>
              <td style="padding:8px 14px;text-align:right;font-weight:700;">KES ${Number(profit?.revenue || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 14px;">Total Expenses</td>
              <td style="padding:8px 14px;text-align:right;font-weight:700;">KES ${Number(profit?.expenses || 0).toLocaleString()}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:8px 14px;">Net Profit</td>
              <td style="padding:8px 14px;text-align:right;font-weight:700;color:#065f46;">KES ${Number(profit?.profit || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 14px;">Pending Debts</td>
              <td style="padding:8px 14px;text-align:right;font-weight:700;color:#C1121F;">KES ${Number(debts?.pending || 0).toLocaleString()}</td>
            </tr>
          </table>`;
      }

      if (reportType === 'invoices' || reportType === 'overview') {
        bodyContent += `
          <h3 style="color:#C1121F;margin:24px 0 12px;font-size:14px;font-weight:700;">Invoice Report</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:#C1121F;color:#fff;">
              <th style="padding:8px 12px;text-align:left;">Invoice #</th>
              <th style="padding:8px 12px;text-align:left;">Customer</th>
              <th style="padding:8px 12px;text-align:right;">Amount (KES)</th>
              <th style="padding:8px 12px;text-align:center;">Status</th>
              <th style="padding:8px 12px;text-align:left;">Date</th>
            </tr></thead>
            <tbody>
              ${invoiceList.slice(0, 100).map((inv: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};border-bottom:1px solid #e5e7eb;">
                  <td style="padding:7px 12px;font-weight:600;color:#C1121F;">${inv.invoice_number || '-'}</td>
                  <td style="padding:7px 12px;">${inv.customer_name || inv.manual_customer_name || 'Walk-in'}</td>
                  <td style="padding:7px 12px;text-align:right;font-weight:700;">${Number(inv.total_amount || 0).toLocaleString()}</td>
                  <td style="padding:7px 12px;text-align:center;">
                    <span style="padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;text-transform:uppercase;background:${inv.status === 'paid' ? '#d1fae5' : inv.status === 'overdue' || inv.status === 'unpaid' ? '#fee2e2' : '#fef3c7'};color:${inv.status === 'paid' ? '#065f46' : inv.status === 'overdue' || inv.status === 'unpaid' ? '#991b1b' : '#92400e'};">${inv.status}</span>
                  </td>
                  <td style="padding:7px 12px;color:#6b7280;">${new Date(inv.created_at).toLocaleDateString('en-GB')}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }

      if (reportType === 'debts' || reportType === 'overview') {
        bodyContent += `
          <h3 style="color:#C1121F;margin:32px 0 12px;font-size:14px;font-weight:700;">Outstanding Debt Report</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:#1d1d1f;color:#fff;">
              <th style="padding:8px 12px;text-align:left;">Customer</th>
              <th style="padding:8px 12px;text-align:left;">Phone</th>
              <th style="padding:8px 12px;text-align:right;">Total Debt (KES)</th>
              <th style="padding:8px 12px;text-align:right;">Open Items</th>
              <th style="padding:8px 12px;text-align:left;">Earliest Due</th>
            </tr></thead>
            <tbody>
              ${debtList.map((d: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};border-bottom:1px solid #e5e7eb;">
                  <td style="padding:7px 12px;font-weight:600;">${d.name || 'Unknown'}</td>
                  <td style="padding:7px 12px;color:#6b7280;">${d.phone || '-'}</td>
                  <td style="padding:7px 12px;text-align:right;font-weight:700;color:#C1121F;">${Number(d.total_balance).toLocaleString()}</td>
                  <td style="padding:7px 12px;text-align:right;">${d.open_items}</td>
                  <td style="padding:7px 12px;color:#6b7280;">${d.earliest_due_date ? new Date(d.earliest_due_date).toLocaleDateString('en-GB') : '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }

      if (reportType === 'services') {
        bodyContent += `
          <h3 style="color:#C1121F;margin:24px 0 12px;font-size:14px;font-weight:700;">Top Services Report</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:#C1121F;color:#fff;">
              <th style="padding:8px 12px;text-align:left;">Service</th>
              <th style="padding:8px 12px;text-align:right;">Times Sold</th>
              <th style="padding:8px 12px;text-align:right;">Revenue (KES)</th>
            </tr></thead>
            <tbody>
              ${topServices.map((s: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};border-bottom:1px solid #e5e7eb;">
                  <td style="padding:7px 12px;font-weight:600;">${s.name}</td>
                  <td style="padding:7px 12px;text-align:right;">${s.times_sold}</td>
                  <td style="padding:7px 12px;text-align:right;font-weight:700;">${Number(s.revenue).toLocaleString()}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }

      if (reportType === 'products') {
        bodyContent += `
          <h3 style="color:#C1121F;margin:24px 0 12px;font-size:14px;font-weight:700;">Top Products Report</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:#C1121F;color:#fff;">
              <th style="padding:8px 12px;text-align:left;">Product</th>
              <th style="padding:8px 12px;text-align:right;">Units Sold</th>
              <th style="padding:8px 12px;text-align:right;">Revenue (KES)</th>
            </tr></thead>
            <tbody>
              ${topProducts.map((p: any, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'};border-bottom:1px solid #e5e7eb;">
                  <td style="padding:7px 12px;font-weight:600;">${p.name}</td>
                  <td style="padding:7px 12px;text-align:right;">${p.units_sold}</td>
                  <td style="padding:7px 12px;text-align:right;font-weight:700;">${Number(p.revenue).toLocaleString()}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }

      if (reportType === 'customers') {
        bodyContent += `
          <h3 style="color:#C1121F;margin:24px 0 12px;font-size:14px;font-weight:700;">Customer Report</h3>
          <table style="width:100%;border-collapse:collapse;font-size:11px;max-width:400px;">
            <tr style="background:#C1121F;color:#fff;">
              <th style="padding:8px 12px;text-align:left;">Metric</th>
              <th style="padding:8px 12px;text-align:right;">Count</th>
            </tr>
            <tr style="background:#f9fafb;"><td style="padding:8px 12px;">Total Customers</td><td style="padding:8px 12px;text-align:right;font-weight:700;">${customerStats?.total_customers || 0}</td></tr>
            <tr><td style="padding:8px 12px;">New (Last 30 days)</td><td style="padding:8px 12px;text-align:right;font-weight:700;">${customerStats?.new_customers_30d || 0}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:8px 12px;">Returning Customers</td><td style="padding:8px 12px;text-align:right;font-weight:700;">${customerStats?.returning_customers || 0}</td></tr>
          </table>`;
      }

      const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Litmus Solutions — ${reportLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1d1d1f; background: #fff; padding: 40px; }
  </style>
</head>
<body>
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #C1121F;">
    <div>
      <div style="font-size:24px;font-weight:900;color:#C1121F;letter-spacing:-0.5px;">LITMUS SOLUTIONS</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">Comprehensive Business Management System</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:800;color:#1d1d1f;">${reportLabel}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:3px;">Period: ${periodLabel}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:2px;">Generated: ${now}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
      <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Total Revenue</div>
      <div style="font-size:18px;font-weight:800;color:#1d1d1f;margin-top:4px;">KES ${Number(profit?.revenue || 0).toLocaleString()}</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;">
      <div style="font-size:9px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Total Expenses</div>
      <div style="font-size:18px;font-weight:800;color:#1d1d1f;margin-top:4px;">KES ${Number(profit?.expenses || 0).toLocaleString()}</div>
    </div>
    <div style="border:1px solid #bbf7d0;border-radius:10px;padding:14px;background:#f0fdf4;">
      <div style="font-size:9px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Net Profit</div>
      <div style="font-size:18px;font-weight:800;color:#065f46;margin-top:4px;">KES ${Number(profit?.profit || 0).toLocaleString()}</div>
    </div>
    <div style="border:1px solid #fca5a5;border-radius:10px;padding:14px;background:#fff7f7;">
      <div style="font-size:9px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Pending Debts</div>
      <div style="font-size:18px;font-weight:800;color:#C1121F;margin-top:4px;">KES ${Number(debts?.pending || 0).toLocaleString()}</div>
    </div>
  </div>

  ${bodyContent}

  <div style="margin-top:48px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;">
    <div style="font-size:10px;color:#9ca3af;">Litmus Solutions LOMS • Confidential Business Report</div>
    <div style="font-size:10px;color:#9ca3af;">Generated on ${now}</div>
  </div>
</body></html>`;

      // Download as .html file (opens cleanly in any browser)
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Litmus_${reportLabel.replace(/\s+/g, '_')}_${period}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Layout title="Reports" subtitle="Analytics, insights and downloadable business reports.">

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                reportType === rt.value
                  ? 'bg-litmus-red text-white border-litmus-red shadow'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-litmus-red/40 hover:text-litmus-red'
              }`}
            >
              <Icon size={13} />
              {rt.label}
            </button>
          );
        })}
      </div>

      {/* Controls bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Filter size={13} /> Period
          </span>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  period === p ? 'bg-white shadow text-litmus-black' : 'text-gray-500'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                period === 'custom' ? 'bg-white shadow text-litmus-black' : 'text-gray-500'
              }`}
            >
              Custom
            </button>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-field !py-1.5 !px-2 text-xs w-36"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input-field !py-1.5 !px-2 text-xs w-36"
              />
            </div>
          )}
        </div>
        <button
          onClick={downloadHTMLReport}
          disabled={downloading}
          className="btn-primary flex items-center gap-2 text-xs shrink-0"
        >
          <Download size={14} />
          {downloading ? 'Preparing…' : 'Download Report'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: profit?.revenue || 0, color: 'text-litmus-black', bg: 'bg-white' },
          { label: 'Total Expenses', value: profit?.expenses || 0, color: 'text-gray-700', bg: 'bg-white' },
          { label: 'Net Profit', value: profit?.profit || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Debts', value: debts?.pending || 0, color: 'text-litmus-red', bg: 'bg-red-50' },
        ].map((kpi) => (
          <div key={kpi.label} className={`card p-4 ${kpi.bg}`}>
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">{kpi.label}</div>
            <div className={`text-xl font-extrabold ${kpi.color}`}>{formatMoney(kpi.value)}</div>
          </div>
        ))}
      </div>

      {/* ── Overview ── */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue vs Expenses Donut */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Revenue vs Expenses</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={profitDonutData}
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {profitDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(v)} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Customer Breakdown Donut */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Customer Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={customerDonutData}
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {customerDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Customer stats */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Customer Insight</h3>
            <div className="space-y-4">
              {[
                { label: 'Total Customers', value: customerStats?.total_customers ?? 0, pct: 100 },
                { label: 'New (Last 30 days)', value: customerStats?.new_customers_30d ?? 0, pct: customerStats?.total_customers ? Math.round((customerStats.new_customers_30d / customerStats.total_customers) * 100) : 0 },
                { label: 'Returning Customers', value: customerStats?.returning_customers ?? 0, pct: customerStats?.total_customers ? Math.round((customerStats.returning_customers / customerStats.total_customers) * 100) : 0 },
              ].map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-bold text-gray-800">{item.value} <span className="text-gray-400 font-normal">({item.pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: DONUT_COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Status Donut */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Invoice Status Split</h3>
            {invoiceDonutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={invoiceDonutData} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={3}>
                    {invoiceDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">No invoice data yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Invoices ── */}
      {reportType === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 flex flex-col">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Status Distribution</h3>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={invoiceDonutData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {invoiceDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {invoiceDonutData.map((item, i) => (
                <div key={item.name} className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i] }} />{item.name}</span>
                  <span className="font-bold text-gray-700">{item.value as number} invoices</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card overflow-hidden lg:col-span-2">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Invoice Listing ({invoiceList.length})</h3>
            </div>
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Invoice #', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceList.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-litmus-red">{inv.invoice_number || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[140px] truncate">{inv.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-800">KES {Number(inv.total_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <span className={`badge text-[8px] font-bold uppercase ${statusColor[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{new Date(inv.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                  {invoiceList.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No invoices found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Debts ── */}
      {reportType === 'debts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Debt Summary</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: Number(debts?.paid || 0) },
                    { name: 'Pending', value: Number(debts?.pending || 0) },
                  ]}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#C1121F" />
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(v)} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Total Collected</span><span className="font-bold text-emerald-600">{formatMoney(debts?.paid || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Still Outstanding</span><span className="font-bold text-litmus-red">{formatMoney(debts?.pending || 0)}</span></div>
            </div>
          </div>
          <div className="card overflow-hidden lg:col-span-2">
            <div className="px-5 py-3 border-b border-gray-100 bg-red-50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider">Outstanding Debtors ({debtList.length})</h3>
              <span className="text-[10px] font-semibold text-red-500">Total: KES {debtList.reduce((a: number, d: any) => a + Number(d.total_balance), 0).toLocaleString()}</span>
            </div>
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Customer', 'Phone', 'Total Debt', 'Open Items', 'Earliest Due'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[9px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {debtList.map((d: any) => (
                    <tr key={d.customer_id} className="border-b border-gray-50 hover:bg-red-50/30">
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{d.name || 'Unknown'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{d.phone || '-'}</td>
                      <td className="px-4 py-2.5 font-extrabold text-litmus-red">KES {Number(d.total_balance).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-gray-600">{d.open_items}</td>
                      <td className="px-4 py-2.5 text-gray-400">{d.earliest_due_date ? new Date(d.earliest_due_date).toLocaleDateString('en-GB') : '—'}</td>
                    </tr>
                  ))}
                  {debtList.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No outstanding debts.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Services ── */}
      {reportType === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Services — Revenue Share</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={serviceDonutData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  {serviceDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(v)} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Service Breakdown</h3>
            <div className="space-y-3.5">
              {topServices.map((s: any, i: number) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {s.name}
                    </span>
                    <span className="font-bold text-gray-800">{formatMoney(s.revenue)} <span className="text-gray-400 font-normal">({s.times_sold} sales)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${topServices[0] ? (s.revenue / topServices[0].revenue) * 100 : 0}%`, backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  </div>
                </div>
              ))}
              {topServices.length === 0 && <p className="text-xs text-gray-400">No service data yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Products ── */}
      {reportType === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Products — Revenue Share</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={productDonutData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  {productDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatMoney(v)} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Product Details</h3>
            <div className="space-y-3.5">
              {topProducts.map((p: any, i: number) => (
                <div key={p.name} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-700 truncate">{p.name}</div>
                      <div className="text-gray-400 text-[10px] mt-0.5">{p.units_sold} units sold</div>
                    </div>
                  </div>
                  <span className="font-extrabold text-gray-800 shrink-0 ml-3">{formatMoney(p.revenue)}</span>
                </div>
              ))}
              {topProducts.length === 0 && <p className="text-xs text-gray-400">No product sales yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Customers ── */}
      {reportType === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Customer Type Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={customerDonutData} dataKey="value" innerRadius={65} outerRadius={95} paddingAngle={3}>
                  {customerDonutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-6">Customer Statistics</h3>
            <div className="space-y-5">
              {[
                { label: 'Total Customers', value: customerStats?.total_customers ?? 0, color: '#C1121F' },
                { label: 'New (Last 30 days)', value: customerStats?.new_customers_30d ?? 0, color: '#0ea5e9' },
                { label: 'Returning Customers', value: customerStats?.returning_customers ?? 0, color: '#10b981' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-medium">{item.label}</span>
                    <span className="font-extrabold text-gray-800">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: customerStats?.total_customers ? `${(item.value / customerStats.total_customers) * 100}%` : '0%',
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
