export interface AuthSession {
  status: 'loading' | 'authenticated';
  userId: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}
