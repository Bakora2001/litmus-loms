/**
 * salesReportHtml.ts
 * Generates the HTML string for the downloadable sales report.
 * Kept in a plain .ts file (NOT .tsx) so Babel/tsc never tries to
 * parse the HTML tag literals inside template strings as JSX.
 */

export interface ReportTransaction {
  created_at: string;
  description: string;
  customer_name?: string;
  customer_phone?: string;
  module: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  served_by_name?: string;
}

export interface ReportTotals {
  totalRevenue: number;
  totalSales: number;
  outstanding: number;
  paidCount: number;
}

export function buildSalesReportHtml(
  periodLabel: string,
  from: string,
  to: string,
  rows: ReportTransaction[],
  totals: ReportTotals,
): string {
  const now = new Date().toLocaleString('en-GB');

  const rowsHtml = rows.map((t, i) => {
    const date = new Date(t.created_at).toLocaleDateString('en-GB');
    const time = new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const mod   = t.module === 'cyber_service' ? 'Cyber'
                : t.module === 'product_sale'  ? 'Store'
                : t.module;
    const balClr = Number(t.balance) > 0 ? '#C1121F' : '#999';
    const balVal = Number(t.balance) > 0
      ? 'KES ' + Number(t.balance).toLocaleString()
      : '&mdash;';
    const badge = t.status === 'paid'    ? 'paid'
                : t.status === 'partial' ? 'partial'
                : 'unpaid';

    return (
      '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + date + '<br><small>' + time + '</small></td>' +
        '<td>' + (t.description || '') + '</td>' +
        '<td>' + (t.customer_name || '&mdash;') + '<br><small style="color:#888">' + (t.customer_phone || '') + '</small></td>' +
        '<td>' + mod + '</td>' +
        '<td style="text-align:right">KES ' + Number(t.total_amount).toLocaleString() + '</td>' +
        '<td style="text-align:right;color:#059669">KES ' + Number(t.amount_paid).toLocaleString() + '</td>' +
        '<td style="text-align:right;color:' + balClr + '">' + balVal + '</td>' +
        '<td><span class="badge-' + badge + '">' + t.status.toUpperCase() + '</span></td>' +
        '<td>' + (t.served_by_name || '&mdash;') + '</td>' +
      '</tr>'
    );
  }).join('');

  return (
    '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8"><title>Sales Report - ' + periodLabel + '</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;font-size:10px;color:#000;margin:25px}' +
    '.header-container{border-top:5px solid #C1121F;margin-bottom:18px}' +
    '.header-logo-row{display:flex;align-items:center;gap:12px;background:#000;color:#fff;padding:10px 18px}' +
    '.logo-circle{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #C1121F;overflow:hidden}' +
    '.logo-circle img{height:28px;object-fit:contain}' +
    '.company-title{font-size:18px;font-weight:900}' +
    '.contact-bar{background:#fff;border-top:3px solid #C1121F;border-bottom:3px solid #C1121F;text-align:center;padding:5px;font-size:8px;font-weight:bold}' +
    '.report-title{font-size:14px;font-weight:bold;margin:12px 0 4px}' +
    '.period-info{font-size:9px;color:#666;margin-bottom:12px}' +
    '.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}' +
    '.summary-card{border:1px solid #e5e5e5;border-radius:6px;padding:10px;text-align:center}' +
    '.summary-card label{display:block;font-size:8px;color:#888;text-transform:uppercase;font-weight:bold;margin-bottom:3px}' +
    '.summary-card .val{font-size:13px;font-weight:900}' +
    '.val-green{color:#059669}.val-red{color:#C1121F}.val-blue{color:#2563eb}' +
    'table{width:100%;border-collapse:collapse;margin-top:8px}' +
    'th{background:#000;color:#fff;font-size:9px;font-weight:bold;padding:7px 8px;text-align:left;border-right:1px solid #333}' +
    'th:last-child{border-right:none}' +
    'td{padding:7px 8px;font-size:9px;border-bottom:1px solid #eee;border-right:1px solid #f0f0f0}' +
    'td:last-child{border-right:none}' +
    'tr:nth-child(even) td{background:#fafafa}' +
    '.tfoot-row td{background:#f0f0f0;font-weight:bold;font-size:10px;border-top:2px solid #000}' +
    '.badge-paid{background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:10px;font-size:8px;font-weight:bold}' +
    '.badge-partial{background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:10px;font-size:8px;font-weight:bold}' +
    '.badge-unpaid{background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:10px;font-size:8px;font-weight:bold}' +
    '.footer{margin-top:20px;border-top:2px solid #C1121F;padding-top:10px;font-size:8px;color:#888;text-align:center}' +
    '@media print{body{margin:10px}}' +
    '</style></head>' +
    '<body>' +

    '<div class="header-container">' +
      '<div class="header-logo-row">' +
        '<div class="logo-circle"><img src="/logo.png" onerror="this.style.display=\'none\'" /></div>' +
        '<div>' +
          '<div class="company-title">Litmus Tech Solutions</div>' +
          '<div style="font-size:8px;opacity:0.7">Sales &amp; Revenue Report</div>' +
        '</div>' +
      '</div>' +
      '<div class="contact-bar">Tel: +254 723 005 182 | 0706 085 261 | Email: info@litmussolution.co.ke | www.litmussolution.co.ke</div>' +
    '</div>' +

    '<div class="report-title">Sales Report &mdash; ' + periodLabel + '</div>' +
    '<div class="period-info">Period: ' + from + ' to ' + to + ' &nbsp;|&nbsp; Generated: ' + now + '</div>' +

    '<div class="summary-grid">' +
      '<div class="summary-card"><label>Total Revenue (Paid)</label><div class="val val-green">KES ' + totals.totalRevenue.toLocaleString() + '</div></div>' +
      '<div class="summary-card"><label>Total Sales Value</label><div class="val val-blue">KES ' + totals.totalSales.toLocaleString() + '</div></div>' +
      '<div class="summary-card"><label>Outstanding</label><div class="val val-red">KES ' + totals.outstanding.toLocaleString() + '</div></div>' +
      '<div class="summary-card"><label>Paid / Total</label><div class="val">' + totals.paidCount + ' / ' + rows.length + '</div></div>' +
    '</div>' +

    '<table>' +
      '<thead><tr>' +
        '<th>#</th><th>Date &amp; Time</th><th>Item / Service</th><th>Customer</th>' +
        '<th>Type</th><th style="text-align:right">Total</th>' +
        '<th style="text-align:right">Paid</th><th style="text-align:right">Balance</th>' +
        '<th>Status</th><th>Served By</th>' +
      '</tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '<tfoot>' +
        '<tr class="tfoot-row">' +
          '<td colspan="5">TOTALS (' + rows.length + ' records)</td>' +
          '<td style="text-align:right">KES ' + totals.totalSales.toLocaleString() + '</td>' +
          '<td style="text-align:right;color:#059669">KES ' + totals.totalRevenue.toLocaleString() + '</td>' +
          '<td style="text-align:right;color:#C1121F">KES ' + totals.outstanding.toLocaleString() + '</td>' +
          '<td colspan="2"></td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>' +

    '<div class="footer">' +
      '<div>&bull; Internet installation &bull; Computer sales &amp; repair &bull; Software installation &bull; ICT consultancy &bull; Website design &bull; Graphic design &bull; Printing &amp; scanning &bull; Cyber services</div>' +
      '<div style="margin-top:4px">Generated by Litmus LOMS &bull; Confidential Sales Report</div>' +
    '</div>' +

    '</body></html>'
  );
}
