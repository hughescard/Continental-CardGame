import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface DiscardCardCommand {
  roomId: string;
  cardId: string;
}

export function createDiscardCardUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function discardCard(command: DiscardCardCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.discardCard({
      roomId: command.roomId,
      playerId: asPlayerId(session.userId),
      cardId: command.cardId,
    });
  };
}
