import { describe, expect, it } from 'vitest';
import { asPlayerId } from '@/domain/types/players';
import { getCardsToDealForRound, getRoundDefinition } from '@/domain/constants/rounds';
import { createCardInstance } from '@/domain/cards/helpers';
import {
  isValidStraight,
  isValidTrio,
  validateRoundMeldSet,
  validateStraight,
  validateTrio,
} from '@/domain/validation/melds';

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
  id?: string,
) {
  return createCardInstance({
    id: id ?? `${rank}-${suit}`,
    rank,
    suit,
    deckNumber: 1,
  });
}

describe('round definitions', () => {
  it('computes exact cards to deal for the defined rounds', () => {
    expect(getRoundDefinition(1).cardsToDeal).toBe(7);
    expect(getCardsToDealForRound(3)).toBe(9);
    expect(getCardsToDealForRound(8)).toBe(13);
  });
});

describe('trio validation', () => {
  it('accepts a natural trio', () => {
    expect(
      isValidTrio([
        card('7', 'clubs'),
        card('7', 'diamonds'),
        card('7', 'spades'),
      ]),
    ).toBe(true);
  });

  it('rejects a trio with conflicting natural ranks', () => {
    const result = validateTrio([
      card('7', 'clubs'),
      card('8', 'diamonds'),
      card('7', 'spades'),
    ]);

    expect(result.isValid).toBe(false);
  });

  it('accepts jokers as wildcards when natural cards are enough', () => {
    const result = validateTrio([
      card('9', 'clubs'),
      card('9', 'diamonds'),
      card('JOKER', 'joker'),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.wildcardCount).toBe(1);
  });

  it('accepts red aces acting as wildcards in a trio', () => {
    const result = validateTrio([
      card('5', 'clubs'),
      card('5', 'spades'),
      card('A', 'hearts'),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.wildcardCount).toBe(1);
  });

  it('accepts red aces acting as real aces in an ace trio', () => {
    const result = validateTrio([
      card('A', 'hearts'),
      card('A', 'diamonds'),
      card('JOKER', 'joker'),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.naturalCount).toBe(2);
    expect(result.wildcardCount).toBe(1);
  });

  it('rejects melds with more wildcards than naturals', () => {
    const result = validateTrio([
      card('5', 'clubs'),
      card('JOKER', 'joker'),
      card('A', 'hearts'),
      card('A', 'diamonds'),
    ]);

    expect(result.isValid).toBe(false);
  });
});

describe('straight validation', () => {
  it('accepts a natural straight', () => {
    expect(
      isValidStraight([
        card('4', 'clubs'),
        card('5', 'clubs'),
        card('6', 'clubs'),
        card('7', 'clubs'),
      ]),
    ).toBe(true);
  });

  it('accepts a cyclic straight', () => {
    const result = validateStraight([
      card('Q', 'spades'),
      card('K', 'spades'),
      card('A', 'spades'),
      card('2', 'spades'),
    ]);

    expect(result.isValid).toBe(true);
  });

  it('accepts a straight with a joker wildcard', () => {
    const result = validateStraight([
      card('4', 'clubs'),
      card('5', 'clubs'),
      card('JOKER', 'joker'),
      card('7', 'clubs'),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.wildcardCount).toBe(1);
  });

  it('accepts a red ace acting as wildcard inside a straight', () => {
    const result = validateStraight([
      card('4', 'clubs'),
      card('5', 'clubs'),
      card('A', 'hearts'),
      card('7', 'clubs'),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.wildcardCount).toBe(1);
  });

  it('accepts a red ace acting as real card in a straight', () => {
    const result = validateStraight([
      card('Q', 'hearts'),
      card('K', 'hearts'),
      card('A', 'hearts'),
      card('2', 'hearts'),
    ]);

    expect(result.isValid).toBe(true);
    expect(result.naturalCount).toBe(4);
  });

  it('rejects a straight with naturals from different suits', () => {
    expect(
      isValidStraight([
        card('4', 'clubs'),
        card('5', 'clubs'),
        card('6', 'hearts'),
        card('7', 'clubs'),
      ]),
    ).toBe(false);
  });

  it('rejects a straight with too many wildcards', () => {
    const result = validateStraight([
      card('4', 'clubs'),
      card('JOKER', 'joker'),
      card('A', 'hearts'),
      card('A', 'diamonds'),
    ]);

    expect(result.isValid).toBe(false);
  });

  it('rejects consecutive wildcard positions in a straight', () => {
    const result = validateStraight([
      card('4', 'clubs'),
      card('JOKER', 'joker'),
      card('A', 'hearts'),
      card('7', 'clubs'),
    ]);

    expect(result.isValid).toBe(false);
  });
});

describe('round requirement validation', () => {
  it('accepts an exact meld set for round 2', () => {
    const validation = validateRoundMeldSet(
      [
        {
          type: 'trio',
          cards: [card('7', 'clubs'), card('7', 'diamonds'), card('7', 'spades')],
        },
        {
          type: 'straight',
          cards: [
            card('4', 'clubs'),
            card('5', 'clubs'),
            card('6', 'clubs'),
            card('7', 'clubs', 'seven-clubs-second-copy'),
          ],
        },
      ],
      2,
    );

    expect(validation.isValid).toBe(true);
  });

  it('rejects a meld set that does not match the exact round shape', () => {
    const validation = validateRoundMeldSet(
      [
        {
          type: 'trio',
          cards: [card('7', 'clubs'), card('7', 'diamonds'), card('7', 'spades')],
        },
        {
          type: 'trio',
          cards: [card('9', 'clubs'), card('9', 'diamonds'), card('9', 'spades')],
        },
      ],
      2,
    );

    expect(validation.isValid).toBe(false);
  });
});
