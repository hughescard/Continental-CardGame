import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface ClaimOutOfTurnDiscardCommand {
  roomId: string;
}

export function createClaimOutOfTurnDiscardUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function claimOutOfTurnDiscard(command: ClaimOutOfTurnDiscardCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay sesión activa.');
    }

    return gameRepository.claimOutOfTurnDiscard({
      roomId: command.roomId,
      playerId: asPlayerId(session.userId),
    });
  };
}
