# Das PG Management (PWA)

A modern, mobile-first Progressive Web App (PWA) for managing **Das PG** (10 rooms), tenants, monthly rent, electricity/line bills, payments, dues, expenses, and financial reports in Indian Rupees (₹).

## Features
- **Admin-Only Security**: First-time setup creates a hashed local admin account (PBKDF2 + salt) or connects to Supabase Auth.
- **Dashboard**: 10 KPI cards, Monthly Income vs Expenses chart, Rent Collection chart, Occupied vs Vacant Room chart, and quick actions.
- **Rooms (1–10)**: Status, multi-occupant support, rent & electricity tracking, and full room history.
- **Tenants**: Full profile, search/filter/sort, move-out workflow, payment history, and monthly bill history.
- **Monthly Rent & Electricity Bills**: Manual room-by-room electricity entry, automatic previous-due carry-forward, duplicate bill prevention per `(room, month)`, and printable bills.
- **Payments & Receipts**: Cash, UPI, Bank Transfer, Other; partial & multiple payments per month; printable/PDF receipts.
- **Expenses & Reports**: Categorized expenses with receipt photo attachments, CSV/Excel/PDF exports.
- **Reminders & WhatsApp**: Overdue/upcoming alerts and one-tap pre-filled WhatsApp payment reminders.
- **Installable PWA**: Works offline and installs on Android, iOS, and Desktop as **Das PG Management** (`Das PG`).

## Run Locally
```bash
npm install
npm run dev
```

## Build for Production
```bash
npm run build
npm run preview
```

## Optional Supabase Cloud Setup
1. Create a Supabase project and run `supabase/schema.sql` in the SQL Editor.
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Rebuild and deploy.
