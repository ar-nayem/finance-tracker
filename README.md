# Finance Tracker

A personal and multi-tenant finance tracker — accounts, transactions,
investments, and recurring income/expense streams, with charts and
document storage. Installable as a PWA.

## What it does

- **Accounts & transactions** — track balances across accounts, categorize
  spending, generate reports (Recharts) and export to Excel/PDF
- **Investments** — separate tracking outside day-to-day cash flow
- **Streams** — recurring income and expenses
- **Documents** — receipts and statements attached to records
- **Multi-tenant** — admin-scoped access control
- **Live sync** — pushes transaction changes to [dashboard](https://github.com/ar-nayem/dashboard)
  via a Prisma hook the moment they're saved, so a separate personal
  dashboard always shows current balances without a manual import.
  Sync is gated on both apps and never sums different currencies together.
- **PWA** — installable, works offline for viewing cached data

## Stack

Next.js 16 (App Router) · Prisma 7 + better-sqlite3 · Recharts ·
ExcelJS / pdf-lib (exports) · TypeScript

## Getting started

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```
