export class BackupError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);

    this.name = 'BackupError';
    this.cause = cause;
  }
}