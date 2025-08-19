from rest_framework import serializers
from .models import Room, Round
from player.serializers import PlayerSerializer

class RoomSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    spy = PlayerSerializer(allow_null=True) # Will use __str__ of Player
    host = PlayerSerializer(allow_null=True)  # Same here

    class Meta:
        model = Room
        fields = ['id', 'code', 'status', 'secret_word', 'spy', 'host', 'players', 'winner']

class RoomCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True)

    class Meta:
        model = Room
        fields = ['name','code']
        read_only_fields = ['code']  # code is generated automatically


class JoinRoomSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)


# class RoundSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Round
#         fields = ['round_timer_seconds']


class RoundUpdateSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['start_voting', 'end_round'])
