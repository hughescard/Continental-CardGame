import { describe, expect, it } from 'vitest';
import { createCardInstance } from '@/domain/cards/helpers';
import { asPlayerId } from '@/domain/types/players';
import {
  accumulateScores,
  getRoundScoreMultiplier,
  scoreCard,
  scoreHand,
  scoreRound,
} from '@/domain/scoring/scoring';

function card(
  rank:
    | 'A'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | 'J'
    | 'Q'
    | 'K'
    | 'JOKER',
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'joker',
) {
  return createCardInstance({
    id: `${rank}-${suit}`,
    rank,
    suit,
    deckNumber: 1,
  });
}

describe('scoreCard', () => {
  it('scores cards according to the rule table', () => {
    expect(scoreCard(card('2', 'clubs'))).toBe(5);
    expect(scoreCard(card('8', 'clubs'))).toBe(10);
    expect(scoreCard(card('A', 'hearts'))).toBe(20);
    expect(scoreCard(card('JOKER', 'joker'))).toBe(50);
  });
});

describe('scoreHand', () => {
  it('sums all cards in hand', () => {
    expect(
      scoreHand([
        card('2', 'clubs'),
        card('10', 'diamonds'),
        card('A', 'hearts'),
        card('JOKER', 'joker'),
      ]),
    ).toBe(85);
  });
});

describe('scoreRound', () => {
  const player1 = asPlayerId('p1');
  const player2 = asPlayerId('p2');
  const player3 = asPlayerId('p3');

  it('applies normal scoring when the bonus condition does not trigger', () => {
    const result = scoreRound({
      roundIndex: 3,
      winnerPlayerId: player1,
      winnerWentOutFromInitialLaydown: false,
      winnerWentOutOnFirstTurn: false,
      players: [
        { playerId: player1, remainingHand: [], hadLaidDownInitialMelds: false },
        {
          playerId: player2,
          remainingHand: [card('2', 'clubs'), card('A', 'hearts')],
          hadLaidDownInitialMelds: true,
        },
      ],
    });

    expect(result.multiplierApplied).toBe(1);
    expect(result.entries.find((entry) => entry.playerId === player2)?.pointsAwarded).toBe(25);
  });

  it('applies double scoring when someone goes out in a single laydown and nobody else was down', () => {
    const result = scoreRound({
      roundIndex: 4,
      winnerPlayerId: player1,
      winnerWentOutFromInitialLaydown: true,
      winnerWentOutOnFirstTurn: false,
      players: [
        { playerId: player1, remainingHand: [], hadLaidDownInitialMelds: false },
        {
          playerId: player2,
          remainingHand: [card('2', 'clubs'), card('A', 'hearts')],
          hadLaidDownInitialMelds: false,
        },
        {
          playerId: player3,
          remainingHand: [card('JOKER', 'joker')],
          hadLaidDownInitialMelds: false,
        },
      ],
    });

    expect(result.multiplierApplied).toBe(2);
    expect(result.entries.find((entry) => entry.playerId === player2)?.pointsAwarded).toBe(50);
    expect(result.entries.find((entry) => entry.playerId === player3)?.pointsAwarded).toBe(100);
  });

  it('applies triple scoring only when the player goes out in the first turn', () => {
    const result = scoreRound({
      roundIndex: 4,
      winnerPlayerId: player1,
      winnerWentOutFromInitialLaydown: true,
      winnerWentOutOnFirstTurn: true,
      players: [
        { playerId: player1, remainingHand: [], hadLaidDownInitialMelds: false },
        {
          playerId: player2,
          remainingHand: [card('10', 'clubs'), card('A', 'hearts')],
          hadLaidDownInitialMelds: false,
        },
      ],
    });

    expect(result.multiplierApplied).toBe(3);
    expect(result.entries.find((entry) => entry.playerId === player2)?.pointsAwarded).toBe(90);
  });

  it('accumulates totals over previous rounds', () => {
    const result = scoreRound({
      roundIndex: 2,
      winnerPlayerId: player1,
      winnerWentOutFromInitialLaydown: false,
      winnerWentOutOnFirstTurn: false,
      previousTotals: [
        { playerId: player1, totalPoints: 15 },
        { playerId: player2, totalPoints: 40 },
      ],
      players: [
        { playerId: player1, remainingHand: [], hadLaidDownInitialMelds: false },
        {
          playerId: player2,
          remainingHand: [card('2', 'clubs'), card('3', 'clubs')],
          hadLaidDownInitialMelds: true,
        },
      ],
    });

    expect(result.entries.find((entry) => entry.playerId === player1)?.totalPointsAfterRound).toBe(
      15,
    );
    expect(result.entries.find((entry) => entry.playerId === player2)?.totalPointsAfterRound).toBe(
      50,
    );

    expect(
      accumulateScores(
        [
          { playerId: player1, totalPoints: 15 },
          { playerId: player2, totalPoints: 40 },
        ],
        result.entries,
      ),
    ).toEqual([
      { playerId: player1, totalPoints: 15 },
      { playerId: player2, totalPoints: 50 },
    ]);
  });
});
