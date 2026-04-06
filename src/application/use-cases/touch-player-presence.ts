import type { RoomLobbyRepository } from '@/application/ports/room-lobby-repository';
import type { PlayerId } from '@/domain/types/players';

export function createTouchPlayerPresenceUseCase(
  roomLobbyRepository: RoomLobbyRepository,
) {
  return function touchPlayerPresence(roomId: string, playerId: PlayerId) {
    return roomLobbyRepository.touchPlayerPresence({ roomId, playerId });
  };
}
