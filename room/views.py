import uuid
from datetime import timedelta

from channels.layers import get_channel_layer
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
import random, string
import logging
logger = logging.getLogger(__name__)
from .models import Room, Round
from player.models import Player,Vote
from .serializers import RoomSerializer, RoomCreateSerializer, JoinRoomSerializer
from player.serializers import PlayerSerializer, VoteSerializer, SpyGuessSerializer
from .tasks import start_voting_task, end_round_task
from asgiref.sync import async_to_sync
channel_layer = get_channel_layer()
def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase, k=4))


# views.py
class CreateRoomView(APIView):
    serializer_class = RoomCreateSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            room = Room.objects.create(code=generate_room_code(),status='waiting', host=None, winner=None)
            # You can use serializer.validated_data['name'] if needed for other purposes
            return Response({"code": room.code}, status=201)
        return Response(serializer.errors, status=400)

class JoinRoomView(generics.GenericAPIView):
    serializer_class = JoinRoomSerializer

    def post(self, request, code):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data['name']

        try:
            room = Room.objects.get(code=code, status='waiting')
        except Room.DoesNotExist:
            return Response({"error": "Room not found or already started"}, status=404)

        is_host = room.host is None
        sesh_id = str(uuid.uuid4())  # generate a unique session ID
        request.session['session_id'] = sesh_id
        player = Player.objects.create(name=name, room=room, is_host=is_host, is_alive=True, session_id=sesh_id)

        if is_host:
            room.host = player
            room.save()
        async_to_sync(channel_layer.group_send)(
            f"game_{room.code}",
            {
                "type": "game_state_update",  # must match consumer method
                "players": RoomSerializer(room).data,  # or a list of players
                "status": room.status,
            }
        )
        return Response({
            "room": RoomSerializer(room).data,
            "session_id": player.session_id
        })


class StartGameView(APIView):

    secret_word_list = {
        "places": [
        "Airport", "Beach", "Cinema", "Zoo", "Museum", "Library", "Restaurant", "Park",
        "Hospital", "Train Station", "Hotel", "School", "Stadium", "Mall", "Aquarium",
        "Theater", "Mountain", "Cafe", "Bus Stop", "Supermarket", "Bridge", "Harbor",
        "Monument", "Garden", "Market", "Temple", "Castle", "Arena", "Station", "Square",
        "Palace", "Port", "Street", "Tower", "Tunnel", "Reservoir", "Dock", "Island", "Plaza", "Jungle"
    ],
    "items": [
        "Backpack", "Bottle", "Laptop", "Wallet", "Phone", "Keys", "Book", "Umbrella",
        "Glasses", "Watch", "Pen", "Camera", "Shoes", "Hat", "Notebook", "Headphones",
        "Chair", "Table", "Lamp", "Bicycle", "Wallet", "Sunglasses", "Bottle", "Bag",
        "Shoes", "Phone Charger", "Ruler", "Scissors", "Notebook", "Marker", "Eraser",
        "Pillow", "Blanket", "Bottle Opener", "Flashlight", "Fan", "Tablet", "Remote", "Brush", "Gloves"
    ],
    "animals": [
        "Dog", "Cat", "Elephant", "Lion", "Tiger", "Monkey", "Giraffe", "Bear",
        "Rabbit", "Horse", "Kangaroo", "Penguin", "Fox", "Dolphin", "Shark", "Eagle",
        "Snake", "Frog", "Panda", "Whale", "Wolf", "Crocodile", "Owl", "Deer",
        "Squirrel", "Bat", "Lizard", "Moose", "Otter", "Hippopotamus", "Raccoon",
        "Seal", "Parrot", "Chicken", "Duck", "Goat", "Sheep", "Camel", "Butterfly"
    ],
    "foods": [
        "Pizza", "Burger", "Pasta", "Sushi", "Salad", "Sandwich", "Steak", "Soup",
        "Ice Cream", "Chocolate", "Bread", "Cheese", "Cake", "Fries", "Taco", "Pancake",
        "Donut", "Noodles", "Rice", "Apple", "Banana", "Orange", "Strawberry", "Grapes",
        "Chicken", "Fish", "Lamb", "Bacon", "Eggs", "Yogurt", "Milk", "Muffin",
        "Pie", "Sausage", "Corn", "Potato", "Carrot", "Tomato", "Pepper", "Spinach"
    ],
    "professions": [
        "Doctor", "Engineer", "Teacher", "Lawyer", "Chef", "Nurse", "Pilot", "Police",
        "Firefighter", "Artist", "Musician", "Writer", "Actor", "Dancer", "Farmer", "Judge",
        "Scientist", "Photographer", "Mechanic", "Driver", "Architect", "Programmer", "Designer",
        "Journalist", "Coach", "Soldier", "Barber", "Librarian", "Plumber", "Electrician",
        "Singer", "Director", "Baker", "Translator", "Researcher", "Therapist", "Magician",
        "Coach", "Inspector", "Technician"
    ],
    "movies": [
        "Titanic", "Inception", "Avatar", "Gladiator", "Matrix", "Joker", "Interstellar",
        "Frozen", "Coco", "Lion King", "Avengers", "Spiderman", "Batman", "Iron Man",
        "Star Wars", "Thor", "Black Panther", "Shrek", "Toy Story", "Finding Nemo",
        "Up", "Harry Potter", "Lord of the Rings", "Hobbit", "Jurassic Park", "Aladdin",
        "Moana", "Cinderella", "Mulan", "Beauty and the Beast", "Frozen II", "Deadpool",
        "Doctor Strange", "Guardians", "Ant-Man", "Captain Marvel", "Thor Ragnarok",
        "Wonder Woman", "Aquaman", "The Incredibles"
    ],
    "vehicles": [
        "Car", "Bike", "Bus", "Train", "Plane", "Boat", "Ship", "Truck",
        "Motorcycle", "Scooter", "Helicopter", "Submarine", "Tram", "Taxi", "Van",
        "Ambulance", "Fire Truck", "Tank", "Spaceship", "Bicycle", "Skateboard",
        "Rollerblades", "Hot Air Balloon", "Ferry", "Jet Ski", "Rickshaw", "Segway",
        "Snowmobile", "Golf Cart", "Yacht", "Sailboat", "Hoverboard", "Cable Car",
        "Drone", "Carriage", "Subway", "Monorail", "Cruise Ship", "Trolley"
    ],
    "clothing": [
        "Shirt", "Pants", "Dress", "Skirt", "Jacket", "Coat", "Hat", "Cap",
        "Shoes", "Boots", "Socks", "Gloves", "Scarf", "Tie", "Belt", "Sweater",
        "Hoodie", "Shorts", "Blouse", "T-shirt", "Jeans", "Sandals", "Sneakers",
        "Swimsuit", "Raincoat", "Pyjamas", "Vest", "Leggings", "Slippers", "Overalls",
        "Blazer", "Cardigan", "Mittens", "Poncho", "Cloak", "Kimono", "Sarong",
        "Gown", "Uniform", "Capris"
    ],
    "sports": [
        "Soccer", "Basketball", "Tennis", "Cricket", "Baseball", "Golf", "Hockey",
        "Swimming", "Running", "Cycling", "Boxing", "Karate", "Wrestling", "Skiing",
        "Snowboarding", "Skateboarding", "Gymnastics", "Surfing", "Volleyball",
        "Badminton", "Ping Pong", "Rugby", "American Football", "Archery", "Fencing",
        "Weightlifting", "Yoga", "Climbing", "Diving", "Sailing", "Kayaking", "Rowing",
        "Horse Riding", "Martial Arts", "Snooker", "Lacrosse", "Fishing", "Curling",
        "Triathlon", "Parkour"
    ]
    }

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code, status='waiting')
        except Room.DoesNotExist:
            return Response({"error": "Room not found or already started"}, status=404)

        players = list(room.players.all())
        if len(players) < 3:
            return Response({"error": "Not enough players"}, status=400)

        # Reset players
        for p in players:
            p.is_alive = True
            p.is_spy = False
            p.save()

        spy = random.choice(players)
        spy.is_spy = True
        spy.save()

        secret_category = random.choice(list(self.secret_word_list.keys()))
        secret_word = random.choice(self.secret_word_list[secret_category])
        room.secret_word = secret_word
        room.spy = spy
        room.status = 'started'
        room.save()
        round_start_time = timezone.now()
        # Start first round
        new_round = Round.objects.create(room=room, number=1, status='active', round_start_time=round_start_time,
                                         round_timer_seconds=request.data.get('round_timer_seconds', 10),
                                         vote_timer_seconds=request.data.get('vote_timer_seconds', 42))
        start_voting_task.apply_async(args=[room.code, new_round.number], countdown=new_round.round_timer_seconds)

        players_data = [
            {"id": player.id, "name": player.name}
            for player in room.players.all()
        ]

        return Response({
            "room_code": room.code,
            "round_number": new_round.number,
            "round_timer_seconds": new_round.round_timer_seconds,
            "vote_timer_seconds": new_round.vote_timer_seconds,
            "round_start_time": round_start_time,
            "round_end_time": round_start_time + timedelta(seconds=new_round.round_timer_seconds),
            "players": players_data
        })


class RoundVoteView(APIView):

    serializer_class = VoteSerializer

    def post(self, request, code, round_number):
        voter_session = request.data.get('voter_session_id')
        votee_id = request.data.get('votee_id')

        try:
            room = Room.objects.get(code=code, status__in=['started', 'spy_guess'])
        except Room.DoesNotExist:
            return Response({"error": "Room not found or not started"}, status=404)

        try:
            round_obj = Round.objects.get(room=room, number=round_number, status='voting')
        except Round.DoesNotExist:
            return Response({"error": "Round not in voting state"}, status=400)

        try:
            voter = Player.objects.get(session_id=voter_session, room=room, is_alive=True)
            votee = Player.objects.get(id=votee_id, room=room, is_alive=True)
        except Player.DoesNotExist:
            return Response({"error": "Invalid voter or votee"}, status=400)

        if Vote.objects.filter(room=room, voter=voter, round_number=round_obj.number).exists():
            return Response({"error": "Already voted"}, status=400)

        Vote.objects.create(room=room, voter=voter, votee=votee, round_number=round_obj.number)
        return Response({"message": "Vote registered"}, status=201)


class SpyGuessView(APIView):
    serializer_class = SpyGuessSerializer

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code, status='spy_guess')
        except Room.DoesNotExist:
            return Response({"error": "Room not in spy guess state"}, status=400)

        guess_word = request.data.get('secret_word', '').strip().lower()
        spy = room.spy

        if not spy:
            return Response({"error": "No spy found"}, status=400)

        # Check guess
        if guess_word == (room.secret_word or "").lower():
            room.winner = 'spy'
            logger.info("Spy guessed correctly! Spy wins in room %s", code)
        else:
            room.winner = 'players'
            logger.info("Spy guessed incorrectly. Players win in room %s", code)

        room.status = 'ended'
        room.save()

        return Response({"winner": room.winner})



class RestartGameView(APIView):

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        room.status = 'waiting'
        room.secret_word = ''
        room.spy = None
        room.winner = None
        room.save()

        room.players.update(is_alive=True, is_spy=False)
        room.rounds.all().delete()
        Vote.objects.filter(room=room).delete()

        return Response({"message": "Game reset", "room": RoomSerializer(room).data}
                        )



class GameStatusView(APIView):
    serializer_class = RoomSerializer
    def get(self, request, room_code):
        try:
            room = Room.objects.get(code=room_code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)

        # Players
        players = Player.objects.filter(room=room)
        players_data = [
            {
                "id": player.id,
                "name": player.name,
                "is_alive": player.is_alive
            } for player in players
        ]

        # Current round
        current_round = Round.objects.filter(room=room).order_by('-number').first()
        round_data = None
        if current_round:
            round_data = {
                "number": current_round.number,
                "status": current_round.status,
                "start_time": current_round.round_start_time,

            }

        return Response({
            "room": {

                "code": room.code,
                "status": room.status,
                "spy_id": room.spy.id if room.spy else None,
                "winner": room.winner
            },
            "players": players_data,
            "current_round": round_data
        })