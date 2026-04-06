export type StandardSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export type Suit = StandardSuit | 'joker';

export type NaturalRank =
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
  | 'K';

export type Rank = NaturalRank | 'JOKER';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface CardInstance extends Card {
  id: string;
  deckNumber: number;
}

export type WildcardBehavior = 'natural' | 'wildcard';

export interface ResolvedCard {
  card: CardInstance;
  behavior: WildcardBehavior;
  representedRank: NaturalRank;
  representedSuit: StandardSuit | null;
  sequenceIndex: number | null;
}
