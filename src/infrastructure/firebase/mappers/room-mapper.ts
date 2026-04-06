import type { LobbyRoom } from '@/application/models/lobby';
import type { FirestoreRoomDocument } from '@/infrastructure/firebase/types';
import { timestampToDate } from '@/infrastructure/firebase/utils';

export function mapFirestoreRoomToLobbyRoom(
  roomId: string,
  source: FirestoreRoomDocument,
  currentPlayerCount = 0,
): LobbyRoom {
  return {
    id: roomId,
    code: source.code,
    hostPlayerId: source.hostPlayerId,
    status: source.status,
    activeGameId: source.activeGameId,
    currentPlayerCount,
    maxPlayers: source.maxPlayers,
    minPlayers: source.minPlayers,
    createdAt: timestampToDate(source.createdAt),
    updatedAt: timestampToDate(source.updatedAt),
    startedAt: timestampToDate(source.startedAt),
  };
}
