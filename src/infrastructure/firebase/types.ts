import type { Timestamp } from 'firebase/firestore';
import type { RoomStatus, PlayerPresenceStatus } from '@/application/models/lobby';
import type { MeldType } from '@/domain/types/melds';
import type { Rank, Suit } from '@/domain/types/cards';
import type { RoundIndex } from '@/domain/types/rounds';
import type { GamePhase, TurnPhase } from '@/domain/types/game-state';

export interface FirestoreCardDocument {
  id: string;
  rank: Rank;
  suit: Suit;
  deckNumber: number;
}

export interface FirestoreRoundRequirementDocument {
  meldType: MeldType;
  minimumLength: number;
}

export interface FirestorePublicTableMeldDocument {
  id: string;
  type: MeldType;
  ownerPlayerId: string | null;
  cards: FirestoreCardDocument[];
}

export interface FirestoreOutOfTurnClaimWindowDocument {
  card: FirestoreCardDocument;
  eligiblePlayerIds: string[];
  declinedPlayerIds: string[];
  claimedByPlayerId: string | null;
  sourcePlayerId: string;
}

export interface FirestoreRoomDocument {
  code: string;
  codeNormalized: string;
  hostPlayerId: string;
  status: RoomStatus;
  activeGameId: string | null;
  minPlayers: number;
  maxPlayers: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  startedAt: Timestamp | null;
}

export interface FirestoreRoomCodeDocument {
  roomId: string;
  code: string;
  codeNormalized: string;
  status: RoomStatus;
  currentPlayerCount: number;
  minPlayers: number;
  maxPlayers: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface FirestoreRoomPlayerDocument {
  playerId: string;
  displayName: string;
  seatIndex: number;
  status: PlayerPresenceStatus;
  joinedAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastActiveAt: Timestamp | null;
  leftAt: Timestamp | null;
}

export interface FirestorePrivatePlayerDocument {
  playerId: string;
  roomId: string;
  displayNameCache: string;
  hand: FirestoreCardDocument[];
  hasGoneDown: boolean;
  canTakeOutOfTurnDiscard: boolean;
  scoreTotal: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  secretState: {
    handCardIds: string[];
    stagedCardIds: string[];
  };
}

export interface FirestorePublicGameStateDocument {
  gameId: string;
  roomId: string;
  startedByPlayerId: string;
  phase: Extract<GamePhase, 'playing' | 'scoring' | 'finished'>;
  roundIndex: RoundIndex;
  roundRequirement: FirestoreRoundRequirementDocument[];
  currentTurnPlayerId: string;
  turnPhase: TurnPhase;
  turnNumber: number;
  discardTop: FirestoreCardDocument | null;
  discardCount: number;
  drawPileCount: number;
  playerCardCounts: Record<string, number>;
  orderedPlayerIds: string[];
  playersWhoAreDown: string[];
  publicTableMelds: FirestorePublicTableMeldDocument[];
  winnerOfRound: string | null;
  winnerWentOutFromInitialLaydown: boolean;
  finalWinnerPlayerId: string | null;
  pendingOutOfTurnClaim: FirestoreOutOfTurnClaimWindowDocument | null;
  lastDrawSource: 'deck' | 'discard' | null;
  scoringPending: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  roundStartedAt: Timestamp | null;
  roundEndedAt: Timestamp | null;
  gameCompletedAt: Timestamp | null;
}

export interface FirestoreGameEngineDocument {
  gameId: string;
  roomId: string;
  roundIndex: RoundIndex;
  drawPile: FirestoreCardDocument[];
  discardPile: FirestoreCardDocument[];
  pendingTurnDiscard: FirestoreCardDocument | null;
  currentTurnWentDownPlayerId: string | null;
  turnNumber: number;
  lastDrawSource: 'deck' | 'discard' | null;
  pendingOutOfTurnClaim: FirestoreOutOfTurnClaimWindowDocument | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface FirestoreRoundResultEntryDocument {
  playerId: string;
  displayName: string;
  basePoints: number;
  pointsAwarded: number;
  totalPointsAfterRound: number;
  remainingHand: FirestoreCardDocument[];
}

export interface FirestoreRoundResultDocument {
  roomId: string;
  roundIndex: RoundIndex;
  closedByPlayerId: string;
  winnerPlayerId: string;
  multiplierApplied: 1 | 2 | 3;
  winnerWentOutFromInitialLaydown: boolean;
  nobodyElseHadLaidDown: boolean;
  entries: FirestoreRoundResultEntryDocument[];
  createdAt: Timestamp | null;
}

export interface FirestoreGameSummaryStandingDocument {
  playerId: string;
  displayName: string;
  totalPoints: number;
  rank: number;
}

export interface FirestoreGameSummaryRoundDocument {
  roundIndex: RoundIndex;
  winnerPlayerId: string;
  multiplierApplied: 1 | 2 | 3;
  createdAt: Timestamp | null;
}

export interface FirestoreGameSummaryDocument {
  roomId: string;
  gameId: string;
  winnerPlayerId: string;
  tieBreakRule: string;
  standings: FirestoreGameSummaryStandingDocument[];
  rounds: FirestoreGameSummaryRoundDocument[];
  completedAt: Timestamp | null;
}
