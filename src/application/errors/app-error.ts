export type AppErrorCode =
  | 'auth-required'
  | 'missing-display-name'
  | 'room-not-found'
  | 'room-full'
  | 'room-not-joinable'
  | 'room-access-denied'
  | 'host-only'
  | 'invalid-room-state'
  | 'firebase-not-configured'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError('unknown', error.message);
  }

  return new AppError('unknown', 'Unexpected application error.');
}
