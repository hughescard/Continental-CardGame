import { MAX_PLAYERS, MIN_PLAYERS } from '@/domain/constants/cards';
import { getRoundDefinition } from '@/domain/constants/rounds';
import type { GameState, RoundState, TurnState } from '@/domain/types/game-state';
import type { PlayerRoundState, PlayerId } from '@/domain/types/players';
import type { RoundIndex } from '@/domain/types/rounds';

export function createInitialPlayerRoundState(playerId: PlayerId): PlayerRoundState {
  return {
    playerId,
    hand: [],
    laidMelds: [],
    hasLaidDownInitialMelds: false,
    hasCompletedRound: false,
    pickedDiscardOutOfTurn: false,
  };
}

export function createInitialTurnState(
  playerOrder: readonly PlayerId[],
  startingPlayerIndex = 0,
): TurnState {
  const activePlayerId = playerOrder[startingPlayerIndex];

  if (!activePlayerId) {
    throw new Error('Cannot create a turn without at least one player.');
  }

  return {
    activePlayerId,
    turnNumber: 1,
    phase: 'awaiting-draw',
    pendingOutOfTurnClaim: null,
  };
}

export function createEmptyRoundState(input: {
  roundIndex: RoundIndex;
  playerOrder: readonly PlayerId[];
  startingPlayerIndex?: number;
}): RoundState {
  return {
    roundIndex: input.roundIndex,
    definition: getRoundDefinition(input.roundIndex),
    players: input.playerOrder.map(createInitialPlayerRoundState),
    drawPile: [],
    discardPile: [],
    tableMelds: [],
    turn: createInitialTurnState(input.playerOrder, input.startingPlayerIndex),
    winnerPlayerId: null,
  };
}

export function createInitialGameState(playerOrder: readonly PlayerId[]): GameState {
  if (playerOrder.length < MIN_PLAYERS || playerOrder.length > MAX_PLAYERS) {
    throw new Error(
      `Continental requires between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`,
    );
  }

  return {
    phase: 'lobby',
    playerOrder,
    currentRound: null,
    scoreboard: playerOrder.map((playerId) => ({ playerId, totalPoints: 0 })),
    completedRounds: [],
  };
}
