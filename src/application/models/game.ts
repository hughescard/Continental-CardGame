import type { GamePhase, TurnPhase } from '@/domain/types/game-state';
import type { CardInstance } from '@/domain/types/cards';
import type { MeldType } from '@/domain/types/melds';
import type { PlayerId } from '@/domain/types/players';
import type { RoundIndex, RoundRequirement } from '@/domain/types/rounds';

export interface PublicTableMeld {
  id: string;
  type: MeldType;
  ownerPlayerId: PlayerId | null;
  cards: readonly CardInstance[];
}

export interface OutOfTurnClaimWindow {
  card: CardInstance;
  eligiblePlayerIds: readonly PlayerId[];
  declinedPlayerIds: readonly PlayerId[];
  claimedByPlayerId: PlayerId | null;
  sourcePlayerId: PlayerId;
}

export interface RoundResultEntrySummary {
  playerId: PlayerId;
  displayName: string;
  basePoints: number;
  pointsAwarded: number;
  totalPointsAfterRound: number;
  remainingHand: readonly CardInstance[];
}

export interface RoundResultSummary {
  roomId: string;
  roundIndex: RoundIndex;
  closedByPlayerId: PlayerId;
  winnerPlayerId: PlayerId;
  multiplierApplied: 1 | 2 | 3;
  winnerWentOutFromInitialLaydown: boolean;
  nobodyElseHadLaidDown: boolean;
  entries: readonly RoundResultEntrySummary[];
  createdAt: Date | null;
}

export interface GameSummaryStanding {
  playerId: PlayerId;
  displayName: string;
  totalPoints: number;
  rank: number;
}

export interface GameSummaryRoundOverview {
  roundIndex: RoundIndex;
  winnerPlayerId: PlayerId;
  multiplierApplied: 1 | 2 | 3;
  createdAt: Date | null;
}

export interface GameSummary {
  roomId: string;
  gameId: string;
  winnerPlayerId: PlayerId;
  tieBreakRule: string;
  standings: readonly GameSummaryStanding[];
  rounds: readonly GameSummaryRoundOverview[];
  completedAt: Date | null;
}

export interface PublicGameState {
  roomId: string;
  gameId: string;
  phase: Extract<GamePhase, 'playing' | 'scoring' | 'finished'>;
  roundIndex: RoundIndex;
  roundRequirement: readonly RoundRequirement[];
  currentTurnPlayerId: PlayerId;
  turnPhase: TurnPhase;
  turnNumber: number;
  discardTop: CardInstance | null;
  discardCount: number;
  drawPileCount: number;
  playerCardCounts: Readonly<Record<string, number>>;
  orderedPlayerIds: readonly PlayerId[];
  playersWhoAreDown: readonly PlayerId[];
  publicTableMelds: readonly PublicTableMeld[];
  winnerOfRound: PlayerId | null;
  winnerWentOutFromInitialLaydown: boolean;
  finalWinnerPlayerId: PlayerId | null;
  pendingOutOfTurnClaim: OutOfTurnClaimWindow | null;
  lastDrawSource: 'deck' | 'discard' | null;
  scoringPending: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  roundStartedAt: Date | null;
  roundEndedAt: Date | null;
  gameCompletedAt: Date | null;
}

export interface PrivatePlayerGameState {
  roomId: string;
  playerId: PlayerId;
  hand: readonly CardInstance[];
  hasGoneDown: boolean;
  canTakeOutOfTurnDiscard: boolean;
  scoreTotal: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface InternalGameEngineState {
  roomId: string;
  gameId: string;
  roundIndex: RoundIndex;
  drawPile: readonly CardInstance[];
  discardPile: readonly CardInstance[];
  pendingTurnDiscard: CardInstance | null;
  currentTurnWentDownPlayerId: PlayerId | null;
  turnNumber: number;
  lastDrawSource: 'deck' | 'discard' | null;
  pendingOutOfTurnClaim: OutOfTurnClaimWindow | null;
}

export interface GameRoundSnapshot {
  publicState: PublicGameState;
  engineState: InternalGameEngineState;
  privateStates: Readonly<Record<string, PrivatePlayerGameState>>;
}

export interface BuildInitialRoundInput {
  roomId: string;
  gameId: string;
  orderedPlayerIds: readonly PlayerId[];
  roundIndex: RoundIndex;
  initialScoreTotals?: Readonly<Record<string, number>>;
  shuffledDeck?: readonly CardInstance[];
}

export interface AttemptInitialMeldDownInput {
  playerId: PlayerId;
  melds: readonly {
    id: string;
    type: MeldType;
    cardIds: readonly string[];
  }[];
}

export interface AddCardsToExistingMeldInput {
  playerId: PlayerId;
  meldId: string;
  cardIds: readonly string[];
}

export interface RearrangeTableMeldsInput {
  playerId: PlayerId;
  melds: readonly {
    id: string;
    type: MeldType;
    cardIds: readonly string[];
  }[];
}
