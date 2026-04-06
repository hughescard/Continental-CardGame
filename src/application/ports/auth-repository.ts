import type { AuthSession } from '@/application/models/auth-session';

export interface EnsureAnonymousSessionInput {
  preferredDisplayName?: string;
}

export interface AuthRepository {
  getCurrentSession: () => AuthSession;
  subscribeToSession: (listener: (session: AuthSession) => void) => () => void;
  ensureAnonymousSession: (input?: EnsureAnonymousSessionInput) => Promise<AuthSession>;
  updateDisplayName: (displayName: string) => Promise<AuthSession>;
}
