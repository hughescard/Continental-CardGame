import type { CardInstance } from '@/domain/types/cards';
import type { TableMeld } from '@/domain/types/melds';

declare const playerIdBrand: unique symbol;

export type PlayerId = string & {
  readonly [playerIdBrand]: 'PlayerId';
};

export function asPlayerId(value: string): PlayerId {
  return value as PlayerId;
}

export interface PlayerRoundState {
  playerId: PlayerId;
  hand: readonly CardInstance[];
  laidMelds: readonly TableMeld[];
  hasLaidDownInitialMelds: boolean;
  hasCompletedRound: boolean;
  pickedDiscardOutOfTurn: boolean;
}
