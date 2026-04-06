import { createAddCardsToExistingMeldUseCase } from '@/application/use-cases/add-cards-to-existing-meld';
import { createAdvanceTurnUseCase } from '@/application/use-cases/advance-turn';
import { createAttemptInitialMeldDownUseCase } from '@/application/use-cases/attempt-initial-meld-down';
import { createClaimOutOfTurnDiscardUseCase } from '@/application/use-cases/claim-out-of-turn-discard';
import { createCloseRoundAndScoreUseCase } from '@/application/use-cases/close-round-and-score';
import { createCreateRoomUseCase } from '@/application/use-cases/create-room';
import { createDiscardCardUseCase } from '@/application/use-cases/discard-card';
import { createDrawFromDeckUseCase } from '@/application/use-cases/draw-from-deck';
import { createDrawFromDiscardUseCase } from '@/application/use-cases/draw-from-discard';
import { createFinishRoundIfPlayerIsEmptyUseCase } from '@/application/use-cases/finish-round-if-player-is-empty';
import { createFinalizeGameUseCase } from '@/application/use-cases/finalize-game';
import { createInitializeGameRoundUseCase } from '@/application/use-cases/initialize-game-round';
import { createJoinRoomByCodeUseCase } from '@/application/use-cases/join-room-by-code';
import { createLeaveRoomUseCase } from '@/application/use-cases/leave-room';
import { createRearrangeTableMeldsUseCase } from '@/application/use-cases/rearrange-table-melds';
import { createRejectOutOfTurnDiscardUseCase } from '@/application/use-cases/reject-out-of-turn-discard';
import { createSignInAnonymouslyIfNeededUseCase } from '@/application/use-cases/sign-in-anonymously-if-needed';
import { createStartNextRoundUseCase } from '@/application/use-cases/start-next-round';
import { createStartGameFromLobbyUseCase } from '@/application/use-cases/start-game-from-lobby';
import { createSubscribeToGameCompletionUseCase } from '@/application/use-cases/subscribe-to-game-completion';
import { createSubscribeToPrivatePlayerStateUseCase } from '@/application/use-cases/subscribe-to-private-player-state';
import { createSubscribeToPublicGameStateUseCase } from '@/application/use-cases/subscribe-to-public-game-state';
import { createSubscribeToPlayersInRoomUseCase } from '@/application/use-cases/subscribe-to-players-in-room';
import { createSubscribeToRoomUseCase } from '@/application/use-cases/subscribe-to-room';
import { createSubscribeToRoundResultUseCase } from '@/application/use-cases/subscribe-to-round-result';
import { createSyncPlayerCardCountUseCase } from '@/application/use-cases/sync-player-card-count';
import { createTouchPlayerPresenceUseCase } from '@/application/use-cases/touch-player-presence';
import { firebaseAuthRepository } from '@/infrastructure/firebase/auth-repository';
import { firebaseGameRepository } from '@/infrastructure/firebase/repositories/firebase-game-repository';
import { firebaseRoomLobbyRepository } from '@/infrastructure/firebase/repositories/firebase-room-lobby-repository';

export const appServices = {
  signInAnonymouslyIfNeeded: createSignInAnonymouslyIfNeededUseCase(firebaseAuthRepository),
  createRoom: createCreateRoomUseCase(
    firebaseAuthRepository,
    firebaseRoomLobbyRepository,
  ),
  joinRoomByCode: createJoinRoomByCodeUseCase(
    firebaseAuthRepository,
    firebaseRoomLobbyRepository,
  ),
  subscribeToRoom: createSubscribeToRoomUseCase(firebaseRoomLobbyRepository),
  subscribeToPlayersInRoom: createSubscribeToPlayersInRoomUseCase(
    firebaseRoomLobbyRepository,
  ),
  initializeGameRound: createInitializeGameRoundUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  closeRoundAndScore: createCloseRoundAndScoreUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  startNextRound: createStartNextRoundUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  finalizeGame: createFinalizeGameUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  subscribeToPublicGameState: createSubscribeToPublicGameStateUseCase(firebaseGameRepository),
  subscribeToRoundResult: createSubscribeToRoundResultUseCase(firebaseGameRepository),
  subscribeToGameCompletion: createSubscribeToGameCompletionUseCase(firebaseGameRepository),
  subscribeToPrivatePlayerState: createSubscribeToPrivatePlayerStateUseCase(
    firebaseGameRepository,
  ),
  startGameFromLobby: createStartGameFromLobbyUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  drawFromDeck: createDrawFromDeckUseCase(firebaseAuthRepository, firebaseGameRepository),
  drawFromDiscard: createDrawFromDiscardUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  discardCard: createDiscardCardUseCase(firebaseAuthRepository, firebaseGameRepository),
  attemptInitialMeldDown: createAttemptInitialMeldDownUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  addCardsToExistingMeld: createAddCardsToExistingMeldUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  rearrangeTableMelds: createRearrangeTableMeldsUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  claimOutOfTurnDiscard: createClaimOutOfTurnDiscardUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  rejectOutOfTurnDiscard: createRejectOutOfTurnDiscardUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  advanceTurn: createAdvanceTurnUseCase(firebaseAuthRepository, firebaseGameRepository),
  syncPlayerCardCount: createSyncPlayerCardCountUseCase(firebaseGameRepository),
  finishRoundIfPlayerIsEmpty: createFinishRoundIfPlayerIsEmptyUseCase(
    firebaseAuthRepository,
    firebaseGameRepository,
  ),
  leaveRoom: createLeaveRoomUseCase(
    firebaseAuthRepository,
    firebaseRoomLobbyRepository,
  ),
  touchPlayerPresence: createTouchPlayerPresenceUseCase(firebaseRoomLobbyRepository),
  authRepository: firebaseAuthRepository,
  gameRepository: firebaseGameRepository,
  roomLobbyRepository: firebaseRoomLobbyRepository,
};
