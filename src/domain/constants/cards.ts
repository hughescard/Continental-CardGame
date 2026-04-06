import type { NaturalRank, Rank, StandardSuit, Suit } from '@/domain/types/cards';

export const STANDARD_SUITS = [
  'clubs',
  'diamonds',
  'hearts',
  'spades',
] as const satisfies readonly StandardSuit[];

export const SUITS = [...STANDARD_SUITS, 'joker'] as const satisfies readonly Suit[];

export const NATURAL_RANKS = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
] as const satisfies readonly NaturalRank[];

export const RANKS = [...NATURAL_RANKS, 'JOKER'] as const satisfies readonly Rank[];

export const RANK_SORT_ORDER = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
  'JOKER',
] as const satisfies readonly Rank[];

export const CYCLIC_STRAIGHT_RANKS = NATURAL_RANKS;

export const SUIT_SORT_ORDER = [
  'clubs',
  'diamonds',
  'hearts',
  'spades',
  'joker',
] as const satisfies readonly Suit[];

export const RED_ACE_SUITS = ['diamonds', 'hearts'] as const;

export const CONTINENTAL_DECK_COUNT = 2;
export const DEFAULT_JOKERS_PER_DECK = 2;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 7;
