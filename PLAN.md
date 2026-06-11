# PLAN.md — IPTV Web App (Next.js 16 + Prisma + shadcn)

> This file is the single source of truth for building this project with Claude Code.
> Read it at the start of every session. Build phase by phase, commit after each phase,
> and **always fetch current docs with Context7 before writing library code** (see §3).

---

## 1. Project Overview

A responsive **web IPTV player** that lets a user add their own playlist sources and
watch streams in the browser, with favorites and watch history synced to their account.

**The app is the player. The user supplies the content.** We do not bundle, host, or
hardcode any TV streams. The app reads M3U playlists the *user* provides and plays them.

### Goals
- Play HLS (`.m3u8`) streams reliably in all major browsers.
- Let users add/remove their own M3U playlist URLs.
- Browse channels by category, search, and mark favorites.
- Resume from watch history.
- Per-user data synced across devices (accounts).
- Clean, simple, **mobile-first** UI with light/dark mode.

---

## 2. Legal & Content Constraints (hard rules — do not break)

These are guardrails for every phase. If a task seems to violate them, stop and flag it.

1. **No hardcoded streams.** Never commit or embed stream URLs for any channel,
   especially licensed content (FIFA World Cup, T Sports, Toffee, GTV, etc.).
2. **User-supplied playlists only.** Stream/playlist URLs come from the user at runtime
   and are stored as *their* data.
3. **The proxy is a generic fetch relay, not a restreaming service.** It exists to solve
   CORS for the user's own playlists. Do not turn it into a curated stream catalog.
4. For premium events, the correct UX is to point users to the official rights holder —
   not to source the feed ourselves.

---

## 3. Context7 — use the latest library versions (required)

LLM training data goes stale. Library APIs (Next.js 16, Prisma 7, Tailwind v4, shadcn)
have all shipped breaking changes recently. **Before writing code against any library,
pull its current docs with Context7.**

### One-time setup (run in terminal)
```sh
# Local server (recommended). Get a free API key at context7.com/dashboard.
claude mcp add context7 -- npx -y @upstash/context7-mcp --api-key YOUR_API_KEY

# OR remote HTTP transport
claude mcp add --header "CONTEXT7_API_KEY: YOUR_API_KEY" --transport http context7 https://mcp.context7.com/mcp
```
Verify with `/mcp` inside a Claude Code session — `context7` should show "connected".
Requires Node.js 18+.

### How to use it
- Append **`use context7`** to any prompt that involves a library, e.g.
  *"Set up Prisma 7 with the pg driver adapter for Next.js 16. use context7"*
- Context7 exposes `resolve-library-id` and `get-library-docs`. Target a version by
  naming it in the prompt (e.g. "Tailwind v4", "Next.js 16", "Prisma 7").

### Rule for this project
Every phase below that touches **Next.js, Prisma, Tailwind, shadcn/ui, hls.js,
next-themes, or jose (JWT)** must fetch current docs via Context7 first. Do not generate
library code from memory.

---

## 4. Tech Stack

> Treat versions as "latest in this major" and confirm exact APIs via Context7.

| Layer            | Choice                                            |
|------------------|---------------------------------------------------|
| Framework        | **Next.js 16** (App Router, Turbopack, TypeScript)|
| Runtime          | Node.js 20.19+                                     |
| Language         | TypeScript 5.4+                                    |
| Mutations        | **Next.js Server Actions** (no REST layer)        |
| ORM              | **Prisma 7** (Rust-free + driver adapter)         |
| Database         | PostgreSQL (use SQLite locally if you prefer)     |
| Styling          | **Tailwind CSS v4**                               |
| Components       | **shadcn/ui (latest), default style**             |
| Theming          | next-themes (light + dark)                         |
| Video            | hls.js (+ native HLS fallback for Safari)         |
| Auth             | **Custom JWT auth** — `jose` (JWT) + `bcryptjs` (hash), httpOnly session cookie |
| Deploy           | Vercel + a managed Postgres (Neon/Supabase)       |

---

## 5. Architecture

```
Browser (client)
  └─ hls.js <video> player ............ plays streams
  └─ shadcn UI (channels, search, fav)  reads/writes via server actions

Next.js server
  └─ Server Actions ................... signup / login / logout / addPlaylist / toggleFavorite ...
  └─ Auth: jose-signed JWT in an httpOnly, secure, sameSite cookie (= the session)
  └─ /app/api/proxy/route.ts .......... generic CORS fetch relay for M3U + manifests
  └─ Prisma 7 (lib/prisma.ts) ......... PrismaClient singleton + pg adapter

PostgreSQL ............................ User, Session, Playlist, Favorite, WatchHistory
```

Design principle: **parse playlists live through the proxy; persist only user-owned
data** (playlist URLs, favorites, history). Do not store the whole parsed channel list.

---

## 6. Data Model (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client"        // ⚠ swap to "prisma-client-js" if Turbopack errors (see §9)
  output   = "../app/generated/prisma"
}
datasource db {
  provider = "postgresql"            // connection URL lives in prisma.config.ts (Prisma 7)
}

model User {
  id           String         @id @default(cuid())
  email        String         @unique
  name         String?
  passwordHash String         // bcrypt hash — never store plaintext
  playlists    Playlist[]
  favorites    Favorite[]
  history       WatchHistory[]
  sessions     Session[]
  createdAt    DateTime       @default(now())
}

// Optional but recommended: lets you revoke a session server-side
// (logout-everywhere, stolen-token). The JWT carries this session id (sid);
// verify the row still exists + isn't expired on each request.
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  @@index([userId])
}

model Playlist {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name   String
  url    String            // user-supplied M3U source
  createdAt DateTime @default(now())
}

model Favorite {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  logo      String?
  group     String?
  streamUrl String
  @@unique([userId, streamUrl])
}

model WatchHistory {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  streamUrl   String
  lastWatched DateTime @default(now())
  @@unique([userId, streamUrl])
}
```

---

## 7. UI / UX Requirements

**Mobile responsiveness is the top priority. The app must be perfect on phones.**
Use shadcn/ui defaults — do not over-design. Keep it simple and clean.

### Components (shadcn, default style)
- `Button`, `Input`, `Card`, `Dialog`, `Sheet` (mobile playlist/menu), `Tabs`,
  `ScrollArea`, `Skeleton` (loading), `Sonner`/`Toast`, `DropdownMenu` (theme toggle).

### Theming
- Implement light + dark via `next-themes` with shadcn's `ThemeProvider`.
- Add a theme toggle (system / light / dark) in the header.
- Respect `prefers-color-scheme` on first load; no flash of wrong theme (suppress
  hydration warning on `<html>`).

### Responsive rules (non-negotiable)
- **Mobile-first.** Design at 360px width first, then scale up with `sm:` `md:` `lg:`.
- **No horizontal scroll** at any width.
- Channel grid: 1 column on mobile → 2 (`sm`) → 3–4 (`md`/`lg`).
- **Bottom navigation bar** on mobile (Home / Favorites / Playlists / Settings);
  move to a top/side layout on desktop.
- Player: fills width on mobile, supports fullscreen and (where available) PiP.
- Touch targets ≥ 44×44px. Use `Sheet` for menus/dialogs on small screens.
- Test every screen at 360px, 768px, and 1280px before marking a phase done.

---

## 8. Build Phases

Do these in order. **Commit after each.** Start each library task with `use context7`.

### Phase 0 — Setup
- `npx create-next-app@latest` (App Router, TS, Tailwind, Turbopack).
- Configure Context7 (§3). Confirm `/mcp` shows connected.
- Add this PLAN.md and an `AGENTS.md` summarizing §2, §3, §9.
- **DoD:** dev server runs; Context7 connected.

### Phase 1 — UI shell + theming
- `npx shadcn@latest init` (default style). Add base components.
- Build responsive app shell: header (logo + theme toggle), mobile bottom nav,
  desktop layout. Wire `next-themes` light/dark. `use context7`.
- **DoD:** shell renders correctly at 360/768/1280px, theme toggle works, no layout shift.

### Phase 2 — Player core
- `'use client'` player component using **hls.js** with native-HLS fallback for Safari.
- Handle buffering, error recovery, quality levels, fullscreen. Hardcode one public
  test HLS stream for now. `use context7`.
- **DoD:** test stream plays in Chrome, Firefox, and Safari; responsive; fullscreen works.

### Phase 3 — Prisma 7
- Install `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`.
- Create `prisma.config.ts` (holds `DATABASE_URL`), schema (§6), `lib/prisma.ts`
  singleton with the pg adapter. Run first migration. `use context7`.
- **DoD:** `prisma migrate` succeeds; app builds under Turbopack (see §9 if it errors).

### Phase 4 — Auth (custom JWT + session cookie)
Roll our own — no Auth.js. Stateless JWT carried in an httpOnly cookie, backed by a
`Session` row so we can revoke. `use context7` for `jose` and the Next.js cookies API.
- Install `jose` (JWT sign/verify) and `bcryptjs` (password hashing).
- `lib/auth.ts`:
  - `hashPassword` / `verifyPassword` (bcryptjs).
  - `createSession(userId)` → create a `Session` row, sign a JWT with `jose`
    containing `{ sub: userId, sid: session.id }`, set it in an httpOnly cookie
    (`secure` in prod, `sameSite: "lax"`, `path: "/"`, expiry matching the session).
  - `getUserId()` → read the cookie, verify the JWT with `jose`, confirm the `Session`
    row still exists and isn't expired; return `userId` or `null`.
  - `destroySession()` → delete the `Session` row and clear the cookie.
- Server actions in `app/actions/auth.ts`: `signup`, `login`, `logout`
  (`'use server'`; validate input with zod; never log credentials).
- Store the signing secret in `AUTH_SECRET` (env, 32+ random bytes). Never commit it.
- Minimal sign-in / sign-up / sign-out UI (shadcn `Card` + `Input` + `Button`).
- **DoD:** signup→login sets an httpOnly cookie; `getUserId()` resolves it server-side;
  logout revokes the session (old cookie no longer authenticates); passwords are hashed.

### Phase 5 — Proxy + M3U parsing
- `/app/api/proxy/route.ts`: generic fetch relay for playlist + manifest (CORS fix).
  Validate destinations (no open relay). See §2.
- M3U parser → `{ name, logo, group, streamUrl }[]`. Unit-test malformed `#EXTINF`.
- **DoD:** a user-pasted M3U URL parses into a channel list.

### Phase 6 — Server actions
- `app/actions/`: `addPlaylist`, `removePlaylist`, `toggleFavorite`, `recordWatch`.
- `'use server'`, read session via `getUserId()`, `revalidatePath` after mutations.
  `use context7` for current Server Actions patterns.
- **DoD:** favorites/playlists/history persist per-user and survive reload.

### Phase 7 — Channel UI
- Responsive channel grid (§7), category filter (Tabs), search (Input), favorite
  toggle, playlist manager (Sheet on mobile). Loading skeletons.
- **DoD:** browse/search/favorite works; perfect at 360px; no horizontal scroll.

### Phase 8 — EPG (program guide)
- Parse XMLTV; show now/next per channel; simple guide view.
- **DoD:** now/next renders for channels that have EPG data.

### Phase 9 — Polish + deploy
- Resume last channel, PiP, error/empty states, Sonner toasts.
- Deploy to Vercel + managed Postgres. Set env vars. `postinstall: prisma generate`.
- **DoD:** production build deploys; full mobile pass at 360/768/1280px.

---

## 9. Known Gotchas (read before Phases 2–3)

- **Prisma 7 is Rust-free** → requires a driver adapter. Install `@prisma/adapter-pg`
  and `pg`; you cannot use just `@prisma/client`.
- **Connection URL moved** out of `schema.prisma` into **`prisma.config.ts`** in Prisma 7.
- **Turbopack + Prisma 7 generator:** the new `prisma-client` provider can cause
  module-resolution errors under Next.js 16's default Turbopack. If that happens, keep
  the **`prisma-client-js`** provider name as a workaround (or follow current Context7
  guidance). Don't fight the default blindly.
- **PrismaClient singleton** is required so dev hot-reload doesn't exhaust connections.
- **Next.js 16 renamed `middleware` → `proxy.ts`** (Node runtime only). Our CORS relay is
  a route handler, but know this if you add middleware-style logic.
- **hls.js:** Safari plays HLS natively; Chrome/Firefox need hls.js. Always ship the
  native fallback path.
- **CORS:** many playlists/streams block cross-origin fetches. Route them through the
  proxy (Phase 5), not direct browser fetch.
- **Server Actions** run on Node, not edge — fine for Prisma.
- **Auth / JWT:**
  - Use **`jose`**, not `jsonwebtoken` — jose is the Next.js-recommended, Web Crypto /
    edge-compatible library.
  - `cookies()` is **async** in Next.js 16 — `const store = await cookies()`. You can
    only set/delete cookies inside a Server Action or Route Handler, not during render.
  - Cookie flags: `httpOnly: true`, `secure: true` (prod), `sameSite: "lax"`,
    `path: "/"`. httpOnly means the token is never exposed to client JS (XSS-safer).
  - Keep `AUTH_SECRET` (32+ random bytes) in env; rotating it invalidates all sessions.
  - Stateless JWTs can't be revoked on their own — that's why we keep a `Session` row
    and check it each request. This makes logout-everywhere and token revocation work.
  - Always `bcryptjs.hash` passwords; never store or log plaintext.

---

## 10. Conventions

- TypeScript everywhere; no `any` without reason.
- Server Actions for all mutations; no ad-hoc API routes except the proxy.
- Co-locate actions in `app/actions/`, data access behind `lib/`.
- Tailwind utility classes only; shadcn defaults; minimal custom CSS.
- Commit per phase with a clear message; keep PLAN.md updated as the source of truth.
- Before any library code: **`use context7`**.
