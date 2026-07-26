export const BACKUP_FORMAT = "ariascore-backup" as const;
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupSourceScore {
  /**
   * Existing database ID.
   */
  id: string;

  title: string;
  composer: string | null;

  /**
   * Current device-specific URI. Used only while building the archive.
   * This must not be written into library.json.
   */
  sourceUri: string;

  originalFileName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastOpenedAt: string | null;
}

export interface PortableBackupScore {
  id: string;
  title: string;
  composer: string | null;

  originalFileName: string | null;

  /**
   * Null when the PDF could not be included.
   */
  storedFileName: string | null;

  fileIncluded: boolean;

  createdAt: string | null;
  updatedAt: string | null;
  lastOpenedAt: string | null;
}

export interface BackupSetlist {
  id: string;
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackupSetlistItem {
  id: string;
  setlistId: string;
  scoreId: string;
  position: number;
}

export interface BackupBookmark {
  id: string;
  scoreId: string;
  pageNumber: number;
  name: string | null;
  createdAt: string | null;
}

export type BackupFileIssueReason =
  | "missing"
  | "unreadable"
  | "unsupported-uri"
  | "copy-failed";

export interface BackupFileIssue {
  scoreId: string;
  title: string;
  sourceUri: string;
  reason: BackupFileIssueReason;
  message: string;
}

export interface BackupPreferences {
  [key: string]: string | number | boolean | null;
}

export interface BackupDatabaseSnapshot {
  databaseSchemaVersion: number;
  scores: BackupSourceScore[];
  setlists: BackupSetlist[];
  setlistItems: BackupSetlistItem[];
  bookmarks: BackupBookmark[];
  preferences: BackupPreferences;
}

export interface AriaScoreLibraryBackup {
  scores: PortableBackupScore[];
  setlists: BackupSetlist[];
  setlistItems: BackupSetlistItem[];
  bookmarks: BackupBookmark[];
  preferences: BackupPreferences;
}

export interface AriaScoreBackupManifest {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  databaseSchemaVersion: number;

  application: {
    name: "AriaScore";
    version: string;
    buildVersion: string | null;
  };

  createdAt: string;

  contents: {
    libraryFile: "library.json";
    scoresDirectory: "scores";
  };

  statistics: {
    scoreCount: number;
    setlistCount: number;
    setlistItemCount: number;
    bookmarkCount: number;
    includedPdfCount: number;
    omittedPdfCount: number;
  };

  fileIssues: BackupFileIssue[];

  complete: boolean;
}

export interface CreatedBackup {
  uri: string;
  fileName: string;
  manifest: AriaScoreBackupManifest;
}