# Case Study Studio

A public, multi-user studio for writing design case studies. Anyone can register; every account gets
**one private personal workspace**, and nobody else can see or reach its documents or uploaded media.
There are no owner or admin accounts, no public pages of user content, and no publishing.

```
 Browser ──► frontend/ (Next.js 16 + React 19)              httpOnly cookies on /studio: studio_access, studio_refresh
               │  pages, server actions, /studio/files — the browser never calls the backends directly
               ├──► backend/django/  accounts: password + confirmation, email codes, reset, delete; issues JWTs
               │                     (tables in the private Postgres schema `django`)
               └──► backend/express/ /api/app/*: workspace, case studies, media, account cleanup
                       verifies the JWT, scopes every query to that user ─► Supabase Postgres + private Storage
 Browser ──► Supabase Storage only to PUT one file to a one-time upload link from Express
```

| Folder | What it is |
|---|---|
| `frontend/` | The Studio UI: sign-in/up and recovery, dashboard, the case-study editor (Tiptap), private preview, media library, settings. `src/proxy.ts` guards `/studio`. No Supabase keys. |
| `backend/django/` | Accounts and tokens: email + password (confirmed by link) or email code, one account per email; reset, password change, account deletion; rate limits. |
| `backend/express/` | The data API (TypeScript). The only holder of the Supabase service-role key; every route needs a token and touches only the caller's rows and files. |
| `packages/shared/` | `@studio/shared`: Studio types, the block/document schema helpers, save-time validation, token constants. |
| `supabase/` | SQL migrations (`0001`–`0009`, see `supabase/README.md`) and the tests. |
| `docs/` | `master-plan.v2.json` (the implementation contract) and `RELEASE.md` (going to production). |

## Pages

`/` → `/studio`. Public: `/studio/login`, `/studio/signup`, `/studio/forgot-password`,
`/studio/update-password`, `/studio/confirm`. Signed in: `/studio` (your drafts), `/studio/case-studies`
(drafts / archived), `/studio/case-studies/new`, `/studio/case-studies/[id]` (editor),
`/studio/case-studies/[id]/preview` (private preview), `/studio/media`, `/studio/settings`,
`/studio/files/<path>` (your private files).

## Run it locally

Needs Node 20+ and Python 3.9+.

1. **Secrets.** Generate two values and use them in all three `.env` files:
   ```bash
   openssl rand -base64 48   # JWT_SECRET
   ```
   ```bash
   openssl rand -base64 32   # AUTH_SERVICE_KEY
   ```
2. **Env files.** Copy and fill in `frontend/.env.example → frontend/.env.local`,
   `backend/express/.env.example → backend/express/.env`, `backend/django/.env.example → backend/django/.env`.
3. **Install.**
   ```bash
   npm install
   ```
   ```bash
   cd backend/django && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   ```
4. **Database** (staging first): follow the order in `supabase/README.md`.
5. **Start the three services** (each in its own terminal), then open http://localhost:3000:
   ```bash
   npm run dev:auth
   ```
   ```bash
   npm run dev:api
   ```
   ```bash
   npm run dev:web
   ```
   Without SMTP settings, Django prints sign-in codes and links to its console.

## Checks

```bash
scripts/security-suite.sh
```
Add the Django console log path to also run the live two-account tests against **staging**
(`supabase/tests/README.md` maps every acceptance test). Going live: `docs/RELEASE.md`.

## Security model

- **One rule for everyone.** Every account is an ordinary user; access is always "your own workspace only".
- Only the Next.js server talks to Django (with `X-Service-Key`) and Express (with the user's token).
- Tokens live in httpOnly, `SameSite=Lax`, `Secure` (production) cookies scoped to `/studio`. The proxy
  refreshes them; refresh tokens rotate and are revoked on sign-out, password change and deletion.
- Express scopes every query to the token's user id, never an id from the request, and refuses to save a
  document that references any file outside the user's own folder.
- Supabase: the Studio tables have row-level security on with no policies and no grants for `anon` or
  `authenticated`, and the one bucket is private with no policies, so Supabase's public API reaches
  nothing. Database constraints and triggers stop rows being moved to or pointed at another workspace.
- Files are served only through `/studio/files`, which checks the session on every request. There are
  no public or signed read links.
