import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface RejectOutOfTurnDiscardCommand {
  roomId: string;
}

export function createRejectOutOfTurnDiscardUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function rejectOutOfTurnDiscard(command: RejectOutOfTurnDiscardCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.rejectOutOfTurnDiscard({
      roomId: command.roomId,
      playerId: asPlayerId(session.userId),
    });
  };
}
