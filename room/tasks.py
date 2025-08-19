from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.utils import timezone
from room.models import Room, Round
from player.models import Player, Vote
import logging

from room.serializers import RoomSerializer

logger = logging.getLogger(__name__)

@shared_task
def start_voting_task(room_code, round_number):
    logger.info("Starting voting task for room %s, round %s", room_code, round_number)
    try:
        logger.info("Trying to get Room with code=%s", room_code)
        room = Room.objects.get(code=room_code)
        logger.info("Room fetched: %s", room)
        logger.info("Trying to get Round number=%s in room %s", round_number, room)
        round_obj = Round.objects.get(room=room, number=round_number)
        logger.info("Round fetched: %s", round_obj)
        round_obj.status = 'voting'
        round_obj.save()
        channel_layer = get_channel_layer()
        logger.info ("Got channel layer: %s", type(channel_layer))
        async_to_sync(channel_layer.group_send)(
            f"game_{room.code}",
            {
                "type": "game_state_update",  # must match consumer method
            }
        )
        logger.info("Voting started for room %s, round %s", room_code, round_number)
    except Exception as e:
        logger.error("Error starting voting for room %s, round %s: %s", room_code, round_number, e)
        return

    # Schedule end of voting after vote_timer_seconds
    end_round_task.apply_async(args=[room_code, round_number], countdown=round_obj.vote_timer_seconds)
    logger.info("End round task scheduled for room %s, round %s in %s seconds",
                room_code, round_number, round_obj.vote_timer_seconds)


@shared_task
def end_round_task(room_code, round_number):
    logger.info("Ending round task for room %s, round %s", room_code, round_number)
    channel_layer = get_channel_layer()

    try:
        room = Room.objects.get(code=room_code)
        round_obj = Round.objects.get(room=room, number=round_number)
        round_obj.status = 'collecting votes'
        round_obj.save()

        async_to_sync(channel_layer.group_send)(
            f"game_{room.code}",
            {"type": "game_state_update"},
        )
    except (Room.DoesNotExist, Round.DoesNotExist) as e:
        logger.error("Error ending round for room %s, round %s: %s", room_code, round_number, e)
        return

    # Count votes
    votes = Vote.objects.filter(room=room, round_number=round_number)
    round_obj.status = 'calculating results'
    round_obj.save()

    async_to_sync(channel_layer.group_send)(
        f"game_{room.code}",
        {"type": "game_state_update"},
    )

    vote_counts = {}
    for vote in votes:
        vote_counts[vote.votee.id] = vote_counts.get(vote.votee.id, 0) + 1

    if not vote_counts:
        logger.info("No votes found for room %s, round %s", room_code, round_number)
        return

    max_votes = max(vote_counts.values())
    top_voted_ids = [pid for pid, count in vote_counts.items() if count == max_votes]

    spy = room.spy
    eliminated_player = None

    if len(top_voted_ids) > 1:
        # Tie case
        if spy.id in top_voted_ids:
            # Spy + non-spy tied → eliminate the non-spy
            non_spy_ids = [pid for pid in top_voted_ids if pid != spy.id]
            if non_spy_ids:
                eliminated_player = Player.objects.get(id=non_spy_ids[0])
        else:
            # Tie but no spy involved → spy wins
            room.status = 'ended'
            room.winner = 'spy'
            logger.info("Tie detected without spy → Spy wins in room %s", room_code)
    else:
        # Single most-voted
        eliminated_player = Player.objects.get(id=top_voted_ids[0])

    # Apply elimination if found
    if eliminated_player:
        eliminated_player.is_alive = False
        eliminated_player.save()
        round_obj.eliminated = eliminated_player  # ✅ FK to Player, not just name
        logger.info("Player %s eliminated", eliminated_player.id)

    # Save state
    room.save()
    round_obj.status = 'ended'
    round_obj.save()

    logger.info("Round %s ended for room %s", round_number, room_code)
    async_to_sync(channel_layer.group_send)(
        f"game_{room.code}",
        {"type": "game_state_update"},
    )



# code from gpt