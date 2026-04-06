import { useEffect, useMemo, useState } from 'react';
import { appServices } from '@/application/services/app-services';
import type {
  GameSummary,
  PrivatePlayerGameState,
  PublicGameState,
  RoundResultSummary,
} from '@/application/models/game';
import type { LobbyPlayer, LobbyRoom } from '@/application/models/lobby';
import { canStartNextRound } from '@/application/engine/game-progression';
import { sortCardsByRank, sortCardsBySuit } from '@/domain';
import { asPlayerId } from '@/domain/types/players';
import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { getPlayerName, describeRoundRequirement } from '@/features/game/lib/formatters';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export interface DraftMeld {
  id: string;
  type: 'trio' | 'straight';
  cardIds: string[];
}

export type HandSortMode = 'rank' | 'suit';

export type GameActionKey =
  | 'draw-deck'
  | 'draw-discard'
  | 'discard'
  | 'draft-trio'
  | 'draft-straight'
  | 'initial-down'
  | 'add-to-meld'
  | 'claim-out-of-turn'
  | 'reject-out-of-turn'
  | 'advance-turn';

export interface GameActionDescriptor {
  key: GameActionKey;
  label: string;
  description: string;
  enabled: boolean;
  visible: boolean;
  disabledReason?: string | undefined;
  tone?: 'brand' | 'surface' | 'danger' | undefined;
}

interface GameStatusNotice {
  title: string;
  description: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}

export interface TableParticipant {
  id: string;
  displayName: string;
  cardCount: number;
  isCurrentTurn: boolean;
  hasGoneDown: boolean;
  isClaimPriority: boolean;
  isSelf: boolean;
}

function buildActionDescriptors(input: {
  isRoundOpen: boolean;
  isCurrentPlayerTurn: boolean;
  turnPhase: PublicGameState['turnPhase'] | undefined;
  hasGoneDown: boolean | undefined;
  selectionCount: number;
  hasInitialDraft: boolean;
  hasSelectedTableMeld: boolean;
  canDrawFromDiscard: boolean;
  hasDiscardTop: boolean;
  canClaimOutOfTurn: boolean;
  canRejectOutOfTurn: boolean;
  canAdvanceTurn: boolean;
}) {
  const drawStateVisible = input.isRoundOpen && input.isCurrentPlayerTurn && input.turnPhase === 'awaiting-draw';
  const meldStateVisible =
    input.isRoundOpen &&
    input.isCurrentPlayerTurn &&
    (input.turnPhase === 'awaiting-melds' || input.turnPhase === 'awaiting-discard');
  const claimStateVisible = input.isRoundOpen && input.turnPhase === 'awaiting-out-of-turn-claim';

  const actions: GameActionDescriptor[] = [
    {
      key: 'draw-deck',
      label: 'Robar del mazo',
      description: 'Toma una carta boca abajo para iniciar tu turno.',
      visible: drawStateVisible,
      enabled: drawStateVisible,
      tone: 'brand',
    },
    {
      key: 'draw-discard',
      label: 'Robar descarte',
      description: 'Toma la carta visible del descarte si todavía no te has bajado.',
      visible: drawStateVisible,
      enabled: input.canDrawFromDiscard,
      disabledReason: !input.hasDiscardTop
        ? 'No hay una carta visible para tomar.'
        : input.hasGoneDown
          ? 'Después de bajarte solo puedes robar del mazo.'
          : undefined,
    },
    {
      key: 'discard',
      label: 'Descartar',
      description: 'Termina tu secuencia soltando una sola carta.',
      visible: meldStateVisible,
      enabled: input.selectionCount === 1,
      tone: 'brand',
      disabledReason:
        input.selectionCount === 0
          ? 'Selecciona una carta de tu mano.'
          : 'Solo puedes descartar una carta a la vez.',
    },
    {
      key: 'draft-trio',
      label: 'Borrador: trío',
      description: 'Agrega las cartas seleccionadas al borrador como combinación de trío.',
      visible: meldStateVisible && !input.hasGoneDown,
      enabled: input.selectionCount > 0,
      disabledReason: 'Selecciona una o más cartas para formar el borrador.',
    },
    {
      key: 'draft-straight',
      label: 'Borrador: escalera',
      description: 'Agrega las cartas seleccionadas al borrador como combinación de escalera.',
      visible: meldStateVisible && !input.hasGoneDown,
      enabled: input.selectionCount > 0,
      disabledReason: 'Selecciona una o más cartas para formar el borrador.',
    },
    {
      key: 'initial-down',
      label: 'Bajarse',
      description: 'Valida y publica tus combinaciones iniciales de esta ronda.',
      visible: meldStateVisible && !input.hasGoneDown,
      enabled: input.hasInitialDraft,
      tone: 'brand',
      disabledReason: 'Agrega combinaciones al borrador antes de bajarte.',
    },
    {
      key: 'add-to-meld',
      label: 'Agregar a combinación',
      description: 'Añade las cartas seleccionadas a la combinación pública marcada.',
      visible: meldStateVisible && !!input.hasGoneDown,
      enabled: input.selectionCount > 0 && input.hasSelectedTableMeld,
      disabledReason:
        input.selectionCount === 0
          ? 'Selecciona cartas de tu mano.'
          : !input.hasSelectedTableMeld
            ? 'Selecciona una combinación pública como destino.'
            : undefined,
    },
    {
      key: 'claim-out-of-turn',
      label: 'Reclamar descarte',
      description: 'Toma la carta en disputa antes de que avance el turno.',
      visible: claimStateVisible && input.canClaimOutOfTurn,
      enabled: input.canClaimOutOfTurn,
      tone: 'brand',
    },
    {
      key: 'reject-out-of-turn',
      label: 'Pasar reclamo',
      description: 'Cede la prioridad para que decida el siguiente jugador elegible.',
      visible: claimStateVisible && input.canRejectOutOfTurn,
      enabled: input.canRejectOutOfTurn,
    },
    {
      key: 'advance-turn',
      label: 'Avanzar turno',
      description: 'Pasa el control al siguiente jugador.',
      visible: input.isRoundOpen && input.isCurrentPlayerTurn && input.turnPhase === 'completed',
      enabled: input.canAdvanceTurn,
      tone: 'brand',
    },
  ];

  return actions.filter((action) => action.visible);
}

function buildStatusNotice(input: {
  publicState: PublicGameState | null;
  sessionUserId: string | null;
  currentTurnPlayerName: string;
  currentOutOfTurnPriorityPlayerName: string | null;
  roomStatus: LobbyRoom['status'] | null;
  isHydrating: boolean;
  hasPrivateState: boolean;
  hasPublicState: boolean;
  error: string | null;
}) {
  if (input.error) {
    return {
      title: 'Error temporal',
      description: input.error,
      tone: 'danger',
    } satisfies GameStatusNotice;
  }

  if (input.isHydrating || !input.hasPublicState || !input.hasPrivateState) {
    return {
      title: 'Sincronizando partida',
      description:
        input.roomStatus === 'in_game'
          ? 'Cargando estado público y tu mano privada.'
          : 'Esperando la sincronización inicial de la partida.',
      tone: 'info',
    } satisfies GameStatusNotice;
  }

  const publicState = input.publicState;

  if (!publicState) {
    return {
      title: 'Esperando partida',
      description: 'La mesa todavía no tiene un estado activo para mostrar.',
      tone: 'info',
    } satisfies GameStatusNotice;
  }

  if (publicState.phase === 'finished') {
    return {
      title: 'Partida terminada',
      description: 'Revisa la clasificación final y el historial de rondas.',
      tone: 'warning',
    } satisfies GameStatusNotice;
  }

  if (publicState.phase === 'scoring') {
    return {
      title: 'Ronda terminada',
      description: publicState.scoringPending
        ? 'Calculando el resultado de la ronda.'
        : 'La ronda ya terminó. Revisa el resumen y continúa cuando corresponda.',
      tone: 'success',
    } satisfies GameStatusNotice;
  }

  if (publicState.pendingOutOfTurnClaim) {
    if (input.currentOutOfTurnPriorityPlayerName) {
      return {
        title: 'Reclamo fuera de turno abierto',
        description: `La prioridad actual es para ${input.currentOutOfTurnPriorityPlayerName}.`,
        tone: 'warning',
      } satisfies GameStatusNotice;
    }
  }

  if (publicState.currentTurnPlayerId === input.sessionUserId) {
    if (publicState.turnPhase === 'awaiting-draw') {
      return {
        title: 'Tu turno',
        description: 'Primero roba del mazo o del descarte visible.',
        tone: 'info',
      } satisfies GameStatusNotice;
    }

    if (publicState.turnPhase === 'awaiting-melds') {
      return {
        title: 'Tu turno',
        description: 'Arma combinaciones, agrega a la mesa o prepara tu descarte.',
        tone: 'info',
      } satisfies GameStatusNotice;
    }

    if (publicState.turnPhase === 'completed') {
      return {
        title: 'Turno listo',
        description: 'Si no hay reclamos pendientes, puedes pasar al siguiente jugador.',
        tone: 'success',
      } satisfies GameStatusNotice;
    }
  }

  return {
    title: 'Esperando a otro jugador',
    description: `El turno actual es de ${input.currentTurnPlayerName}.`,
    tone: 'info',
  } satisfies GameStatusNotice;
}

export function useRealtimeGame(roomId: string) {
  const { session, ensureAnonymousSession, isLoading: isAuthLoading } = useAuthSession();
  const [publicState, setPublicState] = useState<PublicGameState | null>(null);
  const [privateState, setPrivateState] = useState<PrivatePlayerGameState | null>(null);
  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [roundResult, setRoundResult] = useState<RoundResultSummary | null>(null);
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [selectedTableMeldId, setSelectedTableMeldId] = useState<string | null>(null);
  const [initialDownDraft, setInitialDownDraft] = useState<DraftMeld[]>([]);
  const [rearrangeInput, setRearrangeInput] = useState('');
  const [handSortMode, setHandSortMode] = useState<HandSortMode>('rank');
  const [isBusy, setIsBusy] = useState(false);
  const [isStartingNextRound, setIsStartingNextRound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading || session.userId) {
      return;
    }

    void ensureAnonymousSession().catch((nextError) => {
      setError(getErrorMessage(nextError));
    });
  }, [ensureAnonymousSession, isAuthLoading, session.userId]);

  useEffect(() => {
    if (!session.userId) {
      return;
    }

    const unsubscribePublic = appServices.subscribeToPublicGameState(
      roomId,
      setPublicState,
      (nextError) => setError(getErrorMessage(nextError)),
    );
    const unsubscribeRoom = appServices.subscribeToRoom(
      roomId,
      setRoom,
      (nextError) => setError(getErrorMessage(nextError)),
    );
    const unsubscribePlayers = appServices.subscribeToPlayersInRoom(
      roomId,
      (nextPlayers) => setPlayers([...nextPlayers]),
      (nextError) => setError(getErrorMessage(nextError)),
    );
    const unsubscribePrivate = appServices.subscribeToPrivatePlayerState(
      roomId,
      asPlayerId(session.userId),
      setPrivateState,
      (nextError) => setError(getErrorMessage(nextError)),
    );

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
      unsubscribePublic();
      unsubscribePrivate();
    };
  }, [roomId, session.userId]);

  useEffect(() => {
    if (!session.userId || !publicState || !privateState) {
      return;
    }

    const publicCardCount = publicState.playerCardCounts?.[session.userId];
    const privateCardCount = privateState.hand.length;

    if (publicCardCount === privateCardCount) {
      return;
    }

    void appServices
      .syncPlayerCardCount({
        roomId,
        playerId: asPlayerId(session.userId),
        cardCount: privateCardCount,
      })
      .catch((nextError) => setError(getErrorMessage(nextError)));
  }, [
    privateState,
    publicState,
    roomId,
    session.userId,
  ]);

  useEffect(() => {
    if (!publicState) {
      setRoundResult(null);
      return;
    }

    const unsubscribe = appServices.subscribeToRoundResult(
      roomId,
      publicState.roundIndex,
      setRoundResult,
      (nextError) => setError(getErrorMessage(nextError)),
    );

    return () => {
      unsubscribe();
    };
  }, [publicState?.roundIndex, roomId]);

  useEffect(() => {
    if (!publicState?.gameId) {
      setGameSummary(null);
      return;
    }

    const unsubscribe = appServices.subscribeToGameCompletion(
      roomId,
      publicState.gameId,
      setGameSummary,
      (nextError) => setError(getErrorMessage(nextError)),
    );

    return () => {
      unsubscribe();
    };
  }, [publicState?.gameId, roomId]);

  useEffect(() => {
    if (!publicState) {
      return;
    }

    if (publicState.phase === 'playing' || publicState.phase === 'finished') {
      setIsStartingNextRound(false);
    }
  }, [publicState]);

  const currentOutOfTurnPriorityPlayerId =
    publicState?.pendingOutOfTurnClaim?.eligiblePlayerIds.find(
      (playerId) =>
        !publicState.pendingOutOfTurnClaim?.declinedPlayerIds.includes(playerId),
    ) ?? null;

  const isCurrentPlayerTurn = publicState?.currentTurnPlayerId === session.userId;
  const isHost = room?.hostPlayerId === session.userId;
  const isRoundOpen = publicState?.phase === 'playing';

  useEffect(() => {
    if (
      !publicState ||
      publicState.phase !== 'scoring' ||
      !publicState.scoringPending ||
      !session.userId
    ) {
      return;
    }

    void appServices.closeRoundAndScore({ roomId }).catch((nextError) => {
      setError(getErrorMessage(nextError));
    });
  }, [publicState?.phase, publicState?.roundIndex, publicState?.scoringPending, roomId, session.userId]);

  useEffect(() => {
    if (
      !publicState ||
      publicState.phase !== 'scoring' ||
      publicState.roundIndex !== 8 ||
      publicState.scoringPending ||
      !roundResult ||
      gameSummary ||
      !isHost ||
      !session.userId
    ) {
      return;
    }

    void appServices.finalizeGame({ roomId }).catch((nextError) => {
      setError(getErrorMessage(nextError));
    });
  }, [
    gameSummary,
    publicState?.phase,
    publicState?.roundIndex,
    publicState?.scoringPending,
    roomId,
    roundResult,
    isHost,
    session.userId,
  ]);

  const canDrawFromDeck =
    isRoundOpen && isCurrentPlayerTurn && publicState?.turnPhase === 'awaiting-draw';
  const canDrawFromDiscard =
    canDrawFromDeck && !privateState?.hasGoneDown && publicState?.discardTop !== null;
  const canDiscard =
    isRoundOpen &&
    isCurrentPlayerTurn &&
    (publicState?.turnPhase === 'awaiting-melds' ||
      publicState?.turnPhase === 'awaiting-discard') &&
    selectedCardIds.length === 1;
  const canAttemptInitialDown =
    isRoundOpen &&
    isCurrentPlayerTurn &&
    !privateState?.hasGoneDown &&
    initialDownDraft.length > 0 &&
    publicState?.turnPhase === 'awaiting-melds';
  const canAddToTable =
    isRoundOpen &&
    isCurrentPlayerTurn &&
    privateState?.hasGoneDown &&
    selectedTableMeldId !== null &&
    selectedCardIds.length > 0 &&
    publicState?.turnPhase === 'awaiting-melds';
  const canClaimOutOfTurn =
    isRoundOpen &&
    publicState?.turnPhase === 'awaiting-out-of-turn-claim' &&
    currentOutOfTurnPriorityPlayerId === session.userId &&
    !privateState?.hasGoneDown;
  const canRejectOutOfTurn =
    isRoundOpen &&
    publicState?.turnPhase === 'awaiting-out-of-turn-claim' &&
    currentOutOfTurnPriorityPlayerId === session.userId &&
    !privateState?.hasGoneDown;
  const canAdvanceTurn =
    isRoundOpen && isCurrentPlayerTurn && publicState?.turnPhase === 'completed';
  const canStartNextRoundAction =
    isHost &&
    publicState !== null &&
    roundResult !== null &&
    canStartNextRound(
      publicState.roundIndex,
      publicState.phase,
      publicState.scoringPending,
      true,
    );
  const canRearrangeTable =
    isRoundOpen &&
    isCurrentPlayerTurn &&
    !!privateState?.hasGoneDown &&
    publicState?.turnPhase === 'awaiting-melds';

  const sortedHand = useMemo(() => {
    if (!privateState?.hand) {
      return [];
    }

    return handSortMode === 'suit'
      ? sortCardsBySuit(privateState.hand)
      : sortCardsByRank(privateState.hand);
  }, [handSortMode, privateState?.hand]);

  const playerNameMap = useMemo(
    () => Object.fromEntries(players.map((player) => [player.id, player.displayName])),
    [players],
  );

  const tableParticipants = useMemo<TableParticipant[]>(() => {
    if (!publicState) {
      return [];
    }

    const playerCardCounts = publicState.playerCardCounts ?? {};

    return publicState.orderedPlayerIds.map((playerId) => {
      const player = players.find((item) => item.id === playerId);

      return {
        id: playerId,
        displayName: player?.displayName ?? getPlayerName(playerId, players, session.userId),
        cardCount: playerCardCounts[playerId] ?? 0,
        isCurrentTurn: publicState.currentTurnPlayerId === playerId,
        hasGoneDown: publicState.playersWhoAreDown.includes(playerId),
        isClaimPriority: currentOutOfTurnPriorityPlayerId === playerId,
        isSelf: session.userId === playerId,
      };
    });
  }, [currentOutOfTurnPriorityPlayerId, players, publicState, session.userId]);

  const currentTurnPlayerName = publicState
    ? getPlayerName(publicState.currentTurnPlayerId, players, session.userId)
    : '...';
  const currentOutOfTurnPriorityPlayerName = currentOutOfTurnPriorityPlayerId
    ? getPlayerName(currentOutOfTurnPriorityPlayerId, players, session.userId)
    : null;
  const winnerOfRoundName =
    publicState?.winnerOfRound
      ? getPlayerName(publicState.winnerOfRound, players, session.userId)
      : null;
  const isHydrating =
    isAuthLoading ||
    (!session.userId && !error) ||
    (session.userId !== null && (!publicState || !privateState));

  const roundRequirementText = describeRoundRequirement(publicState?.roundRequirement);

  const statusNotice = buildStatusNotice({
    publicState,
    sessionUserId: session.userId,
    currentTurnPlayerName,
    currentOutOfTurnPriorityPlayerName,
    roomStatus: room?.status ?? null,
    isHydrating,
    hasPrivateState: privateState !== null,
    hasPublicState: publicState !== null,
    error,
  });

  const actionDescriptors = useMemo(
    () =>
      buildActionDescriptors({
        isRoundOpen,
        isCurrentPlayerTurn: !!isCurrentPlayerTurn,
        turnPhase: publicState?.turnPhase,
        hasGoneDown: privateState?.hasGoneDown,
        selectionCount: selectedCardIds.length,
        hasInitialDraft: initialDownDraft.length > 0,
        hasSelectedTableMeld: selectedTableMeldId !== null,
        canDrawFromDiscard: !!canDrawFromDiscard,
        hasDiscardTop: !!publicState?.discardTop,
        canClaimOutOfTurn: !!canClaimOutOfTurn,
        canRejectOutOfTurn: !!canRejectOutOfTurn,
        canAdvanceTurn: !!canAdvanceTurn,
      }),
    [
      canAdvanceTurn,
      canClaimOutOfTurn,
      canDrawFromDiscard,
      canRejectOutOfTurn,
      initialDownDraft.length,
      isCurrentPlayerTurn,
      isRoundOpen,
      privateState?.hasGoneDown,
      publicState?.discardTop,
      publicState?.turnPhase,
      selectedCardIds.length,
      selectedTableMeldId,
    ],
  );

  function toggleCard(cardId: string) {
    setSelectedCardIds((current) =>
      current.includes(cardId)
        ? current.filter((item) => item !== cardId)
        : [...current, cardId],
    );
  }

  function addDraftMeld(type: DraftMeld['type']) {
    if (selectedCardIds.length === 0) {
      return;
    }

    setInitialDownDraft((current) => [
      ...current,
      {
        id: `draft-${current.length + 1}`,
        type,
        cardIds: selectedCardIds,
      },
    ]);
    setSelectedCardIds([]);
  }

  function removeDraftMeld(meldId: string) {
    setInitialDownDraft((current) => current.filter((meld) => meld.id !== meldId));
  }

  function parseRearrangeInput(): { id: string; type: 'trio' | 'straight'; cardIds: string[] }[] {
    return rearrangeInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [idPart, typePart, cardsPart] = line.split(':');

        if (!idPart || !typePart || !cardsPart) {
          throw new Error(`Formato inválido en la línea ${index + 1}.`);
        }

        if (typePart !== 'trio' && typePart !== 'straight') {
          throw new Error(`Tipo inválido en la línea ${index + 1}.`);
        }

        return {
          id: idPart,
          type: typePart,
          cardIds: cardsPart
            .split(',')
            .map((cardId) => cardId.trim())
            .filter(Boolean),
        };
      });
  }

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setIsBusy(true);

    try {
      await action();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsBusy(false);
    }
  }

  return {
    room,
    players,
    tableParticipants,
    playerNameMap,
    publicState,
    privateState,
    roundResult,
    gameSummary,
    isHost,
    isHydrating,
    statusNotice,
    currentTurnPlayerName,
    currentOutOfTurnPriorityPlayerName,
    winnerOfRoundName,
    roundRequirementText,
    sortedHand,
    handSortMode,
    selectedCardIds,
    selectedTableMeldId,
    initialDownDraft,
    rearrangeInput,
    error,
    isBusy,
    isStartingNextRound,
    isCurrentPlayerTurn,
    currentOutOfTurnPriorityPlayerId,
    canDrawFromDeck,
    canDrawFromDiscard,
    canDiscard,
    canAttemptInitialDown,
    canAddToTable,
    canClaimOutOfTurn,
    canRejectOutOfTurn,
    canAdvanceTurn,
    canStartNextRound: canStartNextRoundAction,
    canRearrangeTable,
    actionDescriptors,
    toggleCard,
    setSelectedTableMeldId,
    setHandSortMode,
    addDraftMeld,
    removeDraftMeld,
    setRearrangeInput,
    clearSelection: () => setSelectedCardIds([]),
    clearError: () => setError(null),
    drawFromDeck: () =>
      runAction(async () => {
        await appServices.drawFromDeck({ roomId });
      }),
    drawFromDiscard: () =>
      runAction(async () => {
        await appServices.drawFromDiscard({ roomId });
      }),
    discardSelectedCard: () =>
      runAction(async () => {
        const cardId = selectedCardIds[0];

        if (!cardId) {
          return;
        }

        await appServices.discardCard({ roomId, cardId });
        setSelectedCardIds([]);
        setSelectedTableMeldId(null);
      }),
    submitInitialDown: () =>
      runAction(async () => {
        await appServices.attemptInitialMeldDown(roomId, { melds: initialDownDraft });
        setInitialDownDraft([]);
        setSelectedCardIds([]);
      }),
    addSelectedCardsToMeld: () =>
      runAction(async () => {
        if (!selectedTableMeldId) {
          return;
        }

        await appServices.addCardsToExistingMeld(roomId, {
          meldId: selectedTableMeldId,
          cardIds: selectedCardIds,
        });
        setSelectedCardIds([]);
      }),
    submitRearrangeTable: () =>
      runAction(async () => {
        const melds = parseRearrangeInput();
        await appServices.rearrangeTableMelds(roomId, { melds });
      }),
    claimOutOfTurnDiscard: () =>
      runAction(async () => {
        await appServices.claimOutOfTurnDiscard({ roomId });
      }),
    rejectOutOfTurnDiscard: () =>
      runAction(async () => {
        await appServices.rejectOutOfTurnDiscard({ roomId });
      }),
    advanceTurn: () =>
      runAction(async () => {
        await appServices.advanceTurn({ roomId });
      }),
    startNextRound: async () => {
      setError(null);
      setIsBusy(true);
      setIsStartingNextRound(true);

      try {
        await appServices.startNextRound({ roomId });
        setSelectedCardIds([]);
        setSelectedTableMeldId(null);
        setInitialDownDraft([]);
        setRearrangeInput('');
      } catch (nextError) {
        setIsStartingNextRound(false);
        setError(getErrorMessage(nextError));
      } finally {
        setIsBusy(false);
      }
    },
  };
}
