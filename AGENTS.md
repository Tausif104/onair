<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — working rules for this repo

Read this + `PLAN.md` (the source of truth) before each session.

## Hard content rules (PLAN §2)
- **No hardcoded streams.** Never commit/embed stream or playlist URLs for any channel
  (especially licensed: FIFA, T Sports, Toffee, GTV, …).
- **User-supplied playlists only** — stored as the user's own data.
- The proxy (`app/api/proxy/route.ts`) is a **generic CORS fetch relay**, not a
  restreaming service or curated catalog. Keep it generic; keep the SSRF guard.
- For premium events, point users to the official rights holder.

## Library docs (PLAN §3)
- Append **`use context7`** before writing code against Next.js 16, Prisma 7, Tailwind v4,
  shadcn/ui, hls.js, next-themes, or jose. Don't generate library code from memory.
- Context7 MCP is optional; not configured in this checkout.

## Gotchas (PLAN §9)
- **Prisma 7 is Rust-free** → needs a driver adapter. Uses `@prisma/adapter-pg` + `pg`
  (Postgres everywhere — local + prod). See `DEPLOY.md`.
- **Connection URL** lives in `prisma.config.ts` (`datasource.url`), NOT `schema.prisma`.
- Generator kept as **`prisma-client-js`** (Turbopack-safe). Output: `@prisma/client`.
- **PrismaClient singleton** in `lib/prisma.ts` (dev hot-reload).
- **`cookies()` is async** in Next 16 — `await cookies()`. Set/delete only in a Server
  Action or Route Handler.
- Auth: **jose** (not jsonwebtoken) + **bcryptjs**. JWT in httpOnly cookie, backed by a
  `Session` row so logout/revoke works. Secret in `AUTH_SECRET` (env, 32+ bytes).
- **hls.js**: Safari plays HLS natively; Chrome/Firefox need hls.js. Ship both paths.
- Route streams/playlists through the proxy for CORS.

## Conventions (PLAN §10)
- TypeScript everywhere; Server Actions for mutations (`app/actions/`); data access in `lib/`.
- Tailwind utilities + shadcn defaults; minimal custom CSS.
- **Mobile-first.** Test at 360 / 768 / 1280px. No horizontal scroll. Touch targets ≥44px.
- Commit per phase.

## Local setup
```sh
npm install
npx prisma migrate deploy    # applies prisma/migrations to your Postgres
npm run dev
```
`.env` needs `DATABASE_URL` (Postgres) and `AUTH_SECRET`. See `.env.example` / `DEPLOY.md`.
