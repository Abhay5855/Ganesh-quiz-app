# Ganesh Festival Live Quiz

One-time company event quiz for ~120–130 concurrent participants.

**Stack:** React Router v8 Framework Mode · React 19 · TypeScript · Tailwind v4 · Supabase · dnd-kit · Vercel

## Setup

1. **Apply database schema** (manual)

   - Open Supabase → SQL Editor
   - Run [`supabase/schema.sql`](supabase/schema.sql)
   - Optionally run [`supabase/seed.sql`](supabase/seed.sql)

2. **Create admin user**

   - Auth → Users → Add user (email/password)
   - Insert admin row:

   ```sql
   insert into public.admins (user_id)
   values ('<auth.users.id>');
   ```

3. **Env vars**

   ```bash
   cp .env.example .env
   ```

   Set:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   Never put `SUPABASE_SERVICE_ROLE_KEY` in `VITE_*` or client code.

4. **Install & run**

   ```bash
   pnpm install
   pnpm dev
   ```

## Surfaces

| URL | Who |
|-----|-----|
| `/` | Participants enter PIN |
| `/join/:pin` | Display name → `join_game` RPC |
| `/play/:gameId` | Live participant UI |
| `/admin/login` | Admin/host login |
| `/admin` | Quiz CRUD |
| `/host` | Create live game |
| `/host/game/:gameId` | Host control panel |

## Deploy (Vercel)

1. Push repo to GitHub
2. Import project in Vercel (framework: React Router / Vite)
3. Set env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy

Confirm Realtime is enabled for `games` and `players` after schema apply.

## Event-day checklist

1. Admin creates/publishes quiz with all questions
2. Host starts game → show PIN on projector
3. Dry run with 3–5 phones through join → answer → reveal → leaderboard
4. Optional: open 20–30 tabs and submit on one question (load smoke test)
5. Keep host console open; do not refresh mid-transition if avoidable

## Engineering rules

See [`AGENTS.md`](AGENTS.md).

## Scripts

- `pnpm dev` — local dev
- `pnpm build` — production build
- `pnpm typecheck` — typegen + tsc
- `pnpm start` — serve production build
