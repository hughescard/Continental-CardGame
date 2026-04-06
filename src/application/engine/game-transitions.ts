import { AppError } from '@/application/errors/app-error';
import type {
  AddCardsToExistingMeldInput,
  AttemptInitialMeldDownInput,
  BuildInitialRoundInput,
  GameRoundSnapshot,
  InternalGameEngineState,
  OutOfTurnClaimWindow,
  PrivatePlayerGameState,
  PublicGameState,
  PublicTableMeld,
  RearrangeTableMeldsInput,
} from '@/application/models/game';
import {
  createDoubleDeck,
  dealCardsForRound,
  getRoundDefinition,
  isValidMeld,
  scoreHand,
  shuffleDeck,
  validateMeld,
  validateRoundMeldSet,
} from '@/domain';
import type { CardInstance } from '@/domain/types/cards';
import type { TableMeld } from '@/domain/types/melds';
import type { PlayerId } from '@/domain/types/players';
import type { RoundIndex } from '@/domain/types/rounds';

function cloneCard(card: CardInstance): CardInstance {
  return { ...card };
}

function cloneCards(cards: readonly CardInstance[]) {
  return cards.map(cloneCard);
}

function cloneTableMeld(meld: PublicTableMeld): PublicTableMeld {
  return {
    id: meld.id,
    type: meld.type,
    ownerPlayerId: meld.ownerPlayerId,
    cards: cloneCards(meld.cards),
  };
}

function clonePrivateState(state: PrivatePlayerGameState): PrivatePlayerGameState {
  return {
    ...state,
    hand: cloneCards(state.hand),
  };
}

function cloneSnapshot(snapshot: GameRoundSnapshot): GameRoundSnapshot {
  const nextPrivateStates = Object.fromEntries(
    Object.entries(snapshot.privateStates).map(([playerId, state]) => [
      playerId,
      clonePrivateState(state),
    ]),
  );

  return {
    publicState: {
      ...snapshot.publicState,
      roundRequirement: [...snapshot.publicState.roundRequirement],
      playerCardCounts: { ...snapshot.publicState.playerCardCounts },
      orderedPlayerIds: [...snapshot.publicState.orderedPlayerIds],
      playersWhoAreDown: [...snapshot.publicState.playersWhoAreDown],
      publicTableMelds: snapshot.publicState.publicTableMelds.map(cloneTableMeld),
      discardTop: snapshot.publicState.discardTop
        ? cloneCard(snapshot.publicState.discardTop)
        : null,
      pendingOutOfTurnClaim: snapshot.publicState.pendingOutOfTurnClaim
        ? {
            ...snapshot.publicState.pendingOutOfTurnClaim,
            card: cloneCard(snapshot.publicState.pendingOutOfTurnClaim.card),
            eligiblePlayerIds: [...snapshot.publicState.pendingOutOfTurnClaim.eligiblePlayerIds],
            declinedPlayerIds: [...snapshot.publicState.pendingOutOfTurnClaim.declinedPlayerIds],
          }
        : null,
    },
    engineState: {
      ...snapshot.engineState,
      drawPile: cloneCards(snapshot.engineState.drawPile),
      discardPile: cloneCards(snapshot.engineState.discardPile),
      pendingTurnDiscard: snapshot.engineState.pendingTurnDiscard
        ? cloneCard(snapshot.engineState.pendingTurnDiscard)
        : null,
      pendingOutOfTurnClaim: snapshot.engineState.pendingOutOfTurnClaim
        ? {
            ...snapshot.engineState.pendingOutOfTurnClaim,
            card: cloneCard(snapshot.engineState.pendingOutOfTurnClaim.card),
            eligiblePlayerIds: [...snapshot.engineState.pendingOutOfTurnClaim.eligiblePlayerIds],
            declinedPlayerIds: [...snapshot.engineState.pendingOutOfTurnClaim.declinedPlayerIds],
          }
        : null,
    },
    privateStates: nextPrivateStates,
  };
}

function assertPlayerState(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): PrivatePlayerGameState {
  const playerState = snapshot.privateStates[playerId];

  if (!playerState) {
    throw new AppError('room-access-denied', 'No existe estado privado para ese jugador.');
  }

  return playerState;
}

function assertRoundIsPlaying(snapshot: GameRoundSnapshot) {
  if (snapshot.publicState.phase !== 'playing') {
    throw new AppError(
      'invalid-room-state',
      'La ronda ya está terminada y no acepta más acciones de juego.',
    );
  }
}

function requireCurrentTurn(snapshot: GameRoundSnapshot, playerId: PlayerId) {
  if (snapshot.publicState.currentTurnPlayerId !== playerId) {
    throw new AppError('invalid-room-state', 'No es el turno de ese jugador.');
  }
}

function findCardIndex(cards: readonly CardInstance[], cardId: string) {
  return cards.findIndex((card) => card.id === cardId);
}

function removeCardFromHand(state: PrivatePlayerGameState, cardId: string): CardInstance {
  const index = findCardIndex(state.hand, cardId);

  if (index === -1) {
    throw new AppError('invalid-room-state', `La carta ${cardId} no está en la mano.`);
  }

  const nextHand = [...state.hand];
  const [removedCard] = nextHand.splice(index, 1);

  if (!removedCard) {
    throw new AppError('invalid-room-state', 'No se pudo remover la carta de la mano.');
  }

  state.hand = nextHand;
  return removedCard;
}

function removeCardsFromHand(
  state: PrivatePlayerGameState,
  cardIds: readonly string[],
): CardInstance[] {
  const mutableState = { ...state, hand: [...state.hand] };
  const removedCards = cardIds.map((cardId) => removeCardFromHand(mutableState, cardId));
  state.hand = mutableState.hand;
  return removedCards;
}

function toTableMeld(
  id: string,
  type: PublicTableMeld['type'],
  ownerPlayerId: PublicTableMeld['ownerPlayerId'],
  cards: readonly CardInstance[],
): PublicTableMeld {
  return {
    id,
    type,
    ownerPlayerId,
    cards: cloneCards(cards),
  };
}

function tableMeldToDomain(meld: PublicTableMeld): TableMeld {
  return {
    type: meld.type,
    cards: meld.cards,
  };
}

function getNextPlayerId(orderedPlayerIds: readonly PlayerId[], currentPlayerId: PlayerId): PlayerId {
  const index = orderedPlayerIds.indexOf(currentPlayerId);

  if (index === -1) {
    throw new AppError('invalid-room-state', 'El jugador actual no pertenece al orden de turnos.');
  }

  const nextPlayerId = orderedPlayerIds[(index + 1) % orderedPlayerIds.length];

  if (!nextPlayerId) {
    throw new AppError('invalid-room-state', 'No existe siguiente jugador.');
  }

  return nextPlayerId;
}

function computeEligibleOutOfTurnClaimers(snapshot: GameRoundSnapshot): readonly PlayerId[] {
  const currentPlayerId = snapshot.publicState.currentTurnPlayerId;
  const currentIndex = snapshot.publicState.orderedPlayerIds.indexOf(currentPlayerId);
  const playersWhoAreDown = new Set(snapshot.publicState.playersWhoAreDown);

  if (currentIndex === -1) {
    return [];
  }

  const ordered = snapshot.publicState.orderedPlayerIds;
  const eligible: PlayerId[] = [];

  for (let offset = 1; offset < ordered.length; offset += 1) {
    const candidate = ordered[(currentIndex + offset) % ordered.length];

    if (!candidate) {
      continue;
    }

    if (!playersWhoAreDown.has(candidate)) {
      eligible.push(candidate);
    }
  }

  return eligible;
}

function syncLoadedClaimEligibility(snapshot: GameRoundSnapshot) {
  const claimWindow = snapshot.engineState.pendingOutOfTurnClaim;
  const declinedPlayerIds = new Set(claimWindow?.declinedPlayerIds ?? []);
  const topPriorityPlayerId =
    claimWindow?.eligiblePlayerIds.find((playerId) => !declinedPlayerIds.has(playerId)) ?? null;

  for (const [playerId, privateState] of Object.entries(snapshot.privateStates)) {
    privateState.canTakeOutOfTurnDiscard =
      topPriorityPlayerId === (playerId as PlayerId) && !privateState.hasGoneDown;
  }
}

function refreshCounts(snapshot: GameRoundSnapshot) {
  const discardTop =
    snapshot.engineState.discardPile.length > 0
      ? snapshot.engineState.discardPile[snapshot.engineState.discardPile.length - 1] ?? null
      : null;

  snapshot.publicState.discardTop = discardTop ? cloneCard(discardTop) : null;
  snapshot.publicState.discardCount = snapshot.engineState.discardPile.length;
  snapshot.publicState.drawPileCount = snapshot.engineState.drawPile.length;
  snapshot.publicState.playerCardCounts = {
    ...snapshot.publicState.playerCardCounts,
    ...Object.fromEntries(
      Object.entries(snapshot.privateStates).map(([playerId, privateState]) => [
        playerId,
        privateState.hand.length,
      ]),
    ),
  };
  snapshot.publicState.lastDrawSource = snapshot.engineState.lastDrawSource;
  snapshot.publicState.pendingOutOfTurnClaim = snapshot.engineState.pendingOutOfTurnClaim
    ? {
        ...snapshot.engineState.pendingOutOfTurnClaim,
        card: cloneCard(snapshot.engineState.pendingOutOfTurnClaim.card),
        eligiblePlayerIds: [...snapshot.engineState.pendingOutOfTurnClaim.eligiblePlayerIds],
      }
    : null;
}

function commitPendingTurnDiscard(snapshot: GameRoundSnapshot) {
  if (!snapshot.engineState.pendingTurnDiscard) {
    return;
  }

  snapshot.engineState.discardPile = [
    ...snapshot.engineState.discardPile,
    cloneCard(snapshot.engineState.pendingTurnDiscard),
  ];
  snapshot.engineState.pendingTurnDiscard = null;
}

function advanceToNextTurnMutable(snapshot: GameRoundSnapshot) {
  if (snapshot.publicState.winnerOfRound) {
    return snapshot;
  }

  const nextPlayerId = getNextPlayerId(
    snapshot.publicState.orderedPlayerIds,
    snapshot.publicState.currentTurnPlayerId,
  );

  snapshot.publicState.currentTurnPlayerId = nextPlayerId;
  snapshot.publicState.turnPhase = 'awaiting-draw';
  snapshot.publicState.turnNumber += 1;
  snapshot.engineState.turnNumber = snapshot.publicState.turnNumber;
  snapshot.engineState.lastDrawSource = null;
  snapshot.engineState.pendingOutOfTurnClaim = null;
  snapshot.engineState.pendingTurnDiscard = null;
  snapshot.engineState.currentTurnWentDownPlayerId = null;
  syncLoadedClaimEligibility(snapshot);
  refreshCounts(snapshot);

  return snapshot;
}

function assertCanDraw(snapshot: GameRoundSnapshot, playerId: PlayerId) {
  requireCurrentTurn(snapshot, playerId);

  if (snapshot.publicState.turnPhase !== 'awaiting-draw') {
    throw new AppError('invalid-room-state', 'El turno no está esperando un robo.');
  }
}

function assertCanDiscard(snapshot: GameRoundSnapshot, playerId: PlayerId) {
  requireCurrentTurn(snapshot, playerId);

  if (
    snapshot.publicState.turnPhase !== 'awaiting-melds' &&
    snapshot.publicState.turnPhase !== 'awaiting-discard'
  ) {
    throw new AppError('invalid-room-state', 'El turno no permite descartar en este momento.');
  }
}

function finishRoundTransitionMutable(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
  winnerWentOutFromInitialLaydown?: boolean,
) {
  const playerState = assertPlayerState(snapshot, playerId);

  if (playerState.hand.length > 0) {
    return snapshot;
  }

  const winnerWentDownThisTurn =
    snapshot.engineState.currentTurnWentDownPlayerId === playerId;

  snapshot.publicState.phase = 'scoring';
  snapshot.publicState.winnerOfRound = playerId;
  snapshot.publicState.winnerWentOutFromInitialLaydown =
    winnerWentOutFromInitialLaydown ?? winnerWentDownThisTurn;
  snapshot.publicState.turnPhase = 'completed';
  snapshot.publicState.scoringPending = true;
  snapshot.publicState.roundEndedAt = new Date();
  snapshot.engineState.pendingOutOfTurnClaim = null;
  syncLoadedClaimEligibility(snapshot);
  refreshCounts(snapshot);

  return snapshot;
}

export function buildInitialRoundSnapshot(
  input: BuildInitialRoundInput,
): GameRoundSnapshot {
  const roundDefinition = getRoundDefinition(input.roundIndex);
  const shuffledDeck =
    input.shuffledDeck ? [...input.shuffledDeck] : shuffleDeck(createDoubleDeck());
  const dealResult = dealCardsForRound(
    input.orderedPlayerIds,
    input.roundIndex,
    shuffledDeck,
  );
  const discardTop = dealResult.remainingDeck[0];

  if (!discardTop) {
    throw new AppError('invalid-room-state', 'No hay carta suficiente para iniciar el descarte.');
  }

  const drawPile = dealResult.remainingDeck.slice(1);
  const privateStates = Object.fromEntries(
    dealResult.hands.map((hand) => [
      hand.playerId,
      {
        roomId: input.roomId,
        playerId: hand.playerId,
        hand: cloneCards(hand.cards),
        hasGoneDown: false,
        canTakeOutOfTurnDiscard: false,
        scoreTotal: input.initialScoreTotals?.[hand.playerId] ?? 0,
        createdAt: null,
        updatedAt: null,
      } satisfies PrivatePlayerGameState,
    ]),
  );
  const currentTurnPlayerId = input.orderedPlayerIds[0];

  if (!currentTurnPlayerId) {
    throw new AppError('invalid-room-state', 'No hay jugadores para iniciar la ronda.');
  }

  const engineState: InternalGameEngineState = {
    roomId: input.roomId,
    gameId: input.gameId,
    roundIndex: input.roundIndex,
    drawPile: cloneCards(drawPile),
    discardPile: [cloneCard(discardTop)],
    pendingTurnDiscard: null,
    currentTurnWentDownPlayerId: null,
    turnNumber: 1,
    lastDrawSource: null,
    pendingOutOfTurnClaim: null,
  };

  const publicState: PublicGameState = {
    roomId: input.roomId,
    gameId: input.gameId,
    phase: 'playing',
    roundIndex: input.roundIndex,
    roundRequirement: roundDefinition.requirements,
    currentTurnPlayerId,
    turnPhase: 'awaiting-draw',
    turnNumber: 1,
    discardTop: cloneCard(discardTop),
    discardCount: 1,
    drawPileCount: drawPile.length,
    playerCardCounts: Object.fromEntries(
      Object.entries(privateStates).map(([playerId, privateState]) => [
        playerId,
        privateState.hand.length,
      ]),
    ),
    orderedPlayerIds: [...input.orderedPlayerIds],
    playersWhoAreDown: [],
    publicTableMelds: [],
    winnerOfRound: null,
    winnerWentOutFromInitialLaydown: false,
    finalWinnerPlayerId: null,
    pendingOutOfTurnClaim: null,
    lastDrawSource: null,
    scoringPending: false,
    createdAt: null,
    updatedAt: null,
    roundStartedAt: null,
    roundEndedAt: null,
    gameCompletedAt: null,
  };

  return {
    publicState,
    engineState,
    privateStates,
  };
}

export function drawFromDeckTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  assertCanDraw(nextSnapshot, playerId);
  const playerState = assertPlayerState(nextSnapshot, playerId);
  const nextCard = nextSnapshot.engineState.drawPile[0];

  if (!nextCard) {
    throw new AppError('invalid-room-state', 'El mazo está vacío.');
  }

  nextSnapshot.engineState.drawPile = nextSnapshot.engineState.drawPile.slice(1);
  playerState.hand = [...playerState.hand, cloneCard(nextCard)];
  nextSnapshot.engineState.lastDrawSource = 'deck';
  nextSnapshot.engineState.pendingOutOfTurnClaim = null;
  nextSnapshot.engineState.pendingTurnDiscard = null;
  nextSnapshot.engineState.currentTurnWentDownPlayerId = null;
  nextSnapshot.publicState.turnPhase = 'awaiting-melds';
  syncLoadedClaimEligibility(nextSnapshot);
  refreshCounts(nextSnapshot);

  return nextSnapshot;
}

export function drawFromDiscardTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  assertCanDraw(nextSnapshot, playerId);
  const playerState = assertPlayerState(nextSnapshot, playerId);

  if (playerState.hasGoneDown) {
    throw new AppError(
      'invalid-room-state',
      'Un jugador que ya se bajó solo puede robar del mazo.',
    );
  }

  const nextDiscardPile = [...nextSnapshot.engineState.discardPile];
  const nextCard = nextDiscardPile.pop();

  if (!nextCard) {
    throw new AppError('invalid-room-state', 'No hay carta visible en el descarte.');
  }

  nextSnapshot.engineState.discardPile = nextDiscardPile;
  playerState.hand = [...playerState.hand, cloneCard(nextCard)];
  nextSnapshot.engineState.lastDrawSource = 'discard';
  nextSnapshot.engineState.pendingOutOfTurnClaim = null;
  nextSnapshot.engineState.pendingTurnDiscard = null;
  nextSnapshot.engineState.currentTurnWentDownPlayerId = null;
  nextSnapshot.publicState.turnPhase = 'awaiting-melds';
  syncLoadedClaimEligibility(nextSnapshot);
  refreshCounts(nextSnapshot);

  return nextSnapshot;
}

function buildMeldsFromCardIds(
  state: PrivatePlayerGameState,
  ownerPlayerId: PlayerId,
  melds: readonly { id: string; type: PublicTableMeld['type']; cardIds: readonly string[] }[],
): PublicTableMeld[] {
  return melds.map((meld) => {
    const cards = meld.cardIds.map((cardId) => {
      const card = state.hand.find((item) => item.id === cardId);

      if (!card) {
        throw new AppError('invalid-room-state', `La carta ${cardId} no está disponible.`);
      }

      return cloneCard(card);
    });

    return toTableMeld(meld.id, meld.type, ownerPlayerId, cards);
  });
}

export function attemptInitialMeldDownTransition(
  snapshot: GameRoundSnapshot,
  input: AttemptInitialMeldDownInput,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  requireCurrentTurn(nextSnapshot, input.playerId);
  const playerState = assertPlayerState(nextSnapshot, input.playerId);
  const wasAlreadyDown = playerState.hasGoneDown;

  if (playerState.hasGoneDown) {
    throw new AppError('invalid-room-state', 'Ese jugador ya se bajó en esta ronda.');
  }

  const nextMelds = buildMeldsFromCardIds(playerState, input.playerId, input.melds);
  const validation = validateRoundMeldSet(
    nextMelds.map(tableMeldToDomain),
    nextSnapshot.publicState.roundIndex,
  );

  if (!validation.isValid) {
    throw new AppError(
      'invalid-room-state',
      validation.reason ?? 'La combinación inicial no cumple el requisito de la ronda.',
    );
  }

  const allCardIds = input.melds.flatMap((meld) => meld.cardIds);
  const removedCards = removeCardsFromHand(playerState, allCardIds);
  void removedCards;

  nextSnapshot.publicState.publicTableMelds = [
    ...nextSnapshot.publicState.publicTableMelds,
    ...nextMelds,
  ];
  playerState.hasGoneDown = true;
  playerState.canTakeOutOfTurnDiscard = false;

  if (!nextSnapshot.publicState.playersWhoAreDown.includes(input.playerId)) {
    nextSnapshot.publicState.playersWhoAreDown = [
      ...nextSnapshot.publicState.playersWhoAreDown,
      input.playerId,
    ];
  }

  if (!wasAlreadyDown) {
    nextSnapshot.engineState.currentTurnWentDownPlayerId = input.playerId;
  }

  syncLoadedClaimEligibility(nextSnapshot);
  return finishRoundTransitionMutable(nextSnapshot, input.playerId);
}

export function addCardsToExistingMeldTransition(
  snapshot: GameRoundSnapshot,
  input: AddCardsToExistingMeldInput,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  requireCurrentTurn(nextSnapshot, input.playerId);
  const playerState = assertPlayerState(nextSnapshot, input.playerId);

  if (!playerState.hasGoneDown) {
    throw new AppError(
      'invalid-room-state',
      'Solo un jugador que ya se bajó puede agregar cartas a la mesa.',
    );
  }

  const meldIndex = nextSnapshot.publicState.publicTableMelds.findIndex(
    (meld) => meld.id === input.meldId,
  );

  if (meldIndex === -1) {
    throw new AppError('invalid-room-state', 'No existe el meld objetivo en la mesa.');
  }

  const cardsToAdd = removeCardsFromHand(playerState, input.cardIds);
  const targetMeld = nextSnapshot.publicState.publicTableMelds[meldIndex];

  if (!targetMeld) {
    throw new AppError('invalid-room-state', 'No se pudo cargar el meld objetivo.');
  }

  const nextMeld = toTableMeld(targetMeld.id, targetMeld.type, targetMeld.ownerPlayerId, [
    ...targetMeld.cards,
    ...cardsToAdd,
  ]);
  const validation = validateMeld(tableMeldToDomain(nextMeld));

  if (!validation.isValid) {
    throw new AppError(
      'invalid-room-state',
      validation.reason ?? 'La mesa quedaría en un estado inválido.',
    );
  }

  const nextTable = [...nextSnapshot.publicState.publicTableMelds];
  nextTable[meldIndex] = nextMeld;
  nextSnapshot.publicState.publicTableMelds = nextTable;

  syncLoadedClaimEligibility(nextSnapshot);
  return finishRoundTransitionMutable(nextSnapshot, input.playerId);
}

export function rearrangeTableMeldsTransition(
  snapshot: GameRoundSnapshot,
  input: RearrangeTableMeldsInput,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  requireCurrentTurn(nextSnapshot, input.playerId);
  const playerState = assertPlayerState(nextSnapshot, input.playerId);

  if (!playerState.hasGoneDown) {
    throw new AppError(
      'invalid-room-state',
      'Solo un jugador que ya se bajó puede reorganizar la mesa.',
    );
  }

  const currentCards = nextSnapshot.publicState.publicTableMelds.flatMap((meld) =>
    meld.cards.map((card) => card.id),
  );
  const nextCards = input.melds.flatMap((meld) => meld.cardIds);
  const currentSorted = [...currentCards].sort();
  const nextSorted = [...nextCards].sort();

  if (currentSorted.length !== nextSorted.length) {
    throw new AppError(
      'invalid-room-state',
      'La reorganización debe conservar todas las cartas que ya están en la mesa.',
    );
  }

  if (currentSorted.some((cardId, index) => cardId !== nextSorted[index])) {
    throw new AppError(
      'invalid-room-state',
      'La reorganización no puede agregar ni quitar cartas de la mesa.',
    );
  }

  const cardMap = new Map(
    nextSnapshot.publicState.publicTableMelds.flatMap((meld) =>
      meld.cards.map((card) => [card.id, card] as const),
    ),
  );
  const nextMelds = input.melds.map((meld) =>
    toTableMeld(
      meld.id,
      meld.type,
      nextSnapshot.publicState.publicTableMelds.find((currentMeld) => currentMeld.id === meld.id)
        ?.ownerPlayerId ?? input.playerId,
      meld.cardIds.map((cardId) => {
        const card = cardMap.get(cardId);

        if (!card) {
          throw new AppError('invalid-room-state', `La carta ${cardId} no está en la mesa.`);
        }

        return card;
      }),
    ),
  );

  const invalidMeld = nextMelds.find((meld) => !isValidMeld(tableMeldToDomain(meld)));

  if (invalidMeld) {
    throw new AppError(
      'invalid-room-state',
      'La reorganización propuesta deja al menos un meld inválido.',
    );
  }

  nextSnapshot.publicState.publicTableMelds = nextMelds;
  syncLoadedClaimEligibility(nextSnapshot);
  return nextSnapshot;
}

export function discardCardTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
  cardId: string,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  assertCanDiscard(nextSnapshot, playerId);
  const playerState = assertPlayerState(nextSnapshot, playerId);
  const discardedCard = removeCardFromHand(playerState, cardId);

  const eligiblePlayerIds =
    nextSnapshot.engineState.lastDrawSource === 'deck' && playerState.hand.length > 0
      ? computeEligibleOutOfTurnClaimers(nextSnapshot)
      : [];

  const claimWindow: OutOfTurnClaimWindow | null =
    eligiblePlayerIds.length > 0
      ? {
          card: cloneCard(
            nextSnapshot.engineState.discardPile[
              nextSnapshot.engineState.discardPile.length - 1
            ] ?? discardedCard,
          ),
          eligiblePlayerIds,
          declinedPlayerIds: [],
          claimedByPlayerId: null,
          sourcePlayerId: playerId,
        }
      : null;

  if (claimWindow) {
    nextSnapshot.engineState.pendingTurnDiscard = cloneCard(discardedCard);
  } else {
    nextSnapshot.engineState.discardPile = [
      ...nextSnapshot.engineState.discardPile,
      cloneCard(discardedCard),
    ];
    nextSnapshot.engineState.pendingTurnDiscard = null;
  }

  nextSnapshot.engineState.pendingOutOfTurnClaim = claimWindow;
  nextSnapshot.publicState.turnPhase = claimWindow
    ? 'awaiting-out-of-turn-claim'
    : 'completed';
  nextSnapshot.engineState.lastDrawSource = nextSnapshot.engineState.lastDrawSource;
  syncLoadedClaimEligibility(nextSnapshot);
  refreshCounts(nextSnapshot);

  const afterFinishCheck = finishRoundTransitionMutable(nextSnapshot, playerId);

  if (
    afterFinishCheck.publicState.phase === 'playing' &&
    afterFinishCheck.engineState.lastDrawSource === 'discard' &&
    !afterFinishCheck.engineState.pendingOutOfTurnClaim
  ) {
    return advanceToNextTurnMutable(afterFinishCheck);
  }

  return afterFinishCheck;
}

export function claimOutOfTurnDiscardTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  const claimWindow = nextSnapshot.engineState.pendingOutOfTurnClaim;

  if (!claimWindow) {
    throw new AppError('invalid-room-state', 'No hay descarte reclamable fuera de turno.');
  }

  const privateState = assertPlayerState(nextSnapshot, playerId);

  if (privateState.hasGoneDown) {
    throw new AppError(
      'invalid-room-state',
      'Un jugador que ya se bajó no puede reclamar el descarte fuera de turno.',
    );
  }

  const declinedPlayerIds = new Set(claimWindow.declinedPlayerIds);
  const topPriorityPlayer = claimWindow.eligiblePlayerIds.find(
    (candidatePlayerId) => !declinedPlayerIds.has(candidatePlayerId),
  );

  if (topPriorityPlayer !== playerId) {
    throw new AppError(
      'invalid-room-state',
      'Otro jugador tiene prioridad para reclamar ese descarte.',
    );
  }

  const nextDiscardPile = [...nextSnapshot.engineState.discardPile];
  const claimedCard = nextDiscardPile.pop();

  if (!claimedCard || claimedCard.id !== claimWindow.card.id) {
    throw new AppError('invalid-room-state', 'El descarte visible cambió antes del reclamo.');
  }

  privateState.hand = [...privateState.hand, cloneCard(claimedCard)];
  privateState.canTakeOutOfTurnDiscard = false;
  nextSnapshot.engineState.discardPile = nextDiscardPile;
  commitPendingTurnDiscard(nextSnapshot);
  nextSnapshot.engineState.pendingOutOfTurnClaim = null;
  nextSnapshot.publicState.turnPhase = 'completed';

  return advanceToNextTurnMutable(nextSnapshot);
}

export function rejectOutOfTurnDiscardTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);
  const claimWindow = nextSnapshot.engineState.pendingOutOfTurnClaim;

  if (nextSnapshot.publicState.turnPhase !== 'awaiting-out-of-turn-claim' || !claimWindow) {
    throw new AppError(
      'invalid-room-state',
      'No hay una ventana de reclamo pendiente para rechazar.',
    );
  }

  const privateState = assertPlayerState(nextSnapshot, playerId);

  if (privateState.hasGoneDown) {
    throw new AppError(
      'invalid-room-state',
      'Un jugador que ya se bajó no puede participar en el reclamo fuera de turno.',
    );
  }

  const declinedPlayerIds = new Set(claimWindow.declinedPlayerIds);
  const topPriorityPlayer = claimWindow.eligiblePlayerIds.find(
    (candidatePlayerId) => !declinedPlayerIds.has(candidatePlayerId),
  );

  if (topPriorityPlayer !== playerId) {
    throw new AppError(
      'invalid-room-state',
      'Otro jugador tiene prioridad para decidir sobre ese descarte.',
    );
  }

  declinedPlayerIds.add(playerId);
  const nextDeclinedPlayerIds = [...declinedPlayerIds];
  const everyEligiblePlayerDeclined = claimWindow.eligiblePlayerIds.every((candidatePlayerId) =>
    declinedPlayerIds.has(candidatePlayerId),
  );

  nextSnapshot.engineState.pendingOutOfTurnClaim = everyEligiblePlayerDeclined
    ? null
    : {
        ...claimWindow,
        declinedPlayerIds: nextDeclinedPlayerIds,
      };
  if (everyEligiblePlayerDeclined) {
    commitPendingTurnDiscard(nextSnapshot);
  }
  nextSnapshot.publicState.turnPhase = everyEligiblePlayerDeclined
    ? 'completed'
    : 'awaiting-out-of-turn-claim';
  if (everyEligiblePlayerDeclined) {
    return advanceToNextTurnMutable(nextSnapshot);
  }

  syncLoadedClaimEligibility(nextSnapshot);
  refreshCounts(nextSnapshot);

  return nextSnapshot;
}

export function advanceTurnTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  assertRoundIsPlaying(nextSnapshot);

  requireCurrentTurn(nextSnapshot, playerId);

  if (nextSnapshot.engineState.pendingOutOfTurnClaim) {
    throw new AppError(
      'invalid-room-state',
      'No se puede avanzar el turno mientras exista un reclamo fuera de turno pendiente.',
    );
  }

  if (nextSnapshot.publicState.turnPhase !== 'completed') {
    throw new AppError('invalid-room-state', 'Todavía no corresponde avanzar el turno.');
  }

  return advanceToNextTurnMutable(nextSnapshot);
}

export function finishRoundIfPlayerIsEmptyTransition(
  snapshot: GameRoundSnapshot,
  playerId: PlayerId,
): GameRoundSnapshot {
  const nextSnapshot = cloneSnapshot(snapshot);
  return finishRoundTransitionMutable(nextSnapshot, playerId);
}

export function buildRoundScorePreview(snapshot: GameRoundSnapshot) {
  return Object.values(snapshot.privateStates).map((playerState) => ({
    playerId: playerState.playerId,
    remainingPoints: scoreHand(playerState.hand),
  }));
}
