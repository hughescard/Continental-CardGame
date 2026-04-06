import type { MeldType } from '@/domain/types/melds';

export type RoundIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface RoundRequirement {
  meldType: MeldType;
  minimumLength: number;
}

export interface RoundDefinition {
  index: RoundIndex;
  label: string;
  requirements: readonly RoundRequirement[];
  cardsToDeal: number;
}
