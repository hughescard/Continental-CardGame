import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/infrastructure/firebase/client';

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}
