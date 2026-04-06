import { FirebaseError, initializeApp, type FirebaseApp } from 'firebase/app';
import { appEnv, hasCompleteFirebaseConfig } from '@/shared/config/env';

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!hasCompleteFirebaseConfig(appEnv.firebase)) {
    throw new FirebaseError(
      'app/missing-config',
      'Firebase environment variables are incomplete. Create a .env.local file based on .env.example.',
    );
  }

  firebaseApp = initializeApp(appEnv.firebase);
  return firebaseApp;
}
