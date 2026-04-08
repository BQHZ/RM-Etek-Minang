# RM. Etek Minang — POS System

Point of Sale system for a Padang restaurant, built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + Supabase PostgreSQL, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **ORM:** Prisma (all CRUD)
- **Database:** Supabase PostgreSQL
- **Realtime:** Supabase JS client (stock & restock alerts only)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

- `DATABASE_URL` — Supabase pooled connection string (port 6543, `?pgbouncer=true`)
- `DIRECT_URL` — Supabase direct connection string (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon/public key

### 3. Generate Prisma client & run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed the database

```bash
npx prisma db seed
```

### 5. Enable Supabase Realtime

Open your Supabase SQL Editor and run the contents of `prisma/supabase-realtime.sql`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "MenuItem";
ALTER PUBLICATION supabase_realtime ADD TABLE "RestockNotification";
```

### 6. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── app/              # Next.js App Router pages & API routes
├── components/ui/    # shadcn/ui components (Button, Card, Dialog, etc.)
├── lib/              # Utilities (prisma.ts, supabase.ts, utils.ts)
├── prisma/           # Schema, seed, and Supabase Realtime SQL
├── types/            # Shared TypeScript types
└── public/           # Static assets
```

## Architecture Notes

- **Prisma** handles ALL database reads/writes via Next.js API routes.
- **Supabase JS client** is used ONLY for Realtime subscriptions (kitchen display, stock alerts).
- Order numbers auto-increment daily: `ORD-YYYYMMDD-001`.
- Menu items have a configurable low-stock threshold (default 25% of initial stock).

## Seed Data

- 4 users: Owner (etek), Cashier (siti), Waiter (budi), Kitchen (rani)
- 4 categories: Lauk, Sayur, Minuman, Tambahan
- 19 menu items with realistic IDR prices

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
