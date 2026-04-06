import { appConfig } from '@/shared/config/env';
import type { LobbyPlayer } from '@/application/models/lobby';
import type { FirestoreRoomPlayerDocument } from '@/infrastructure/firebase/types';
import { timestampToDate } from '@/infrastructure/firebase/utils';

export function mapFirestorePlayerToLobbyPlayer(
  playerId: string,
  source: FirestoreRoomPlayerDocument,
): LobbyPlayer {
  const lastActiveAt = timestampToDate(source.lastActiveAt);
  const now = Date.now();
  const isOnline =
    source.status === 'connected' &&
    (lastActiveAt === null ||
      now - lastActiveAt.getTime() <= appConfig.playerPresenceOfflineThresholdMs);

  return {
    id: playerId,
    displayName: source.displayName,
    seatIndex: source.seatIndex,
    status: source.status,
    joinedAt: timestampToDate(source.joinedAt),
    updatedAt: timestampToDate(source.updatedAt),
    lastActiveAt,
    leftAt: timestampToDate(source.leftAt),
    isOnline,
  };
}
