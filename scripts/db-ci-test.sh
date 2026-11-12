#!/usr/bin/env bash
# Runs database migration checks, dry-run upgrade/downgrade, and schema lockdown tests in CI.
# Usage:
#   scripts/db-ci-test.sh [DATABASE_URL]
set -euo pipefail
cd "$(dirname "$0")/.."

DATABASE_URL="${1:-${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/studio_test}}"
export DATABASE_URL

echo "== Database CI: Connecting to ${DATABASE_URL}"

# 1. Bootstrap Supabase stubs and roles
echo "== Applying CI bootstrap..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ci_bootstrap.sql

# 2. Apply initial migrations 0001 - 0004
echo "== Applying migrations 0001-0004..."
for file in supabase/migrations/0001_case_studies.sql \
            supabase/migrations/0002_case_study_downloads.sql \
            supabase/migrations/0003_side_work.sql \
            supabase/migrations/0004_split_backends.sql; do
  echo "Applying $file..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

# 3. Apply Django migrations (creates django.accounts_user)
echo "== Applying Django migrations..."
DJANGO_DB_SCHEMA=django python backend/django/manage.py migrate

# 4. Apply Studio migrations 0005 - 0013
echo "== Applying migrations 0005-0013..."
for file in supabase/migrations/0005_studio_accounts.sql \
            supabase/migrations/0006_studio_case_studies.sql \
            supabase/migrations/0007_studio_assets.sql \
            supabase/migrations/0008_studio_private_storage.sql \
            supabase/migrations/0009_remove_portfolio.sql \
            supabase/migrations/0010_studio_projects.sql \
            supabase/migrations/0011_studio_sections.sql \
            supabase/migrations/0012_studio_section_progress.sql \
            supabase/migrations/0013_studio_revisions.sql; do
  echo "Applying $file..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

# 5. Run Migration 0014 Dry-Run (tests migration up, data integrity, and rollback down inside a transaction)
echo "== Running Migration 0014 dry run test..."
python supabase/tests/migration_0014_dry_run.py

# 6. Apply Migration 0014
echo "== Applying migration 0014 (studio_documents)..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0014_studio_documents.sql

# 7. Run Studio Schema Verification (33 checks on RLS, triggers, cascades, constraints)
echo "== Running Studio schema verification..."
python supabase/tests/test_studio_schema.py

echo
echo "== All database tests and schema checks passed!"
