import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import transactionRoutes from './routes/transactions.js';
import productRoutes from './routes/products.js';
import serviceRoutes from './routes/services.js';
import taskRoutes from './routes/tasks.js';
import invoiceRoutes from './routes/invoices.js';
import smsRoutes from './routes/sms.js';
import expenseRoutes from './routes/expenses.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();

// Build an allowed-origins list from CLIENT_ORIGIN (supports comma-separated values)
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman) or in development any localhost
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy: origin '${origin}' not allowed.`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ name: 'Litmus LOMS API', status: 'running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Public
app.use('/api/auth', authRoutes);

// Protected - require a valid JWT for everything else
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/customers', requireAuth, customerRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/services', requireAuth, serviceRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/invoices', requireAuth, invoiceRoutes);
app.use('/api/sms', requireAuth, smsRoutes);
app.use('/api/expenses', requireAuth, expenseRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Litmus LOMS API running on http://localhost:${PORT}`);
});
