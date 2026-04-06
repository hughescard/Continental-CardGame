import {
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirebaseApp } from '@/infrastructure/firebase/client';

let firebaseAuth: Auth | null = null;

export function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  firebaseAuth = initializeAuth(getFirebaseApp(), {
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence,
    ],
  });

  return firebaseAuth;
}
