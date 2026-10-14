# Sistem Manajemen Produksi Event (EPMS)

> **Event Production Management System** — platform terintegrasi berbasis web dan Android untuk mengelola produksi event, alokasi peralatan, dan penugasan kru.

---

## Daftar Isi

- [Gambaran Umum](#gambaran-umum)
- [Arsitektur](#arsitektur)
- [Struktur Monorepo](#struktur-monorepo)
- [Teknologi](#teknologi)
- [Prasyarat](#prasyarat)
- [Memulai](#memulai)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Perintah Tersedia](#perintah-tersedia)
- [API Endpoints](#api-endpoints)
- [Skema Database](#skema-database)
- [Autentikasi](#autentikasi)
- [Kontribusi](#kontribusi)

---

## Gambaran Umum

EPMS adalah sistem manajemen produksi event yang dirancang untuk tim EO (Event Organizer). Sistem ini memungkinkan:

- **Admin** mengelola event, peralatan, dan kru melalui antarmuka web
- **Kru** menerima penugasan dan memperbarui status pekerjaan melalui aplikasi Android
- Pencatatan alokasi peralatan dengan deteksi konflik waktu otomatis
- Sistem autentikasi berbasis JWT dengan rotasi refresh token

---

## Arsitektur

```
┌─────────────────────┐        ┌─────────────────────┐
│  admin-web          │        │  crew-mobile        │
│  Next.js 15 :3000   │        │  Expo (Android)     │
└──────────┬──────────┘        └──────────┬──────────┘
           │                              │
           └──────────────┬───────────────┘
                          │ HTTP REST /api/v1
                ┌─────────▼──────────┐
                │  Express API :4000 │
                │  services/api      │
                └─────────┬──────────┘
                          │ Prisma ORM
                ┌─────────▼──────────┐
                │  MySQL 8.4 InnoDB  │
                └────────────────────┘
```

- Next.js **tidak** digunakan sebagai API layer — semua logika bisnis ada di Express.
- Waktu event disimpan dalam UTC `DATETIME(3)`, dengan field `timezone` IANA (default `Asia/Jakarta`) untuk keperluan tampilan.

---

## Struktur Monorepo

```
.
├── apps/
│   ├── admin-web/          # Aplikasi web admin (Next.js 15 + Tailwind CSS 4)
│   └── crew-mobile/        # Aplikasi mobile kru (Expo / Android)
├── services/
│   └── api/                # REST API (Express + Prisma + MySQL)
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── seed.ts
│       │   └── migrations/
│       └── src/
│           ├── config/
│           ├── lib/
│           ├── middleware/
│           └── modules/
│               ├── auth/
│               ├── users/
│               ├── events/
│               ├── equipment/
│               ├── allocations/
│               ├── assignments/
│               └── health/
├── packages/
│   └── shared/             # Tipe & utilitas bersama (@epms/shared)
├── docs/
│   └── architecture.md
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

---

## Teknologi

| Layer | Teknologi |
|---|---|
| Package manager | pnpm 11 (workspace monorepo) |
| Bahasa | TypeScript 5.9 (strict) |
| API | Express 4, Helmet, CORS, express-rate-limit |
| ORM | Prisma 6 |
| Database | MySQL 8.4 InnoDB |
| Autentikasi | JWT (jsonwebtoken) + Argon2id |
| Validasi | Zod 4 |
| Dokumentasi API | Swagger UI (`/api/v1/docs`) |
| Web Admin | Next.js 15 (App Router) + Tailwind CSS 4 |
| Mobile | Expo (Android, `id.epms.crew`) |
| Testing | Vitest |
| Formatter | Prettier |

---

## Prasyarat

- **Node.js** ≥ 20.19.0
- **pnpm** 11 — `npm i -g pnpm@11`
- **MySQL 8.4** yang sedang berjalan (contoh: [Laragon](https://laragon.org/))
- *(Opsional)* Android Studio + emulator untuk pengembangan crew-mobile

---

## Memulai

### 1. Clone & install dependensi

```bash
git clone <url-repo>
cd "Sistem Manajemen Produksi Event"
pnpm install
```

### 2. Konfigurasi variabel lingkungan

```bash
# Salin file contoh ke root dan ke services/api
cp .env.example .env
cp .env.example services/api/.env
```

Edit kedua file `.env` sesuai konfigurasi lokal (lihat [Variabel Lingkungan](#variabel-lingkungan)).

### 3. Siapkan database

```bash
# Buat database di MySQL terlebih dahulu
# mysql -u root -e "CREATE DATABASE event_production_dev;"

# Jalankan migrasi Prisma
pnpm db:migrate

# (Opsional) Isi data awal
pnpm db:seed
```

### 4. Jalankan server pengembangan

```bash
# Jalankan API (port 4000)
pnpm dev:api

# Jalankan web admin (port 3000) — di terminal terpisah
pnpm dev:web
```

Akses:
- Web Admin: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger Docs: `http://localhost:4000/api/v1/docs`
- Health check: `http://localhost:4000/health`

---

## Variabel Lingkungan

Salin `.env.example` ke `.env` di root dan di `services/api/`. Nilai berikut wajib diisi:

| Variabel | Keterangan | Contoh |
|---|---|---|
| `NODE_ENV` | Lingkungan runtime | `development` |
| `API_PORT` | Port Express | `4000` |
| `API_PREFIX` | Prefix route API | `/api/v1` |
| `CORS_ORIGIN` | Origin yang diizinkan (dipisah koma) | `http://localhost:3000` |
| `DATABASE_URL` | Connection string MySQL (Prisma) | `mysql://root@127.0.0.1:3306/event_production_dev` |
| `DATABASE_URL_TEST` | Connection string database test | `mysql://root@127.0.0.1:3306/event_production_test` |
| `JWT_ACCESS_SECRET` | Secret untuk access token (min. 32 karakter) | *(string acak panjang)* |
| `JWT_REFRESH_SECRET` | Secret untuk refresh token | *(string acak panjang)* |
| `JWT_ACCESS_EXPIRES_IN` | Masa berlaku access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Masa berlaku refresh token | `7d` |
| `NEXT_PUBLIC_API_URL` | URL API untuk Next.js | `http://localhost:4000/api/v1` |
| `EXPO_PUBLIC_API_URL` | URL API untuk Expo | `http://localhost:4000/api/v1` |

> ⚠️ **Jangan commit file `.env`** yang berisi secret nyata ke repositori.

---

## Perintah Tersedia

### Pengembangan

```bash
pnpm dev:api          # Jalankan API dalam mode watch (tsx)
pnpm dev:web          # Jalankan web admin Next.js
```

### Build

```bash
pnpm build            # Build semua package
```

### Kualitas kode

```bash
pnpm typecheck        # Cek tipe TypeScript di semua package
pnpm lint             # Lint semua package
pnpm format           # Format kode dengan Prettier
pnpm format:check     # Cek format tanpa mengubah file
pnpm test             # Jalankan semua test (Vitest)
```

### Database

```bash
pnpm db:generate      # Generate Prisma Client
pnpm db:migrate       # Buat & jalankan migrasi baru (dev)
pnpm db:migrate:deploy # Jalankan migrasi di production
pnpm db:seed          # Isi data awal (seed)
pnpm db:studio        # Buka Prisma Studio
```

---

## API Endpoints

Dokumentasi interaktif lengkap tersedia di `/api/v1/docs` (Swagger UI) saat server berjalan.

### Health

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/health` | Status server & koneksi database |
| `GET` | `/api/v1/health` | (sama, dengan prefix) |

### Auth

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Login, rate-limited 10 req/menit per IP |
| `POST` | `/api/v1/auth/refresh` | Public | Perbarui access token |
| `POST` | `/api/v1/auth/logout` | 🔒 Bearer | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | 🔒 Bearer | Data pengguna yang sedang login |

### Users

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/users` | 🔒 ADMIN | Daftar semua pengguna |
| `POST` | `/api/v1/users` | 🔒 ADMIN | Buat pengguna baru |
| `GET` | `/api/v1/users/:id` | 🔒 ADMIN | Detail pengguna |
| `PATCH` | `/api/v1/users/:id` | 🔒 ADMIN | Perbarui pengguna |
| `DELETE` | `/api/v1/users/:id` | 🔒 ADMIN | Hapus / nonaktifkan pengguna |

### Events

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/events` | 🔒 Bearer | Daftar event |
| `POST` | `/api/v1/events` | 🔒 ADMIN | Buat event baru |
| `GET` | `/api/v1/events/:id` | 🔒 Bearer | Detail event |
| `PATCH` | `/api/v1/events/:id` | 🔒 ADMIN | Perbarui event |
| `DELETE` | `/api/v1/events/:id` | 🔒 ADMIN | Hapus event |

### Equipment

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/equipment` | 🔒 Bearer | Daftar peralatan |
| `POST` | `/api/v1/equipment` | 🔒 ADMIN | Tambah peralatan |
| `GET` | `/api/v1/equipment/:id` | 🔒 Bearer | Detail peralatan |
| `PATCH` | `/api/v1/equipment/:id` | 🔒 ADMIN | Perbarui peralatan |
| `GET` | `/api/v1/equipment/categories` | 🔒 Bearer | Daftar kategori |
| `POST` | `/api/v1/equipment/categories` | 🔒 ADMIN | Tambah kategori |

### Allocations & Assignments (nested under Events)

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/events/:eventId/allocations` | 🔒 Bearer | Alokasi peralatan untuk event |
| `POST` | `/api/v1/events/:eventId/allocations` | 🔒 ADMIN | Alokasikan peralatan ke event |
| `GET` | `/api/v1/events/:eventId/assignments` | 🔒 Bearer | Penugasan kru untuk event |
| `POST` | `/api/v1/events/:eventId/assignments` | 🔒 ADMIN | Tugaskan kru ke event |

---

## Skema Database

Diagram entitas utama:

```
users ──< crew_profiles ──< crew_assignments >── events
  │                                                 │
  │                                    equipment_allocations >── equipment
  │                                                               │
  └── audit_logs                               equipment_categories
  └── refresh_tokens
  └── idempotency_keys
  └── event_status_history >── events
```

### Enum utama

| Enum | Nilai |
|---|---|
| `UserRole` | `ADMIN`, `CREW` |
| `EventStatus` | `DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `EquipmentCondition` | `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `UNUSABLE` |
| `AllocationStatus` | `PENDING`, `ACTIVE`, `CANCELLED` |
| `CrewJobStatus` | `ASSIGNED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED` |

---

## Autentikasi

Sistem menggunakan **JWT dual-token**:

- **Access Token** — berlaku **15 menit**, dikirim di header `Authorization: Bearer <token>`
- **Refresh Token** — berlaku **7 hari**, dirotasi setiap refresh dan disimpan hash-nya di tabel `refresh_tokens`

Password di-hash menggunakan **Argon2id**.

Terdapat dua middleware utama:
- `authenticate` — validasi Bearer token pada route yang dilindungi
- `requireRole('ADMIN')` — RBAC, memastikan hanya ADMIN yang bisa mengakses route tertentu

Setiap login sukses dicatat di tabel `audit_logs`.

---

## Kontribusi

1. Buat branch baru dari `main`: `git checkout -b feat/nama-fitur`
2. Pastikan `pnpm typecheck` dan `pnpm test` lulus sebelum commit
3. Format kode: `pnpm format`
4. Buat Pull Request dengan deskripsi perubahan yang jelas