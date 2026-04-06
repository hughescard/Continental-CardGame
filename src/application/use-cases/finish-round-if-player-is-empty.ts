import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface FinishRoundIfPlayerIsEmptyCommand {
  roomId: string;
}

export function createFinishRoundIfPlayerIsEmptyUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function finishRoundIfPlayerIsEmpty(
    command: FinishRoundIfPlayerIsEmptyCommand,
  ) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.finishRoundIfPlayerIsEmpty(
      command.roomId,
      asPlayerId(session.userId),
    );
  };
}
