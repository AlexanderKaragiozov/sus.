import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async



# room_code -> {session_id: {"channel": str, "is_host": bool}}
ROOM_PLAYERS = {}


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"game_{self.room_code}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        self.session_id = None
        print(f"[WS] New connection to room {self.room_code}")

    async def disconnect(self, close_code):
        if self.session_id and self.room_code in ROOM_PLAYERS:
            ROOM_PLAYERS[self.room_code].pop(self.session_id, None)
            # Notify others
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "game_state_update"}
            )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")

        if action == "join":
            self.session_id = data["player_id"]

            if self.room_code not in ROOM_PLAYERS:
                ROOM_PLAYERS[self.room_code] = {}

            # First player to join the room is host
            is_host = len(ROOM_PLAYERS[self.room_code]) == 0

            ROOM_PLAYERS[self.room_code][self.session_id] = {
                "channel": self.channel_name,
                "is_host": is_host,
            }

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

    async def game_state_update(self, event):
        await self.send_current_game_state()

    @database_sync_to_async
    def get_player_info(self, session_id, is_host):
        from player.models import Player
        try:
            player = Player.objects.get(session_id=session_id)
            return {
                "id": session_id,
                "name": player.name,
                "is_host": is_host,
            }
        except Player.DoesNotExist:
            return {
                "id": session_id,
                "name": "Unknown",
                "is_host": is_host,
            }

    async def send_current_game_state(self):
        players = []
        for session_id, info in ROOM_PLAYERS.get(self.room_code, {}).items():
            player_data = await self.get_player_info(session_id, info["is_host"])
            players.append(player_data)

        await self.send(text_data=json.dumps({
            "players": players,
            "status": "started" if len(players) > 1 else "waiting"
        }))
