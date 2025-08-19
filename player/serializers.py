from rest_framework import serializers
from .models import Player, Vote

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['id', 'name', 'is_spy', 'is_host', 'is_alive']

class VoteSerializer(serializers.ModelSerializer):
    voter_session_id = serializers.CharField()
    votee_id = serializers.IntegerField()
    class Meta:
        model = Vote
        fields = ['voter_session_id', 'votee_id',]

class SpyGuessSerializer(serializers.ModelSerializer):
    secret_word = serializers.CharField()
    class Meta:
        model = Player
        fields = ['secret_word']
