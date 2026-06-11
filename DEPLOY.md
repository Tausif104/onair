# Deploying to Vercel

The app uses **Postgres** (serverless filesystems are ephemeral, so SQLite won't
persist). Prisma 7 connects through the `@prisma/adapter-pg` driver adapter.

## 1. Create a Postgres database
Use any managed Postgres — **Neon**, **Supabase**, or **Vercel Postgres**.
Copy its connection string. For serverless, prefer the **pooled** URL
(Neon: the `-pooler` host; Supabase: the pgBouncer/"Transaction" URL).

```
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

## 2. Import the repo into Vercel
- New Project → import this Git repo. Framework: **Next.js** (auto-detected).
- No special build settings needed — `vercel-build` runs
  `prisma migrate deploy && next build`, so the schema is applied on every deploy.

## 3. Environment variables (Project → Settings → Environment Variables)
| Key | Value |
|-----|-------|
| `DATABASE_URL` | your pooled Postgres connection string |
| `AUTH_SECRET` | 32+ random bytes — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DEFAULT_PLAYLIST_URL` | *(optional)* override the default channel source |

Add them for **Production** (and Preview/Development if you want previews to work).

## 4. Deploy
Push to the default branch (or click Deploy). On build Vercel will:
1. `npm install` → `postinstall` runs `prisma generate`
2. `vercel-build` → `prisma migrate deploy` (applies `prisma/migrations`) → `next build`

## Local development
Local now uses Postgres too (prod parity). Point `.env`'s `DATABASE_URL` at a
Neon/Supabase DB or a local Postgres, then:

```sh
npm install
npx prisma migrate deploy      # or: npx prisma migrate dev
npm run dev
```

## Notes
- The `/api/proxy` route and Server Actions run on the **Node.js runtime** (required
  for `pg` + Prisma). They are not Edge-compatible.
- Rotating `AUTH_SECRET` invalidates all existing sessions.
- We never host or bundle streams — users supply playlists; the proxy is a generic
  CORS relay (see `PLAN.md` §2).
