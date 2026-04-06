import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface DrawFromDiscardCommand {
  roomId: string;
}

export function createDrawFromDiscardUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function drawFromDiscard(command: DrawFromDiscardCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.drawFromDiscard({
      roomId: command.roomId,
      playerId: asPlayerId(session.userId),
    });
  };
}
