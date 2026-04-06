import type { GameRepository, SyncPlayerCardCountInput } from '@/application/ports/game-repository';

export function createSyncPlayerCardCountUseCase(
  repository: Pick<GameRepository, 'syncPlayerCardCount'>,
) {
  return async (input: SyncPlayerCardCountInput) => repository.syncPlayerCardCount(input);
}
