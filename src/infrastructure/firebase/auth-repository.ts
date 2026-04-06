import {
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
  type User,
} from 'firebase/auth';
import { AppError } from '@/application/errors/app-error';
import type { AuthSession } from '@/application/models/auth-session';
import type {
  AuthRepository,
  EnsureAnonymousSessionInput,
} from '@/application/ports/auth-repository';
import { getFirebaseAuth } from '@/infrastructure/firebase/auth';

function mapUserToSession(user: User | null): AuthSession {
  return {
    status: 'authenticated',
    userId: user?.uid ?? null,
    displayName: user?.displayName ?? null,
    isAnonymous: user?.isAnonymous ?? false,
  };
}

async function syncDisplayName(user: User, preferredDisplayName?: string) {
  const normalizedDisplayName = preferredDisplayName?.trim();

  if (!normalizedDisplayName || user.displayName === normalizedDisplayName) {
    return;
  }

  await updateProfile(user, { displayName: normalizedDisplayName });
}

export const firebaseAuthRepository: AuthRepository = {
  getCurrentSession() {
    return mapUserToSession(getFirebaseAuth().currentUser);
  },

  subscribeToSession(listener) {
    listener({
      status: 'loading',
      userId: null,
      displayName: null,
      isAnonymous: false,
    });

    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      listener(mapUserToSession(user));
    });
  },

  async ensureAnonymousSession(input?: EnsureAnonymousSessionInput) {
    const auth = getFirebaseAuth();
    let user = auth.currentUser;

    if (!user) {
      const credentials = await signInAnonymously(auth).catch((error: unknown) => {
        throw new AppError(
          'auth-required',
          error instanceof Error ? error.message : 'Anonymous authentication failed.',
        );
      });

      user = credentials.user;
    }

    await syncDisplayName(user, input?.preferredDisplayName);
    await user.reload();

    return mapUserToSession(auth.currentUser);
  },

  async updateDisplayName(displayName: string) {
    const user = getFirebaseAuth().currentUser;

    if (!user) {
      throw new AppError('auth-required', 'No active Firebase session was found.');
    }

    await syncDisplayName(user, displayName);
    await user.reload();

    return mapUserToSession(getFirebaseAuth().currentUser);
  },
};
