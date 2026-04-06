import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { RoomLobbyRepository } from '@/application/ports/room-lobby-repository';
import { asPlayerId } from '@/domain/types/players';

export interface JoinRoomByCodeCommand {
  roomCode: string;
  displayName: string;
}

export function createJoinRoomByCodeUseCase(
  authRepository: AuthRepository,
  roomLobbyRepository: RoomLobbyRepository,
) {
  return async function joinRoomByCode(command: JoinRoomByCodeCommand) {
    const displayName = command.displayName.trim();
    const roomCode = command.roomCode.trim().toUpperCase();

    if (!displayName) {
      throw new AppError('missing-display-name', 'Debes indicar un nombre visible.');
    }

    if (!roomCode) {
      throw new AppError('room-not-found', 'Debes indicar un código de sala válido.');
    }

    const session = await authRepository.ensureAnonymousSession({
      preferredDisplayName: displayName,
    });

    if (!session.userId) {
      throw new AppError('auth-required', 'No se pudo obtener la sesión del jugador.');
    }

    return roomLobbyRepository.joinRoomByCode({
      playerId: asPlayerId(session.userId),
      displayName,
      roomCode,
    });
  };
}
