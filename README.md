# Write studio

The private case-study and side-work studio (`/write`) from Ravi Kumar's portfolio, split into
three services over one Supabase project:

```
 Browser ──► frontend/ (Next.js 16 + React 19)            httpOnly cookies: studio_access, studio_refresh
               │  server actions & server components only — the browser never calls the backends
               ├──► backend/django/  (Django)  POST /api/auth/request-code | verify-code | refresh | logout
               │       sign-in codes by email, issues JWTs (HS256, JWT_SECRET)     tables in Postgres schema `django`
               └──► backend/express/ (Express 5) /api/public/*  (published content, download requests)
                       verifies the Django JWT ─► /api/studio/*  (case studies, assets, side work)
                       Supabase service-role key ─► Supabase Postgres + Storage (case-study-media)
 Browser ──► Supabase Storage directly, only to PUT a file to a one-time signed upload URL from Express
```

| Folder | What it is |
|---|---|
| `frontend/` | The Next.js app: the studio UI, the shared case-study renderer, `src/proxy.ts` (guards `/write`, refreshes tokens). Talks to the backends from the server only. |
| `backend/express/` | The data API (TypeScript). The only service holding the Supabase service-role key. |
| `backend/django/` | The auth service. Owner-only email code sign-in, JWT access (15 min) and refresh (30 days, rotated, revocable) tokens. |
| `packages/shared/` | `@studio/shared`: types, block validation, publish checks, embeds, the case-study template, token constants. Used by both the frontend and Express, so the API enforces the same rules as the editor. |
| `supabase/` | SQL migrations (run 0001 → 0004 in order) and the studio's feature guide. |

## Run it locally

Needs Node 20+ and Python 3.9+.

1. **Secrets.** Generate two values and use them in all three `.env` files:
   ```bash
   openssl rand -base64 48   # JWT_SECRET
   ```
   ```bash
   openssl rand -base64 32   # AUTH_SERVICE_KEY
   ```
2. **Supabase.** In the SQL editor run `supabase/migrations/0001` … `0004` in order (0004 switches
   writes to the service role and creates the `django` schema).
3. **Env files.** Copy and fill in each example:
   `frontend/.env.example → frontend/.env.local`, `backend/express/.env.example → backend/express/.env`,
   `backend/django/.env.example → backend/django/.env`. `ADMIN_EMAIL` must be the same in Django and Express.
4. **Install.**
   ```bash
   npm install
   ```
   ```bash
   cd backend/django && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python manage.py migrate
   ```
5. **Start the three services** (each in its own terminal), then open http://localhost:3000/write:
   ```bash
   npm run dev:auth
   ```
   ```bash
   npm run dev:api
   ```
   ```bash
   npm run dev:web
   ```
   Without `GMAIL_USER`, Django prints the sign-in code to its console.

`npm run typecheck` checks all TypeScript workspaces; `npm run build` builds Express and Next.js.

## Security model

- Only the Next.js server talks to Django (it must send `X-Service-Key`) and to `/api/studio/*`.
- Tokens live in httpOnly, `SameSite=Lax`, `Secure` (in production) cookies scoped to `/write`.
- The proxy verifies the access token and refreshes it with Django when it expires; every Express
  studio route verifies it again (signature, issuer, audience, type, role and `ADMIN_EMAIL`).
- Refresh tokens rotate on every use and are revoked on sign-out.
- Supabase: the service-role key exists only in Express. After 0004 no browser can write to the
  tables; public reads (published case studies, side work, media) stay as before. Django's tables
  live in the `django` schema, which the Supabase REST API doesn't expose.

## Not in this folder

This is an excerpt of the full portfolio. The public pages (`/`, `/work`, `/work/[slug]`), the root
layout, `src/theme/portfolioTheme.ts`, the home/navigation components and `public/` live in the full
site; they keep working with the same `lib/caseStudies/queries.ts` and `lib/sideWork/queries.ts`
functions, which now read from the Express API.
# write-studio
