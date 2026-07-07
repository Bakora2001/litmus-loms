# Litmus LOMS — Backend API

Node.js + Express + PostgreSQL API for the Litmus Operations Management System.

## 1. Install dependencies

```bash
cd backend
npm install
```

## 2. Configure the database

Your Render PostgreSQL instance is already wired up in `.env`:

```
DATABASE_URL=postgresql://litmus_user:...@dpg-d9655nv7f7vs73cu7f0g-a.oregon-postgres.render.com/litmus_db_5zmq
```

This uses the **External Database URL** so it works from your laptop or any host.
If you later deploy this API as a Render Web Service in the same region (Oregon),
switch `DATABASE_URL` to the **Internal** URL (commented in `.env`) — it's faster and free.

> ⚠️ Your free Postgres instance expires **August 6, 2026** unless upgraded on Render.

## 3. Create the tables

```bash
npm run migrate
```

This runs `src/schema.sql`, creating every table LOMS needs (customers, transactions,
products, tasks, invoices, SMS, expenses, settings, etc.) — safe to re-run any time.

## 4. Seed a login user

```bash
npm run seed
```

Creates the default admin account:

- **Email:** admin@litmussolutions.co.ke
- **Password:** Litmus@2026

Change this password immediately after your first login.

## 5. Run the API

```bash
npm run dev      # with auto-reload (nodemon)
# or
npm start
```

The API runs on `http://localhost:5000` by default (see `PORT` in `.env`).

## API overview

| Area | Base path |
|---|---|
| Auth | `/api/auth` (login, register, me) |
| Dashboard | `/api/dashboard/*` |
| Customers | `/api/customers` |
| Transactions (Cyber Services, Laptop sales, Debt Tracker) | `/api/transactions` |
| Products / Inventory | `/api/products` |
| Service catalog | `/api/services` |
| Tasks | `/api/tasks` |
| Invoices (+ PDF) | `/api/invoices` |
| Bulk SMS | `/api/sms` |
| Expenses / Cashbook | `/api/expenses` |
| Reports | `/api/reports` |
| Settings | `/api/settings` |

Every route except `/api/auth/login` and `/api/auth/register` requires a
`Authorization: Bearer <token>` header, returned from `/api/auth/login`.

## Bulk SMS provider

`src/routes/sms.js` simulates delivery until you add your Sender ID provider's
credentials to `.env` (`SMS_PROVIDER_API_URL`, `SMS_PROVIDER_API_KEY`). Swap the
`deliverSms()` function body for your provider's exact request format when ready.
