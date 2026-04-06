import type {
  AddCardsToExistingMeldInput,
  GameSummary,
  PrivatePlayerGameState,
  PublicGameState,
  RearrangeTableMeldsInput,
  AttemptInitialMeldDownInput,
  RoundResultSummary,
} from '@/application/models/game';
import type { PlayerId } from '@/domain/types/players';

export interface InitializeGameRoundInput {
  roomId: string;
  requestedByPlayerId: PlayerId;
}

export interface StartNextRoundInput {
  roomId: string;
  requestedByPlayerId: PlayerId;
}

export interface FinalizeGameInput {
  roomId: string;
  requestedByPlayerId: PlayerId;
}

export interface DrawActionInput {
  roomId: string;
  playerId: PlayerId;
}

export interface DiscardCardInput {
  roomId: string;
  playerId: PlayerId;
  cardId: string;
}

export interface ClaimOutOfTurnDiscardInput {
  roomId: string;
  playerId: PlayerId;
}

export interface RejectOutOfTurnDiscardInput {
  roomId: string;
  playerId: PlayerId;
}

export interface AdvanceTurnInput {
  roomId: string;
  playerId: PlayerId;
}

export interface SyncPlayerCardCountInput {
  roomId: string;
  playerId: PlayerId;
  cardCount: number;
}

export interface GameRepository {
  initializeGameRound: (input: InitializeGameRoundInput) => Promise<PublicGameState>;
  closeRoundAndScore: (roomId: string) => Promise<RoundResultSummary>;
  startNextRound: (input: StartNextRoundInput) => Promise<PublicGameState>;
  finalizeGame: (input: FinalizeGameInput) => Promise<GameSummary>;
  subscribeToPublicGameState: (
    roomId: string,
    listener: (state: PublicGameState | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToRoundResult: (
    roomId: string,
    roundIndex: number,
    listener: (state: RoundResultSummary | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToGameCompletion: (
    roomId: string,
    gameId: string,
    listener: (state: GameSummary | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToPrivatePlayerState: (
    roomId: string,
    playerId: PlayerId,
    listener: (state: PrivatePlayerGameState | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  drawFromDeck: (input: DrawActionInput) => Promise<PublicGameState>;
  drawFromDiscard: (input: DrawActionInput) => Promise<PublicGameState>;
  discardCard: (input: DiscardCardInput) => Promise<PublicGameState>;
  attemptInitialMeldDown: (
    roomId: string,
    input: AttemptInitialMeldDownInput,
  ) => Promise<PublicGameState>;
  addCardsToExistingMeld: (
    roomId: string,
    input: AddCardsToExistingMeldInput,
  ) => Promise<PublicGameState>;
  rearrangeTableMelds: (
    roomId: string,
    input: RearrangeTableMeldsInput,
  ) => Promise<PublicGameState>;
  claimOutOfTurnDiscard: (input: ClaimOutOfTurnDiscardInput) => Promise<PublicGameState>;
  rejectOutOfTurnDiscard: (input: RejectOutOfTurnDiscardInput) => Promise<PublicGameState>;
  advanceTurn: (input: AdvanceTurnInput) => Promise<PublicGameState>;
  syncPlayerCardCount: (input: SyncPlayerCardCountInput) => Promise<void>;
  finishRoundIfPlayerIsEmpty: (
    roomId: string,
    playerId: PlayerId,
  ) => Promise<PublicGameState>;
}
