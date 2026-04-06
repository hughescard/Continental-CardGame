import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface InitializeGameRoundCommand {
  roomId: string;
}

export function createInitializeGameRoundUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function initializeGameRound(command: InitializeGameRoundCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'Necesitas una sesión activa para iniciar la partida.');
    }

    return gameRepository.initializeGameRound({
      roomId: command.roomId,
      requestedByPlayerId: asPlayerId(session.userId),
    });
  };
}
