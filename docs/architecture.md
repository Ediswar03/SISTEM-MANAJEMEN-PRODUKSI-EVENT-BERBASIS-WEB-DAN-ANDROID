# Architecture

## Implemented in Stage 2

- pnpm workspace monorepo
- Express API (`services/api`) with health check against MySQL
- Prisma schema and initial migration (after `prisma migrate`)
- Shared interval and status helpers (`packages/shared`)
- Next.js App Router shell (`apps/admin-web`) that only reports API health
- Crew mobile package placeholder that talks to the API URL, not MySQL

## Implemented in Stage 3

- JWT authentication (access token 15 min + refresh token 7 days)
- Argon2id password hashing for all user accounts
- Refresh token rotation with DB-side revocation (`refresh_tokens` table)
- `authenticate` middleware (Bearer token validation on protected routes)
- `requireRole` middleware (RBAC — ADMIN / CREW enforcement)
- Rate limiting on `POST /auth/login` (10 req/min per IP)
- Audit log entry on every successful login
- `GET /auth/me` protected endpoint

## Planned (not yet implemented)

- Event / equipment / crew CRUD
- Transactional reservation with `SELECT ... FOR UPDATE`
- Conflict detection at booking time (helpers already in `@epms/shared`)
- Admin design system, calendar, conflict UI
- Expo crew application screens (Stage 6)
- Concurrency test harness against live MySQL

## Runtime topology

```
admin-web (Next.js :3000) ──┐
                            ├── GET/POST /api/v1 ── Express (:4000) ── Prisma ── MySQL 8.4 InnoDB
crew-mobile (Expo, later) ──┘
```

Next.js API routes are **not** used as the system API.

## Time

Event instants are stored as UTC `DATETIME(3)`. Each event has an IANA `timezone` (default `Asia/Jakarta`) for display and civil-time input.
