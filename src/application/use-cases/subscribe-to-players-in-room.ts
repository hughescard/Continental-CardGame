import type { RoomLobbyRepository } from '@/application/ports/room-lobby-repository';

export function createSubscribeToPlayersInRoomUseCase(
  roomLobbyRepository: RoomLobbyRepository,
) {
  return function subscribeToPlayersInRoom(
    roomId: string,
    listener: Parameters<RoomLobbyRepository['subscribeToPlayersInRoom']>[1],
    onError?: Parameters<RoomLobbyRepository['subscribeToPlayersInRoom']>[2],
  ) {
    return roomLobbyRepository.subscribeToPlayersInRoom(roomId, listener, onError);
  };
}
