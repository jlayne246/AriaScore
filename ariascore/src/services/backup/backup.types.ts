export const BACKUP_FORMAT = 'ariascore-backup' as const;
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupScore {
  id: number;
  title: string;
  composer: string | null;
  fileName: string;
  originalFileName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastOpenedAt: string | null;
}

export interface BackupSetlist {
  id: number;
  name: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BackupSetlistItem {
  id: number;
  setlistId: number;
  scoreId: number;
  position: number;
}

export interface BackupBookmark {
  id: number;
  scoreId: number;
  pageNumber: number;
  name: string | null;
  createdAt: string | null;
}

export interface BackupStatistics {
  scoreCount: number;
  setlistCount: number;
  setlistItemCount: number;
  bookmarkCount: number;
}

export interface AriaScoreBackupManifest {
  format: typeof BACKUP_FORMAT;

  /**
   * Version of the JSON backup contract itself.
   * This is separate from the SQLite schema version.
   */
  formatVersion: number;

  /**
   * Version of the source SQLite schema.
   */
  databaseSchemaVersion: number;

  application: {
    name: 'AriaScore';
    version: string;
    buildVersion: string | null;
  };

  createdAt: string;

  /**
   * Metadata rows exported from SQLite.
   * PDF contents are deliberately excluded from this first implementation.
   */
  data: {
    scores: BackupScore[];
    setlists: BackupSetlist[];
    setlistItems: BackupSetlistItem[];
    bookmarks: BackupBookmark[];
  };

  statistics: BackupStatistics;
}