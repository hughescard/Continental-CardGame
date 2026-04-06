import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';
import type { RoomLobbyRepository } from '@/application/ports/room-lobby-repository';
import { asPlayerId } from '@/domain/types/players';

export interface LeaveRoomCommand {
  roomId: string;
}

export function createLeaveRoomUseCase(
  authRepository: AuthRepository,
  roomLobbyRepository: RoomLobbyRepository,
) {
  return async function leaveRoom(command: LeaveRoomCommand) {
    const session = authRepository.getCurrentSession();

    if (!session.userId) {
      throw new AppError('auth-required', 'No hay una sesión activa para salir de la sala.');
    }

    await roomLobbyRepository.leaveRoom({
      roomId: command.roomId,
      playerId: asPlayerId(session.userId),
    });
  };
}
