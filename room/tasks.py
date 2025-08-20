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



logger = logging.getLogger(__name__)

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
        logger.info("No votes found for room %s, round %s. Spy wins by default.", room_code, round_number)
        room.status = 'ended'
        room.winner = 'spy'  # <--- ADD THIS LINE
        room.save()
        round_obj.status = 'ended' # Ensure round status is also set to ended
        round_obj.save() # <--- ADD THIS SAVE for round_obj
        async_to_sync(channel_layer.group_send)(
            f"game_{room.code}",
            {"type": "game_state_update"},
        )
        return # <--- IMPORTANT: Exit the function here

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
                # Assuming you want to eliminate only one if multiple non-spies tied.
                # You might need more complex logic here for multiple eliminations or specific tie-breaking.
                eliminated_player = Player.objects.get(id=non_spy_ids[0])
            else: # This case means only the spy was in the tie (which shouldn't happen alone in a tie with >1 top_voted_ids unless all are spies, which is not possible)
                # Or it means a tie between multiple non-spies, but the logic above picks one.
                # If only spy is in top_voted_ids and len(top_voted_ids) > 1, something is off.
                # Assuming this else is for tie with no non-spy to eliminate among top voters.
                # If a tie between multiple non-spies, and spy wasn't voted, spy wins.
                room.winner = 'spy' # If non-spy tie, spy wins.
                room.status = 'ended' # Game ends here
                logger.info("Tie detected without spy being top voted or spy tied with only other spies → Spy wins in room %s", room_code)
        else:
            # Tie among non-spies, or a tie where the spy is not among the top votes
            # In this scenario, if the players fail to correctly identify and eliminate the spy, the spy typically wins.
            room.status = 'ended'
            room.winner = 'spy'
            logger.info("Tie detected without spy being top voted or spy not among top voted → Spy wins in room %s", room_code)
    else:
        # Single most-voted player
        eliminated_player = Player.objects.get(id=top_voted_ids[0])
        # After elimination, you'd check win condition (e.g., if spy was eliminated, players win).
        # This logic should be part of the `game_state_update` or a separate `check_win_condition` function
        # if it's not handled implicitly by the frontend based on the `eliminated_player` and `room.spy` data.
        if eliminated_player.id == spy.id:
            room.winner = 'players'
            room.status = 'ended'
            logger.info("Spy (%s) eliminated. Players win in room %s", eliminated_player.name, room_code)
        else:
            # Non-spy eliminated, game might continue or spy wins if certain conditions met
            # For simplicity, if a non-spy is eliminated and it's the last round or a specific condition,
            # the spy might win by default. Or the game continues.
            # This part needs clear game rules: does eliminating a non-spy immediately end the game?
            # Assuming for now it doesn't immediately set a winner unless the spy is caught.
            logger.info("Non-spy (%s) eliminated in room %s. Game continues or specific win condition needed.", eliminated_player.name, room_code)


    # Apply elimination if found
    if eliminated_player:
        round_obj.eliminated = eliminated_player # Set the eliminated player on the round
        if room.winner != 'players': # Don't set is_alive to False if game already ended with Players win.
                                     # This assumes the game ends immediately upon spy elimination.
            eliminated_player.is_alive = False
            eliminated_player.save()
        logger.info("Player %s eliminated (ID: %s)", eliminated_player.name, eliminated_player.id)


    # Save final state for room and round
    room.save()
    round_obj.status = 'ended'
    round_obj.save()

    logger.info("Round %s ended for room %s. Final room status: %s, winner: %s", round_number, room_code, room.status, room.winner)
    async_to_sync(channel_layer.group_send)(
        f"game_{room.code}",
        {"type": "game_state_update"},
    )



# code from gpt