import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

ROOM_PLAYERS = {}


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"game_{self.room_code}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        self.session_id = None
        print(f"[WS] New connection to room {self.room_code}")

        # Send initial state
        await self.send_current_game_state()

    async def disconnect(self, close_code):
        if self.session_id and self.room_code in ROOM_PLAYERS:
            ROOM_PLAYERS[self.room_code].pop(self.session_id, None)
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "game_state_update"}
            )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")

        if action == "join":
            self.session_id = data.get("player_id")
            if not self.session_id:
                return  # ignore join without session_id

            if self.room_code not in ROOM_PLAYERS:
                ROOM_PLAYERS[self.room_code] = {}

            ROOM_PLAYERS[self.room_code][self.session_id] = self.channel_name

            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "game_state_update"}
            )

        elif action == "leave":
            if self.session_id and self.room_code in ROOM_PLAYERS:
                ROOM_PLAYERS[self.room_code].pop(self.session_id, None)
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "game_state_update"}
                )
        elif action == "start_game":
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "game_state_update"}
            )
        elif action == "restart_game":
            # Reset room or round state here
            await self.reset_game()
            # Broadcast updated state
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "game_state_update"}
            )

    async def game_state_update(self, event):
        await self.send_current_game_state()

    @database_sync_to_async
    def fetch_me(self):
        from player.models import Player
        from player.serializers import PlayerSerializer
        try:
            p = Player.objects.get(session_id=self.session_id)
            return PlayerSerializer(p).data
        except Player.DoesNotExist:
            return None
    @database_sync_to_async
    def fetch_players(self):
        if self.room_code not in ROOM_PLAYERS:
            return []

        players = []
        session_ids = ROOM_PLAYERS[self.room_code].keys()
        from player.models import Player

        for session_id in session_ids:
            try:
                player = Player.objects.get(session_id=session_id)
                players.append({
                    "id": player.id,
                    "name": player.name,
                    "is_host": player.is_host,
                    "is_alive": player.is_alive,
                })
            except Player.DoesNotExist:
                players.append({
                    "id": session_id,
                    "name": "Unknown",
                    "is_host": False,
                    "is_alive": False,
                })
        return players

    @database_sync_to_async
    def fetch_room(self):
        from room.models import Room
        try:
            return Room.objects.get(code=self.room_code)
        except Room.DoesNotExist:
            return None

    @sync_to_async
    def serialize_room(self, room):
        if not room:
            return "unknown"
        from room.serializers import RoomSerializer
        data = RoomSerializer(room).data

        return data

    async def send_current_game_state(self):
        from player.models import Player

        players = await self.fetch_players()
        room = await self.fetch_room()
        room_data = await self.serialize_room(room)
        round = await self.fetch_current_round()
        me = await self.fetch_me()
        round_data = None

        if round:
            eliminated_player_name = None
            if round.eliminated_id:
                # Fetch eliminated player safely in async context
                try:
                    eliminated_player = await sync_to_async(Player.objects.get)(id=round.eliminated_id)
                    eliminated_player_name = eliminated_player.name
                except Player.DoesNotExist:
                    eliminated_player_name = "Unknown"

            round_data = {
                "round_start": round.round_start_time.isoformat(),
                "round_timer": round.round_timer_seconds,
                "vote_timer": round.vote_timer_seconds,
                "eliminated": eliminated_player_name,
            }

        await self.send(text_data=json.dumps({
            "players": players,
            "room": room_data,
            "room_status": room.status if room else None,
            "round": round_data,
            "round_status": round.status if round else None,
            "me": me if me else "unknown",
        }))

    @database_sync_to_async
    def fetch_current_round(self):
        from room.models import Round
        from room.models import Room
        try:
            room = Room.objects.get(code=self.room_code)
            return Round.objects.filter(room=room).latest("round_start_time")
        except Round.DoesNotExist:
            return None

    @database_sync_to_async
    def reset_game(self):
        from room.models import Round, Room
        try:
            room = Room.objects.get(code=self.room_code)
            # Delete rounds or reset fields
            Round.objects.filter(room=room).delete()
            room.status = "waiting"
            room.save()
        except Room.DoesNotExist:
            pass