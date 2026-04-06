import {
  CYCLIC_STRAIGHT_RANKS,
  RANK_SORT_ORDER,
  RED_ACE_SUITS,
  SUIT_SORT_ORDER,
} from '@/domain/constants/cards';
import type {
  Card,
  CardInstance,
  NaturalRank,
  Rank,
  StandardSuit,
  Suit,
  WildcardBehavior,
} from '@/domain/types/cards';

export interface CreateCardInstanceInput {
  id?: string;
  rank: Rank;
  suit: Suit;
  deckNumber?: number;
}

export function createCard(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

export function createCardInstance({
  id,
  rank,
  suit,
  deckNumber = 1,
}: CreateCardInstanceInput): CardInstance {
  return {
    id: id ?? `${deckNumber}-${rank}-${suit}`,
    rank,
    suit,
    deckNumber,
  };
}

export function isJoker(card: Card | CardInstance): boolean {
  return card.rank === 'JOKER' && card.suit === 'joker';
}

export function isRedAce(card: Card | CardInstance): boolean {
  return card.rank === 'A' && RED_ACE_SUITS.includes(card.suit as 'diamonds' | 'hearts');
}

export function canActAsWildcard(card: Card | CardInstance): boolean {
  return isJoker(card) || isRedAce(card);
}

export function isRedAceActingAsWildcard(
  card: Card | CardInstance,
  behavior: WildcardBehavior,
): boolean {
  return isRedAce(card) && behavior === 'wildcard';
}

export function isRedAceActingAsNatural(
  card: Card | CardInstance,
  behavior: WildcardBehavior,
): boolean {
  return isRedAce(card) && behavior === 'natural';
}

export function getRankSortValue(rank: Rank): number {
  const index = RANK_SORT_ORDER.indexOf(rank);

  if (index === -1) {
    throw new Error(`Unsupported rank: ${rank}`);
  }

  return index;
}

export function getSuitSortValue(suit: Suit): number {
  const index = SUIT_SORT_ORDER.indexOf(suit);

  if (index === -1) {
    throw new Error(`Unsupported suit: ${suit}`);
  }

  return index;
}

export function getCyclicRankIndex(rank: NaturalRank): number {
  const index = CYCLIC_STRAIGHT_RANKS.indexOf(rank);

  if (index === -1) {
    throw new Error(`Unsupported natural rank: ${rank}`);
  }

  return index;
}

export function getNaturalRankFromCyclicIndex(index: number): NaturalRank {
  const normalizedIndex =
    ((index % CYCLIC_STRAIGHT_RANKS.length) + CYCLIC_STRAIGHT_RANKS.length) %
    CYCLIC_STRAIGHT_RANKS.length;
  const rank = CYCLIC_STRAIGHT_RANKS[normalizedIndex];

  if (!rank) {
    throw new Error(`Unsupported cyclic rank index: ${index}`);
  }

  return rank;
}

export function asNaturalRank(rank: Rank): NaturalRank {
  if (rank === 'JOKER') {
    throw new Error('JOKER cannot be converted to a natural rank.');
  }

  return rank;
}

export function asStandardSuit(suit: Suit): StandardSuit {
  if (suit === 'joker') {
    throw new Error('Joker suit cannot be converted to a standard suit.');
  }

  return suit;
}
