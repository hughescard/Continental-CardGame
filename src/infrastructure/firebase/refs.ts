import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import {
  gameEngineDocumentConverter,
  gameSummaryDocumentConverter,
  privatePlayerDocumentConverter,
  publicGameStateDocumentConverter,
  roundResultDocumentConverter,
  roomCodeDocumentConverter,
  roomDocumentConverter,
  roomPlayerDocumentConverter,
} from '@/infrastructure/firebase/converters';
import { getFirestoreDb } from '@/infrastructure/firebase/firestore';
import type {
  FirestoreGameEngineDocument,
  FirestoreGameSummaryDocument,
  FirestorePrivatePlayerDocument,
  FirestorePublicGameStateDocument,
  FirestoreRoundResultDocument,
  FirestoreRoomCodeDocument,
  FirestoreRoomDocument,
  FirestoreRoomPlayerDocument,
} from '@/infrastructure/firebase/types';

export function roomsCollection(): CollectionReference<FirestoreRoomDocument> {
  return collection(getFirestoreDb(), 'rooms').withConverter(roomDocumentConverter);
}

export function roomDocument(roomId: string): DocumentReference<FirestoreRoomDocument> {
  return doc(roomsCollection(), roomId);
}

export function roomCodesCollection(): CollectionReference<FirestoreRoomCodeDocument> {
  return collection(getFirestoreDb(), 'roomCodes').withConverter(roomCodeDocumentConverter);
}

export function roomCodeDocument(
  codeNormalized: string,
): DocumentReference<FirestoreRoomCodeDocument> {
  return doc(roomCodesCollection(), codeNormalized);
}

export function roomPlayersCollection(
  roomId: string,
): CollectionReference<FirestoreRoomPlayerDocument> {
  return collection(roomDocument(roomId), 'players').withConverter(roomPlayerDocumentConverter);
}

export function roomPlayerDocument(
  roomId: string,
  playerId: string,
): DocumentReference<FirestoreRoomPlayerDocument> {
  return doc(roomPlayersCollection(roomId), playerId);
}

export function privatePlayersCollection(
  roomId: string,
): CollectionReference<FirestorePrivatePlayerDocument> {
  return collection(roomDocument(roomId), 'privatePlayers').withConverter(
    privatePlayerDocumentConverter,
  );
}

export function privatePlayerDocument(
  roomId: string,
  playerId: string,
): DocumentReference<FirestorePrivatePlayerDocument> {
  return doc(privatePlayersCollection(roomId), playerId);
}

export function publicGameStateDocument(
  roomId: string,
): DocumentReference<FirestorePublicGameStateDocument> {
  return doc(collection(roomDocument(roomId), 'gameState'), 'current').withConverter(
    publicGameStateDocumentConverter,
  );
}

export function gameEngineDocument(
  roomId: string,
): DocumentReference<FirestoreGameEngineDocument> {
  return doc(collection(roomDocument(roomId), 'engine'), 'current').withConverter(
    gameEngineDocumentConverter,
  );
}

export function roundResultsCollection(
  roomId: string,
): CollectionReference<FirestoreRoundResultDocument> {
  return collection(roomDocument(roomId), 'roundResults').withConverter(
    roundResultDocumentConverter,
  );
}

export function roundResultDocument(
  roomId: string,
  roundIndex: number,
): DocumentReference<FirestoreRoundResultDocument> {
  return doc(roundResultsCollection(roomId), `round-${roundIndex}`);
}

export function gameResultsCollection(
  roomId: string,
): CollectionReference<FirestoreGameSummaryDocument> {
  return collection(roomDocument(roomId), 'gameResults').withConverter(
    gameSummaryDocumentConverter,
  );
}

export function gameResultDocument(
  roomId: string,
  gameId: string,
): DocumentReference<FirestoreGameSummaryDocument> {
  return doc(gameResultsCollection(roomId), gameId);
}
