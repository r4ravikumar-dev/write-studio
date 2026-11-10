from __future__ import annotations

import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email: str, password: str | None, **fields):
        if not email:
            raise ValueError('An email is required.')
        user = self.model(email=self.normalize_email(email).lower(), **fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **fields):
        fields.setdefault('is_staff', False)
        fields.setdefault('is_superuser', False)
        return self._create(email, password, **fields)

    def create_superuser(self, email: str, password: str | None = None, **fields):
        fields.update(is_staff=True, is_superuser=True)
        return self._create(email, password, **fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    One account per email, whichever way it signs in (password or email code).

    The id is a UUID because it is the owner_id of every Studio workspace,
    case study and asset in Supabase (public.studio_*), and the `sub` of the
    JWTs this service issues. Creating a row here creates the account's
    personal workspace (trigger in supabase/migrations/0005_studio_accounts.sql).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Always stored lowercased (save()), so a plain unique index is case-insensitive in practice.
    email = models.EmailField(max_length=254, unique=True)
    display_name = models.CharField(max_length=80, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    # Set once the email has been proven (a confirmation link or a sign-in code).
    email_verified_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)
    # Bumped when the password changes or is reset: every refresh token issued
    # before that stops working (claim `sv`).
    session_version = models.PositiveIntegerField(default=0)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = 'accounts_user'

    def save(self, *args, **kwargs):
        self.email = (self.email or '').strip().lower()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.email


class LoginCode(models.Model):
    """A one-time sign-in code, stored only as a keyed hash."""

    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['email', 'created_at'])]


class RevokedToken(models.Model):
    """Refresh tokens that were rotated or signed out (by their jti)."""

    jti = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)


class ThrottleEvent(models.Model):
    """One attempt counted against a rate limit (key like "login:email:a@b.c")."""

    key = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['key', 'created_at'])]
