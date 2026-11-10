"""The emails the auth service sends. Plain text plus a simple HTML version."""
from __future__ import annotations

from html import escape

from django.conf import settings
from django.core.mail import send_mail


def _send(to: str, subject: str, lines: list[str], button: tuple[str, str] | None = None) -> None:
    text = '\n'.join(lines + ([f'\n{button[0]}: {button[1]}'] if button else []))
    html = ''.join(f'<p>{escape(line)}</p>' for line in lines if line)
    if button:
        html += (
            f'<p><a href="{escape(button[1])}" style="display:inline-block;padding:10px 18px;border-radius:999px;'
            f'background:#2059DF;color:#ffffff;text-decoration:none;font-weight:600">{escape(button[0])}</a></p>'
        )
    send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [to], html_message=html)


def send_login_code(to: str, code: str, minutes: int) -> None:
    _send(
        to,
        f'Your sign-in code: {code}',
        [f'Your code to sign in to the studio is {code}.', f'It works once, for {minutes} minutes.',
         'If you didn’t ask for it, you can ignore this email.'],
    )


def send_confirm_email(to: str, link: str) -> None:
    _send(
        to,
        'Confirm your email for the studio',
        ['Someone (hopefully you) created a studio account with this email address.',
         'Confirm it to finish signing up. The link works for 24 hours.',
         'If this wasn’t you, ignore this email and no account will be activated.'],
        ('Confirm my email', link),
    )


def send_password_reset(to: str, link: str) -> None:
    _send(
        to,
        'Reset your studio password',
        ['Someone asked to reset the password for your studio account.',
         'The link works for one hour, once. If this wasn’t you, ignore this email; your password stays the same.'],
        ('Choose a new password', link),
    )


def send_already_registered(to: str, link: str) -> None:
    _send(
        to,
        'You already have a studio account',
        ['Someone tried to sign up with this email, but it already has a studio account.',
         'If it was you, sign in instead (with your password or an email code), or reset your password.'],
        ('Sign in', link),
    )
