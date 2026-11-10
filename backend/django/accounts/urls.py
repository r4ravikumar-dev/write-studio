from django.urls import path

from . import views

urlpatterns = [
    path('request-code', views.request_code),
    path('verify-code', views.verify_code),
    path('signup', views.signup),
    path('confirm-email', views.confirm_email),
    path('login', views.login),
    path('forgot-password', views.forgot_password),
    path('reset-password', views.reset_password),
    path('me', views.me),
    path('update-profile', views.update_profile),
    path('set-password', views.set_password),
    path('delete-account/confirm', views.confirm_account_deletion),
    path('delete-account', views.delete_account),
    path('refresh', views.refresh),
    path('logout', views.logout),
    path('health', views.health),
]
