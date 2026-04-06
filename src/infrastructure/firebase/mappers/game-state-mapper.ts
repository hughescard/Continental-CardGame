import type {
  GameSummary,
  InternalGameEngineState,
  OutOfTurnClaimWindow,
  PrivatePlayerGameState,
  PublicGameState,
  PublicTableMeld,
  RoundResultSummary,
} from '@/application/models/game';
import { asPlayerId } from '@/domain/types/players';
import type { CardInstance } from '@/domain/types/cards';
import type {
  FirestoreCardDocument,
  FirestoreGameEngineDocument,
  FirestoreGameSummaryDocument,
  FirestoreOutOfTurnClaimWindowDocument,
  FirestorePrivatePlayerDocument,
  FirestorePublicGameStateDocument,
  FirestorePublicTableMeldDocument,
  FirestoreRoundResultDocument,
} from '@/infrastructure/firebase/types';
import { timestampToDate } from '@/infrastructure/firebase/utils';

function mapCardFromFirestore(source: FirestoreCardDocument): CardInstance {
  return {
    id: source.id,
    rank: source.rank,
    suit: source.suit,
    deckNumber: source.deckNumber,
  };
}

function mapCardToFirestore(card: CardInstance): FirestoreCardDocument {
  return {
    id: card.id,
    rank: card.rank,
    suit: card.suit,
    deckNumber: card.deckNumber,
  };
}

function mapClaimWindowFromFirestore(
  source: FirestoreOutOfTurnClaimWindowDocument,
): OutOfTurnClaimWindow {
  return {
    card: mapCardFromFirestore(source.card),
    eligiblePlayerIds: source.eligiblePlayerIds.map(asPlayerId),
    declinedPlayerIds: source.declinedPlayerIds.map(asPlayerId),
    claimedByPlayerId: source.claimedByPlayerId
      ? asPlayerId(source.claimedByPlayerId)
      : null,
    sourcePlayerId: asPlayerId(source.sourcePlayerId),
  };
}

function mapClaimWindowToFirestore(
  source: OutOfTurnClaimWindow,
): FirestoreOutOfTurnClaimWindowDocument {
  return {
    card: mapCardToFirestore(source.card),
    eligiblePlayerIds: [...source.eligiblePlayerIds],
    declinedPlayerIds: [...source.declinedPlayerIds],
    claimedByPlayerId: source.claimedByPlayerId,
    sourcePlayerId: source.sourcePlayerId,
  };
}

function mapTableMeldFromFirestore(
  source: FirestorePublicTableMeldDocument,
): PublicTableMeld {
  return {
    id: source.id,
    type: source.type,
    ownerPlayerId: source.ownerPlayerId ? asPlayerId(source.ownerPlayerId) : null,
    cards: source.cards.map(mapCardFromFirestore),
  };
}

function mapTableMeldToFirestore(
  source: PublicTableMeld,
): FirestorePublicTableMeldDocument {
  return {
    id: source.id,
    type: source.type,
    ownerPlayerId: source.ownerPlayerId,
    cards: source.cards.map(mapCardToFirestore),
  };
}

export function mapPublicGameStateFromFirestore(
  source: FirestorePublicGameStateDocument,
): PublicGameState {
  return {
    roomId: source.roomId,
    gameId: source.gameId,
    phase: source.phase,
    roundIndex: source.roundIndex,
    roundRequirement: source.roundRequirement.map((requirement) => ({
      meldType: requirement.meldType,
      minimumLength: requirement.minimumLength,
    })),
    currentTurnPlayerId: asPlayerId(source.currentTurnPlayerId),
    turnPhase: source.turnPhase,
    turnNumber: source.turnNumber,
    discardTop: source.discardTop ? mapCardFromFirestore(source.discardTop) : null,
    discardCount: source.discardCount,
    drawPileCount: source.drawPileCount,
    playerCardCounts: source.playerCardCounts,
    orderedPlayerIds: source.orderedPlayerIds.map(asPlayerId),
    playersWhoAreDown: source.playersWhoAreDown.map(asPlayerId),
    publicTableMelds: source.publicTableMelds.map(mapTableMeldFromFirestore),
    winnerOfRound: source.winnerOfRound ? asPlayerId(source.winnerOfRound) : null,
    winnerWentOutFromInitialLaydown: source.winnerWentOutFromInitialLaydown,
    finalWinnerPlayerId: source.finalWinnerPlayerId
      ? asPlayerId(source.finalWinnerPlayerId)
      : null,
    pendingOutOfTurnClaim: source.pendingOutOfTurnClaim
      ? mapClaimWindowFromFirestore(source.pendingOutOfTurnClaim)
      : null,
    lastDrawSource: source.lastDrawSource,
    scoringPending: source.scoringPending,
    createdAt: timestampToDate(source.createdAt),
    updatedAt: timestampToDate(source.updatedAt),
    roundStartedAt: timestampToDate(source.roundStartedAt),
    roundEndedAt: timestampToDate(source.roundEndedAt),
    gameCompletedAt: timestampToDate(source.gameCompletedAt),
  };
}

export function mapPublicGameStateToFirestore(
  source: PublicGameState,
): FirestorePublicGameStateDocument {
  return {
    roomId: source.roomId,
    gameId: source.gameId,
    startedByPlayerId: source.orderedPlayerIds[0] ?? '',
    phase: source.phase,
    roundIndex: source.roundIndex,
    roundRequirement: source.roundRequirement.map((requirement) => ({
      meldType: requirement.meldType,
      minimumLength: requirement.minimumLength,
    })),
    currentTurnPlayerId: source.currentTurnPlayerId,
    turnPhase: source.turnPhase,
    turnNumber: source.turnNumber,
    discardTop: source.discardTop ? mapCardToFirestore(source.discardTop) : null,
    discardCount: source.discardCount,
    drawPileCount: source.drawPileCount,
    playerCardCounts: { ...source.playerCardCounts },
    orderedPlayerIds: [...source.orderedPlayerIds],
    playersWhoAreDown: [...source.playersWhoAreDown],
    publicTableMelds: source.publicTableMelds.map(mapTableMeldToFirestore),
    winnerOfRound: source.winnerOfRound,
    winnerWentOutFromInitialLaydown: source.winnerWentOutFromInitialLaydown,
    finalWinnerPlayerId: source.finalWinnerPlayerId,
    pendingOutOfTurnClaim: source.pendingOutOfTurnClaim
      ? mapClaimWindowToFirestore(source.pendingOutOfTurnClaim)
      : null,
    lastDrawSource: source.lastDrawSource,
    scoringPending: source.scoringPending,
    createdAt: null,
    updatedAt: null,
    roundStartedAt: null,
    roundEndedAt: null,
    gameCompletedAt: null,
  };
}

export function mapPrivatePlayerStateFromFirestore(
  source: FirestorePrivatePlayerDocument,
): PrivatePlayerGameState {
  return {
    roomId: source.roomId,
    playerId: asPlayerId(source.playerId),
    hand: source.hand.map(mapCardFromFirestore),
    hasGoneDown: source.hasGoneDown,
    canTakeOutOfTurnDiscard: source.canTakeOutOfTurnDiscard,
    scoreTotal: source.scoreTotal,
    createdAt: timestampToDate(source.createdAt),
    updatedAt: timestampToDate(source.updatedAt),
  };
}

export function mapPrivatePlayerStateToFirestore(
  source: PrivatePlayerGameState,
): FirestorePrivatePlayerDocument {
  return {
    roomId: source.roomId,
    playerId: source.playerId,
    displayNameCache: '',
    hand: source.hand.map(mapCardToFirestore),
    hasGoneDown: source.hasGoneDown,
    canTakeOutOfTurnDiscard: source.canTakeOutOfTurnDiscard,
    scoreTotal: source.scoreTotal,
    createdAt: null,
    updatedAt: null,
    secretState: {
      handCardIds: source.hand.map((card) => card.id),
      stagedCardIds: [],
    },
  };
}

export function mapGameEngineStateFromFirestore(
  source: FirestoreGameEngineDocument,
): InternalGameEngineState {
  return {
    roomId: source.roomId,
    gameId: source.gameId,
    roundIndex: source.roundIndex,
    drawPile: source.drawPile.map(mapCardFromFirestore),
    discardPile: source.discardPile.map(mapCardFromFirestore),
    pendingTurnDiscard: source.pendingTurnDiscard
      ? mapCardFromFirestore(source.pendingTurnDiscard)
      : null,
    currentTurnWentDownPlayerId: source.currentTurnWentDownPlayerId
      ? asPlayerId(source.currentTurnWentDownPlayerId)
      : null,
    turnNumber: source.turnNumber,
    lastDrawSource: source.lastDrawSource,
    pendingOutOfTurnClaim: source.pendingOutOfTurnClaim
      ? mapClaimWindowFromFirestore(source.pendingOutOfTurnClaim)
      : null,
  };
}

export function mapGameEngineStateToFirestore(
  source: InternalGameEngineState,
): FirestoreGameEngineDocument {
  return {
    roomId: source.roomId,
    gameId: source.gameId,
    roundIndex: source.roundIndex,
    drawPile: source.drawPile.map(mapCardToFirestore),
    discardPile: source.discardPile.map(mapCardToFirestore),
    pendingTurnDiscard: source.pendingTurnDiscard
      ? mapCardToFirestore(source.pendingTurnDiscard)
      : null,
    currentTurnWentDownPlayerId: source.currentTurnWentDownPlayerId,
    turnNumber: source.turnNumber,
    lastDrawSource: source.lastDrawSource,
    pendingOutOfTurnClaim: source.pendingOutOfTurnClaim
      ? mapClaimWindowToFirestore(source.pendingOutOfTurnClaim)
      : null,
    createdAt: null,
    updatedAt: null,
  };
}

export function mapRoundResultFromFirestore(
  source: FirestoreRoundResultDocument,
): RoundResultSummary {
  return {
    roomId: source.roomId,
    roundIndex: source.roundIndex,
    closedByPlayerId: asPlayerId(source.closedByPlayerId),
    winnerPlayerId: asPlayerId(source.winnerPlayerId),
    multiplierApplied: source.multiplierApplied,
    winnerWentOutFromInitialLaydown: source.winnerWentOutFromInitialLaydown,
    nobodyElseHadLaidDown: source.nobodyElseHadLaidDown,
    entries: source.entries.map((entry) => ({
      playerId: asPlayerId(entry.playerId),
      displayName: entry.displayName,
      basePoints: entry.basePoints,
      pointsAwarded: entry.pointsAwarded,
      totalPointsAfterRound: entry.totalPointsAfterRound,
      remainingHand: entry.remainingHand.map(mapCardFromFirestore),
    })),
    createdAt: timestampToDate(source.createdAt),
  };
}

export function mapRoundResultToFirestore(
  source: RoundResultSummary,
): FirestoreRoundResultDocument {
  return {
    roomId: source.roomId,
    roundIndex: source.roundIndex,
    closedByPlayerId: source.closedByPlayerId,
    winnerPlayerId: source.winnerPlayerId,
    multiplierApplied: source.multiplierApplied,
    winnerWentOutFromInitialLaydown: source.winnerWentOutFromInitialLaydown,
    nobodyElseHadLaidDown: source.nobodyElseHadLaidDown,
    entries: source.entries.map((entry) => ({
      playerId: entry.playerId,
      displayName: entry.displayName,
      basePoints: entry.basePoints,
      pointsAwarded: entry.pointsAwarded,
      totalPointsAfterRound: entry.totalPointsAfterRound,
      remainingHand: entry.remainingHand.map(mapCardToFirestore),
    })),
    createdAt: null,
  };
}

export function mapGameSummaryFromFirestore(
  source: FirestoreGameSummaryDocument,
): GameSummary {
  return {
    roomId: source.roomId,
    gameId: source.gameId,
    winnerPlayerId: asPlayerId(source.winnerPlayerId),
    tieBreakRule: source.tieBreakRule,
    standings: source.standings.map((standing) => ({
      playerId: asPlayerId(standing.playerId),
      displayName: standing.displayName,
      totalPoints: standing.totalPoints,
      rank: standing.rank,
    })),
    rounds: source.rounds.map((round) => ({
      roundIndex: round.roundIndex,
      winnerPlayerId: asPlayerId(round.winnerPlayerId),
      multiplierApplied: round.multiplierApplied,
      createdAt: timestampToDate(round.createdAt),
    })),
    completedAt: timestampToDate(source.completedAt),
  };
}

export function mapGameSummaryToFirestore(
  source: GameSummary,
): FirestoreGameSummaryDocument {
  return {
    roomId: source.roomId,
    gameId: source.gameId,
    winnerPlayerId: source.winnerPlayerId,
    tieBreakRule: source.tieBreakRule,
    standings: source.standings.map((standing) => ({
      playerId: standing.playerId,
      displayName: standing.displayName,
      totalPoints: standing.totalPoints,
      rank: standing.rank,
    })),
    rounds: source.rounds.map((round) => ({
      roundIndex: round.roundIndex,
      winnerPlayerId: round.winnerPlayerId,
      multiplierApplied: round.multiplierApplied,
      createdAt: null,
    })),
    completedAt: null,
  };
}
