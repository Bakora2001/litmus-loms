import { Router } from 'express';
import { pool } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '', category, low_stock } = req.query;
    const clauses = ['is_active = TRUE'];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR barcode ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (low_stock === 'true') {
      clauses.push('quantity <= min_stock');
    }

    const { rows } = await pool.query(
      `SELECT * FROM products WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC`,
      params
    );
    res.json(rows);
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    res.json(rows.map((r) => r.category));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      sku, barcode, name, category, brand,
      buying_price, selling_price, supplier,
      quantity, min_stock, warranty, image_url,
      serial_number,
    } = req.body;

    if (!name || !category || selling_price === undefined) {
      return res.status(400).json({ message: 'name, category and selling_price are required.' });
    }

    const finalSku = sku && sku.trim() !== '' ? sku.trim() : null;
    const finalBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : null;

    const { rows } = await pool.query(
      `INSERT INTO products (sku, barcode, name, category, brand, buying_price, selling_price, supplier, quantity, min_stock, warranty, image_url, serial_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [finalSku, finalBarcode, name, category, brand, buying_price || 0, selling_price, supplier, quantity || 0, min_stock || 3, warranty, image_url, serial_number]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      sku, barcode, name, category, brand,
      buying_price, selling_price, supplier,
      quantity, min_stock, warranty, image_url,
      serial_number,
    } = req.body;

    const finalSku = sku !== undefined ? (sku && sku.trim() !== '' ? sku.trim() : null) : undefined;
    const finalBarcode = barcode !== undefined ? (barcode && barcode.trim() !== '' ? barcode.trim() : null) : undefined;

    const { rows } = await pool.query(
      `UPDATE products SET
        sku = COALESCE($1, sku), barcode = COALESCE($2, barcode), name = COALESCE($3, name),
        category = COALESCE($4, category), brand = COALESCE($5, brand),
        buying_price = COALESCE($6, buying_price), selling_price = COALESCE($7, selling_price),
        supplier = COALESCE($8, supplier), quantity = COALESCE($9, quantity),
        min_stock = COALESCE($10, min_stock), warranty = COALESCE($11, warranty),
        image_url = COALESCE($12, image_url), serial_number = COALESCE($13, serial_number), updated_at = NOW()
       WHERE id = $14 RETURNING *`,
      [finalSku, finalBarcode, name, category, brand, buying_price, selling_price, supplier, quantity, min_stock, warranty, image_url, serial_number, id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Product not found.' });
    res.json(rows[0]);
  })
);

router.post(
  '/:id/adjust-stock',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { change_qty, reason, created_by } = req.body;
    if (!change_qty) return res.status(400).json({ message: 'change_qty is required.' });

    const updated = await pool.query(
      'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [change_qty, id]
    );
    await pool.query(
      `INSERT INTO stock_movements (product_id, change_qty, reason, created_by) VALUES ($1,$2,$3,$4)`,
      [id, change_qty, reason || 'manual adjustment', created_by || null]
    );
    res.json(updated.rows[0]);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await pool.query('UPDATE products SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product removed.' });
  })
);

export default router;
