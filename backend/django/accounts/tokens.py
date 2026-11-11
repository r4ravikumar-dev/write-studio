"""
The JWTs the studio runs on (HS256, shared JWT_SECRET).

- access: 15 minutes by default. Sent by the Next.js server to the Express
  API as `Authorization: Bearer …`; also checked by the Next.js proxy.
- refresh: 30 days by default. Only ever sent back here to get a new pair.
  Each refresh rotates it: the old one is revoked.

Claims: sub (user UUID), email, role (always 'user': every account is an
ordinary Studio user with access to its own workspace only), type, sv
(session version), jti, iat, exp, iss, aud.
Keep in step with packages/shared/src/auth.ts.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import jwt
from django.conf import settings

from .models import RevokedToken


class TokenError(Exception):
    pass


def _encode(user, token_type: str, lifetime) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    expires = now + lifetime
    jti = uuid.uuid4().hex
    payload = {
        'sub': str(user.pk),  # a UUID: the owner_id of the user's Studio rows
        'email': user.email.lower(),
        'role': 'user',
        'sv': user.session_version,
        'type': token_type,
        'jti': jti,
        'iat': int(now.timestamp()),
        'exp': int(expires.timestamp()),
        'iss': settings.JWT_ISSUER,
        'aud': settings.JWT_AUDIENCE,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256'), jti, expires


def issue_pair(user) -> dict:
    access, _, access_exp = _encode(user, 'access', settings.ACCESS_TOKEN_LIFETIME)
    refresh, _, refresh_exp = _encode(user, 'refresh', settings.REFRESH_TOKEN_LIFETIME)
    return {
        'access': access,
        'refresh': refresh,
        'access_expires_at': access_exp.isoformat(),
        'refresh_expires_at': refresh_exp.isoformat(),
        'user': {
            'id': str(user.pk),
            'email': user.email.lower(),
            'display_name': user.display_name,
            'role': 'user',
        },
    }


def decode(token: str, token_type: str) -> dict:
    try:
        claims = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=['HS256'],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
            options={'require': ['exp', 'iat', 'sub', 'jti', 'type']},
        )
    except jwt.PyJWTError as error:
        raise TokenError(str(error)) from error
    if claims.get('type') != token_type:
        raise TokenError('Wrong token type.')
    if token_type == 'refresh' and RevokedToken.objects.filter(jti=claims['jti']).exists():
        raise TokenError('Token was revoked.')
    return claims


def revoke(claims: dict) -> None:
    RevokedToken.objects.get_or_create(
        jti=claims['jti'],
        defaults={'expires_at': datetime.fromtimestamp(claims['exp'], tz=timezone.utc)},
    )
