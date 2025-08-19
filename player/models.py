from django.db import models
# Create your models here.

class Player(models.Model):
    name = models.CharField(max_length=100)
    is_spy = models.BooleanField(default=False)
    room = models.ForeignKey('room.Room', on_delete=models.CASCADE,related_name='players')
    session_id = models.CharField(max_length=100)
    is_host = models.BooleanField(default=False)
    is_alive = models.BooleanField(default=False)

class Vote(models.Model):
    room = models.ForeignKey('room.Room', on_delete=models.CASCADE)
    voter = models.ForeignKey(
        'player.Player',
        on_delete=models.CASCADE,
        related_name="votes_cast"
    )
    votee = models.ForeignKey(
        'player.Player',
        on_delete=models.CASCADE,
        related_name="votes_received"
    )
    round_number = models.IntegerField()