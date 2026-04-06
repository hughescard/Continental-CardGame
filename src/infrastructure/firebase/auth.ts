import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirebaseApp } from '@/infrastructure/firebase/client';

let firebaseAuth: Auth | null = null;
let persistenceConfigured = false;

async function configureBestAvailablePersistence(auth: Auth) {
  if (persistenceConfigured) {
    return;
  }

  persistenceConfigured = true;

  try {
    await setPersistence(auth, browserLocalPersistence);
    return;
  } catch {
    // Fall through to the next persistence strategy.
  }

  try {
    await setPersistence(auth, browserSessionPersistence);
    return;
  } catch {
    // Fall through to in-memory persistence as the last safe fallback.
  }

  try {
    await setPersistence(auth, inMemoryPersistence);
  } catch {
    // Ignore persistence setup errors; auth can still function for the session.
  }
}

export function getFirebaseAuth() {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  const app = getFirebaseApp();
  firebaseAuth = getAuth(app);
  void configureBestAvailablePersistence(firebaseAuth);

  return firebaseAuth;
}
