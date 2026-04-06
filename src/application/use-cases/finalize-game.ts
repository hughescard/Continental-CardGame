import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface FinalizeGameCommand {
  roomId: string;
}

export function createFinalizeGameUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function finalizeGame(command: FinalizeGameCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.finalizeGame({
      roomId: command.roomId,
      requestedByPlayerId: asPlayerId(session.userId),
    });
  };
}
