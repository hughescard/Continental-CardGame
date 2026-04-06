import {
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type QuerySnapshot,
} from 'firebase/firestore';
import { AppError } from '@/application/errors/app-error';
import type {
  CreateRoomInput,
  CreateRoomResult,
  JoinRoomByCodeInput,
  JoinRoomByCodeResult,
  LeaveRoomInput,
  RoomLobbyRepository,
  StartGameFromLobbyInput,
  TouchPlayerPresenceInput,
} from '@/application/ports/room-lobby-repository';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
} from '@/domain';
import { asPlayerId } from '@/domain/types/players';
import { appConfig } from '@/shared/config/env';
import { getFirestoreDb } from '@/infrastructure/firebase/firestore';
import { mapFirestoreGameStateToPublicBootstrap } from '@/infrastructure/firebase/mappers/game-bootstrap-mapper';
import { mapFirestorePlayerToLobbyPlayer } from '@/infrastructure/firebase/mappers/player-mapper';
import { mapFirestoreRoomToLobbyRoom } from '@/infrastructure/firebase/mappers/room-mapper';
import {
  privatePlayerDocument,
  publicGameStateDocument,
  roomCodeDocument,
  roomDocument,
  roomPlayerDocument,
  roomPlayersCollection,
  roomsCollection,
} from '@/infrastructure/firebase/refs';
import type {
  FirestorePrivatePlayerDocument,
  FirestorePublicGameStateDocument,
  FirestoreRoomCodeDocument,
  FirestoreRoomDocument,
  FirestoreRoomPlayerDocument,
} from '@/infrastructure/firebase/types';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CREATE_ROOM_MAX_RETRIES = 10;

function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase();
}

function generateRoomCode(length = appConfig.roomCodeLength): string {
  let code = '';

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[randomIndex];
  }

  return code;
}

function createPrivatePlayerSeed(
  roomId: string,
  playerId: string,
  displayName: string,
): FirestorePrivatePlayerDocument {
  return {
    roomId,
    playerId,
    displayNameCache: displayName,
    hand: [],
    hasGoneDown: false,
    canTakeOutOfTurnDiscard: false,
    scoreTotal: 0,
    createdAt: null,
    updatedAt: null,
    secretState: {
      handCardIds: [],
      stagedCardIds: [],
    },
  };
}

function mapPlayersSnapshot(snapshot: QuerySnapshot<FirestoreRoomPlayerDocument>) {
  return snapshot.docs
    .map((item) => mapFirestorePlayerToLobbyPlayer(item.id, item.data()))
    .sort((left, right) => left.seatIndex - right.seatIndex);
}

function buildPrivatePlayerWrite(
  roomId: string,
  playerId: string,
  displayName: string,
  shouldSetCreatedAt: boolean,
) {
  const baseWrite = {
    roomId,
    playerId,
    displayNameCache: displayName,
    hand: [],
    hasGoneDown: false,
    canTakeOutOfTurnDiscard: false,
    scoreTotal: 0,
    updatedAt: serverTimestamp(),
    secretState: {
      handCardIds: [],
      stagedCardIds: [],
    },
  };

  return shouldSetCreatedAt
    ? {
        ...baseWrite,
        createdAt: serverTimestamp(),
      }
    : baseWrite;
}

export const firebaseRoomLobbyRepository: RoomLobbyRepository = {
  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    const db = getFirestoreDb();

    for (let attempt = 0; attempt < CREATE_ROOM_MAX_RETRIES; attempt += 1) {
      const roomCode = generateRoomCode();
      const codeNormalized = normalizeRoomCode(roomCode);
      const newRoomRef = doc(roomsCollection());
      const roomId = newRoomRef.id;
      const roomCodeRef = roomCodeDocument(codeNormalized);
      const playerRef = roomPlayerDocument(roomId, input.playerId);
      const privatePlayerRef = privatePlayerDocument(roomId, input.playerId);

      try {
        const result = await runTransaction(db, async (transaction) => {
          const existingCodeSnapshot = await transaction.get(roomCodeRef);

          if (existingCodeSnapshot.exists()) {
            throw new AppError('invalid-room-state', 'Room code collision.');
          }

          const roomDocumentData: FirestoreRoomDocument = {
            code: roomCode,
            codeNormalized,
            hostPlayerId: input.playerId,
            status: 'lobby',
            activeGameId: null,
            minPlayers: MIN_PLAYERS,
            maxPlayers: MAX_PLAYERS,
            createdAt: null,
            updatedAt: null,
            startedAt: null,
          };

          const roomCodeData: FirestoreRoomCodeDocument = {
            roomId,
            code: roomCode,
            codeNormalized,
            status: 'lobby',
            currentPlayerCount: 1,
            minPlayers: MIN_PLAYERS,
            maxPlayers: MAX_PLAYERS,
            createdAt: null,
            updatedAt: null,
          };

          const playerData: FirestoreRoomPlayerDocument = {
            playerId: input.playerId,
            displayName: input.displayName,
            seatIndex: 0,
            status: 'connected',
            joinedAt: null,
            updatedAt: null,
            lastActiveAt: null,
            leftAt: null,
          };

          transaction.set(newRoomRef, {
            ...roomDocumentData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.set(roomCodeRef, {
            ...roomCodeData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          transaction.set(playerRef, {
            ...playerData,
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
          });

          transaction.set(privatePlayerRef, {
            ...createPrivatePlayerSeed(roomId, input.playerId, input.displayName),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          return {
            room: mapFirestoreRoomToLobbyRoom(roomId, roomDocumentData, 1),
            player: mapFirestorePlayerToLobbyPlayer(input.playerId, {
              ...playerData,
              joinedAt: null,
              updatedAt: null,
              lastActiveAt: null,
              leftAt: null,
            }),
          };
        });

        return result;
      } catch (error) {
        if (
          error instanceof AppError &&
          error.code === 'invalid-room-state' &&
          error.message === 'Room code collision.'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new AppError(
      'invalid-room-state',
      'No se pudo generar un código de sala único.',
    );
  },

  async joinRoomByCode(input: JoinRoomByCodeInput): Promise<JoinRoomByCodeResult> {
    const db = getFirestoreDb();
    const codeNormalized = normalizeRoomCode(input.roomCode);

    return runTransaction(db, async (transaction) => {
      const roomCodeRef = roomCodeDocument(codeNormalized);
      const roomCodeSnapshot = await transaction.get(roomCodeRef);

      if (!roomCodeSnapshot.exists()) {
        throw new AppError('room-not-found', 'No existe una sala con ese código.');
      }

      const roomCodeData = roomCodeSnapshot.data();

      if (roomCodeData.status !== 'lobby') {
        throw new AppError(
          'room-not-joinable',
          'La sala ya no acepta nuevos jugadores.',
        );
      }

      const roomId = roomCodeData.roomId;
      const playerRef = roomPlayerDocument(roomId, input.playerId);
      const privatePlayerRef = privatePlayerDocument(roomId, input.playerId);
      const roomRef = roomDocument(roomId);

      const existingPlayerSnapshot = await transaction.get(playerRef);
      const isNewSeat = !existingPlayerSnapshot.exists() || existingPlayerSnapshot.data().status === 'left';

      if (isNewSeat && roomCodeData.currentPlayerCount >= roomCodeData.maxPlayers) {
        throw new AppError('room-full', 'La sala ya alcanzó el máximo de jugadores.');
      }

      const nextSeatIndex = existingPlayerSnapshot.exists()
        ? existingPlayerSnapshot.data().seatIndex
        : roomCodeData.currentPlayerCount;

      transaction.set(
        playerRef,
        {
          playerId: input.playerId,
          displayName: input.displayName,
          seatIndex: nextSeatIndex,
          status: 'connected',
          joinedAt: existingPlayerSnapshot.exists()
            ? existingPlayerSnapshot.data().joinedAt ?? serverTimestamp()
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          leftAt: null,
        },
        { merge: true },
      );

      transaction.set(
        privatePlayerRef,
        buildPrivatePlayerWrite(roomId, input.playerId, input.displayName, !existingPlayerSnapshot.exists()),
        { merge: true },
      );

      transaction.update(roomCodeRef, {
        currentPlayerCount: isNewSeat
          ? roomCodeData.currentPlayerCount + 1
          : roomCodeData.currentPlayerCount,
        updatedAt: serverTimestamp(),
      });

      return { roomId };
    });
  },

  subscribeToRoom(roomId, listener, onError) {
    return onSnapshot(
      roomDocument(roomId),
      (roomSnapshot) => {
        if (!roomSnapshot.exists()) {
          listener(null);
          return;
        }

        listener(mapFirestoreRoomToLobbyRoom(roomId, roomSnapshot.data()));
      },
      (error) => onError?.(error),
    );
  },

  subscribeToPlayersInRoom(roomId, listener, onError) {
    const playersQuery = query(roomPlayersCollection(roomId), orderBy('seatIndex', 'asc'));

    return onSnapshot(
      playersQuery,
      (snapshot) => {
        listener(mapPlayersSnapshot(snapshot));
      },
      (error) => onError?.(error),
    );
  },

  subscribeToPublicGameBootstrap(roomId, listener, onError) {
    return onSnapshot(
      publicGameStateDocument(roomId),
      (snapshot) => {
        if (!snapshot.exists()) {
          listener(null);
          return;
        }

        listener(mapFirestoreGameStateToPublicBootstrap(snapshot.data()));
      },
      (error) => onError?.(error),
    );
  },

  async leaveRoom(input: LeaveRoomInput) {
    const db = getFirestoreDb();
    const playersSnapshot = await getDocs(
      query(roomPlayersCollection(input.roomId), orderBy('seatIndex', 'asc')),
    );
    const remainingConnectedPlayers = mapPlayersSnapshot(playersSnapshot).filter(
      (player) => player.status === 'connected' && player.id !== input.playerId,
    );

    await runTransaction(db, async (transaction) => {
      const playerRef = roomPlayerDocument(input.roomId, input.playerId);
      const playerSnapshot = await transaction.get(playerRef);

      if (!playerSnapshot.exists()) {
        return;
      }

      const roomRef = roomDocument(input.roomId);
      const roomSnapshot = await transaction.get(roomRef);

      if (!roomSnapshot.exists()) {
        return;
      }

      const room = roomSnapshot.data();
      const roomCodeRef = roomCodeDocument(room.codeNormalized);
      const roomCodeSnapshot = await transaction.get(roomCodeRef);
      const player = playerSnapshot.data();

      if (player.status === 'left') {
        return;
      }

      transaction.update(playerRef, {
        status: 'left',
        updatedAt: serverTimestamp(),
        leftAt: serverTimestamp(),
      });

      if (roomCodeSnapshot.exists()) {
        const roomCodeData = roomCodeSnapshot.data();
        const nextPlayerCount = Math.max(roomCodeData.currentPlayerCount - 1, 0);

        transaction.update(roomCodeRef, {
          currentPlayerCount: nextPlayerCount,
          updatedAt: serverTimestamp(),
          status: nextPlayerCount === 0 ? 'finished' : roomCodeData.status,
        });
      }

      transaction.update(roomRef, {
        hostPlayerId:
          room.hostPlayerId === input.playerId
            ? remainingConnectedPlayers[0]?.id ?? room.hostPlayerId
            : room.hostPlayerId,
        status:
          remainingConnectedPlayers.length === 0 && room.status === 'lobby'
            ? 'finished'
            : room.status,
        activeGameId:
          remainingConnectedPlayers.length === 0 && room.status === 'lobby'
            ? null
            : room.activeGameId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async touchPlayerPresence(input: TouchPlayerPresenceInput) {
    const playerRef = roomPlayerDocument(input.roomId, input.playerId);

    await updateDoc(playerRef, {
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
