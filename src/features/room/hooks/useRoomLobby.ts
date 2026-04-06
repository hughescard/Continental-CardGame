import { useEffect, useMemo, useState } from 'react';
import { appServices } from '@/application/services/app-services';
import type {
  LobbyPlayer,
  LobbyRoom,
  PublicGameBootstrap,
} from '@/application/models/lobby';
import { toAppError, type AppError } from '@/application/errors/app-error';
import { asPlayerId } from '@/domain/types/players';
import { appConfig } from '@/shared/config/env';
import { useAuthSession } from '@/shared/hooks/useAuthSession';

function asMessage(error: unknown) {
  return toAppError(error).message;
}

export function useRoomLobby(roomId: string) {
  const { session, isLoading: isAuthLoading, ensureAnonymousSession } = useAuthSession();
  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [players, setPlayers] = useState<readonly LobbyPlayer[]>([]);
  const [gameBootstrap, setGameBootstrap] = useState<PublicGameBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);

  useEffect(() => {
    if (isAuthLoading || session.userId) {
      return;
    }

    void ensureAnonymousSession().catch((nextError) => {
      setError(asMessage(nextError));
    });
  }, [ensureAnonymousSession, isAuthLoading, session.userId]);

  useEffect(() => {
    if (!session.userId) {
      return;
    }

    const handleError = (nextError: Error) => {
      setError(asMessage(nextError));
    };

    const unsubscribeRoom = appServices.subscribeToRoom(roomId, setRoom, handleError);
    const unsubscribePlayers = appServices.subscribeToPlayersInRoom(
      roomId,
      setPlayers,
      handleError,
    );
    const unsubscribeGame = appServices.roomLobbyRepository.subscribeToPublicGameBootstrap(
      roomId,
      setGameBootstrap,
      handleError,
    );

    return () => {
      unsubscribeRoom();
      unsubscribePlayers();
      unsubscribeGame();
    };
  }, [roomId, session.userId]);

  useEffect(() => {
    if (!session.userId) {
      return;
    }

    const playerId = asPlayerId(session.userId);

    void appServices.touchPlayerPresence(roomId, playerId).catch(() => undefined);

    const intervalId = window.setInterval(() => {
      void appServices.touchPlayerPresence(roomId, playerId).catch(() => undefined);
    }, appConfig.playerPresenceHeartbeatMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomId, session.userId]);

  const activePlayers = useMemo(
    () => players.filter((player) => player.status === 'connected'),
    [players],
  );

  const currentPlayer = useMemo(
    () => players.find((player) => player.id === session.userId) ?? null,
    [players, session.userId],
  );

  const isHost = room?.hostPlayerId === session.userId;

  async function startGame() {
    if (!room) {
      return;
    }

    setError(null);
    setIsStartingGame(true);

    try {
      await appServices.startGameFromLobby({ roomId: room.id });
    } catch (nextError) {
      setError(asMessage(nextError));
    } finally {
      setIsStartingGame(false);
    }
  }

  async function leaveRoom() {
    setError(null);
    setIsLeavingRoom(true);

    try {
      await appServices.leaveRoom({ roomId });
      return true;
    } catch (nextError) {
      setError(asMessage(nextError));
      return false;
    } finally {
      setIsLeavingRoom(false);
    }
  }

  return {
    room,
    players,
    activePlayers,
    currentPlayer,
    gameBootstrap,
    error,
    isHost,
    isAuthLoading,
    isStartingGame,
    isLeavingRoom,
    startGame,
    leaveRoom,
    clearError: () => setError(null),
  };
}
