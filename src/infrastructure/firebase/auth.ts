import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  inMemoryPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirebaseApp } from '@/infrastructure/firebase/client';

let firebaseAuth: Auth | null = null;

export function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  const app = getFirebaseApp();

  try {
    firebaseAuth = initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
    });
  } catch {
    firebaseAuth = getAuth(app);

    void setPersistence(firebaseAuth, browserLocalPersistence).catch(() =>
      setPersistence(firebaseAuth!, browserSessionPersistence).catch(() =>
        setPersistence(firebaseAuth!, inMemoryPersistence).catch(() => undefined),
      ),
    );
  }

  return firebaseAuth;
}
