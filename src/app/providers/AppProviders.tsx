import type { PropsWithChildren } from 'react';
import { AuthSessionProvider } from '@/app/providers/AuthSessionProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
