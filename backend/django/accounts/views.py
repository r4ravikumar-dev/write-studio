"""
The auth API. Every endpoint except /health is called only by the Next.js
server, which proves it with X-Service-Key and passes the visitor's address in
X-Client-IP (for rate limits). JSON in, JSON out.

  Codes (passwordless sign-in, and sign-up on first use)
    POST request-code     {email}                                           -> {status: "sent"} always
    POST verify-code      {email, code, display_name?}                      -> token pair
  Passwords
    POST signup           {email, password, display_name}                   -> {status: "check-email"} always
    POST confirm-email    {token}                                           -> token pair
    POST login            {email, password}                                 -> token pair
    POST forgot-password  {email}                                           -> {status: "check-email"} always
    POST reset-password   {uid, token, password}                            -> token pair
  Signed in (Authorization: Bearer <access>)
    GET  me                                                                 -> {user}
    POST update-profile   {display_name}                                    -> {user}
    POST set-password     {password, current_password?}                     -> token pair
    POST delete-account/confirm {password? | code?}                         -> {deletion_token} (5 min, single use)
    POST delete-account   {deletion_token}                                  -> {status: "deleted"}
  Sessions
    POST refresh          {refresh}                                         -> token pair (rotated)
    POST logout           {refresh}                                         -> {status}

One account per email, whichever way it signs in. Every account is an
ordinary user: there is no owner, admin or special-cased address. Replies
never reveal whether an email has an account.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import secrets
import uuid
from functools import wraps
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import emails, throttle
from .models import LoginCode, RevokedToken
from .tokens import TokenError, decode, issue_pair, revoke

log = logging.getLogger(__name__)
User = get_user_model()

EMAIL = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
CODE = re.compile(r'^\d{6}$')
CONFIRM_SALT = 'studio.confirm-email'
DELETION_SALT = 'studio.delete-account'
DELETION_TOKEN_SECONDS = 5 * 60
# Compared against when an email has no account, so a wrong email takes as long as a wrong password.
DUMMY_HASH = make_password(secrets.token_urlsafe(16))

SENT = {'status': 'sent'}
CHECK_EMAIL = {'status': 'check-email'}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _error(message: str, status: int = 400, **extra) -> JsonResponse:
    return JsonResponse({'error': message, **extra}, status=status)


def _body(request: HttpRequest) -> dict:
    try:
        data = json.loads(request.body or b'{}')
        return data if isinstance(data, dict) else {}
    except ValueError:
        return {}


def _email(data: dict) -> str:
    email = str(data.get('email', '')).strip().lower()
    return email if EMAIL.match(email) and len(email) <= 254 else ''


def _ip(request: HttpRequest) -> str:
    # Trusted only because the caller had to present the service key.
    return request.headers.get('X-Client-IP', '')[:64]


def _display_name(value: object, fallback: str = '') -> str:
    name = re.sub(r'\s+', ' ', str(value or '')).strip()[:80]
    return name or fallback


def _password_problems(password: str, user=None) -> list[str]:
    if len(password) > settings.PASSWORD_MAX_LENGTH:
        return [f'Use no more than {settings.PASSWORD_MAX_LENGTH} characters.']
    try:
        validate_password(password, user)
    except ValidationError as error:
        return list(error.messages)
    return []


def service_only(view):
    """Refuses callers without the shared service key (only the Next.js server has it)."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        expected = settings.AUTH_SERVICE_KEY
        given = request.headers.get('X-Service-Key', '')
        if expected and not hmac.compare_digest(given, expected):
            return _error('Forbidden.', 403)
        return view(request, *args, **kwargs)

    return wrapper


def signed_in(view):
    """Passes the user from a valid access token (Authorization: Bearer …)."""

    @wraps(view)
    def wrapper(request, *args, **kwargs):
        header = request.headers.get('Authorization', '')
        try:
            claims = decode(header[7:] if header.startswith('Bearer ') else '', 'access')
            user = User.objects.get(pk=claims['sub'], is_active=True)
        except (TokenError, User.DoesNotExist, ValidationError, ValueError):
            return _error('Signed out.', 401)
        if user.email != claims.get('email') or not user.email_verified_at:
            return _error('Signed out.', 401)
        return view(request, user, *args, **kwargs)

    return wrapper


def _user_json(user) -> dict:
    return {
        'id': str(user.pk),
        'email': user.email,
        'display_name': user.display_name,
        'role': 'user',
        'has_password': user.has_usable_password(),
        'email_verified': bool(user.email_verified_at),
    }


def _hash_code(email: str, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f'{email}:{code}'.encode(), hashlib.sha256).hexdigest()


def _mark_verified(user, *, drop_unproven_password: bool) -> None:
    """
    Records that the email is proven. When it's proven by a code (not by the
    confirmation link), a password set before the email was ever confirmed is
    dropped: it may have been chosen by someone else who signed up with this
    address first ("pre-hijacking").
    """
    if user.email_verified_at:
        return
    user.email_verified_at = timezone.now()
    fields = ['email_verified_at']
    if drop_unproven_password and user.has_usable_password():
        user.set_unusable_password()
        user.session_version += 1
        fields += ['password', 'session_version']
    user.save(update_fields=fields)


def _signed_in_reply(user) -> JsonResponse:
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    return JsonResponse(issue_pair(user))


def _confirm_link(user) -> str:
    token = signing.dumps({'u': str(user.pk), 'e': user.email}, salt=CONFIRM_SALT)
    return f'{settings.FRONTEND_URL}/studio/confirm?{urlencode({"token": token})}'


# ---------------------------------------------------------------------------
# Email codes
# ---------------------------------------------------------------------------
@csrf_exempt
@require_POST
@service_only
def request_code(request: HttpRequest) -> JsonResponse:
    data = _body(request)
    email = _email(data)
    if not email:
        return _error('Enter an email address in the format name@example.com.')
    now = timezone.now()
    LoginCode.objects.filter(expires_at__lt=now - settings.LOGIN_CODE_LIFETIME * 6).delete()
    RevokedToken.objects.filter(expires_at__lt=now).delete()
    throttle.prune()

    if throttle.hit('code:ip', _ip(request)):
        return _error('You’ve asked for too many codes. Wait a few minutes, then try again.', 429)
    if throttle.hit('code:email', email):
        return _error('You’ve asked for too many codes. Wait a few minutes, then try again.', 429)
    existing = User.objects.filter(email=email).first()
    if existing and not existing.is_active:
        return JsonResponse(SENT)

    code = f'{secrets.randbelow(10**6):06d}'
    LoginCode.objects.filter(email=email, used_at__isnull=True).update(used_at=now)  # older codes stop working
    LoginCode.objects.create(email=email, code_hash=_hash_code(email, code), expires_at=now + settings.LOGIN_CODE_LIFETIME)
    try:
        emails.send_login_code(email, code, int(settings.LOGIN_CODE_LIFETIME.total_seconds() // 60))
    except Exception:  # noqa: BLE001
        log.exception('Sending a sign-in code failed')
        return _error('We couldn’t send the code. Try again in a minute.', 502)
    return JsonResponse(SENT)


@csrf_exempt
@require_POST
@service_only
def verify_code(request: HttpRequest) -> JsonResponse:
    data = _body(request)
    email = _email(data)
    code = re.sub(r'\s+', '', str(data.get('code', '')))
    wrong = _error('That code is wrong or has expired. Use the latest code we sent, or ask for a new one.')
    if throttle.hit('verify:ip', _ip(request)):
        return _error('Too many attempts. Wait a few minutes, then try again.', 429)
    if not email or not CODE.match(code):
        return wrong

    with transaction.atomic():
        login = (
            LoginCode.objects.select_for_update()
            .filter(email=email, used_at__isnull=True, expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )
        if not login or login.attempts >= settings.LOGIN_CODE_MAX_ATTEMPTS:
            return wrong
        if not hmac.compare_digest(login.code_hash, _hash_code(email, code)):
            login.attempts += 1
            login.save(update_fields=['attempts'])
            return wrong
        login.used_at = timezone.now()
        login.save(update_fields=['used_at'])

        # First time here: the code just proved the email, so this is the sign-up.
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(
                email=email,
                display_name=_display_name(data.get('display_name'), email.split('@')[0]),
                email_verified_at=timezone.now(),
            )
        if not user.is_active:
            return wrong
        _mark_verified(user, drop_unproven_password=True)
        return _signed_in_reply(user)


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------
@csrf_exempt
@require_POST
@service_only
def signup(request: HttpRequest) -> JsonResponse:
    data = _body(request)
    email = _email(data)
    password = str(data.get('password', ''))
    name = _display_name(data.get('display_name'))
    if not email:
        return _error('Enter an email address in the format name@example.com.', field='email')
    if not name:
        return _error('Enter your name.', field='display_name')
    problems = _password_problems(password, User(email=email, display_name=name))
    if problems:
        return _error(' '.join(problems), field='password')
    if throttle.hit('signup:ip', _ip(request)) or throttle.hit('signup:email', email):
        return _error('Too many sign-up attempts. Wait a few minutes, then try again.', 429)

    with transaction.atomic():
        user = User.objects.select_for_update().filter(email=email).first()
        already_registered = bool(user and user.email_verified_at)
        if already_registered:
            pass
        elif user is None:
            user = User.objects.create_user(email=email, password=password, display_name=name)
        else:
            # An unconfirmed sign-up again: the latest password and name win.
            user.set_password(password)
            user.display_name = name
            user.save(update_fields=['password', 'display_name'])
        link = _confirm_link(user)
    try:
        if already_registered:
            # Same reply as a new sign-up; the owner of the address hears about it by email.
            emails.send_already_registered(email, f'{settings.FRONTEND_URL}/studio/login')
        else:
            emails.send_confirm_email(email, link)
    except Exception:  # noqa: BLE001
        log.exception('Sending a confirmation email failed')
        return _error('We couldn’t send the confirmation email. Try again in a minute.', 502)
    return JsonResponse(CHECK_EMAIL)


@csrf_exempt
@require_POST
@service_only
def confirm_email(request: HttpRequest) -> JsonResponse:
    invalid = _error('This link has expired or has already been used. Sign in, or sign up again to get a new link.')
    try:
        payload = signing.loads(
            str(_body(request).get('token', '')),
            salt=CONFIRM_SALT,
            max_age=settings.EMAIL_CONFIRM_LIFETIME.total_seconds(),
        )
        user = User.objects.get(pk=uuid.UUID(payload['u']), email=payload['e'], is_active=True)
    except (signing.BadSignature, User.DoesNotExist, KeyError, ValueError, TypeError):
        return invalid
    if user.email_verified_at:
        return invalid  # single use: a confirmed account signs in normally
    _mark_verified(user, drop_unproven_password=False)
    return _signed_in_reply(user)


@csrf_exempt
@require_POST
@service_only
def login(request: HttpRequest) -> JsonResponse:
    data = _body(request)
    email = _email(data)
    password = str(data.get('password', ''))[: settings.PASSWORD_MAX_LENGTH]
    wrong = _error('The email address or password is wrong. Check both and try again, or sign in with an email code.')
    if throttle.hit('login:ip', _ip(request)) or (email and throttle.hit('login:email', email)):
        return _error('Too many attempts. Wait a few minutes, or sign in with an email code.', 429)

    user = User.objects.filter(email=email, is_active=True).first() if email else None
    if user is None or not user.has_usable_password():
        check_password(password, DUMMY_HASH)
        return wrong
    if not user.check_password(password):
        return wrong
    if not user.email_verified_at:
        # Only someone who knows the password gets here, so this reveals nothing new.
        try:
            emails.send_confirm_email(user.email, _confirm_link(user))
        except Exception:  # noqa: BLE001
            log.exception('Re-sending a confirmation email failed')
        return _error('Confirm your email address first. We’ve sent you the link again.', 403, code='unverified')
    return _signed_in_reply(user)


@csrf_exempt
@require_POST
@service_only
def forgot_password(request: HttpRequest) -> JsonResponse:
    email = _email(_body(request))
    if not email:
        return _error('Enter an email address in the format name@example.com.')
    if throttle.hit('reset:ip', _ip(request)) or throttle.hit('reset:email', email):
        return _error('Too many attempts. Wait a few minutes, then try again.', 429)
    user = User.objects.filter(email=email, is_active=True, email_verified_at__isnull=False).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(str(user.pk)))
        token = default_token_generator.make_token(user)
        link = f'{settings.FRONTEND_URL}/studio/update-password?{urlencode({"uid": uid, "token": token})}'
        try:
            emails.send_password_reset(email, link)
        except Exception:  # noqa: BLE001
            log.exception('Sending a password reset failed')
            return _error('We couldn’t send the email. Try again in a minute.', 502)
    return JsonResponse(CHECK_EMAIL)


@csrf_exempt
@require_POST
@service_only
def reset_password(request: HttpRequest) -> JsonResponse:
    data = _body(request)
    invalid = _error('This reset link has expired or has already been used. Ask for a new one.')
    try:
        user = User.objects.get(pk=uuid.UUID(force_str(urlsafe_base64_decode(str(data.get('uid', ''))))), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError):
        return invalid
    if not default_token_generator.check_token(user, str(data.get('token', ''))):
        return invalid
    password = str(data.get('password', ''))
    problems = _password_problems(password, user)
    if problems:
        return _error(' '.join(problems), field='password')
    user.set_password(password)
    user.session_version += 1  # signs out every other session
    user.email_verified_at = user.email_verified_at or timezone.now()
    user.save(update_fields=['password', 'session_version', 'email_verified_at'])
    return _signed_in_reply(user)


# ---------------------------------------------------------------------------
# Signed in
# ---------------------------------------------------------------------------
@require_GET
@service_only
@signed_in
def me(request: HttpRequest, user) -> JsonResponse:
    return JsonResponse({'user': _user_json(user)})


@csrf_exempt
@require_POST
@service_only
@signed_in
def update_profile(request: HttpRequest, user) -> JsonResponse:
    name = _display_name(_body(request).get('display_name'))
    if not name:
        return _error('Enter your name.', field='display_name')
    user.display_name = name
    user.save(update_fields=['display_name'])
    return JsonResponse({'user': _user_json(user)})


@csrf_exempt
@require_POST
@service_only
@signed_in
def set_password(request: HttpRequest, user) -> JsonResponse:
    """Adds a password to an account that signs in by code, or changes an existing one."""
    data = _body(request)
    if user.has_usable_password() and not user.check_password(str(data.get('current_password', ''))):
        return _error('Your current password is wrong. Check it and try again.', field='current_password')
    password = str(data.get('password', ''))
    problems = _password_problems(password, user)
    if problems:
        return _error(' '.join(problems), field='password')
    user.set_password(password)
    user.session_version += 1  # other devices sign out; this one gets a fresh pair
    user.save(update_fields=['password', 'session_version'])
    return JsonResponse(issue_pair(user))


# ---------------------------------------------------------------------------
# Account deletion (two steps, so the Next.js app can remove the user's
# private files through the Express API in between: the database cascade
# deletes rows, but never objects in Storage).
# ---------------------------------------------------------------------------
def _deletion_token(user) -> str:
    # Bound to the account's current session version, so it dies with a password change.
    return signing.dumps({'u': str(user.pk), 'sv': user.session_version, 'n': secrets.token_hex(8)}, salt=DELETION_SALT)


@csrf_exempt
@require_POST
@service_only
@signed_in
def confirm_account_deletion(request: HttpRequest, user) -> JsonResponse:
    """Step 1: proves it's really the account holder (password, or a fresh email code)."""
    if throttle.hit('login:email', user.email):
        return _error('Too many attempts. Wait a few minutes, then try again.', 429)
    data = _body(request)
    if user.has_usable_password():
        if not user.check_password(str(data.get('password', ''))[: settings.PASSWORD_MAX_LENGTH]):
            return _error('That password is wrong. Check it and try again.', field='password')
    else:
        code = re.sub(r'\s+', '', str(data.get('code', '')))
        with transaction.atomic():
            login = (
                LoginCode.objects.select_for_update()
                .filter(email=user.email, used_at__isnull=True, expires_at__gt=timezone.now())
                .order_by('-created_at')
                .first()
            )
            if not CODE.match(code) or not login or login.attempts >= settings.LOGIN_CODE_MAX_ATTEMPTS:
                return _error('That code is wrong or has expired. Use the latest code we sent, or ask for a new one.', field='code')
            if not hmac.compare_digest(login.code_hash, _hash_code(user.email, code)):
                login.attempts += 1
                login.save(update_fields=['attempts'])
                return _error('That code is wrong or has expired. Use the latest code we sent, or ask for a new one.', field='code')
            login.used_at = timezone.now()
            login.save(update_fields=['used_at'])
    return JsonResponse({'deletion_token': _deletion_token(user), 'expires_in': DELETION_TOKEN_SECONDS})


@csrf_exempt
@require_POST
@service_only
@signed_in
def delete_account(request: HttpRequest, user) -> JsonResponse:
    """
    Step 2: deletes the account. The database then cascades to the user's
    Studio workspace, case studies and asset rows (supabase/migrations/0005-0007).
    Call only after the user's private files were removed (Express purge).
    """
    try:
        payload = signing.loads(str(_body(request).get('deletion_token', '')), salt=DELETION_SALT, max_age=DELETION_TOKEN_SECONDS)
    except signing.BadSignature:
        return _error('Your confirmation has expired. Enter your password or code again to delete your account.', 400)
    if payload.get('u') != str(user.pk) or payload.get('sv') != user.session_version:
        return _error('Your confirmation has expired. Enter your password or code again to delete your account.', 400)
    with transaction.atomic():
        LoginCode.objects.filter(email=user.email).delete()
        user.delete()
    log.info('Studio account deleted')
    return JsonResponse({'status': 'deleted'})


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
@csrf_exempt
@require_POST
@service_only
def refresh(request: HttpRequest) -> JsonResponse:
    token = str(_body(request).get('refresh', ''))
    try:
        claims = decode(token, 'refresh')
    except TokenError:
        return _error('Signed out.', 401)
    user = User.objects.filter(pk=claims['sub'], is_active=True, email_verified_at__isnull=False).first()
    if not user or user.email != claims.get('email') or claims.get('sv') != user.session_version:
        return _error('Signed out.', 401)
    with transaction.atomic():
        revoke(claims)  # rotation: each refresh token works once
        pair = issue_pair(user)
    return JsonResponse(pair)


@csrf_exempt
@require_POST
@service_only
def logout(request: HttpRequest) -> JsonResponse:
    try:
        revoke(decode(str(_body(request).get('refresh', '')), 'refresh'))
    except TokenError:
        pass
    return JsonResponse({'status': 'signed-out'})


@require_GET
def health(request: HttpRequest) -> JsonResponse:
    return JsonResponse({'ok': True})
