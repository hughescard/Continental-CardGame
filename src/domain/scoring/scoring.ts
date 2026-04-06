import { isJoker } from '@/domain/cards/helpers';
import type { Card, CardInstance } from '@/domain/types/cards';
import type {
  PlayerScoreSnapshot,
  RoundScoreResult,
  ScoreEntry,
  ScoreRoundInput,
} from '@/domain/types/scoring';

export function scoreCard(card: Card | CardInstance): number {
  if (isJoker(card)) {
    return 50;
  }

  if (card.rank === 'A') {
    return 20;
  }

  if (['8', '9', '10', 'J', 'Q', 'K'].includes(card.rank)) {
    return 10;
  }

  return 5;
}

export function scoreHand(cards: readonly (Card | CardInstance)[]): number {
  return cards.reduce((total, card) => total + scoreCard(card), 0);
}

export function getRoundScoreMultiplier(
  winnerWentOutFromInitialLaydown: boolean,
  winnerWentOutOnFirstTurn: boolean,
  nobodyElseHadLaidDown: boolean,
): 1 | 2 | 3 {
  if (!winnerWentOutFromInitialLaydown || !nobodyElseHadLaidDown) {
    return 1;
  }

  return winnerWentOutOnFirstTurn ? 3 : 2;
}

function getPreviousTotal(
  playerId: ScoreEntry['playerId'],
  previousTotals: readonly PlayerScoreSnapshot[],
): number {
  return previousTotals.find((entry) => entry.playerId === playerId)?.totalPoints ?? 0;
}

export function scoreRound(input: ScoreRoundInput): RoundScoreResult {
  const previousTotals = input.previousTotals ?? [];
  const nobodyElseHadLaidDown = input.players.every(
    (player) =>
      player.playerId === input.winnerPlayerId || !player.hadLaidDownInitialMelds,
  );
  const multiplierApplied = getRoundScoreMultiplier(
    input.winnerWentOutFromInitialLaydown,
    input.winnerWentOutOnFirstTurn,
    nobodyElseHadLaidDown,
  );

  const entries: ScoreEntry[] = input.players.map((player) => {
    const basePoints =
      player.playerId === input.winnerPlayerId ? 0 : scoreHand(player.remainingHand);
    const pointsAwarded = basePoints * multiplierApplied;
    const previousTotal = getPreviousTotal(player.playerId, previousTotals);

    return {
      playerId: player.playerId,
      roundIndex: input.roundIndex,
      basePoints,
      multiplierApplied,
      pointsAwarded,
      totalPointsAfterRound: previousTotal + pointsAwarded,
      remainingHand: player.remainingHand,
    };
  });

  return {
    roundIndex: input.roundIndex,
    winnerPlayerId: input.winnerPlayerId,
    entries,
    multiplierApplied,
    winnerWentOutFromInitialLaydown: input.winnerWentOutFromInitialLaydown,
    winnerWentOutOnFirstTurn: input.winnerWentOutOnFirstTurn,
    nobodyElseHadLaidDown,
  };
}

export function accumulateScores(
  previousTotals: readonly PlayerScoreSnapshot[],
  entries: readonly ScoreEntry[],
): PlayerScoreSnapshot[] {
  return entries.map((entry) => ({
    playerId: entry.playerId,
    totalPoints:
      getPreviousTotal(entry.playerId, previousTotals) + entry.pointsAwarded,
  }));
}
