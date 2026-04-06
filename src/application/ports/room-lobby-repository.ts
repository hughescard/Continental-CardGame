import type { PlayerId } from '@/domain/types/players';
import type { LobbyPlayer, LobbyRoom, PublicGameBootstrap } from '@/application/models/lobby';

export interface CreateRoomInput {
  playerId: PlayerId;
  displayName: string;
}

export interface CreateRoomResult {
  room: LobbyRoom;
  player: LobbyPlayer;
}

export interface JoinRoomByCodeInput {
  playerId: PlayerId;
  displayName: string;
  roomCode: string;
}

export interface JoinRoomByCodeResult {
  roomId: string;
}

export interface StartGameFromLobbyInput {
  roomId: string;
  requestedByPlayerId: PlayerId;
}

export interface LeaveRoomInput {
  roomId: string;
  playerId: PlayerId;
}

export interface TouchPlayerPresenceInput {
  roomId: string;
  playerId: PlayerId;
}

export interface RoomLobbyRepository {
  createRoom: (input: CreateRoomInput) => Promise<CreateRoomResult>;
  joinRoomByCode: (input: JoinRoomByCodeInput) => Promise<JoinRoomByCodeResult>;
  subscribeToRoom: (
    roomId: string,
    listener: (room: LobbyRoom | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToPlayersInRoom: (
    roomId: string,
    listener: (players: readonly LobbyPlayer[]) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToPublicGameBootstrap: (
    roomId: string,
    listener: (game: PublicGameBootstrap | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  leaveRoom: (input: LeaveRoomInput) => Promise<void>;
  touchPlayerPresence: (input: TouchPlayerPresenceInput) => Promise<void>;
}
