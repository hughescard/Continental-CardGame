import { Timestamp, type DocumentSnapshot } from 'firebase/firestore';

export function timestampToDate(value: Timestamp | null | undefined): Date | null {
  return value ? value.toDate() : null;
}

export function documentExists<T>(snapshot: DocumentSnapshot<T>): snapshot is DocumentSnapshot<T> & {
  data(): T;
} {
  return snapshot.exists();
}
