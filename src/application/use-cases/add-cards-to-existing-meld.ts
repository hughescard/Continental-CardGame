import { AppError } from '@/application/errors/app-error';
import type { AddCardsToExistingMeldInput } from '@/application/models/game';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export function createAddCardsToExistingMeldUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function addCardsToExistingMeld(
    roomId: string,
    input: Omit<AddCardsToExistingMeldInput, 'playerId'>,
  ) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.addCardsToExistingMeld(roomId, {
      ...input,
      playerId: asPlayerId(session.userId),
    });
  };
}
