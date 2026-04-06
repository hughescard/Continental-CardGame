import type { RoomLobbyRepository } from '@/application/ports/room-lobby-repository';

export function createSubscribeToRoomUseCase(roomLobbyRepository: RoomLobbyRepository) {
  return function subscribeToRoom(
    roomId: string,
    listener: Parameters<RoomLobbyRepository['subscribeToRoom']>[1],
    onError?: Parameters<RoomLobbyRepository['subscribeToRoom']>[2],
  ) {
    return roomLobbyRepository.subscribeToRoom(roomId, listener, onError);
  };
}
