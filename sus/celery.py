# myproject/celery.py

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sus.settings')

app = Celery('sus')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
)
