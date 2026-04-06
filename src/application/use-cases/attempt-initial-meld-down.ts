import { AppError } from '@/application/errors/app-error';
import type { AttemptInitialMeldDownInput } from '@/application/models/game';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export function createAttemptInitialMeldDownUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function attemptInitialMeldDown(
    roomId: string,
    input: Omit<AttemptInitialMeldDownInput, 'playerId'>,
  ) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.attemptInitialMeldDown(roomId, {
      ...input,
      playerId: asPlayerId(session.userId),
    });
  };
}
