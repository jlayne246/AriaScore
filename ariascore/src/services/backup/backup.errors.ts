export class BackupError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);

    this.name = "BackupError";
    this.cause = cause;

    Object.setPrototypeOf(this, BackupError.prototype);
  }
}

export class BackupFileResolutionError extends Error {
  constructor(
    public readonly reason:
      | "missing"
      | "unreadable"
      | "unsupported-uri"
      | "copy-failed",
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "BackupFileResolutionError";
  }
}