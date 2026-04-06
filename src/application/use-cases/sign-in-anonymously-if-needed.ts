import { AppError } from '@/application/errors/app-error';
import type { AuthRepository } from '@/application/ports/auth-repository';

export interface SignInAnonymouslyIfNeededInput {
  preferredDisplayName?: string;
}

export function createSignInAnonymouslyIfNeededUseCase(authRepository: AuthRepository) {
  return async function signInAnonymouslyIfNeeded(
    input?: SignInAnonymouslyIfNeededInput,
  ) {
    const normalizedDisplayName = input?.preferredDisplayName?.trim();

    if (normalizedDisplayName !== undefined && normalizedDisplayName.length === 0) {
      throw new AppError('missing-display-name', 'Debes indicar un nombre visible.');
    }

    return normalizedDisplayName
      ? authRepository.ensureAnonymousSession({
          preferredDisplayName: normalizedDisplayName,
        })
      : authRepository.ensureAnonymousSession();
  };
}
