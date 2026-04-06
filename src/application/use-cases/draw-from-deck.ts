import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface DrawFromDeckCommand {
  roomId: string;
}

export function createDrawFromDeckUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function drawFromDeck(command: DrawFromDeckCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.drawFromDeck({
      roomId: command.roomId,
      playerId: asPlayerId(session.userId),
    });
  };
}
