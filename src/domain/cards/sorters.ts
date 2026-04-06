import { getRankSortValue, getSuitSortValue } from '@/domain/cards/helpers';
import type { CardInstance } from '@/domain/types/cards';

export function sortCardsByRank(cards: readonly CardInstance[]): CardInstance[] {
  return [...cards].sort((left, right) => {
    const rankComparison = getRankSortValue(left.rank) - getRankSortValue(right.rank);

    if (rankComparison !== 0) {
      return rankComparison;
    }

    const suitComparison = getSuitSortValue(left.suit) - getSuitSortValue(right.suit);

    if (suitComparison !== 0) {
      return suitComparison;
    }

    return left.id.localeCompare(right.id);
  });
}

export function sortCardsBySuit(cards: readonly CardInstance[]): CardInstance[] {
  return [...cards].sort((left, right) => {
    const suitComparison = getSuitSortValue(left.suit) - getSuitSortValue(right.suit);

    if (suitComparison !== 0) {
      return suitComparison;
    }

    const rankComparison = getRankSortValue(left.rank) - getRankSortValue(right.rank);

    if (rankComparison !== 0) {
      return rankComparison;
    }

    return left.id.localeCompare(right.id);
  });
}

export function sortCardsBySuitThenRank(cards: readonly CardInstance[]): CardInstance[] {
  return sortCardsBySuit(cards);
}
