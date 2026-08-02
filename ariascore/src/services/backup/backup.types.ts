export const BACKUP_FORMAT = "ariascore-backup" as const;
export const BACKUP_FORMAT_VERSION = 1;

/**
 * A score as stored in the application database before its PDF is copied
 * into the backup archive.
 */
export interface BackupSourceScore {
  id: number;
  title: string;

  /**
   * Device-local URI to the managed PDF.
   *
   * This value must not be written directly into library.json because it
   * will not be valid after restoring into another installation.
   */
  sourceUri: string;

  originalFilename: string | null;

  documentType: string | null;
  composer: string | null;
  arranger: string | null;
  editor: string | null;
  publisher: string | null;
  genre: string | null;
  keySignature: string | null;
  timeSignature: string | null;
  pageCount: number | null;

  createdAt: string | null;
  updatedAt: string | null;
  lastOpenedAt: string | null;
}

/**
 * A portable score record written into library.json.
 *
 * Unlike BackupSourceScore, this does not contain the device-local URI.
 * The importer creates a new URI after copying the PDF into the destination
 * installation's managed storage.
 */
export interface PortableBackupScore {
  id: number;
  title: string;
  originalFilename: string | null;

  documentType: string | null;
  composer: string | null;
  arranger: string | null;
  editor: string | null;
  publisher: string | null;
  genre: string | null;
  keySignature: string | null;
  timeSignature: string | null;
  pageCount: number | null;

  /**
   * Filename of the PDF inside the backup archive's scores directory.
   *
   * Null when the PDF could not be included.
   */
  storedFileName: string | null;

  /**
   * Indicates whether the corresponding PDF exists in the archive.
   */
  fileIncluded: boolean;

  createdAt: string | null;
  updatedAt: string | null;
  lastOpenedAt: string | null;
}

export type BackupFileIssueReason =
  | "missing"
  | "unreadable"
  | "unsupported-uri"
  | "copy-failed";

export interface BackupFileIssue {
  scoreId: number;
  title: string;
  sourceUri: string;
  reason: BackupFileIssueReason;
  message: string;
}

export interface BackupSetlist {
  id: number;
  name: string;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastOpenedAt: string | null;
}

export interface BackupSetlistItem {
  musicId: number;
  setlistId: number;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackupSetlistProgress {
  setlistId: number;
  musicId: number;
  pageNumber: number;
  updatedAt: string | null;
}

export interface BackupBookmark {
  id: number;
  musicId: number;
  pageNumber: number;
  label: string | null;
  createdAt: string;
}

export interface BackupLabel {
  id: number;
  name: string;
  colour: string | null;
}

export interface BackupMusicLabel {
  musicId: number;
  labelId: number;
}

export interface BackupReaderSetting {
  key: string;
  value: string;
}

export interface BackupMusicSetting {
  musicId: number;
  key: string;
  value: string | null;
}

export interface BackupSetlistSetting {
  setlistId: number;
  key: string;
  value: string | null;
}

/**
 * Direct snapshot of the relevant SQLite tables.
 *
 * The score records still contain local source URIs at this stage.
 */
export interface BackupDatabaseSnapshot {
  databaseSchemaVersion: number;

  scores: BackupSourceScore[];

  setlists: BackupSetlist[];
  setlistItems: BackupSetlistItem[];
  setlistProgress: BackupSetlistProgress[];

  bookmarks: BackupBookmark[];

  labels: BackupLabel[];
  musicLabels: BackupMusicLabel[];

  readerSettings: BackupReaderSetting[];
  musicSettings: BackupMusicSetting[];
  setlistSettings: BackupSetlistSetting[];
}

/**
 * Portable data written to library.json.
 *
 * This must not contain application-local file URIs.
 */
export interface AriaScoreLibraryBackup {
  scores: PortableBackupScore[];

  setlists: BackupSetlist[];
  setlistItems: BackupSetlistItem[];
  setlistProgress: BackupSetlistProgress[];

  bookmarks: BackupBookmark[];

  labels: BackupLabel[];
  musicLabels: BackupMusicLabel[];

  readerSettings: BackupReaderSetting[];
  musicSettings: BackupMusicSetting[];
  setlistSettings: BackupSetlistSetting[];
}

export interface AriaScoreBackupManifest {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  databaseSchemaVersion: number;

  application: {
    name: "AriaScore";
    version: string;
    buildVersion: string | null;
  };

  /**
   * ISO 8601 timestamp.
   */
  createdAt: string;

  contents: {
    libraryFile: "library.json";
    scoresDirectory: "scores";
  };

  statistics: {
    scoreCount: number;

    setlistCount: number;
    setlistItemCount: number;
    setlistProgressCount: number;

    bookmarkCount: number;

    labelCount: number;
    musicLabelCount: number;

    readerSettingCount: number;
    musicSettingCount: number;
    setlistSettingCount: number;

    includedPdfCount: number;
    omittedPdfCount: number;
  };

  /**
   * Problems encountered while attempting to include score PDFs.
   *
   * Metadata may still be included for affected scores.
   */
  fileIssues: BackupFileIssue[];

  /**
   * True only when every expected PDF was included and no file issue occurred.
   */
  complete: boolean;
}

export interface CreatedBackup {
  uri: string;
  fileName: string;
  manifest: AriaScoreBackupManifest;
}

// IMPORT TYPES

export interface RestoreBackupOptions {
  /**
   * Replace the current AriaScore library with the imported backup.
   *
   * Merge mode can be added later.
   */
  mode: "replace";
}

export interface RestoredScoreFile {
  /**
   * Original music ID preserved from the backup.
   */
  musicId: number;

  /**
   * New URI inside the destination installation's managed score directory.
   */
  localUri: string;
}

export interface RestoreBackupResult {
  restoredScoreCount: number;
  omittedScoreCount: number;

  restoredSetlistCount: number;
  restoredBookmarkCount: number;
  restoredLabelCount: number;

  warnings: RestoreBackupWarning[];

  replacedFileUris: string[];
}

export type RestoreBackupWarningReason =
  | "pdf-not-included"
  | "pdf-missing-from-archive"
  | "pdf-copy-failed"
  | "related-record-skipped";

export interface RestoreBackupWarning {
  reason: RestoreBackupWarningReason;
  message: string;
  musicId?: number;
}

export interface BackupSummary {
  createdAt: string;
  scoreCount: number;
  setlistCount: number;
  bookmarkCount: number;
  fileName: string;
}