import type { PublicGameState } from '@/application/models/game';

export type RoomStatus = 'lobby' | 'in_game' | 'finished';
export type PlayerPresenceStatus = 'connected' | 'left';

export interface LobbyRoom {
  id: string;
  code: string;
  status: RoomStatus;
  hostPlayerId: string;
  activeGameId: string | null;
  currentPlayerCount: number;
  maxPlayers: number;
  minPlayers: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  startedAt: Date | null;
}

export interface LobbyPlayer {
  id: string;
  displayName: string;
  seatIndex: number;
  status: PlayerPresenceStatus;
  joinedAt: Date | null;
  lastActiveAt: Date | null;
  updatedAt: Date | null;
  leftAt: Date | null;
  isOnline: boolean;
}
export type PublicGameBootstrap = PublicGameState;
