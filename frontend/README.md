# Litmus LOMS — Frontend

React + TypeScript + Vite + Tailwind CSS frontend for the Litmus Operations
Management System, matching the Litmus Solutions brand (black, white, red accent).

## Setup

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Make sure the backend API is running first
(see `../backend/README.md`) and that `.env` points at it:

```
VITE_API_URL=http://localhost:5000/api
```

## Default login

After running the backend's `npm run seed`:

- **Email:** admin@litmussolutions.co.ke
- **Password:** Litmus@2026

## Structure

```
src/
  api/client.ts          Axios instance + auth header injection
  context/AuthContext.tsx  Login/logout/session state
  components/            Sidebar, Topbar, Layout, Modal, StatCard, Logo
  pages/                  One file per module (Dashboard, Customers, Cyber
                          Services, Laptop Store, Inventory, Tasks, Invoices,
                          Debt Tracker, Bulk SMS, Calendar, Reports, Expenses,
                          Settings)
  types/                  Shared TypeScript interfaces
  utils/format.ts         Currency/date formatting + badge colour maps
```

## Design system

- Background `#F8F9FA`, cards white with soft shadows and 14px radius
- Sidebar matte black `#121212`
- Primary red `#C1121F`, hover `#9B0F18`
- Font: Inter
- All colours/spacing are defined in `tailwind.config.js` under the `litmus.*` palette

## Build for production

```bash
npm run build
```

Outputs static files to `dist/` — deploy to Vercel, Netlify, Render Static
Site, or serve via any static host / Nginx.
