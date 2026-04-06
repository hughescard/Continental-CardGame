import {
  CONTINENTAL_DECK_COUNT,
  DEFAULT_JOKERS_PER_DECK,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NATURAL_RANKS,
  STANDARD_SUITS,
} from '@/domain/constants/cards';
import { getCardsToDealForRound } from '@/domain/constants/rounds';
import { createCardInstance } from '@/domain/cards/helpers';
import type { CardInstance } from '@/domain/types/cards';
import type { PlayerId } from '@/domain/types/players';
import type { RoundIndex } from '@/domain/types/rounds';

export interface DeckConfig {
  deckCount: number;
  jokersPerDeck: number;
}

export interface PlayerHandDeal {
  playerId: PlayerId;
  cards: readonly CardInstance[];
}

export interface DealCardsResult {
  cardsPerPlayer: number;
  hands: readonly PlayerHandDeal[];
  remainingDeck: readonly CardInstance[];
}

export type RandomSource = () => number;

export function createDoubleDeck(config?: Partial<DeckConfig>): CardInstance[] {
  const deckCount = config?.deckCount ?? CONTINENTAL_DECK_COUNT;
  const jokersPerDeck = config?.jokersPerDeck ?? DEFAULT_JOKERS_PER_DECK;
  const cards: CardInstance[] = [];

  for (let deckNumber = 1; deckNumber <= deckCount; deckNumber += 1) {
    for (const suit of STANDARD_SUITS) {
      for (const rank of NATURAL_RANKS) {
        cards.push(
          createCardInstance({
            id: `deck-${deckNumber}-${rank}-${suit}`,
            deckNumber,
            rank,
            suit,
          }),
        );
      }
    }

    for (let jokerIndex = 1; jokerIndex <= jokersPerDeck; jokerIndex += 1) {
      cards.push(
        createCardInstance({
          id: `deck-${deckNumber}-joker-${jokerIndex}`,
          deckNumber,
          rank: 'JOKER',
          suit: 'joker',
        }),
      );
    }
  }

  return cards;
}

export function shuffleDeck(
  deck: readonly CardInstance[],
  randomSource: RandomSource = Math.random,
): CardInstance[] {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomSource() * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];

    if (!current || !swap) {
      throw new Error('Unexpected missing card while shuffling.');
    }

    shuffled[index] = swap;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export function isValidPlayerCount(playerCount: number): boolean {
  return playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;
}

export function dealCardsForRound(
  playerIds: readonly PlayerId[],
  roundIndex: RoundIndex,
  deck: readonly CardInstance[],
): DealCardsResult {
  if (!isValidPlayerCount(playerIds.length)) {
    throw new Error(
      `Continental supports between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`,
    );
  }

  const cardsPerPlayer = getCardsToDealForRound(roundIndex);
  const requiredCards = cardsPerPlayer * playerIds.length;

  if (deck.length < requiredCards) {
    throw new Error(
      `Insufficient cards to deal round ${roundIndex}. Required ${requiredCards}, received ${deck.length}.`,
    );
  }

  const mutableHands = playerIds.map((playerId) => ({
    playerId,
    cards: [] as CardInstance[],
  }));

  let deckCursor = 0;

  for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex += 1) {
    for (const hand of mutableHands) {
      const nextCard = deck[deckCursor];

      if (!nextCard) {
        throw new Error('Unexpected end of deck while dealing.');
      }

      hand.cards.push(nextCard);
      deckCursor += 1;
    }
  }

  return {
    cardsPerPlayer,
    hands: mutableHands.map((hand) => ({
      playerId: hand.playerId,
      cards: hand.cards,
    })),
    remainingDeck: deck.slice(deckCursor),
  };
}
