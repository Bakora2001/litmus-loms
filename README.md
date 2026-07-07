# Litmus Operations Management System (LOMS)

Full-stack business management platform for **Litmus Solutions** — Cyber
Services & Laptop Store — built from your requirements spec and dashboard/login
designs.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (your Render instance, already wired in)

## Quick start

### 1. Backend

```bash
cd backend
npm install
npm run migrate    # creates all tables on your Render Postgres instance
npm run seed       # creates a default login + demo customers
npm run dev        # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### 3. Log in

- **Email:** admin@litmussolutions.co.ke
- **Password:** Litmus@2026

Change this password from the app once you're in (Settings → Users is where
you'll manage staff accounts — wire up a change-password action there when
you're ready to go live).

## What's implemented end-to-end (real DB reads/writes)

- **Auth** — JWT login, protected routes
- **Dashboard** — every stat card, chart and panel from your reference design, all
  reading live data from Postgres
- **Customers** — add/search/view, automatic per-customer service timeline
- **Cyber Services** — quick-button recording (Printing, KRA, eCitizen, CV Writing,
  etc.), phone-based "Smart Service History" search
- **Laptop Store** — browse/sell products by category, auto stock deduction
- **Inventory** — full product CRUD, low-stock detection
- **Debt Tracker** — outstanding balances grouped by customer, full/partial
  payment collection
- **Tasks** — Trello-style drag-and-drop board with priorities and deadlines
- **Invoices** — itemized invoice creation + branded PDF download
- **Bulk SMS** — audience targeting (customers/debtors/VIP/everyone), templates,
  campaign history (see note below on going live with a real provider)
- **Calendar** — monthly view of task deadlines + invoice due dates
- **Reports** — sales, top services/products, debts, customer, profit
- **Expenses** — daily operational cost tracking feeding the profit report
- **Settings** — business profile, tax rate, invoice prefix, SMS sender ID, users list

## What you'll want to finish before going fully live

1. **Bulk SMS provider** — `backend/src/routes/sms.js` simulates delivery until
   you drop your Sender ID provider's API URL/key into `backend/.env`
   (`SMS_PROVIDER_API_URL`, `SMS_PROVIDER_API_KEY`). The UI, database logging,
   and cost tracking are fully wired — only the final HTTP call to your SMS
   gateway needs your provider's exact request format.
2. **Password reset / change password** — login and JWT are real; a
   self-serve "forgot password" email flow isn't built yet.
3. **File uploads** (product images, scanned IDs, logo upload in Settings) —
   the database has columns for these (`image_url`, `logo_url`) but there's no
   upload endpoint yet; `multer` is already in `package.json` for when you add one.
4. **Render free Postgres expiry** — your database is on the **Free** tier and
   is scheduled to expire **August 6, 2026** unless upgraded. Set a reminder.

## Repository layout

```
litmus/
  backend/     Node.js + Express API (see backend/README.md)
  frontend/    React + TypeScript app (see frontend/README.md)
```

Each folder has its own README with more detail.
