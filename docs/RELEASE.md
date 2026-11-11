# Studio release checklist

**Status (2026-11-10): built and tested on the staging Supabase project only.** Nothing has been
deployed, and no production database, Auth, Storage or hosting setting has been changed. Production
needs your explicit go-ahead at each step below.

## What's being released

A public Case Study Studio at `/studio`: anyone can register (password with email confirmation, or
email code, one account per email) and gets one private workspace for case studies and media.
Nothing in a workspace is ever public. There are no owner or admin accounts, and the former
single-owner portfolio (`/work`, `/write`, side work, publishing) has been removed.

Services: Next.js frontend, Express data API (only holder of the Supabase service-role key), Django
auth service (accounts, codes, JWTs), Supabase Postgres + Storage.

## Blockers: do these before production

1. **Rotate the staging secrets that were pasted into chat**: the Supabase secret key (`sb_secret_…`)
   and the database password. Create new ones in Supabase, delete the old, update `.env` files.
2. **Real email delivery.** Set `SMTP_HOST/PORT/USER/PASSWORD` and `EMAIL_FROM` in Django with a
   transactional provider (Postmark, Resend, SES…), and set up SPF/DKIM for the sending domain.
   Gmail caps at about 500 emails a day. The console email backend prints sign-in codes to the log:
   **never run it in production.**
3. **Bot protection on sign-up and code requests.** Only rate limits exist today (per email and per IP).
   Add a CAPTCHA (e.g. Cloudflare Turnstile) to `/studio/signup` and the "Email me a code" forms, verified
   in Django, before opening registration publicly.
4. **Region and connections.** Supabase is in Sydney (ap-southeast-2); from elsewhere each call took 1–5 s.
   Deploy Django and Express in the same region and keep DB connections open (gunicorn workers with
   `conn_max_age`; if you use Supabase's transaction pooler on port 6543, set
   `DISABLE_SERVER_SIDE_CURSORS = True` in Django).
5. **Old portfolio data in production.** If the production project still has the portfolio's
   `case_studies`, `assets`, `side_work` rows or `case-study-media` files, export what you want to keep
   and delete them. `0009` refuses to run until they're empty, and it never deletes data itself.

## Production configuration

| Where | Setting |
|---|---|
| All three | New random `JWT_SECRET` (48+ bytes) and `AUTH_SERVICE_KEY` (32+ bytes), identical everywhere; never reuse staging values |
| Django | `DJANGO_DEBUG=false`, new `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_SSL_REDIRECT=true`, `DATABASE_URL`, `DJANGO_DB_SCHEMA=django`, `FRONTEND_URL=https://<site>`, SMTP settings |
| Express | `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CORS_ORIGIN=https://<site>` |
| Next.js | `API_URL`, `AUTH_URL` (server-only, HTTPS), `JWT_SECRET`, `AUTH_SERVICE_KEY`. No Supabase keys or URLs. |
| Supabase → Auth | Supabase Auth is no longer used: turn off "Allow new users to sign up" so nobody can create Supabase Auth users |
| Supabase → Database | Point-in-time recovery or a fresh backup before migrating |
| Supabase → Storage | Confirm `studio-private-media` is the only bucket, private, with **no** policies |

## Deployment order

1. Back up the production database and take a Storage inventory.
2. SQL migrations `0001`–`0004` (skip any already applied).
3. `cd backend/django && python manage.py migrate` (creates the `django` schema tables).
4. SQL migrations `0005`–`0009`, then delete the empty `case-study-media` bucket (see `supabase/README.md`).
5. Deploy Django, then Express, then the Next.js app.
6. Check `/work`, `/write` and the old `/api/public`, `/api/studio` routes return 404.
7. Register two test accounts in production, check each sees only its own workspace, then delete both
   from Settings.
8. Open registration only after the CAPTCHA (blocker 3) is live.

## Checks

```bash
scripts/security-suite.sh
```
```bash
scripts/security-suite.sh /path/to/django-console.log
```
The second form runs the live two-account tests: **staging only**. Coverage per acceptance test is
in `supabase/tests/README.md`.

## Rollback

- Roll back the apps, not the data. Leave the new tables, the `django` schema and the private bucket
  in place until user data has been safely preserved.
- Never edit earlier migrations, and don't recreate the portfolio tables or public bucket as a shortcut.
- On a security defect, take `/studio` offline (for example, redirect `/studio/*` to a maintenance page
  in `proxy.ts`). Never fall back to public reads.
- Each change is independent: the apps, migrations `0005`–`0009`, the Django schema, and Supabase settings.

## Logging and monitoring

- Don't log document contents, OTP codes, passwords, tokens, signed upload URLs or the service key.
  Django logs only "account deleted" and send failures; Express logs only unexpected errors.
- Watch for 429s (abuse), 502s from Express (Supabase trouble), and failed storage purges.

## Known limitations (by design for this release)

- No teams, sharing, public profiles or publishing for Studio documents.
- Not end-to-end encrypted: the project's administrators, and the Express API's service role, can
  technically read Studio data. Say so in the privacy wording.
- Express uses the service-role key for user requests (the plan's preferred design was per-user
  Supabase sessions with RLS). The trade-off came from choosing Django for login. It's mitigated by
  owner-scoped queries, save-time path validation, deny-all RLS with no grants, and ownership
  constraints and triggers in the database.
- Access tokens are stateless and last 15 minutes. After a password change or account deletion, an
  already-issued access token stays valid until it expires, but a deleted account's token reaches
  nothing, and refresh tokens stop working at once.
- One-time signed upload links last up to 2 hours (Supabase default). They can only create one new
  object at a path the API chose, and can't read or overwrite anything.
- Tokens use HS256 with a shared secret. Moving to RS256 (Django signs, others verify with a public
  key) would remove the secret from Express and Next.js.
