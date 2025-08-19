from django.db import models
from django.db.models import SET_NULL


# Create your models here.

class Room(models.Model):
    code = models.CharField(max_length=4, unique=True)
    status = models.CharField(max_length=10,choices=[('waiting','Waiting'),('started','Started'),('ended','Ended')])
    secret_word = models.CharField(max_length=100)
    spy = models.ForeignKey(
        'player.Player',
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='spy_in_rooms'
    )
    host = models.ForeignKey(
        'player.Player',
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='hosted_rooms'
    )
    winner = models.CharField(max_length=100, null=True, blank=True )
class Round(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='rounds')
    number = models.PositiveIntegerField()
    status = models.CharField(max_length=20)  # active / voting / ended
    round_start_time = models.DateTimeField(null=True, blank=True)
    round_timer_seconds = models.IntegerField(default=120)
    vote_timer_seconds = models.IntegerField(default=30)
    eliminated =  models.ForeignKey('player.Player', null=True, blank=True, on_delete=models.SET_NULL)