from django.urls import path
from .views import CreateRoomView, StartGameView, RoundVoteView, \
    JoinRoomView, SpyGuessView, RestartGameView, GameStatusView

urlpatterns = [
    # Room management
    path('create/', CreateRoomView.as_view(), name='create-room'),
    path('<str:code>/join/', JoinRoomView.as_view(), name='join-room'),
    path('rooms/<str:code>/start/', StartGameView.as_view(), name='start-game'),

    # Voting
    path('<str:code>/round/<int:round_number>/vote/', RoundVoteView.as_view(), name='round-vote'),

    # Spy guess
    path('<str:code>/spy-guess/', SpyGuessView.as_view(), name='spy-guess'),

    path('status/<str:room_code>/', GameStatusView.as_view(), name='game-status'),
    # Restart game
    path('<str:code>/restart/', RestartGameView.as_view(), name='restart-game'),
]