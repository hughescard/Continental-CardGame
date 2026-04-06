import type { GameRepository } from '@/application/ports/game-repository';

export function createSubscribeToPublicGameStateUseCase(gameRepository: GameRepository) {
  return function subscribeToPublicGameState(
    roomId: string,
    listener: Parameters<GameRepository['subscribeToPublicGameState']>[1],
    onError?: Parameters<GameRepository['subscribeToPublicGameState']>[2],
  ) {
    return gameRepository.subscribeToPublicGameState(roomId, listener, onError);
  };
}
