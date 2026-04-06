const firebaseEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
} as const;

export type FirebaseEnv = typeof firebaseEnv;

export function hasCompleteFirebaseConfig(env: FirebaseEnv): boolean {
  return (
    env.apiKey.length > 0 &&
    env.authDomain.length > 0 &&
    env.projectId.length > 0 &&
    env.storageBucket.length > 0 &&
    env.messagingSenderId.length > 0 &&
    env.appId.length > 0
  );
}

export const appEnv = {
  firebase: firebaseEnv,
};

export const appConfig = {
  roomCodeLength: 6,
  playerPresenceHeartbeatMs: 25_000,
  playerPresenceOfflineThresholdMs: 60_000,
} as const;
