"""
Settings for the studio's auth service.

This service does one job: sign Studio users in (password or one-time email
code) and issue JWTs (see accounts/tokens.py). The Express API and the Next.js
proxy verify those tokens with the same JWT_SECRET. Case studies, assets and
side work are not stored here; they live in Supabase behind the Express API.
"""
from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import os

import dj_database_url
from dotenv import load_dotenv
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name: str, default: str = '') -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


DEBUG = env_bool('DJANGO_DEBUG', False)
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('Set DJANGO_SECRET_KEY (or DJANGO_DEBUG=true for local development).')
    SECRET_KEY = 'dev-only-insecure-secret-key'

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'accounts',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# ---------------------------------------------------------------------------
# Database: the Supabase Postgres (Project Settings -> Database -> connection
# string). Django's tables go in their own `django` schema, which Supabase's
# public REST API does not expose (supabase/migrations/0004_split_backends.sql),
# so user rows and login codes can never be read with the anon key.
# Without DATABASE_URL a local SQLite file is used (development only).
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get('DATABASE_URL', '')
if DATABASE_URL:
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL, conn_max_age=60, ssl_require=not DEBUG)}
    schema = os.environ.get('DJANGO_DB_SCHEMA', 'django')
    DATABASES['default'].setdefault('OPTIONS', {})['options'] = f'-c search_path={schema}'
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}

# `manage.py test` always runs on a throwaway SQLite database, never Supabase.
TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'
if TESTING:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'
USE_TZ = True
TIME_ZONE = 'UTC'

# ---------------------------------------------------------------------------
# Tokens.
# ---------------------------------------------------------------------------

# Shared with the Express API and the Next.js app (HS256). At least 32 random bytes.
JWT_SECRET = os.environ.get('JWT_SECRET', '')
if not JWT_SECRET and not DEBUG:
    raise RuntimeError('Set JWT_SECRET.')
JWT_SECRET = JWT_SECRET or 'dev-only-insecure-jwt-secret-change-me-please'
JWT_ISSUER = 'studio-auth'
JWT_AUDIENCE = 'studio'
ACCESS_TOKEN_LIFETIME = timedelta(minutes=int(os.environ.get('ACCESS_TOKEN_MINUTES', '15')))
REFRESH_TOKEN_LIFETIME = timedelta(days=int(os.environ.get('REFRESH_TOKEN_DAYS', '30')))

# Only the Next.js server calls this service; it sends this key in X-Service-Key.
AUTH_SERVICE_KEY = os.environ.get('AUTH_SERVICE_KEY', '')
if not AUTH_SERVICE_KEY and not DEBUG:
    raise RuntimeError('Set AUTH_SERVICE_KEY.')

# Where the Next.js site is, for links in emails (confirm address, reset password).
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')

# Password rules for Studio accounts (checked on sign-up, reset and change).
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
PASSWORD_MAX_LENGTH = 128
EMAIL_CONFIRM_LIFETIME = timedelta(hours=24)
PASSWORD_RESET_TIMEOUT = 60 * 60  # seconds (Django's reset tokens)

# Abuse limits (per email and per client IP, over 15 minutes).
THROTTLE_WINDOW = timedelta(minutes=15)
THROTTLE_LIMITS = {
    'code:email': 5, 'code:ip': 20,
    'login:email': 10, 'login:ip': 30,
    'signup:email': 3, 'signup:ip': 10,
    'reset:email': 3, 'reset:ip': 10,
    'verify:ip': 30,
}

LOGIN_CODE_LIFETIME = timedelta(minutes=10)
LOGIN_CODE_MAX_ATTEMPTS = 5
LOGIN_CODES_PER_WINDOW = 5
LOGIN_CODE_WINDOW = timedelta(minutes=15)

# ---------------------------------------------------------------------------
# Email (sign-in codes, confirmations, password resets).
#   SMTP_HOST set      -> that SMTP server (use a transactional provider for a public site)
#   else GMAIL_USER    -> Gmail with an app password (~500 emails/day)
#   else               -> printed to the console (development)
# ---------------------------------------------------------------------------
SMTP_HOST = os.environ.get('SMTP_HOST', '')
GMAIL_USER = os.environ.get('GMAIL_USER', '')
if TESTING:
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    DEFAULT_FROM_EMAIL = 'Studio <studio@test.invalid>'
elif SMTP_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = SMTP_HOST
    EMAIL_PORT = int(os.environ.get('SMTP_PORT', '587'))
    EMAIL_HOST_USER = os.environ.get('SMTP_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    EMAIL_USE_TLS = EMAIL_PORT == 587
    EMAIL_USE_SSL = EMAIL_PORT == 465
    DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_FROM', f'Studio <{EMAIL_HOST_USER}>')
elif GMAIL_USER:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 465
    EMAIL_USE_SSL = True
    EMAIL_HOST_USER = GMAIL_USER
    EMAIL_HOST_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', '').replace(' ', '')
    DEFAULT_FROM_EMAIL = f'Studio <{GMAIL_USER}>'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'studio@localhost'

# ---------------------------------------------------------------------------
# Security headers when served over HTTPS.
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = env_bool('DJANGO_SSL_REDIRECT', False)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}
