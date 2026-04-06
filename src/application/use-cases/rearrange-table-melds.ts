import { AppError } from '@/application/errors/app-error';
import type { RearrangeTableMeldsInput } from '@/application/models/game';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export function createRearrangeTableMeldsUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function rearrangeTableMelds(
    roomId: string,
    input: Omit<RearrangeTableMeldsInput, 'playerId'>,
  ) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.rearrangeTableMelds(roomId, {
      ...input,
      playerId: asPlayerId(session.userId),
    });
  };
}
