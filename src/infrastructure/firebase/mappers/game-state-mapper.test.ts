import { describe, expect, it } from 'vitest';
import { asPlayerId } from '@/domain/types/players';
import { createCardInstance } from '@/domain/cards/helpers';
import type {
  GameSummary,
  PrivatePlayerGameState,
  PublicGameState,
  RoundResultSummary,
} from '@/application/models/game';
import {
  mapGameEngineStateFromFirestore,
  mapGameEngineStateToFirestore,
  mapGameSummaryFromFirestore,
  mapGameSummaryToFirestore,
  mapPrivatePlayerStateFromFirestore,
  mapPrivatePlayerStateToFirestore,
  mapPublicGameStateFromFirestore,
  mapPublicGameStateToFirestore,
  mapRoundResultFromFirestore,
  mapRoundResultToFirestore,
} from '@/infrastructure/firebase/mappers/game-state-mapper';

const testCard = createCardInstance({
  id: 'deck-1-7-hearts',
  rank: '7',
  suit: 'hearts',
  deckNumber: 1,
});

describe('game-state mappers', () => {
  it('maps public game state to and from Firestore documents', () => {
    const publicState: PublicGameState = {
      roomId: 'room-1',
      gameId: 'game-1',
      phase: 'playing',
      roundIndex: 1,
      roundRequirement: [
        { meldType: 'trio', minimumLength: 3 },
        { meldType: 'trio', minimumLength: 3 },
      ],
      currentTurnPlayerId: asPlayerId('player-1'),
      turnPhase: 'awaiting-draw',
      turnNumber: 1,
      discardTop: testCard,
      discardCount: 1,
      drawPileCount: 93,
      playerCardCounts: {
        'player-1': 7,
        'player-2': 7,
      },
      orderedPlayerIds: [asPlayerId('player-1'), asPlayerId('player-2')],
      playersWhoAreDown: [asPlayerId('player-2')],
      publicTableMelds: [
        {
          id: 'meld-1',
          type: 'trio',
          ownerPlayerId: asPlayerId('player-1'),
          cards: [testCard],
        },
      ],
      winnerOfRound: null,
      winnerWentOutFromInitialLaydown: false,
      finalWinnerPlayerId: null,
      pendingOutOfTurnClaim: null,
      lastDrawSource: 'deck',
      scoringPending: false,
      createdAt: null,
      updatedAt: null,
      roundStartedAt: null,
      roundEndedAt: null,
      gameCompletedAt: null,
    };

    const mapped = mapPublicGameStateFromFirestore(
      mapPublicGameStateToFirestore(publicState),
    );

    expect(mapped).toEqual(publicState);
  });

  it('maps private player state to and from Firestore documents', () => {
    const privateState: PrivatePlayerGameState = {
      roomId: 'room-1',
      playerId: asPlayerId('player-1'),
      hand: [testCard],
      hasGoneDown: false,
      canTakeOutOfTurnDiscard: false,
      scoreTotal: 25,
      createdAt: null,
      updatedAt: null,
    };

    const mapped = mapPrivatePlayerStateFromFirestore(
      mapPrivatePlayerStateToFirestore(privateState),
    );

    expect(mapped).toEqual(privateState);
  });

  it('maps game engine state to and from Firestore documents', () => {
    const mapped = mapGameEngineStateFromFirestore(
      mapGameEngineStateToFirestore({
        roomId: 'room-1',
        gameId: 'game-1',
        roundIndex: 1,
        drawPile: [testCard],
        discardPile: [testCard],
        pendingTurnDiscard: testCard,
        currentTurnWentDownPlayerId: asPlayerId('player-1'),
        turnNumber: 1,
        lastDrawSource: 'deck',
        pendingOutOfTurnClaim: null,
      }),
    );

    expect(mapped.pendingTurnDiscard).toEqual(testCard);
    expect(mapped.currentTurnWentDownPlayerId).toBe(asPlayerId('player-1'));
  });

  it('maps round result summaries to and from Firestore documents', () => {
    const roundResult: RoundResultSummary = {
      roomId: 'room-1',
      roundIndex: 1,
      closedByPlayerId: asPlayerId('player-1'),
      winnerPlayerId: asPlayerId('player-1'),
      multiplierApplied: 3,
      winnerWentOutFromInitialLaydown: true,
      nobodyElseHadLaidDown: true,
      entries: [
        {
          playerId: asPlayerId('player-1'),
          displayName: 'Alice',
          basePoints: 0,
          pointsAwarded: 0,
          totalPointsAfterRound: 0,
          remainingHand: [],
        },
        {
          playerId: asPlayerId('player-2'),
          displayName: 'Bob',
          basePoints: 30,
          pointsAwarded: 90,
          totalPointsAfterRound: 90,
          remainingHand: [testCard],
        },
      ],
      createdAt: null,
    };

    const mapped = mapRoundResultFromFirestore(mapRoundResultToFirestore(roundResult));

    expect(mapped).toEqual(roundResult);
  });

  it('maps game summaries to and from Firestore documents', () => {
    const summary: GameSummary = {
      roomId: 'room-1',
      gameId: 'game-1',
      winnerPlayerId: asPlayerId('player-1'),
      tieBreakRule: 'seat-order',
      standings: [
        {
          playerId: asPlayerId('player-1'),
          displayName: 'Alice',
          totalPoints: 50,
          rank: 1,
        },
        {
          playerId: asPlayerId('player-2'),
          displayName: 'Bob',
          totalPoints: 60,
          rank: 2,
        },
      ],
      rounds: [
        {
          roundIndex: 1,
          winnerPlayerId: asPlayerId('player-1'),
          multiplierApplied: 3,
          createdAt: null,
        },
      ],
      completedAt: null,
    };

    const mapped = mapGameSummaryFromFirestore(mapGameSummaryToFirestore(summary));

    expect(mapped).toEqual(summary);
  });
});
