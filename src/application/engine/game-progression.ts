import type {
  GameSummary,
  GameSummaryRoundOverview,
  GameSummaryStanding,
  RoundResultSummary,
} from '@/application/models/game';
import { buildInitialRoundSnapshot } from '@/application/engine/game-transitions';
import { AppError } from '@/application/errors/app-error';
import type { CardInstance } from '@/domain/types/cards';
import type { PlayerId } from '@/domain/types/players';
import type { RoundIndex } from '@/domain/types/rounds';

interface BuildNextRoundSnapshotInput {
  roomId: string;
  gameId: string;
  orderedPlayerIds: readonly PlayerId[];
  nextRoundIndex: RoundIndex;
  scoreTotals: Readonly<Record<string, number>>;
  startingPlayerId?: PlayerId;
  shuffledDeck?: readonly CardInstance[];
}

interface BuildGameSummaryInput {
  roomId: string;
  gameId: string;
  orderedPlayerIds: readonly PlayerId[];
  scoreTotals: Readonly<Record<string, number>>;
  displayNames: Readonly<Record<string, string>>;
  roundResults: readonly RoundResultSummary[];
}

export const FINAL_TIE_BREAK_RULE =
  'Si hay empate en puntaje total, gana el jugador mejor posicionado en el orden inicial de asientos.';

export function getNextRoundIndex(roundIndex: RoundIndex): RoundIndex | null {
  if (roundIndex >= 8) {
    return null;
  }

  return (roundIndex + 1) as RoundIndex;
}

export function canStartNextRound(
  roundIndex: RoundIndex,
  phase: 'playing' | 'scoring' | 'finished',
  scoringPending: boolean,
  hasRoundResult: boolean,
): boolean {
  return phase === 'scoring' && !scoringPending && hasRoundResult && roundIndex < 8;
}

export function buildNextRoundSnapshot(input: BuildNextRoundSnapshotInput) {
  const buildInput = {
    roomId: input.roomId,
    gameId: input.gameId,
    orderedPlayerIds: input.orderedPlayerIds,
    roundIndex: input.nextRoundIndex,
    initialScoreTotals: input.scoreTotals,
  };

  const snapshot = buildInitialRoundSnapshot(
    input.shuffledDeck
      ? {
          ...buildInput,
          shuffledDeck: input.shuffledDeck,
        }
      : buildInput,
  );

  if (input.startingPlayerId) {
    snapshot.publicState.currentTurnPlayerId = input.startingPlayerId;
  }

  return snapshot;
}

function buildStandings(
  orderedPlayerIds: readonly PlayerId[],
  scoreTotals: Readonly<Record<string, number>>,
  displayNames: Readonly<Record<string, string>>,
): GameSummaryStanding[] {
  const seatOrder = new Map(
    orderedPlayerIds.map((playerId, index) => [playerId, index] as const),
  );

  const sortedPlayerIds = [...orderedPlayerIds].sort((left, right) => {
    const leftScore = scoreTotals[left] ?? 0;
    const rightScore = scoreTotals[right] ?? 0;

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return (seatOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (seatOrder.get(right) ?? Number.MAX_SAFE_INTEGER);
  });

  return sortedPlayerIds.map((playerId, index) => ({
    playerId,
    displayName: displayNames[playerId] ?? playerId,
    totalPoints: scoreTotals[playerId] ?? 0,
    rank: index + 1,
  }));
}

function buildRoundOverviews(
  roundResults: readonly RoundResultSummary[],
): GameSummaryRoundOverview[] {
  return [...roundResults]
    .sort((left, right) => left.roundIndex - right.roundIndex)
    .map((round) => ({
      roundIndex: round.roundIndex,
      winnerPlayerId: round.winnerPlayerId,
      multiplierApplied: round.multiplierApplied,
      createdAt: round.createdAt,
    }));
}

export function buildGameSummary(input: BuildGameSummaryInput): GameSummary {
  if (input.roundResults.length === 0) {
    throw new AppError(
      'invalid-room-state',
      'No se puede finalizar la partida sin resultados de ronda.',
    );
  }

  const standings = buildStandings(
    input.orderedPlayerIds,
    input.scoreTotals,
    input.displayNames,
  );
  const winner = standings[0];

  if (!winner) {
    throw new AppError(
      'invalid-room-state',
      'No se pudo determinar el ganador final de la partida.',
    );
  }

  return {
    roomId: input.roomId,
    gameId: input.gameId,
    winnerPlayerId: winner.playerId,
    tieBreakRule: FINAL_TIE_BREAK_RULE,
    standings,
    rounds: buildRoundOverviews(input.roundResults),
    completedAt: null,
  };
}
