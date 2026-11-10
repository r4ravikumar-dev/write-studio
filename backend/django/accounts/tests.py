"""
Auth service tests (Phase 2). Run: .venv/bin/python manage.py test accounts
Uses an in-memory SQLite database and Django's in-memory mailbox.
"""
from __future__ import annotations

import json
import re
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import LoginCode, User
from .tokens import decode

KEY = 'test-service-key'
FORMER_OWNER = 'former-owner@test.invalid'  # stands in for the old hardcoded portfolio owner: now an ordinary account
GOOD_PASSWORD = 'correct horse battery 42'


@override_settings(AUTH_SERVICE_KEY=KEY, FRONTEND_URL='https://site.test')
class AuthTestBase(TestCase):
    """Helpers only (no tests), shared by the test classes below."""

    ip = 0

    def post(self, path, body=None, token=None, ip=None):
        headers = {'HTTP_X_SERVICE_KEY': KEY, 'HTTP_X_CLIENT_IP': ip or f'10.0.0.{AuthTestBase.ip}'}
        if token:
            headers['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        return self.client.post(f'/api/auth/{path}', json.dumps(body or {}), content_type='application/json', **headers)

    def get(self, path, token):
        return self.client.get(f'/api/auth/{path}', HTTP_X_SERVICE_KEY=KEY, HTTP_AUTHORIZATION=f'Bearer {token}')

    def setUp(self):
        AuthTestBase.ip += 1  # each test its own client IP, so IP limits don't leak between tests

    def last_mail_link(self):
        return re.search(r'https://site\.test/\S+', mail.outbox[-1].body).group(0)

    def code_for(self, email, purpose='studio', ip=None):
        mail.outbox.clear()
        self.assertEqual(self.post('request-code', {'email': email, 'purpose': purpose}, ip=ip).status_code, 200)
        return re.search(r'is (\d{6})', mail.outbox[-1].body).group(1) if mail.outbox else None

    def signup_and_confirm(self, email='a@test.invalid', name='Ada'):
        r = self.post('signup', {'email': email, 'password': GOOD_PASSWORD, 'display_name': name})
        self.assertEqual(r.json(), {'status': 'check-email'})
        token = parse_qs(urlparse(self.last_mail_link()).query)['token'][0]
        r = self.post('confirm-email', {'token': token})
        self.assertEqual(r.status_code, 200)
        return r.json()


class AuthTests(AuthTestBase):
    # --- service key -----------------------------------------------------------
    def test_requires_service_key(self):
        r = self.client.post('/api/auth/login', '{}', content_type='application/json')
        self.assertEqual(r.status_code, 403)

    # --- password sign-up (SEC-001) -------------------------------------------
    def test_signup_confirm_and_login(self):
        pair = self.signup_and_confirm()
        user = User.objects.get(email='a@test.invalid')
        self.assertIsNotNone(user.email_verified_at)
        self.assertEqual(decode(pair['access'], 'access')['role'], 'user')
        self.assertEqual(decode(pair['access'], 'access')['sub'], str(user.pk))
        r = self.post('login', {'email': 'A@Test.invalid ', 'password': GOOD_PASSWORD})
        self.assertEqual(r.status_code, 200)

    def test_unconfirmed_account_cannot_log_in(self):
        self.post('signup', {'email': 'b@test.invalid', 'password': GOOD_PASSWORD, 'display_name': 'B'})
        r = self.post('login', {'email': 'b@test.invalid', 'password': GOOD_PASSWORD})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['code'], 'unverified')

    def test_confirm_link_is_single_use(self):
        self.post('signup', {'email': 'c@test.invalid', 'password': GOOD_PASSWORD, 'display_name': 'C'})
        token = parse_qs(urlparse(self.last_mail_link()).query)['token'][0]
        self.assertEqual(self.post('confirm-email', {'token': token}).status_code, 200)
        self.assertEqual(self.post('confirm-email', {'token': token}).status_code, 400)
        self.assertEqual(self.post('confirm-email', {'token': token + 'x'}).status_code, 400)

    def test_weak_password_refused(self):
        r = self.post('signup', {'email': 'd@test.invalid', 'password': '12345678', 'display_name': 'D'})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['field'], 'password')
        self.assertFalse(User.objects.filter(email='d@test.invalid').exists())

    def test_signup_does_not_reveal_existing_accounts(self):
        self.signup_and_confirm('e@test.invalid')
        mail.outbox.clear()
        r = self.post('signup', {'email': 'e@test.invalid', 'password': 'another long pass 99', 'display_name': 'X'})
        self.assertEqual(r.json(), {'status': 'check-email'})
        self.assertIn('already have a studio account', mail.outbox[-1].subject)
        self.assertEqual(User.objects.filter(email='e@test.invalid').count(), 1)
        # …and the existing password was not replaced.
        self.assertEqual(self.post('login', {'email': 'e@test.invalid', 'password': GOOD_PASSWORD}).status_code, 200)

    def test_wrong_password_and_unknown_email_look_the_same(self):
        self.signup_and_confirm('f@test.invalid')
        a = self.post('login', {'email': 'f@test.invalid', 'password': 'nope nope nope'})
        b = self.post('login', {'email': 'nobody@test.invalid', 'password': 'nope nope nope'})
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))

    # --- OTP (SEC-002) -----------------------------------------------------------
    def test_otp_creates_account_on_first_use(self):
        code = self.code_for('g@test.invalid')
        r = self.post('verify-code', {'email': 'g@test.invalid', 'code': code, 'display_name': 'Grace'})
        self.assertEqual(r.status_code, 200)
        user = User.objects.get(email='g@test.invalid')
        self.assertEqual(user.display_name, 'Grace')
        self.assertFalse(user.has_usable_password())
        self.assertIsNotNone(user.email_verified_at)

    def test_otp_wrong_code_then_lockout(self):
        code = self.code_for('h@test.invalid')
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5):
            self.assertEqual(self.post('verify-code', {'email': 'h@test.invalid', 'code': wrong}).status_code, 400)
        self.assertEqual(self.post('verify-code', {'email': 'h@test.invalid', 'code': code}).status_code, 400)

    def test_otp_code_is_single_use_and_expires(self):
        code = self.code_for('i@test.invalid')
        self.assertEqual(self.post('verify-code', {'email': 'i@test.invalid', 'code': code}).status_code, 200)
        self.assertEqual(self.post('verify-code', {'email': 'i@test.invalid', 'code': code}).status_code, 400)
        code = self.code_for('i@test.invalid')
        LoginCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.post('verify-code', {'email': 'i@test.invalid', 'code': code}).status_code, 400)

    # --- one identity, both methods (SEC-003) -----------------------------------
    def test_password_account_can_also_use_otp(self):
        first = self.signup_and_confirm('j@test.invalid')
        code = self.code_for('j@test.invalid')
        second = self.post('verify-code', {'email': 'j@test.invalid', 'code': code}).json()
        self.assertEqual(first['user']['id'], second['user']['id'])
        self.assertEqual(User.objects.filter(email='j@test.invalid').count(), 1)
        # the password still works afterwards
        self.assertEqual(self.post('login', {'email': 'j@test.invalid', 'password': GOOD_PASSWORD}).status_code, 200)

    def test_otp_account_can_add_a_password(self):
        code = self.code_for('k@test.invalid')
        pair = self.post('verify-code', {'email': 'k@test.invalid', 'code': code}).json()
        r = self.post('set-password', {'password': GOOD_PASSWORD}, token=pair['access'])
        self.assertEqual(r.status_code, 200)
        login = self.post('login', {'email': 'k@test.invalid', 'password': GOOD_PASSWORD}).json()
        code = self.code_for('k@test.invalid')
        otp = self.post('verify-code', {'email': 'k@test.invalid', 'code': code}).json()
        self.assertEqual(pair['user']['id'], login['user']['id'])
        self.assertEqual(login['user']['id'], otp['user']['id'])

    def test_changing_password_needs_the_current_one(self):
        pair = self.signup_and_confirm('l@test.invalid')
        r = self.post('set-password', {'password': 'brand new password 7', 'current_password': 'wrong'}, token=pair['access'])
        self.assertEqual(r.status_code, 400)
        r = self.post('set-password', {'password': 'brand new password 7', 'current_password': GOOD_PASSWORD}, token=pair['access'])
        self.assertEqual(r.status_code, 200)
        # the old refresh token is now dead (other devices signed out)
        self.assertEqual(self.post('refresh', {'refresh': pair['refresh']}).status_code, 401)

    def test_pre_hijack_password_is_dropped_when_owner_proves_email_by_code(self):
        # An attacker signs up with the victim's address and never confirms…
        self.post('signup', {'email': 'victim@test.invalid', 'password': 'attacker chosen pass 1', 'display_name': 'X'})
        # …the real owner signs in with an email code.
        code = self.code_for('victim@test.invalid')
        self.assertEqual(self.post('verify-code', {'email': 'victim@test.invalid', 'code': code}).status_code, 200)
        r = self.post('login', {'email': 'victim@test.invalid', 'password': 'attacker chosen pass 1'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.get(email='victim@test.invalid').has_usable_password())

    # --- password reset ------------------------------------------------------------
    def test_forgot_and_reset_password(self):
        old = self.signup_and_confirm('m@test.invalid')
        mail.outbox.clear()
        self.assertEqual(self.post('forgot-password', {'email': 'm@test.invalid'}).json(), {'status': 'check-email'})
        query = parse_qs(urlparse(self.last_mail_link()).query)
        body = {'uid': query['uid'][0], 'token': query['token'][0], 'password': 'a fresh new password 3'}
        self.assertEqual(self.post('reset-password', body).status_code, 200)
        self.assertEqual(self.post('reset-password', body).status_code, 400)  # single use
        self.assertEqual(self.post('login', {'email': 'm@test.invalid', 'password': GOOD_PASSWORD}).status_code, 400)
        self.assertEqual(self.post('login', {'email': 'm@test.invalid', 'password': 'a fresh new password 3'}).status_code, 200)
        self.assertEqual(self.post('refresh', {'refresh': old['refresh']}).status_code, 401)

    def test_forgot_password_unknown_email_same_reply_no_mail(self):
        mail.outbox.clear()
        self.assertEqual(self.post('forgot-password', {'email': 'ghost@test.invalid'}).json(), {'status': 'check-email'})
        self.assertEqual(mail.outbox, [])

    # --- no special accounts (SEC-015) -----------------------------------------------
    def test_every_account_is_an_ordinary_user(self):
        for email in ('n@test.invalid', FORMER_OWNER):
            code = self.code_for(email)
            pair = self.post('verify-code', {'email': email, 'code': code}).json()
            self.assertEqual(decode(pair['access'], 'access')['role'], 'user')
            self.assertFalse(User.objects.get(email=email).is_staff)

    def test_purpose_field_is_ignored(self):
        # The old "portfolio" sign-in purpose no longer exists or changes anything.
        code = self.code_for('o2@test.invalid', purpose='portfolio')
        self.assertIsNotNone(code)
        self.assertEqual(self.post('verify-code', {'email': 'o2@test.invalid', 'code': code, 'purpose': 'portfolio'}).status_code, 200)

    # --- sessions ------------------------------------------------------------------
    def test_refresh_rotates_and_logout_revokes(self):
        pair = self.signup_and_confirm('o@test.invalid')
        new = self.post('refresh', {'refresh': pair['refresh']})
        self.assertEqual(new.status_code, 200)
        self.assertEqual(self.post('refresh', {'refresh': pair['refresh']}).status_code, 401)
        self.post('logout', {'refresh': new.json()['refresh']})
        self.assertEqual(self.post('refresh', {'refresh': new.json()['refresh']}).status_code, 401)

    def test_me_and_profile(self):
        pair = self.signup_and_confirm('p@test.invalid', name='Pat')
        me = self.get('me', pair['access']).json()['user']
        self.assertEqual((me['display_name'], me['has_password'], me['role']), ('Pat', True, 'user'))
        r = self.post('update-profile', {'display_name': '  Pat   Lee '}, token=pair['access'])
        self.assertEqual(r.json()['user']['display_name'], 'Pat Lee')
        self.assertEqual(self.get('me', pair['refresh']).status_code, 401)  # refresh token isn't an access token

    # --- abuse limits ----------------------------------------------------------------
    def test_code_requests_are_rate_limited_per_email(self):
        for _ in range(5):
            self.post('request-code', {'email': 'q@test.invalid'}, ip='192.0.2.1')
        r = self.post('request-code', {'email': 'q@test.invalid'}, ip='192.0.2.2')
        self.assertEqual(r.status_code, 429)

    def test_login_is_rate_limited(self):
        self.signup_and_confirm('r@test.invalid')
        for _ in range(10):
            self.post('login', {'email': 'r@test.invalid', 'password': 'wrong wrong wrong'}, ip='192.0.2.9')
        r = self.post('login', {'email': 'r@test.invalid', 'password': GOOD_PASSWORD}, ip='192.0.2.10')
        self.assertEqual(r.status_code, 429)


@override_settings(AUTH_SERVICE_KEY=KEY, FRONTEND_URL='https://site.test')
class AccountDeletionTests(AuthTestBase):
    def test_password_account_deletion_needs_password_then_token(self):
        pair = self.signup_and_confirm('del-a@test.invalid')
        r = self.post('delete-account/confirm', {'password': 'wrong one'}, token=pair['access'])
        self.assertEqual(r.status_code, 400)
        r = self.post('delete-account/confirm', {'password': GOOD_PASSWORD}, token=pair['access'])
        token = r.json()['deletion_token']
        self.assertEqual(self.post('delete-account', {'deletion_token': 'forged'}, token=pair['access']).status_code, 400)
        self.assertEqual(self.post('delete-account', {'deletion_token': token}, token=pair['access']).json(), {'status': 'deleted'})
        self.assertFalse(User.objects.filter(email='del-a@test.invalid').exists())
        self.assertEqual(self.post('refresh', {'refresh': pair['refresh']}).status_code, 401)
        self.assertEqual(self.post('login', {'email': 'del-a@test.invalid', 'password': GOOD_PASSWORD}).status_code, 400)

    def test_code_account_deletion_needs_fresh_code(self):
        code = self.code_for('del-b@test.invalid')
        pair = self.post('verify-code', {'email': 'del-b@test.invalid', 'code': code}).json()
        self.assertEqual(self.post('delete-account/confirm', {'code': code}, token=pair['access']).status_code, 400)  # used
        code = self.code_for('del-b@test.invalid')
        token = self.post('delete-account/confirm', {'code': code}, token=pair['access']).json()['deletion_token']
        self.assertEqual(self.post('delete-account', {'deletion_token': token}, token=pair['access']).status_code, 200)
        self.assertFalse(User.objects.filter(email='del-b@test.invalid').exists())

    def test_token_is_bound_to_its_account(self):
        a = self.signup_and_confirm('del-c@test.invalid')
        b = self.signup_and_confirm('del-d@test.invalid')
        token = self.post('delete-account/confirm', {'password': GOOD_PASSWORD}, token=a['access']).json()['deletion_token']
        self.assertEqual(self.post('delete-account', {'deletion_token': token}, token=b['access']).status_code, 400)
        self.assertTrue(User.objects.filter(email='del-d@test.invalid').exists())

    def test_former_owner_address_can_delete_like_anyone(self):
        code = self.code_for(FORMER_OWNER)
        pair = self.post('verify-code', {'email': FORMER_OWNER, 'code': code}).json()
        token = self.post('delete-account/confirm', {'code': self.code_for(FORMER_OWNER)}, token=pair['access']).json()['deletion_token']
        self.assertEqual(self.post('delete-account', {'deletion_token': token}, token=pair['access']).status_code, 200)
        self.assertFalse(User.objects.filter(email=FORMER_OWNER).exists())
