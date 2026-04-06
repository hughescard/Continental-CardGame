import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface StartNextRoundCommand {
  roomId: string;
}

export function createStartNextRoundUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function startNextRound(command: StartNextRoundCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.startNextRound({
      roomId: command.roomId,
      requestedByPlayerId: asPlayerId(session.userId),
    });
  };
}
