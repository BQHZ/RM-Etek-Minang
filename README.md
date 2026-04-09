# RM. Etek Minang — POS System

Sistem Point of Sale lengkap untuk Rumah Makan Padang, dibangun dengan Next.js 14, TypeScript, Prisma, Supabase, dan shadcn/ui.

## Fitur Utama

- **POS / Kasir** — Input pesanan cepat dengan grid menu, manajemen stok real-time
- **Pembayaran** — Tunai (dengan pecahan uang) & QRIS, cetak struk thermal
- **Tampilan Dapur** — Notifikasi real-time via Supabase, desain layar sentuh untuk dapur
- **Dashboard Owner** — Laporan harian, profit, grafik 7 hari, export PDF/Excel
- **Manajemen Menu** — Kategori, harga, stok harian manual
- **Pengeluaran** — Catat pengeluaran harian dengan template cepat
- **Multi-role** — Owner, Kasir, Pelayan, Dapur dengan akses berbeda

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime (kitchen alerts) |
| Auth | Custom JWT (jose) |
| Charts | Recharts |
| Export | jsPDF + SheetJS (xlsx) |

## Setup Lokal

### 1. Clone & Install

```bash
git clone <repo-url>
cd rm-etek-minang
npm install
```

### 2. Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) dan buat project baru
2. Setelah project dibuat, buka **Settings → Database**
3. Catat:
   - **Connection string (Transaction)** → untuk `DATABASE_URL` (gunakan port 6543, tambahkan `?pgbouncer=true`)
   - **Connection string (Session)** → untuk `DIRECT_URL` (port 5432)
4. Buka **Settings → API** dan catat:
   - **Project URL** → untuk `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Konfigurasi Environment

```bash
cp .env.example .env
```

Isi `.env` dengan kredensial Supabase:

```env
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
JWT_SECRET=random-string-minimal-32-karakter
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Enable Supabase Realtime

Buka **Supabase Dashboard → SQL Editor** dan jalankan:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE "MenuItem";
ALTER PUBLICATION supabase_realtime ADD TABLE "RestockNotification";
```

### 6. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 7. (Opsional) Generate Demo Data

Untuk mengisi dashboard dengan data 7 hari terakhir:

```bash
npm run db:seed-demo
```

## Login Credentials

| Nama | Username | PIN | Role | Akses |
|---|---|---|---|---|
| Pak Etek | etek | 1234 | Owner | /dashboard |
| Siti Aisyah | siti | 1111 | Kasir | /pos |
| Budi Santoso | budi | 2222 | Pelayan | /pos |
| Rani Dapur | rani | 3333 | Dapur | /kitchen |

## Struktur Halaman

```
/login              — Halaman login (publik)
/pos                — Kasir / input pesanan
/pos/orders         — Daftar pesanan hari ini
/pos/stock          — Monitor stok etalase
/pos/transactions   — Riwayat transaksi (kasir)
/pos/expenses       — Catat pengeluaran
/kitchen            — Tampilan dapur (realtime)
/dashboard          — Ringkasan owner (profit, grafik)
/dashboard/reports  — Laporan harian + export
/dashboard/transactions — Riwayat transaksi + void
/dashboard/expenses — Pengeluaran
/dashboard/menu     — Kelola menu & stok harian
/dashboard/categories — Kelola kategori
/dashboard/settings — Pengaturan & kelola pengguna
```

## Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <github-repo-url>
git push -u origin main
```

### 2. Import di Vercel

1. Buka [vercel.com](https://vercel.com) → "Add New Project"
2. Import dari GitHub repository
3. Framework Preset: **Next.js** (otomatis terdeteksi)
4. Build Settings: biarkan default

### 3. Set Environment Variables

Di Vercel dashboard → Settings → Environment Variables, tambahkan:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Connection string Supabase (Transaction/port 6543) |
| `DIRECT_URL` | Connection string Supabase (Session/port 5432) |
| `JWT_SECRET` | Random string 32+ karakter |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase |

### 4. Deploy

Klik "Deploy". Vercel akan otomatis build dan deploy.

### 5. Migrasi Database Produksi

Setelah deploy pertama, jalankan migrasi dari lokal:

```bash
# Pastikan .env mengarah ke database produksi Supabase
npx prisma migrate deploy
npx prisma db seed
```

## Scripts

| Script | Deskripsi |
|---|---|
| `npm run dev` | Jalankan development server |
| `npm run build` | Build untuk produksi |
| `npm run start` | Jalankan production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Jalankan migrasi database |
| `npm run db:push` | Push schema tanpa migrasi |
| `npm run db:seed` | Seed data awal (users, kategori, menu) |
| `npm run db:seed-demo` | Generate demo data 7 hari |
| `npm run db:studio` | Buka Prisma Studio (GUI database) |

## Arsitektur

- **Prisma** menangani semua operasi CRUD via API routes
- **Supabase JS client** hanya digunakan untuk Realtime subscriptions (tampilan dapur)
- Sesi login disimpan sebagai JWT cookie (8 jam / 1 shift)
- Order number auto-increment harian: `ORD-YYYYMMDD-001`
- Notifikasi restock otomatis saat stok ≤ threshold (default 25%) selama jam operasional

## Lisensi

Private — RM. Etek Minang
