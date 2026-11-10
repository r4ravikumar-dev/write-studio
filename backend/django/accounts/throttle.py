"""Simple database-backed rate limits (shared by every worker process)."""
from __future__ import annotations

import hashlib

from django.conf import settings
from django.utils import timezone

from .models import ThrottleEvent


def _key(kind: str, value: str) -> str:
    # Emails and IPs are hashed so the table doesn't collect them in clear.
    return f'{kind}:{hashlib.sha256(value.strip().lower().encode()).hexdigest()}'


def hit(kind: str, value: str) -> bool:
    """Counts one attempt; True when the limit for `kind` is already used up."""
    if not value:
        return False
    limit = settings.THROTTLE_LIMITS[kind]
    since = timezone.now() - settings.THROTTLE_WINDOW
    key = _key(kind, value)
    if ThrottleEvent.objects.filter(key=key, created_at__gte=since).count() >= limit:
        return True
    ThrottleEvent.objects.create(key=key)
    return False


def prune() -> None:
    ThrottleEvent.objects.filter(created_at__lt=timezone.now() - settings.THROTTLE_WINDOW).delete()
