import type { GameRepository } from '@/application/ports/game-repository';
import type { PlayerId } from '@/domain/types/players';

export function createSubscribeToPrivatePlayerStateUseCase(gameRepository: GameRepository) {
  return function subscribeToPrivatePlayerState(
    roomId: string,
    playerId: PlayerId,
    listener: Parameters<GameRepository['subscribeToPrivatePlayerState']>[2],
    onError?: Parameters<GameRepository['subscribeToPrivatePlayerState']>[3],
  ) {
    return gameRepository.subscribeToPrivatePlayerState(roomId, playerId, listener, onError);
  };
}
