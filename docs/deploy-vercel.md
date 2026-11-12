# Going live on Vercel (v1 = `main`)

Production showed **"Connect the backends to start writing"** because only the Next.js app was
deployed. The studio needs three Vercel projects from the same GitHub repo, all in **Sydney
(`syd1`)**, next to the Supabase database:

| Vercel project | Root Directory | What it runs | Config in repo |
|---|---|---|---|
| `write-studio` (exists) | *(repo root)* | Next.js site | `vercel.json` |
| `write-studio-api` (new) | `backend/express` | Express data API (one function, `api/index.js`) | `backend/express/vercel.json` |
| `write-studio-auth` (new) | `backend/django` | Django auth service (WSGI, Python 3.12) | `backend/django/vercel.json`, `.python-version` |

Browsers only ever talk to the Next.js site; it calls the other two server-to-server.
Do the steps in order.

## 1. Supabase (the existing project is production)

Production uses the existing project `psfjngzdldqhvmabgvos` (Sydney), the one development used.
It already has every migration this code needs (`0001`–`0014` and Django's), so **no migration
runs**. The test accounts were removed on 2026-11-12.

1. **Rotate the secrets first**: they were pasted in chat during development. Project Settings →
   API Keys: create a new secret key and delete the old one; Database → reset the database password.
   Then put the new values in `backend/express/.env` and `backend/django/.env` for local work.
2. Authentication → Sign In / Providers: turn **off** "Allow new users to sign up" (Supabase Auth isn't used).
3. Database → Backups: check daily backups are on (point-in-time recovery if your plan allows).
4. Storage: confirm `studio-private-media` is the only bucket, private, with no policies.
5. Note down: Project URL, the new **secret** API key (`sb_secret_…`), and the **transaction pooler**
   connection string (Connect → Transaction pooler, port **6543**) with the new password filled in.

### One database for development and production

Anything run locally now writes to production:
- **Never run the live tests** against it: `scripts/security-suite.sh <django-log>` and the
  `supabase/tests/test_*_live.py` / `scripts/e2e/` suites create and delete accounts. The offline
  form `scripts/security-suite.sh` (no argument) is safe.
- A new migration takes effect for production as soon as you run it, so only run it together with
  the code that needs it, after a backup, and keep the matching file in `supabase/rollback/`.
- Locally you sign in as yourself and edit your real documents.

If that becomes a problem, a separate free Supabase project for development is the fix; nothing
in the code changes, only the `.env` files.

## 2. Secrets (new, never the development ones)

```bash
python3 -c "import secrets; print('JWT_SECRET', secrets.token_urlsafe(64)); print('AUTH_SERVICE_KEY', secrets.token_urlsafe(48)); print('DJANGO_SECRET_KEY', secrets.token_urlsafe(64))"
```
`JWT_SECRET` must be identical in all three projects; `AUTH_SERVICE_KEY` in the site and auth projects.
Changing `JWT_SECRET` signs everyone out once, which is fine before launch.

## 3. Email (Resend, Postmark or SES)

Create the provider account, add and verify your sending domain (its SPF/DKIM DNS records), and
create an SMTP credential. For Resend: host `smtp.resend.com`, port `587`, user `resend`, password =
an API key. Without this, sign-up and sign-in codes can't be delivered.

## 4. Auth project (`write-studio-auth`)

Vercel → Add New → Project → this repo → **Root Directory `backend/django`** (framework is detected
from `manage.py`). Environment variables (Production):

| Name | Value |
|---|---|
| `DJANGO_DEBUG` | `false` |
| `DJANGO_SECRET_KEY` | from step 2 |
| `DJANGO_ALLOWED_HOSTS` | `write-studio-auth.vercel.app` (the project's production domain) |
| `DJANGO_SSL_REDIRECT` | `true` |
| `DATABASE_URL` | the **transaction pooler** URL (port 6543) |
| `DJANGO_DB_SCHEMA` | `django` |
| `JWT_SECRET`, `AUTH_SERVICE_KEY` | from step 2 |
| `FRONTEND_URL` | `https://<your site domain>` (links in emails) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | from step 3 |
| `EMAIL_FROM` | e.g. `Case Study Studio <studio@yourdomain.com>` |

Deploy, then check `https://<auth domain>/api/auth/health` returns OK.

## 5. API project (`write-studio-api`)

Add New → Project → this repo → **Root Directory `backend/express`**, Framework Preset **Other**
(the repo's `vercel.json` sets the build). Environment variables (Production):

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | production Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | production secret key |
| `JWT_SECRET` | from step 2 |
| `CORS_ORIGIN` | `https://<your site domain>` |

Deploy, then check `https://<api domain>/health` returns `{"ok":true}` and
`/api/app/workspace` returns 401 (signed out: correct).

## 6. Site project (existing `write-studio`)

Settings → Environment Variables (Production), then **Redeploy** (variables apply only to new deployments):

| Name | Value |
|---|---|
| `API_URL` | `https://<api domain>` |
| `AUTH_URL` | `https://<auth domain>` |
| `JWT_SECRET`, `AUTH_SERVICE_KEY` | from step 2 |

No Supabase keys or URLs here.

## 7. Smoke test

1. Open the site: the sign-in page appears (not "Connect the backends").
2. Sign up with a real address, receive the email, confirm, sign in.
3. Create a document, upload an image, reload: both are still there. Export PDF.
4. In a private window, sign up a second account: it sees an empty workspace.
5. Delete both test accounts from Settings.

## Before opening sign-ups publicly

From `docs/RELEASE.md`: add a CAPTCHA to sign-up and the code forms (only rate limits exist today).

## Notes

- Region: each `vercel.json` sets `"regions": ["syd1"]` (Hobby allows one region; that's this one).
- Django on Vercel uses Supabase's transaction pooler (port 6543): `settings.py` then turns off
  server-side cursors; the `search_path=django` option still applies (checked on staging).
- The API's `public/` folder holds only `robots.txt`, so Vercel never serves the source as static files.
- Request bodies over 4.5 MB are refused by Vercel; documents are capped at 2 MB and files go
  straight to Supabase Storage through signed URLs, so neither is affected.
- Long-running hosting still works: `npm start` (Express) and gunicorn (Django) are unchanged.
