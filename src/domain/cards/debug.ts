import type { CardInstance, Suit } from '@/domain/types/cards';

const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: 'C',
  diamonds: 'D',
  hearts: 'H',
  spades: 'S',
  joker: 'J',
};

export function describeCard(card: CardInstance): string {
  const suffix = SUIT_SYMBOLS[card.suit];
  return `${card.rank}${suffix}#${card.deckNumber}`;
}

export function describeCards(cards: readonly CardInstance[]): string {
  return cards.map(describeCard).join(' ');
}

export function serializeCard(card: CardInstance): string {
  return JSON.stringify({
    id: card.id,
    rank: card.rank,
    suit: card.suit,
    deckNumber: card.deckNumber,
  });
}

export function serializeCards(cards: readonly CardInstance[]): string[] {
  return cards.map(serializeCard);
}
