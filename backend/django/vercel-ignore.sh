#!/bin/bash
# Vercel "Ignored Build Step" for the auth service (vercel.json ignoreCommand).
# Exit 1 = build, exit 0 = skip. Its settings exist for Production only, so
# previews (pull requests) are skipped and every production build runs.
echo "ignore step: VERCEL_ENV=${VERCEL_ENV:-unset} ref=${VERCEL_GIT_COMMIT_REF:-unset}"
if [ "$VERCEL_ENV" = "production" ] || [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then
  echo "production: building"
  exit 1
fi
echo "preview: skipped (the auth service has no preview settings)"
exit 0
