export function createStoredPdfFileName(
  scoreId: string | number
): string {
  const safeId = String(scoreId).replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  return `${safeId}.pdf`;
}

export function createBackupFileName(
  createdAt: string
): string {
  const safeTimestamp = createdAt
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/:/g, "-");

  return `AriaScore-Backup-${safeTimestamp}.ariascore`;
}