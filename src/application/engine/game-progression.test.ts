import { describe, expect, it } from 'vitest';
import { createDoubleDeck } from '@/domain';
import { asPlayerId } from '@/domain/types/players';
import {
  buildGameSummary,
  buildNextRoundSnapshot,
  canStartNextRound,
  FINAL_TIE_BREAK_RULE,
  getNextRoundIndex,
} from '@/application/engine/game-progression';

const player1 = asPlayerId('player-1');
const player2 = asPlayerId('player-2');

describe('game progression', () => {
  it('transitions correctly from round 1 to round 2 preserving accumulated totals', () => {
    const nextSnapshot = buildNextRoundSnapshot({
      roomId: 'room-1',
      gameId: 'game-1',
      orderedPlayerIds: [player1, player2],
      nextRoundIndex: 2,
      scoreTotals: {
        [player1]: 15,
        [player2]: 30,
      },
      startingPlayerId: player2,
      shuffledDeck: createDoubleDeck(),
    });

    expect(nextSnapshot.publicState.roundIndex).toBe(2);
    expect(nextSnapshot.publicState.currentTurnPlayerId).toBe(player2);
    expect(nextSnapshot.publicState.playersWhoAreDown).toEqual([]);
    expect(nextSnapshot.publicState.publicTableMelds).toEqual([]);
    expect(nextSnapshot.publicState.winnerOfRound).toBeNull();
    expect(nextSnapshot.publicState.pendingOutOfTurnClaim).toBeNull();
    expect(nextSnapshot.engineState.pendingTurnDiscard).toBeNull();
    expect(nextSnapshot.privateStates[player1]?.scoreTotal).toBe(15);
    expect(nextSnapshot.privateStates[player2]?.scoreTotal).toBe(30);
    expect(nextSnapshot.privateStates[player1]?.hasGoneDown).toBe(false);
    expect(nextSnapshot.privateStates[player2]?.hasGoneDown).toBe(false);
  });

  it('blocks startNextRound when the round is not ready', () => {
    expect(canStartNextRound(1, 'playing', false, true)).toBe(false);
    expect(canStartNextRound(1, 'scoring', true, true)).toBe(false);
    expect(canStartNextRound(1, 'scoring', false, false)).toBe(false);
    expect(canStartNextRound(8, 'scoring', false, true)).toBe(false);
  });

  it('allows startNextRound only after a scored non-final round', () => {
    expect(canStartNextRound(1, 'scoring', false, true)).toBe(true);
    expect(getNextRoundIndex(1)).toBe(2);
  });

  it('returns null when there is no next round after round 8', () => {
    expect(getNextRoundIndex(8)).toBeNull();
  });

  it('finalizes the game with the player holding the lowest total score', () => {
    const summary = buildGameSummary({
      roomId: 'room-1',
      gameId: 'game-1',
      orderedPlayerIds: [player1, player2],
      scoreTotals: {
        [player1]: 60,
        [player2]: 45,
      },
      displayNames: {
        [player1]: 'Alice',
        [player2]: 'Bob',
      },
      roundResults: [
        {
          roomId: 'room-1',
          roundIndex: 1,
          closedByPlayerId: player1,
          winnerPlayerId: player1,
          multiplierApplied: 3,
          winnerWentOutFromInitialLaydown: true,
          nobodyElseHadLaidDown: true,
          entries: [],
          createdAt: null,
        },
        {
          roomId: 'room-1',
          roundIndex: 8,
          closedByPlayerId: player2,
          winnerPlayerId: player2,
          multiplierApplied: 1,
          winnerWentOutFromInitialLaydown: false,
          nobodyElseHadLaidDown: false,
          entries: [],
          createdAt: null,
        },
      ],
    });

    expect(summary.winnerPlayerId).toBe(player2);
    expect(summary.standings[0]?.playerId).toBe(player2);
    expect(summary.tieBreakRule).toBe(FINAL_TIE_BREAK_RULE);
  });

  it('uses the initial seat order as deterministic MVP tiebreak', () => {
    const summary = buildGameSummary({
      roomId: 'room-1',
      gameId: 'game-1',
      orderedPlayerIds: [player1, player2],
      scoreTotals: {
        [player1]: 50,
        [player2]: 50,
      },
      displayNames: {
        [player1]: 'Alice',
        [player2]: 'Bob',
      },
      roundResults: [
        {
          roomId: 'room-1',
          roundIndex: 8,
          closedByPlayerId: player2,
          winnerPlayerId: player2,
          multiplierApplied: 1,
          winnerWentOutFromInitialLaydown: false,
          nobodyElseHadLaidDown: false,
          entries: [],
          createdAt: null,
        },
      ],
    });

    expect(summary.winnerPlayerId).toBe(player1);
    expect(summary.standings[0]?.playerId).toBe(player1);
    expect(summary.standings[1]?.playerId).toBe(player2);
  });
});
