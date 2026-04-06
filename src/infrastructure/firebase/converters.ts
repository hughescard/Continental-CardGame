import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
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

function createConverter<TDocument extends DocumentData>(): FirestoreDataConverter<TDocument> {
  return {
    toFirestore(modelObject) {
      return modelObject;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions) {
      return snapshot.data(options) as TDocument;
    },
  };
}

export const roomDocumentConverter = createConverter<FirestoreRoomDocument>();
export const roomCodeDocumentConverter = createConverter<FirestoreRoomCodeDocument>();
export const roomPlayerDocumentConverter = createConverter<FirestoreRoomPlayerDocument>();
export const privatePlayerDocumentConverter =
  createConverter<FirestorePrivatePlayerDocument>();
export const publicGameStateDocumentConverter =
  createConverter<FirestorePublicGameStateDocument>();
export const gameEngineDocumentConverter =
  createConverter<FirestoreGameEngineDocument>();
export const roundResultDocumentConverter =
  createConverter<FirestoreRoundResultDocument>();
export const gameSummaryDocumentConverter =
  createConverter<FirestoreGameSummaryDocument>();
