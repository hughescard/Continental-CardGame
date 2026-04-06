export interface PlayerSummary {
  id: string;
  displayName: string;
  seatIndex: number;
}

export interface RoomSummary {
  id: string;
  code: string;
  hostPlayerId: string;
  players: PlayerSummary[];
}
