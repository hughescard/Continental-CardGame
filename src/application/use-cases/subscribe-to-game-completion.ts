import type { GameRepository } from '@/application/ports/game-repository';

export function createSubscribeToGameCompletionUseCase(
  gameRepository: GameRepository,
) {
  return function subscribeToGameCompletion(
    roomId: string,
    gameId: string,
    listener: Parameters<GameRepository['subscribeToGameCompletion']>[2],
    onError?: Parameters<GameRepository['subscribeToGameCompletion']>[3],
  ) {
    return gameRepository.subscribeToGameCompletion(roomId, gameId, listener, onError);
  };
}
