import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';

export interface CloseRoundAndScoreCommand {
  roomId: string;
}

export function createCloseRoundAndScoreUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function closeRoundAndScore(command: CloseRoundAndScoreCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.closeRoundAndScore(command.roomId);
  };
}
