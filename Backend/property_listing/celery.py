import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "property_listing.settings")

app = Celery("property_listing")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
