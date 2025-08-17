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
    try:
        room = Room.objects.get(code=room_code)
        round_obj = Round.objects.get(room=room, number=round_number)
    except (Room.DoesNotExist, Round.DoesNotExist) as e:
        logger.error("Error ending round for room %s, round %s: %s", room_code, round_number, e)
        return

    # Count votes
    votes = Vote.objects.filter(room=room, round_number=round_number)
    logger.info("Votes for room %s, round %s: %s", room_code, round_number, list(votes))

    vote_counts = {}
    for vote in votes:
        vote_counts[vote.votee.id] = vote_counts.get(vote.votee.id, 0) + 1

    if not vote_counts:
        logger.info("No votes found for room %s, round %s", room_code, round_number)
        return

    max_votes = max(vote_counts.values())
    eliminated_players_ids = [pid for pid, count in vote_counts.items() if count == max_votes]
    logger.info("Eliminated player IDs for room %s, round %s: %s", room_code, round_number, eliminated_players_ids)

    spy = room.spy

    for pid in eliminated_players_ids:
        try:
            player = Player.objects.get(id=pid)
            player.is_alive = False
            player.save()
            logger.info("Player %s marked as eliminated", player.id)
        except Player.DoesNotExist:
            logger.warning("Player with id %s does not exist", pid)

    if spy.id in eliminated_players_ids:
        # Spy eliminated → let spy guess
        room.status = 'spy_guess'
        logger.info("Spy eliminated, waiting for spy guess, room %s", room_code)
    else:
        # Non-spy eliminated → spy wins, game ends
        room.status = 'ended'
        room.winner = 'spy'
        logger.info("Non-spy eliminated, spy wins, room %s ended", room_code)

    room.save()
    round_obj.status = 'ended'
    round_obj.save()
    logger.info("Round %s ended for room %s", round_number, room_code)
