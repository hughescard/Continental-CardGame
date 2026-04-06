import { useAuthSessionContext } from '@/app/providers/AuthSessionProvider';

export function useAuthSession() {
  return useAuthSessionContext();
}
