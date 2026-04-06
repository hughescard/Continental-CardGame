import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { appServices } from '@/application/services/app-services';
import type { AuthSession } from '@/application/models/auth-session';

interface AuthSessionContextValue {
  session: AuthSession;
  isLoading: boolean;
  ensureAnonymousSession: (preferredDisplayName?: string) => Promise<AuthSession>;
  updateDisplayName: (displayName: string) => Promise<AuthSession>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const initialSession: AuthSession = {
  status: 'loading',
  userId: null,
  displayName: null,
  isAnonymous: false,
};

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(initialSession);

  useEffect(() => {
    return appServices.authRepository.subscribeToSession((nextSession) => {
      setSession(nextSession);
    });
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      isLoading: session.status === 'loading',
      ensureAnonymousSession: async (preferredDisplayName?: string) =>
        preferredDisplayName
          ? appServices.signInAnonymouslyIfNeeded({ preferredDisplayName })
          : appServices.signInAnonymouslyIfNeeded(),
      updateDisplayName: (displayName: string) =>
        appServices.authRepository.updateDisplayName(displayName),
    }),
    [session],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSessionContext() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSessionContext must be used inside AuthSessionProvider.');
  }

  return context;
}
