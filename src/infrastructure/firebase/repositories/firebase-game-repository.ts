import {
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from 'firebase/firestore';
import type {
  AddCardsToExistingMeldInput,
  AttemptInitialMeldDownInput,
  GameRoundSnapshot,
  PrivatePlayerGameState,
  RearrangeTableMeldsInput,
  RoundResultSummary,
} from '@/application/models/game';
import type {
  AdvanceTurnInput,
  ClaimOutOfTurnDiscardInput,
  DiscardCardInput,
  DrawActionInput,
  FinalizeGameInput,
  GameRepository,
  InitializeGameRoundInput,
  RejectOutOfTurnDiscardInput,
  StartNextRoundInput,
} from '@/application/ports/game-repository';
import {
  addCardsToExistingMeldTransition,
  advanceTurnTransition,
  attemptInitialMeldDownTransition,
  buildInitialRoundSnapshot,
  claimOutOfTurnDiscardTransition,
  discardCardTransition,
  drawFromDeckTransition,
  drawFromDiscardTransition,
  finishRoundIfPlayerIsEmptyTransition,
  rejectOutOfTurnDiscardTransition,
  rearrangeTableMeldsTransition,
} from '@/application/engine/game-transitions';
import {
  buildNextRoundSnapshot,
  buildGameSummary,
  canStartNextRound,
  getNextRoundIndex,
} from '@/application/engine/game-progression';
import { AppError } from '@/application/errors/app-error';
import { ROUND_INDEXES, scoreRound } from '@/domain';
import type { CardInstance } from '@/domain/types/cards';
import { getFirestoreDb } from '@/infrastructure/firebase/firestore';
import {
  mapGameEngineStateFromFirestore,
  mapGameEngineStateToFirestore,
  mapGameSummaryFromFirestore,
  mapGameSummaryToFirestore,
  mapPrivatePlayerStateFromFirestore,
  mapPublicGameStateFromFirestore,
  mapPublicGameStateToFirestore,
  mapRoundResultFromFirestore,
  mapRoundResultToFirestore,
} from '@/infrastructure/firebase/mappers/game-state-mapper';
import {
  gameEngineDocument,
  gameResultDocument,
  privatePlayerDocument,
  publicGameStateDocument,
  roomPlayerDocument,
  roomCodeDocument,
  roomDocument,
  roundResultDocument,
  roomPlayersCollection,
} from '@/infrastructure/firebase/refs';
import { asPlayerId, type PlayerId } from '@/domain/types/players';

async function loadSnapshotInTransaction(
  transaction: Transaction,
  roomId: string,
  privatePlayerIds: readonly PlayerId[],
): Promise<GameRoundSnapshot> {
  const [publicSnapshot, engineSnapshot] = await Promise.all([
    transaction.get(publicGameStateDocument(roomId)),
    transaction.get(gameEngineDocument(roomId)),
  ]);

  if (!publicSnapshot.exists() || !engineSnapshot.exists()) {
    throw new AppError('room-not-found', 'No existe una partida activa para esa sala.');
  }

  const privateEntries = await Promise.all(
    privatePlayerIds.map(async (playerId) => {
      const snapshot = await transaction.get(privatePlayerDocument(roomId, playerId));

      if (!snapshot.exists()) {
        throw new AppError(
          'room-access-denied',
          'No existe estado privado para ese jugador.',
        );
      }

      return [playerId, mapPrivatePlayerStateFromFirestore(snapshot.data())] as const;
    }),
  );

  return {
    publicState: mapPublicGameStateFromFirestore(publicSnapshot.data()),
    engineState: mapGameEngineStateFromFirestore(engineSnapshot.data()),
    privateStates: Object.fromEntries(privateEntries),
  };
}

function applyPrivateStateUpdate(
  transaction: Transaction,
  roomId: string,
  privateState: PrivatePlayerGameState,
) {
  transaction.update(privatePlayerDocument(roomId, privateState.playerId), {
    hand: privateState.hand.map((card) => ({
      id: card.id,
      rank: card.rank,
      suit: card.suit,
      deckNumber: card.deckNumber,
    })),
    hasGoneDown: privateState.hasGoneDown,
    canTakeOutOfTurnDiscard: privateState.canTakeOutOfTurnDiscard,
    scoreTotal: privateState.scoreTotal,
    secretState: {
      handCardIds: privateState.hand.map((card) => card.id),
      stagedCardIds: [],
    },
    updatedAt: serverTimestamp(),
  });
}

function persistSnapshotInTransaction(
  transaction: Transaction,
  roomId: string,
  snapshot: GameRoundSnapshot,
) {
  transaction.update(publicGameStateDocument(roomId), {
    ...mapPublicGameStateToFirestore(snapshot.publicState),
    updatedAt: serverTimestamp(),
    roundStartedAt: snapshot.publicState.roundStartedAt
      ? snapshot.publicState.roundStartedAt
      : serverTimestamp(),
    roundEndedAt: snapshot.publicState.roundEndedAt ?? null,
  });

  transaction.update(gameEngineDocument(roomId), {
    ...mapGameEngineStateToFirestore(snapshot.engineState),
    updatedAt: serverTimestamp(),
  });

  for (const state of Object.values(snapshot.privateStates)) {
    applyPrivateStateUpdate(transaction, roomId, state);
  }
}

async function runGameActionTransaction(
  roomId: string,
  privatePlayerIds: readonly PlayerId[],
  mutate: (snapshot: GameRoundSnapshot) => GameRoundSnapshot,
) {
  const db = getFirestoreDb();

  return runTransaction(db, async (transaction) => {
    const snapshot = await loadSnapshotInTransaction(transaction, roomId, privatePlayerIds);
    const nextSnapshot = mutate(snapshot);
    persistSnapshotInTransaction(transaction, roomId, nextSnapshot);
    return nextSnapshot.publicState;
  });
}

async function loadAllPrivateStatesForRoundScoring(
  transaction: Transaction,
  roomId: string,
  playerIds: readonly PlayerId[],
) {
  return Promise.all(
    playerIds.map(async (playerId) => {
      const [privateSnapshot, playerSnapshot] = await Promise.all([
        transaction.get(privatePlayerDocument(roomId, playerId)),
        transaction.get(roomPlayerDocument(roomId, playerId)),
      ]);

      if (!privateSnapshot.exists()) {
        throw new AppError(
          'room-access-denied',
          'No existe estado privado para un jugador de la ronda.',
        );
      }

      return {
        playerId,
        displayName: playerSnapshot.exists() ? playerSnapshot.data().displayName : playerId,
        privateState: mapPrivatePlayerStateFromFirestore(privateSnapshot.data()),
      };
    }),
  );
}

function buildScoreTotalsMap(
  loadedPlayers: Awaited<ReturnType<typeof loadAllPrivateStatesForRoundScoring>>,
) {
  return Object.fromEntries(
    loadedPlayers.map((player) => [player.playerId, player.privateState.scoreTotal]),
  ) as Record<string, number>;
}

function buildDisplayNamesMap(
  loadedPlayers: Awaited<ReturnType<typeof loadAllPrivateStatesForRoundScoring>>,
) {
  return Object.fromEntries(
    loadedPlayers.map((player) => [player.playerId, player.displayName]),
  ) as Record<string, string>;
}

export const firebaseGameRepository: GameRepository = {
  async initializeGameRound(input: InitializeGameRoundInput) {
    const db = getFirestoreDb();
    const playersSnapshot = await getDocs(
      query(roomPlayersCollection(input.roomId), orderBy('seatIndex', 'asc')),
    );

    return runTransaction(db, async (transaction) => {
      const roomRef = roomDocument(input.roomId);
      const roomSnapshot = await transaction.get(roomRef);

      if (!roomSnapshot.exists()) {
        throw new AppError('room-not-found', 'La sala no existe.');
      }

      const room = roomSnapshot.data();

      if (room.hostPlayerId !== input.requestedByPlayerId) {
        throw new AppError('host-only', 'Solo el host puede iniciar la partida.');
      }

      const orderedPlayerIds = playersSnapshot.docs
        .map((item) => item.data())
        .filter((player) => player.status === 'connected')
        .map((player) => asPlayerId(player.playerId));

      if (orderedPlayerIds.length < 2) {
        throw new AppError(
          'invalid-room-state',
          'Se necesitan al menos 2 jugadores para iniciar la ronda.',
        );
      }

      const gameId = room.activeGameId ?? `${input.roomId}-game-1`;
      const snapshot = buildInitialRoundSnapshot({
        roomId: input.roomId,
        gameId,
        orderedPlayerIds,
        roundIndex: 1,
      });
      snapshot.publicState.roundStartedAt = new Date();

      transaction.set(publicGameStateDocument(input.roomId), {
        ...mapPublicGameStateToFirestore(snapshot.publicState),
        startedByPlayerId: input.requestedByPlayerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        roundStartedAt: serverTimestamp(),
        roundEndedAt: null,
      });

      transaction.set(gameEngineDocument(input.roomId), {
        ...mapGameEngineStateToFirestore(snapshot.engineState),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      for (const player of playersSnapshot.docs) {
        const privateState = snapshot.privateStates[player.id];

        if (!privateState) {
          continue;
        }

        transaction.set(
          privatePlayerDocument(input.roomId, player.id),
          {
            roomId: input.roomId,
            playerId: player.id,
            displayNameCache: player.data().displayName,
            hand: privateState.hand.map((card) => ({
              id: card.id,
              rank: card.rank,
              suit: card.suit,
              deckNumber: card.deckNumber,
            })),
            hasGoneDown: false,
            canTakeOutOfTurnDiscard: false,
            scoreTotal: privateState.scoreTotal,
            secretState: {
              handCardIds: privateState.hand.map((card) => card.id),
              stagedCardIds: [],
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      transaction.update(roomRef, {
        status: 'in_game',
        activeGameId: gameId,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.update(roomCodeDocument(room.codeNormalized), {
        status: 'in_game',
        updatedAt: serverTimestamp(),
      });

      return snapshot.publicState;
    });
  },

  async closeRoundAndScore(roomId: string) {
    const db = getFirestoreDb();

    return runTransaction(db, async (transaction) => {
      const publicSnapshot = await transaction.get(publicGameStateDocument(roomId));

      if (!publicSnapshot.exists()) {
        throw new AppError('room-not-found', 'No existe una partida activa para esa sala.');
      }

      const publicState = mapPublicGameStateFromFirestore(publicSnapshot.data());
      const roundResultRef = roundResultDocument(roomId, publicState.roundIndex);
      const roundResultSnapshot = await transaction.get(roundResultRef);

      if (roundResultSnapshot.exists()) {
        return mapRoundResultFromFirestore(roundResultSnapshot.data());
      }

      if (publicState.phase !== 'scoring' || !publicState.scoringPending || !publicState.winnerOfRound) {
        throw new AppError(
          'invalid-room-state',
          'La ronda todavía no está lista para terminar y puntuar.',
        );
      }

      const loadedPlayers = await loadAllPrivateStatesForRoundScoring(
        transaction,
        roomId,
        publicState.orderedPlayerIds,
      );
      const scoreResult = scoreRound({
        roundIndex: publicState.roundIndex,
        winnerPlayerId: publicState.winnerOfRound,
        winnerWentOutFromInitialLaydown: publicState.winnerWentOutFromInitialLaydown,
        winnerWentOutOnFirstTurn: publicState.turnNumber === 1,
        previousTotals: loadedPlayers.map((player) => ({
          playerId: player.playerId,
          totalPoints: player.privateState.scoreTotal,
        })),
        players: loadedPlayers.map((player) => ({
          playerId: player.playerId,
          remainingHand: player.privateState.hand,
          hadLaidDownInitialMelds:
            publicState.playersWhoAreDown.includes(player.playerId) ||
            player.playerId === publicState.winnerOfRound,
        })),
      });

      const roundResult: RoundResultSummary = {
        roomId,
        roundIndex: publicState.roundIndex,
        closedByPlayerId: publicState.winnerOfRound,
        winnerPlayerId: publicState.winnerOfRound,
        multiplierApplied: scoreResult.multiplierApplied,
        winnerWentOutFromInitialLaydown: scoreResult.winnerWentOutFromInitialLaydown,
        nobodyElseHadLaidDown: scoreResult.nobodyElseHadLaidDown,
        entries: scoreResult.entries.map((entry) => ({
          playerId: entry.playerId,
          displayName:
            loadedPlayers.find((player) => player.playerId === entry.playerId)?.displayName ??
            entry.playerId,
          basePoints: entry.basePoints,
          pointsAwarded: entry.pointsAwarded,
          totalPointsAfterRound: entry.totalPointsAfterRound,
          remainingHand:
            loadedPlayers.find((player) => player.playerId === entry.playerId)?.privateState.hand ??
            [],
        })),
        createdAt: null,
      };

      transaction.set(roundResultRef, {
        ...mapRoundResultToFirestore(roundResult),
        createdAt: serverTimestamp(),
      });

      for (const player of loadedPlayers) {
        const scoreEntry = scoreResult.entries.find((entry) => entry.playerId === player.playerId);

        if (!scoreEntry) {
          continue;
        }

        transaction.update(privatePlayerDocument(roomId, player.playerId), {
          scoreTotal: scoreEntry.totalPointsAfterRound,
          updatedAt: serverTimestamp(),
        });
      }

      transaction.update(publicGameStateDocument(roomId), {
        scoringPending: false,
        updatedAt: serverTimestamp(),
      });

      return {
        ...roundResult,
        createdAt: new Date(),
      };
    });
  },

  async startNextRound(input: StartNextRoundInput) {
    const db = getFirestoreDb();

    return runTransaction(db, async (transaction) => {
      const [roomSnapshot, publicSnapshot] = await Promise.all([
        transaction.get(roomDocument(input.roomId)),
        transaction.get(publicGameStateDocument(input.roomId)),
      ]);

      if (!roomSnapshot.exists() || !publicSnapshot.exists()) {
        throw new AppError('room-not-found', 'No existe una partida activa para esa sala.');
      }

      const room = roomSnapshot.data();
      const publicState = mapPublicGameStateFromFirestore(publicSnapshot.data());

      if (room.hostPlayerId !== input.requestedByPlayerId) {
        throw new AppError('host-only', 'Solo el host puede iniciar la siguiente ronda.');
      }

      if (room.status === 'finished' || publicState.phase === 'finished') {
        throw new AppError(
          'invalid-room-state',
          'La partida ya terminó y no puede iniciar otra ronda.',
        );
      }

      const currentRoundResultRef = roundResultDocument(input.roomId, publicState.roundIndex);
      const currentRoundResultSnapshot = await transaction.get(currentRoundResultRef);
      const hasRoundResult = currentRoundResultSnapshot.exists();

      if (
        !canStartNextRound(
          publicState.roundIndex,
          publicState.phase,
          publicState.scoringPending,
          hasRoundResult,
        )
      ) {
        throw new AppError(
          'invalid-room-state',
          'La siguiente ronda todavía no se puede iniciar.',
        );
      }

      const nextRoundIndex = getNextRoundIndex(publicState.roundIndex);

      if (!nextRoundIndex) {
        throw new AppError(
          'invalid-room-state',
          'La ronda 8 ya terminó. La partida debe finalizarse.',
        );
      }

      const loadedPlayers = await loadAllPrivateStatesForRoundScoring(
        transaction,
        input.roomId,
        publicState.orderedPlayerIds,
      );
      const nextRoundInput = {
        roomId: input.roomId,
        gameId: publicState.gameId,
        orderedPlayerIds: publicState.orderedPlayerIds,
        nextRoundIndex,
        scoreTotals: buildScoreTotalsMap(loadedPlayers),
      };
      const nextSnapshot = buildNextRoundSnapshot(
        publicState.winnerOfRound
          ? {
              ...nextRoundInput,
              startingPlayerId: publicState.winnerOfRound,
            }
          : nextRoundInput,
      );

      nextSnapshot.publicState.roundStartedAt = new Date();

      transaction.update(publicGameStateDocument(input.roomId), {
        ...mapPublicGameStateToFirestore(nextSnapshot.publicState),
        updatedAt: serverTimestamp(),
        roundStartedAt: serverTimestamp(),
        roundEndedAt: null,
        gameCompletedAt: null,
      });

      transaction.update(gameEngineDocument(input.roomId), {
        ...mapGameEngineStateToFirestore(nextSnapshot.engineState),
        updatedAt: serverTimestamp(),
      });

      for (const player of loadedPlayers) {
        const nextPrivateState = nextSnapshot.privateStates[player.playerId];

        if (!nextPrivateState) {
          continue;
        }

        transaction.update(privatePlayerDocument(input.roomId, player.playerId), {
          roomId: input.roomId,
          playerId: player.playerId,
          displayNameCache: player.displayName,
          hand: nextPrivateState.hand.map((card: CardInstance) => ({
            id: card.id,
            rank: card.rank,
            suit: card.suit,
            deckNumber: card.deckNumber,
          })),
          hasGoneDown: nextPrivateState.hasGoneDown,
          canTakeOutOfTurnDiscard: nextPrivateState.canTakeOutOfTurnDiscard,
          scoreTotal: nextPrivateState.scoreTotal,
          secretState: {
            handCardIds: nextPrivateState.hand.map((card: CardInstance) => card.id),
            stagedCardIds: [],
          },
          updatedAt: serverTimestamp(),
        });
      }

      return nextSnapshot.publicState;
    });
  },

  async finalizeGame(input: FinalizeGameInput) {
    const db = getFirestoreDb();

    return runTransaction(db, async (transaction) => {
      const [roomSnapshot, publicSnapshot] = await Promise.all([
        transaction.get(roomDocument(input.roomId)),
        transaction.get(publicGameStateDocument(input.roomId)),
      ]);

      if (!roomSnapshot.exists() || !publicSnapshot.exists()) {
        throw new AppError('room-not-found', 'No existe una partida activa para esa sala.');
      }

      const room = roomSnapshot.data();
      const publicState = mapPublicGameStateFromFirestore(publicSnapshot.data());
      const gameSummaryRef = gameResultDocument(input.roomId, publicState.gameId);
      const existingSummarySnapshot = await transaction.get(gameSummaryRef);

      if (existingSummarySnapshot.exists()) {
        return mapGameSummaryFromFirestore(existingSummarySnapshot.data());
      }

      if (room.hostPlayerId !== input.requestedByPlayerId) {
        throw new AppError('host-only', 'Solo el host puede finalizar la partida.');
      }

      if (publicState.roundIndex !== 8 || publicState.phase !== 'scoring' || publicState.scoringPending) {
        throw new AppError(
          'invalid-room-state',
          'La partida todavía no está lista para finalizar.',
        );
      }

      const currentRoundResultSnapshot = await transaction.get(
        roundResultDocument(input.roomId, publicState.roundIndex),
      );

      if (!currentRoundResultSnapshot.exists()) {
        throw new AppError(
          'invalid-room-state',
          'No se puede finalizar la partida sin el resultado de la ronda 8.',
        );
      }

      const roundResultSnapshots = await Promise.all(
        ROUND_INDEXES.map((roundIndex) =>
          transaction.get(roundResultDocument(input.roomId, roundIndex)),
        ),
      );

      const loadedPlayers = await loadAllPrivateStatesForRoundScoring(
        transaction,
        input.roomId,
        publicState.orderedPlayerIds,
      );
      const gameSummary = buildGameSummary({
        roomId: input.roomId,
        gameId: publicState.gameId,
        orderedPlayerIds: publicState.orderedPlayerIds,
        scoreTotals: buildScoreTotalsMap(loadedPlayers),
        displayNames: buildDisplayNamesMap(loadedPlayers),
        roundResults: roundResultSnapshots
          .filter((docSnapshot) => docSnapshot.exists())
          .map((docSnapshot) => mapRoundResultFromFirestore(docSnapshot.data())),
      });

      transaction.set(gameSummaryRef, {
        ...mapGameSummaryToFirestore(gameSummary),
        completedAt: serverTimestamp(),
      });

      transaction.update(publicGameStateDocument(input.roomId), {
        phase: 'finished',
        finalWinnerPlayerId: gameSummary.winnerPlayerId,
        gameCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.update(roomDocument(input.roomId), {
        status: 'finished',
        updatedAt: serverTimestamp(),
      });

      transaction.update(roomCodeDocument(room.codeNormalized), {
        status: 'finished',
        updatedAt: serverTimestamp(),
      });

      return {
        ...gameSummary,
        completedAt: new Date(),
      };
    });
  },

  subscribeToPublicGameState(roomId, listener, onError) {
    return onSnapshot(
      publicGameStateDocument(roomId),
      (snapshot) => {
        listener(snapshot.exists() ? mapPublicGameStateFromFirestore(snapshot.data()) : null);
      },
      (error) => onError?.(error),
    );
  },

  subscribeToGameCompletion(roomId, gameId, listener, onError) {
    return onSnapshot(
      gameResultDocument(roomId, gameId),
      (snapshot) => {
        listener(snapshot.exists() ? mapGameSummaryFromFirestore(snapshot.data()) : null);
      },
      (error) => onError?.(error),
    );
  },

  subscribeToRoundResult(roomId, roundIndex, listener, onError) {
    return onSnapshot(
      roundResultDocument(roomId, roundIndex),
      (snapshot) => {
        listener(snapshot.exists() ? mapRoundResultFromFirestore(snapshot.data()) : null);
      },
      (error) => onError?.(error),
    );
  },

  subscribeToPrivatePlayerState(roomId, playerId, listener, onError) {
    return onSnapshot(
      privatePlayerDocument(roomId, playerId),
      (snapshot) => {
        listener(snapshot.exists() ? mapPrivatePlayerStateFromFirestore(snapshot.data()) : null);
      },
      (error) => onError?.(error),
    );
  },

  async drawFromDeck(input: DrawActionInput) {
    return runGameActionTransaction(input.roomId, [input.playerId], (snapshot) =>
      drawFromDeckTransition(snapshot, input.playerId),
    );
  },

  async drawFromDiscard(input: DrawActionInput) {
    return runGameActionTransaction(input.roomId, [input.playerId], (snapshot) =>
      drawFromDiscardTransition(snapshot, input.playerId),
    );
  },

  async discardCard(input: DiscardCardInput) {
    return runGameActionTransaction(input.roomId, [input.playerId], (snapshot) =>
      discardCardTransition(snapshot, input.playerId, input.cardId),
    );
  },

  async attemptInitialMeldDown(roomId: string, input: AttemptInitialMeldDownInput) {
    return runGameActionTransaction(roomId, [input.playerId], (snapshot) =>
      attemptInitialMeldDownTransition(snapshot, input),
    );
  },

  async addCardsToExistingMeld(roomId: string, input: AddCardsToExistingMeldInput) {
    return runGameActionTransaction(roomId, [input.playerId], (snapshot) =>
      addCardsToExistingMeldTransition(snapshot, input),
    );
  },

  async rearrangeTableMelds(roomId: string, input: RearrangeTableMeldsInput) {
    return runGameActionTransaction(roomId, [input.playerId], (snapshot) =>
      rearrangeTableMeldsTransition(snapshot, input),
    );
  },

  async claimOutOfTurnDiscard(input: ClaimOutOfTurnDiscardInput) {
    return runGameActionTransaction(input.roomId, [input.playerId], (snapshot) =>
      claimOutOfTurnDiscardTransition(snapshot, input.playerId),
    );
  },

  async rejectOutOfTurnDiscard(input: RejectOutOfTurnDiscardInput) {
    return runGameActionTransaction(input.roomId, [input.playerId], (snapshot) =>
      rejectOutOfTurnDiscardTransition(snapshot, input.playerId),
    );
  },

  async advanceTurn(input: AdvanceTurnInput) {
    return runGameActionTransaction(input.roomId, [], (snapshot) =>
      advanceTurnTransition(snapshot, input.playerId),
    );
  },

  async syncPlayerCardCount(input) {
    const db = getFirestoreDb();

    await runTransaction(db, async (transaction) => {
      const publicRef = publicGameStateDocument(input.roomId);
      const publicSnapshot = await transaction.get(publicRef);

      if (!publicSnapshot.exists()) {
        return;
      }

      const publicState = mapPublicGameStateFromFirestore(publicSnapshot.data());
      const nextCounts = {
        ...(publicState.playerCardCounts ?? {}),
        [input.playerId]: input.cardCount,
      };

      transaction.update(publicRef, {
        playerCardCounts: nextCounts,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async finishRoundIfPlayerIsEmpty(roomId: string, playerId: PlayerId) {
    return runGameActionTransaction(roomId, [playerId], (snapshot) =>
      finishRoundIfPlayerIsEmptyTransition(snapshot, playerId),
    );
  },
};
