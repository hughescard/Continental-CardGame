import type { CardInstance } from '@/domain/types/cards';
import type { TableMeld } from '@/domain/types/melds';
import type { PlayerRoundState, PlayerId } from '@/domain/types/players';
import type { RoundDefinition, RoundIndex } from '@/domain/types/rounds';
import type { PlayerScoreSnapshot, RoundScoreResult } from '@/domain/types/scoring';

export type GamePhase = 'lobby' | 'dealing' | 'playing' | 'scoring' | 'finished';

export type TurnPhase =
  | 'awaiting-draw'
  | 'awaiting-melds'
  | 'awaiting-discard'
  | 'awaiting-out-of-turn-claim'
  | 'completed';

export interface TurnState {
  activePlayerId: PlayerId;
  turnNumber: number;
  phase: TurnPhase;
  pendingOutOfTurnClaim: {
    card: CardInstance;
    eligiblePlayerIds: readonly PlayerId[];
    claimedBy: PlayerId | null;
  } | null;
}

export interface RoundState {
  roundIndex: RoundIndex;
  definition: RoundDefinition;
  players: readonly PlayerRoundState[];
  drawPile: readonly CardInstance[];
  discardPile: readonly CardInstance[];
  tableMelds: readonly TableMeld[];
  turn: TurnState;
  winnerPlayerId: PlayerId | null;
}

export interface GameState {
  phase: GamePhase;
  playerOrder: readonly PlayerId[];
  currentRound: RoundState | null;
  scoreboard: readonly PlayerScoreSnapshot[];
  completedRounds: readonly RoundScoreResult[];
}
