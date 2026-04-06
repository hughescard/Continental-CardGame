import type { CardInstance } from '@/domain/types/cards';
import type { PlayerId } from '@/domain/types/players';
import type { RoundIndex } from '@/domain/types/rounds';

export interface PlayerScoreSnapshot {
  playerId: PlayerId;
  totalPoints: number;
}

export interface ScoreEntry {
  playerId: PlayerId;
  roundIndex: RoundIndex;
  basePoints: number;
  multiplierApplied: 1 | 2 | 3;
  pointsAwarded: number;
  totalPointsAfterRound: number;
  remainingHand: readonly CardInstance[];
}

export interface ScoreRoundPlayerInput {
  playerId: PlayerId;
  remainingHand: readonly CardInstance[];
  hadLaidDownInitialMelds: boolean;
}

export interface ScoreRoundInput {
  roundIndex: RoundIndex;
  winnerPlayerId: PlayerId;
  players: readonly ScoreRoundPlayerInput[];
  winnerWentOutFromInitialLaydown: boolean;
  winnerWentOutOnFirstTurn: boolean;
  previousTotals?: readonly PlayerScoreSnapshot[];
}

export interface RoundScoreResult {
  roundIndex: RoundIndex;
  winnerPlayerId: PlayerId;
  entries: readonly ScoreEntry[];
  multiplierApplied: 1 | 2 | 3;
  winnerWentOutFromInitialLaydown: boolean;
  winnerWentOutOnFirstTurn: boolean;
  nobodyElseHadLaidDown: boolean;
}
