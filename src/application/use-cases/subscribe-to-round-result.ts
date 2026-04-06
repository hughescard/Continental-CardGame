import type { GameRepository } from '@/application/ports/game-repository';

export function createSubscribeToRoundResultUseCase(gameRepository: GameRepository) {
  return function subscribeToRoundResult(
    roomId: string,
    roundIndex: number,
    listener: Parameters<GameRepository['subscribeToRoundResult']>[2],
    onError?: Parameters<GameRepository['subscribeToRoundResult']>[3],
  ) {
    return gameRepository.subscribeToRoundResult(roomId, roundIndex, listener, onError);
  };
}
