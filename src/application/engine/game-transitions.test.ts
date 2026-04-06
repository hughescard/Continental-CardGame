import { describe, expect, it } from 'vitest';
import { createDoubleDeck } from '@/domain';
import { asPlayerId } from '@/domain/types/players';
import {
  advanceTurnTransition,
  buildInitialRoundSnapshot,
  claimOutOfTurnDiscardTransition,
  discardCardTransition,
  drawFromDeckTransition,
  drawFromDiscardTransition,
  finishRoundIfPlayerIsEmptyTransition,
  rejectOutOfTurnDiscardTransition,
} from '@/application/engine/game-transitions';

const player1 = asPlayerId('player-1');
const player2 = asPlayerId('player-2');
const player3 = asPlayerId('player-3');

function createRoundOneSnapshot(playerIds = [player1, player2]) {
  return buildInitialRoundSnapshot({
    roomId: 'room-1',
    gameId: 'game-1',
    orderedPlayerIds: playerIds,
    roundIndex: 1,
    shuffledDeck: createDoubleDeck(),
  });
}

describe('buildInitialRoundSnapshot', () => {
  it('deals the exact amount of cards for round 1 and initializes turn state', () => {
    const snapshot = createRoundOneSnapshot();

    expect(snapshot.publicState.roundIndex).toBe(1);
    expect(snapshot.publicState.currentTurnPlayerId).toBe(player1);
    expect(snapshot.publicState.turnPhase).toBe('awaiting-draw');
    expect(snapshot.publicState.discardCount).toBe(1);
    expect(snapshot.publicState.drawPileCount).toBe(93);
    expect(snapshot.privateStates[player1]?.hand).toHaveLength(7);
    expect(snapshot.privateStates[player2]?.hand).toHaveLength(7);
  });
});

describe('draw restrictions', () => {
  it('blocks drawing from discard after the player has gone down', () => {
    const snapshot = createRoundOneSnapshot();
    const privateState = snapshot.privateStates[player1];

    if (!privateState) {
      throw new Error('Missing private state for player 1.');
    }

    const nextSnapshot = {
      ...snapshot,
      privateStates: {
        ...snapshot.privateStates,
        [player1]: {
          ...privateState,
          hasGoneDown: true,
        },
      },
    };

    expect(() => drawFromDiscardTransition(nextSnapshot, player1)).toThrowError(
      'Un jugador que ya se bajó solo puede robar del mazo.',
    );
  });
});

describe('discard flow', () => {
  it('keeps the previous discard top claimable and delays stacking the new discard after drawing from deck', () => {
    const afterDraw = drawFromDeckTransition(createRoundOneSnapshot(), player1);
    const previousDiscardTopId = afterDraw.publicState.discardTop?.id;
    const cardToDiscard = afterDraw.privateStates[player1]?.hand[0];

    if (!cardToDiscard) {
      throw new Error('Missing card to discard.');
    }

    const afterDiscard = discardCardTransition(afterDraw, player1, cardToDiscard.id);

    expect(afterDiscard.publicState.turnPhase).toBe('awaiting-out-of-turn-claim');
    expect(afterDiscard.publicState.discardTop?.id).toBe(previousDiscardTopId);
    expect(afterDiscard.publicState.discardCount).toBe(1);
    expect(afterDiscard.engineState.pendingTurnDiscard?.id).toBe(cardToDiscard.id);
    expect(afterDiscard.publicState.pendingOutOfTurnClaim?.card.id).toBe(previousDiscardTopId);
    expect(afterDiscard.publicState.pendingOutOfTurnClaim?.eligiblePlayerIds).toEqual([
      player2,
    ]);
  });

  it('disables out-of-turn claim when the active player drew from discard', () => {
    const afterDraw = drawFromDiscardTransition(createRoundOneSnapshot(), player1);
    const cardToDiscard = afterDraw.privateStates[player1]?.hand[0];

    if (!cardToDiscard) {
      throw new Error('Missing card to discard.');
    }

    const afterDiscard = discardCardTransition(afterDraw, player1, cardToDiscard.id);

    expect(afterDiscard.publicState.pendingOutOfTurnClaim).toBeNull();
    expect(afterDiscard.publicState.turnPhase).toBe('completed');
    expect(afterDiscard.publicState.discardTop?.id).toBe(cardToDiscard.id);
    expect(afterDiscard.engineState.pendingTurnDiscard).toBeNull();
  });
});

describe('claimOutOfTurnDiscard', () => {
  it('assigns priority to the nearest next player who is still eligible', () => {
    const snapshot = createRoundOneSnapshot([player1, player2, player3]);
    snapshot.publicState.playersWhoAreDown = [player2];

    const afterDraw = drawFromDeckTransition(snapshot, player1);
    const cardToDiscard = afterDraw.privateStates[player1]?.hand[0];

    if (!cardToDiscard) {
      throw new Error('Missing card to discard.');
    }

    const afterDiscard = discardCardTransition(afterDraw, player1, cardToDiscard.id);

    expect(afterDiscard.publicState.pendingOutOfTurnClaim?.eligiblePlayerIds).toEqual([
      player3,
    ]);
    expect(afterDiscard.publicState.pendingOutOfTurnClaim?.declinedPlayerIds).toEqual([]);

    const beforeHandCount = afterDiscard.privateStates[player3]?.hand.length ?? 0;
    const afterClaim = claimOutOfTurnDiscardTransition(afterDiscard, player3);

    expect(afterClaim.privateStates[player3]?.hand.length).toBe(beforeHandCount + 1);
    expect(afterClaim.publicState.discardTop?.id).toBe(cardToDiscard.id);
    expect(afterClaim.publicState.discardCount).toBe(1);
    expect(afterClaim.publicState.pendingOutOfTurnClaim).toBeNull();
    expect(afterClaim.publicState.currentTurnPlayerId).toBe(player2);
    expect(afterClaim.publicState.turnPhase).toBe('awaiting-draw');
  });
});

describe('claim window lifecycle', () => {
  it('blocks advanceTurn while there is a pending out-of-turn claim', () => {
    const afterDraw = drawFromDeckTransition(createRoundOneSnapshot(), player1);
    const cardToDiscard = afterDraw.privateStates[player1]?.hand[0];

    if (!cardToDiscard) {
      throw new Error('Missing card to discard.');
    }

    const afterDiscard = discardCardTransition(afterDraw, player1, cardToDiscard.id);

    expect(() => advanceTurnTransition(afterDiscard, player1)).toThrowError(
      'No se puede avanzar el turno mientras exista un reclamo fuera de turno pendiente.',
    );
  });

  it('requires each eligible player to reject in priority order and then advances automatically', () => {
    const afterDraw = drawFromDeckTransition(createRoundOneSnapshot([player1, player2, player3]), player1);
    const cardToDiscard = afterDraw.privateStates[player1]?.hand[0];

    if (!cardToDiscard) {
      throw new Error('Missing card to discard.');
    }

    const afterDiscard = discardCardTransition(afterDraw, player1, cardToDiscard.id);
    const afterFirstReject = rejectOutOfTurnDiscardTransition(afterDiscard, player2);

    expect(afterFirstReject.publicState.pendingOutOfTurnClaim?.declinedPlayerIds).toEqual([
      player2,
    ]);
    expect(afterFirstReject.privateStates[player3]?.canTakeOutOfTurnDiscard).toBe(true);
    expect(() => advanceTurnTransition(afterFirstReject, player1)).toThrowError(
      'No se puede avanzar el turno mientras exista un reclamo fuera de turno pendiente.',
    );

    const afterSecondReject = rejectOutOfTurnDiscardTransition(afterFirstReject, player3);

    expect(afterSecondReject.publicState.pendingOutOfTurnClaim).toBeNull();
    expect(afterSecondReject.publicState.turnPhase).toBe('awaiting-draw');
    expect(afterSecondReject.publicState.discardCount).toBe(2);
    expect(afterSecondReject.publicState.discardTop?.id).toBe(cardToDiscard.id);
    expect(afterSecondReject.publicState.currentTurnPlayerId).toBe(player2);
  });
});

describe('finishRoundIfPlayerIsEmpty', () => {
  it('closes the round when the acting player has no cards left', () => {
    const snapshot = createRoundOneSnapshot();
    const privateState = snapshot.privateStates[player1];

    if (!privateState) {
      throw new Error('Missing private state for player 1.');
    }

    const nextSnapshot = {
      ...snapshot,
      privateStates: {
        ...snapshot.privateStates,
        [player1]: {
          ...privateState,
          hand: [],
        },
      },
    };

    const afterFinish = finishRoundIfPlayerIsEmptyTransition(nextSnapshot, player1);

    expect(afterFinish.publicState.phase).toBe('scoring');
    expect(afterFinish.publicState.winnerOfRound).toBe(player1);
    expect(afterFinish.publicState.scoringPending).toBe(true);
    expect(afterFinish.publicState.roundEndedAt).not.toBeNull();
  });

  it('marks same-turn initial laydown winners so scoring can apply x2 or x3', () => {
    const snapshot = createRoundOneSnapshot();
    const privateState = snapshot.privateStates[player1];

    if (!privateState) {
      throw new Error('Missing private state for player 1.');
    }

    const nextSnapshot = {
      ...snapshot,
      engineState: {
        ...snapshot.engineState,
        currentTurnWentDownPlayerId: player1,
      },
      privateStates: {
        ...snapshot.privateStates,
        [player1]: {
          ...privateState,
          hand: [],
        },
      },
    };

    const afterFinish = finishRoundIfPlayerIsEmptyTransition(nextSnapshot, player1);

    expect(afterFinish.publicState.phase).toBe('scoring');
    expect(afterFinish.publicState.winnerWentOutFromInitialLaydown).toBe(true);
  });

  it('blocks normal game actions after the round has been closed', () => {
    const snapshot = createRoundOneSnapshot();
    const privateState = snapshot.privateStates[player1];

    if (!privateState) {
      throw new Error('Missing private state for player 1.');
    }

    const closedSnapshot = finishRoundIfPlayerIsEmptyTransition(
      {
        ...snapshot,
        privateStates: {
          ...snapshot.privateStates,
          [player1]: {
            ...privateState,
            hand: [],
          },
        },
      },
      player1,
    );

    expect(() => drawFromDeckTransition(closedSnapshot, player1)).toThrowError(
      'La ronda ya está terminada y no acepta más acciones de juego.',
    );
  });
});
