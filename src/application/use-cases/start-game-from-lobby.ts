import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { GameRepository } from '@/application/ports/game-repository';
import { asPlayerId } from '@/domain/types/players';

export interface StartGameFromLobbyCommand {
  roomId: string;
}

export function createStartGameFromLobbyUseCase(
  authRepository: AuthRepository,
  gameRepository: GameRepository,
) {
  return async function startGameFromLobby(command: StartGameFromLobbyCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'Necesitas una sesión activa para iniciar la partida.');
    }

    const input = {
      roomId: command.roomId,
      requestedByPlayerId: asPlayerId(session.userId),
    };

    return gameRepository.initializeGameRound(input);
  };
}
