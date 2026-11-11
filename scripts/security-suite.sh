#!/usr/bin/env bash
# Runs every Studio check, in order, and stops at the first failure.
#
#   scripts/security-suite.sh                 offline checks only (types, lint, builds, Django auth tests)
#   scripts/security-suite.sh <django-log>    + staging checks (schema tests and the live two-account tests)
#
# The live tests need Django :8000, Express :4000 and Next :3000 running against a STAGING Supabase
# project, with Django on the console email backend (no SMTP_HOST / GMAIL_USER) writing to <django-log>:
#   cd backend/django && .venv/bin/python manage.py runserver 8000 > /tmp/django.log 2>&1
# They create throwaway @example.test accounts and delete them. Never point this at production.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=backend/django/.venv/bin/python
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step 'No single-owner or portfolio code (SEC-015)'
# Application code only: migrations 0001-0004 are history (0009 removes what they made), and the
# tests/docs name these things on purpose to check they're gone.
if grep -rnE "ADMIN_EMAIL|is_cms_owner|requireOwner|getOwner|ownerEmail|role: 'owner'|'portfolio'|/write\b|write_access|case-study-media|publishCaseStudy" \
     frontend/src backend/express/src backend/django/accounts backend/django/config packages/shared/src \
     --include='*.ts' --include='*.tsx' --include='*.py' | grep -v '/tests.py:'; then
  echo 'Found single-owner or portfolio code (above).'; exit 1
fi
echo ok

step 'TypeScript (shared, Express, frontend)';  npm run typecheck --silent
step 'ESLint (frontend)';                       (cd frontend && npx eslint src)
step 'Express build';                           npm run build -w @studio/express-api --silent >/dev/null && echo ok
step 'Django checks';                           (cd backend/django && .venv/bin/python manage.py check)
step 'Django auth tests (offline, in-memory)';  (cd backend/django && .venv/bin/python manage.py test accounts)

if [[ $# -lt 1 ]]; then
  echo; echo 'Offline checks passed. Pass the Django console log path to also run the staging checks.'
  exit 0
fi
LOG="$1"
for url in http://localhost:8000/api/auth/health http://localhost:4000/health http://localhost:3000/studio/login; do
  curl -sf -o /dev/null "$url" || { echo "Not running: $url"; exit 1; }
done

step 'Schema: ownership, constraints, lockdown (SEC-005/006/007/016)'; $PY supabase/tests/test_studio_schema.py
step 'Auth: both methods, one identity, sessions (SEC-001/002/003)'; $PY -I supabase/tests/test_studio_auth_live.py "$PWD" "$LOG"
step 'Storage: private files, isolation (SEC-008/009/010)';              $PY -I supabase/tests/test_studio_storage_live.py "$PWD" "$LOG"
step 'Documents: editor data, isolation, no publishing, portfolio gone (SEC-004/011-016)'; $PY -I supabase/tests/test_studio_documents_live.py "$PWD" "$LOG"
step 'Project setup: frameworks, resume, duplicate, ownership (Stage 1)'; $PY -I supabase/tests/test_studio_setup_live.py "$PWD" "$LOG"
step 'Lifecycle and caching (SEC-017/018)';                               $PY -I supabase/tests/test_studio_lifecycle_live.py "$PWD" "$LOG"
echo; echo 'All checks passed.'
