import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, '../assets/litmus-logo.png');

const router = Router();

async function nextInvoiceNumber() {
  const settings = await pool.query('SELECT invoice_prefix FROM settings WHERE id = 1');
  const prefix = settings.rows[0]?.invoice_prefix || 'INV-2026-';
  const count = await pool.query(
    `SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1`,
    [`${prefix}%`]
  );
  const next = Number(count.rows[0].count) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, type = 'invoice', created_by, from_date, to_date } = req.query;
    const clauses = [];
    const params = [];
    if (status) { params.push(status); clauses.push(`i.status = $${params.length}`); }
    if (type) { params.push(type); clauses.push(`i.type = $${params.length}`); }
    if (created_by) { params.push(created_by); clauses.push(`i.created_by = $${params.length}`); }
    if (from_date) { params.push(from_date); clauses.push(`i.issue_date >= $${params.length}`); }
    if (to_date) { params.push(to_date); clauses.push(`i.issue_date <= $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone, u.name AS creator_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN users u ON u.id = i.created_by
       ${where}
       ORDER BY i.created_at DESC`,
      params
    );
    res.json(rows);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email, u.name AS creator_name
       FROM invoices i 
       LEFT JOIN customers c ON c.id = i.customer_id 
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
    res.json(rows[0]);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { customer_id, due_date, items = [], discount = 0, vat_rate, terms, type = 'invoice' } = req.body;
    if (!customer_id || !items.length) {
      return res.status(400).json({ message: 'customer_id and at least one item are required.' });
    }

    const settings = await pool.query('SELECT tax_rate FROM settings WHERE id = 1');
    const rate = vat_rate !== undefined ? vat_rate : Number(settings.rows[0]?.tax_rate || 0);

    const subtotal = items.reduce((sum, it) => sum + Number(it.qty) * Number(it.price), 0);
    const vat = (subtotal - discount) * (rate / 100);
    const total = subtotal - discount + vat;

    const invoiceNumber = await nextInvoiceNumber();
    const createdBy = req.user?.id || null;

    const { rows } = await pool.query(
      `INSERT INTO invoices (invoice_number, customer_id, due_date, items, subtotal, vat, discount, total, terms, type, created_by, served_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [invoiceNumber, customer_id, due_date || null, JSON.stringify(items), subtotal, vat, discount, total, terms, type, createdBy, createdBy]
    );
    res.status(201).json(rows[0]);
  })
);

// Full update of an invoice (required for quotations editing)
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { customer_id, due_date, items = [], discount = 0, vat_rate, terms, status, type } = req.body;
    const settings = await pool.query('SELECT tax_rate FROM settings WHERE id = 1');
    const rate = vat_rate !== undefined ? vat_rate : Number(settings.rows[0]?.tax_rate || 0);

    const subtotal = items.reduce((sum, it) => sum + Number(it.qty) * Number(it.price), 0);
    const vat = (subtotal - discount) * (rate / 100);
    const total = subtotal - discount + vat;

    const { rows } = await pool.query(
      `UPDATE invoices SET
        customer_id = COALESCE($1, customer_id),
        due_date = COALESCE($2, due_date),
        items = COALESCE($3, items),
        subtotal = $4,
        vat = $5,
        discount = $6,
        total = $7,
        terms = COALESCE($8, terms),
        status = COALESCE($9, status),
        type = COALESCE($10, type)
       WHERE id = $11 RETURNING *`,
      [customer_id, due_date || null, JSON.stringify(items), subtotal, vat, discount, total, terms, status, type, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Invoice/Quotation not found.' });
    res.json(rows[0]);
  })
);

// Convert quotation to invoice & register transactions
router.post(
  '/:id/convert-to-invoice',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const qRes = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    const quotation = qRes.rows[0];
    if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
    if (quotation.type !== 'quotation') return res.status(400).json({ message: 'Only quotations can be converted.' });

    const { rows } = await pool.query(
      `UPDATE invoices SET type = 'invoice', status = 'unpaid' WHERE id = $1 RETURNING *`,
      [id]
    );

    const items = quotation.items || [];
    const customerId = quotation.customer_id;
    const activeServedBy = req.user?.id || null;

    for (const item of items) {
      const total = Number(item.qty || 1) * Number(item.price || 0);
      await pool.query(
        `INSERT INTO transactions
          (customer_id, module, description, quantity, unit_price, total_amount, amount_paid, status, served_by, due_date)
         VALUES ($1, 'cyber_service', $2, $3, $4, $5, 0, 'pending', $6, $7)`,
        [customerId, item.name + (item.description ? ` - ${item.description}` : ''), item.qty || 1, item.price || 0, total, activeServedBy, quotation.due_date]
      );
    }

    res.json(rows[0]);
  })
);

router.put(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { rows } = await pool.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  })
);

// Generate a branded PDF for the invoice
router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone,
              u.name AS served_by_name
       FROM invoices i 
       LEFT JOIN customers c ON c.id = i.customer_id 
       LEFT JOIN users u ON u.id = i.served_by
       WHERE i.id = $1`,
      [req.params.id]
    );
    const invoice = rows[0];
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

    const settingsRes = await pool.query('SELECT * FROM settings WHERE id = 1');
    const settings = settingsRes.rows[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoice_number}.pdf`);

    // Standard A4 dimensions: 595 x 842 pt
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // 1. Red top border bar
    doc.rect(0, 0, 595, 12).fill('#C1121F');

    // 1b. Diagonal watermark in the centre of the page
    doc.save();
    doc.opacity(0.05);
    doc.fillColor('#C1121F').fontSize(60).font('Helvetica-Bold');
    const wmText = 'LITMUS TECH SOLUTIONS';
    const wmWidth = doc.widthOfString(wmText);
    // Centre of A4 (595x842), rotate -35 degrees
    doc.translate(595 / 2, 842 / 2);
    doc.rotate(-35, { origin: [0, 0] });
    doc.text(wmText, -wmWidth / 2, -30, { lineBreak: false });
    doc.restore();
    doc.opacity(1);

    // 2. Red document-type banner on top-right
    const docTypeLabel = invoice.type === 'quotation' ? 'QUOTATION' : invoice.type === 'receipt' ? 'RECEIPT' : 'INVOICE';
    doc.rect(595 - 130, 12, 105, 45).fill('#C1121F');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(docTypeLabel, 595 - 120, 20);
    doc.fontSize(10).text(invoice.invoice_number, 595 - 120, 32);

    // 3. Branded corporate header on top-left
    // Embed the Litmus Logo
    try {
      doc.image(logoPath, 40, 24, { width: 35 });
    } catch (e) {
      // Fallback L box
      doc.rect(40, 35, 30, 30).fill('#121212');
      doc.fillColor('#C1121F').fontSize(16).font('Helvetica-Bold').text('L', 50, 42);
    }
    // Draw company titles
    doc.fillColor('#121212').fontSize(12).font('Helvetica-Bold').text('Litmus Tech Solutions', 80, 32);
    doc.fillColor('#777777').fontSize(8).font('Helvetica').text('Technology for You', 80, 46);

    doc.y = 85;

    // 4. From / Bill To grids
    const startY = doc.y;
    // LEFT: From Details
    doc.fillColor('#999999').fontSize(8).font('Helvetica-Bold').text('FROM:', 40, startY);
    doc.fillColor('#121212').fontSize(9).font('Helvetica-Bold').text('Litmus Tech Solutions', 40, startY + 12);
    doc.fillColor('#555555').fontSize(8).font('Helvetica').text('Technology for You', 40, startY + 24);
    doc.text('P.O Box 33058-30100 Eldoret-Kenya', 40, startY + 34);
    doc.text('Phone: +254 723 005 182 / 0706 085 261', 40, startY + 44);
    doc.text('Email: info@litmussolutions.co.ke', 40, startY + 54);
    doc.text('Website: www.litmussolutions.co.ke', 40, startY + 64);

    // RIGHT: Bill To Details
    doc.fillColor('#999999').fontSize(8).font('Helvetica-Bold').text('BILL TO:', 310, startY);
    doc.fillColor('#121212').fontSize(9).font('Helvetica-Bold').text(invoice.customer_name || 'Walk-in Customer', 310, startY + 12);
    if (invoice.customer_phone) {
      doc.fillColor('#555555').fontSize(8).font('Helvetica').text(`Phone: ${invoice.customer_phone}`, 310, startY + 24);
    }
    if (invoice.customer_email) {
      doc.text(`Email: ${invoice.customer_email}`, 310, startY + 34);
    }
    
    // Dates
    doc.fillColor('#555555').fontSize(8).text(`${invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} Date: ${new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 310, startY + 48);
    if (invoice.due_date) {
      doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 310, startY + 58);
    }

    // 5. Items table headers in a red filled bar background
    const tableTop = startY + 90;
    doc.rect(40, tableTop, 515, 20).fill('#C1121F');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    doc.text('#', 45, tableTop + 6);
    doc.text('Item / Service', 70, tableTop + 6);
    doc.text('Qty', 290, tableTop + 6, { width: 30, align: 'center' });
    doc.text('Unit Price', 330, tableTop + 6, { width: 70, align: 'right' });
    doc.text('Discount', 410, tableTop + 6, { width: 50, align: 'center' });
    doc.text('Amount', 470, tableTop + 6, { width: 80, align: 'right' });

    // Table rows
    let currentY = tableTop + 20;
    doc.font('Helvetica').fontSize(8).fillColor('#121212');
    
    (invoice.items || []).forEach((item, idx) => {
      const lineTotal = Number(item.qty) * Number(item.price);
      
      // Zebra background or alternate border
      doc.rect(40, currentY, 515, 22).strokeColor('#F3F4F6').stroke();

      doc.fillColor('#777777').text(String(idx + 1), 45, currentY + 7);
      doc.fillColor('#121212').font('Helvetica-Bold').text(item.name || 'Untitled Item', 70, currentY + 7);
      if (item.description) {
        doc.fillColor('#999999').fontSize(7).font('Helvetica').text(item.description, 70, currentY + 14);
      }
      doc.font('Helvetica').fontSize(8).fillColor('#121212');
      doc.text(String(item.qty), 290, currentY + 7, { width: 30, align: 'center' });
      doc.text(`KES ${Number(item.price).toFixed(2)}`, 330, currentY + 7, { width: 70, align: 'right' });
      doc.text(`${item.discount || 0}%`, 410, currentY + 7, { width: 50, align: 'center' });
      doc.font('Helvetica-Bold').text(`KES ${lineTotal.toFixed(2)}`, 470, currentY + 7, { width: 80, align: 'right' });

      currentY += 22;
    });

    // 6. Totals section and notes
    const endOfTableY = currentY + 15;
    
    // Notes & terms (Left side)
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555555').text('Notes & Terms:', 40, endOfTableY);
    doc.font('Helvetica').fillColor('#777777').fontSize(7);
    doc.text(invoice.terms || 'Thank you for choosing Litmus Tech Solutions.', 40, endOfTableY + 12, { width: 230 });

    // Served By row (below notes)
    if (invoice.served_by_name) {
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#555555').text('Served By:', 40, endOfTableY + 46);
      doc.font('Helvetica').fillColor('#C1121F').text(invoice.served_by_name, 88, endOfTableY + 46);
    }

    // Summary block (Right side)
    const summaryX = 330;
    doc.fontSize(8).font('Helvetica').fillColor('#555555');
    doc.text('Subtotal:', summaryX, endOfTableY);
    doc.font('Helvetica-Bold').fillColor('#121212').text(`KES ${Number(invoice.subtotal).toFixed(2)}`, summaryX + 110, endOfTableY, { align: 'right', width: 110 });

    doc.font('Helvetica').fillColor('#555555').text('Discount:', summaryX, endOfTableY + 14);
    doc.font('Helvetica-Bold').fillColor('#121212').text(`KES ${Number(invoice.discount).toFixed(2)}`, summaryX + 110, endOfTableY + 14, { align: 'right', width: 110 });

    doc.font('Helvetica').fillColor('#555555').text('VAT (Tax):', summaryX, endOfTableY + 28);
    doc.font('Helvetica-Bold').fillColor('#121212').text(`KES ${Number(invoice.vat).toFixed(2)}`, summaryX + 110, endOfTableY + 28, { align: 'right', width: 110 });

    // Total filled block matching HTML preview total block
    doc.rect(summaryX, endOfTableY + 44, 225, 20).fill('#121212');
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text('Total:', summaryX + 8, endOfTableY + 50);
    doc.text(`KES ${Number(invoice.total).toFixed(2)}`, summaryX + 105, endOfTableY + 50, { align: 'right', width: 110 });

    // 7. Footer bar
    doc.rect(0, 842 - 25, 595, 25).fill('#C1121F');
    doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('Powered by Litmus Tech Solutions', 40, 842 - 16);
    doc.text('Facebook  |  Twitter  |  WhatsApp', 400, 842 - 16, { align: 'right', width: 155 });

    doc.end();
  })
);

export default router;
