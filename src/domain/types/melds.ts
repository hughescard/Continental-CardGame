import type { CardInstance, ResolvedCard } from '@/domain/types/cards';
import type { RoundDefinition, RoundIndex } from '@/domain/types/rounds';

export type MeldType = 'trio' | 'straight';

interface BaseMeld {
  cards: readonly CardInstance[];
}

export interface TrioMeld extends BaseMeld {
  type: 'trio';
}

export interface StraightMeld extends BaseMeld {
  type: 'straight';
}

export type TableMeld = TrioMeld | StraightMeld;

export interface MeldValidationResult<TType extends MeldType = MeldType> {
  type: TType;
  isValid: boolean;
  cardCount: number;
  naturalCount: number;
  wildcardCount: number;
  resolvedCards: readonly ResolvedCard[];
  reason?: string;
}

export interface RoundMeldValidationResult {
  roundIndex: RoundIndex;
  definition: RoundDefinition;
  isValid: boolean;
  meldResults: readonly MeldValidationResult[];
  reason?: string;
}
