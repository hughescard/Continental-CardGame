import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { RoomLobbyRepository } from '@/application/ports/room-lobby-repository';
import { asPlayerId } from '@/domain/types/players';

export interface CreateRoomCommand {
  displayName: string;
}

export function createCreateRoomUseCase(
  authRepository: AuthRepository,
  roomLobbyRepository: RoomLobbyRepository,
) {
  return async function createRoom(command: CreateRoomCommand) {
    const displayName = command.displayName.trim();

    if (!displayName) {
      throw new AppError('missing-display-name', 'Debes indicar un nombre visible.');
    }

    const session = await authRepository.ensureAnonymousSession({
      preferredDisplayName: displayName,
    });

    if (!session.userId) {
      throw new AppError('auth-required', 'No se pudo obtener la sesión del jugador.');
    }

    return roomLobbyRepository.createRoom({
      playerId: asPlayerId(session.userId),
      displayName,
    });
  };
}
