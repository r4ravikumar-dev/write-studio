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
Do the steps in order. Nothing here touches the staging project.

## 1. Production Supabase project

1. Supabase → New project, region **Sydney (ap-southeast-2)**. Save the DB password in a password manager.
2. Authentication → Sign In / Providers: turn **off** "Allow new users to sign up" (Supabase Auth isn't used).
3. SQL Editor: run `supabase/migrations/0001` … `0004` in order.
4. Django tables (from your machine, with the **session pooler** URL, port 5432):
   ```bash
   cd backend/django && DATABASE_URL='<prod session pooler URL>' DJANGO_DEBUG=true .venv/bin/python manage.py migrate
   ```
5. SQL Editor: run `0005` … `0013` in order (the order and notes are in `supabase/README.md`).
   On a fresh project `0009` has nothing to remove; the `case-study-media` bucket may not exist.
6. Storage: confirm `studio-private-media` is the only bucket, private, with no policies.
7. Note down: Project URL, the **secret** API key (`sb_secret_…`), and the **transaction pooler**
   connection string (Connect → Transaction pooler, port **6543**) with the password filled in.

## 2. Secrets (new, never the staging ones)

```bash
python3 -c "import secrets; print('JWT_SECRET', secrets.token_urlsafe(64)); print('AUTH_SERVICE_KEY', secrets.token_urlsafe(48)); print('DJANGO_SECRET_KEY', secrets.token_urlsafe(64))"
```
`JWT_SECRET` must be identical in all three projects; `AUTH_SERVICE_KEY` in the site and auth projects.

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

From `docs/RELEASE.md`: add a CAPTCHA to sign-up and the code forms (only rate limits exist today),
and rotate the **staging** Supabase secret key and DB password that were pasted in chat.

## Notes

- Region: each `vercel.json` sets `"regions": ["syd1"]` (Hobby allows one region; that's this one).
- Django on Vercel uses Supabase's transaction pooler (port 6543): `settings.py` then turns off
  server-side cursors; the `search_path=django` option still applies (checked on staging).
- The API's `public/` folder holds only `robots.txt`, so Vercel never serves the source as static files.
- Request bodies over 4.5 MB are refused by Vercel; documents are capped at 2 MB and files go
  straight to Supabase Storage through signed URLs, so neither is affected.
- Long-running hosting still works: `npm start` (Express) and gunicorn (Django) are unchanged.
