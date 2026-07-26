import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  BackupBookmark,
  BackupScore,
  BackupSetlist,
  BackupSetlistItem,
} from './backup.types';

interface SQLiteUserVersionRow {
  user_version: number;
}

export interface BackupDatabaseSnapshot {
  databaseSchemaVersion: number;
  scores: BackupScore[];
  setlists: BackupSetlist[];
  setlistItems: BackupSetlistItem[];
  bookmarks: BackupBookmark[];
}

export class BackupRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async createSnapshot(): Promise<BackupDatabaseSnapshot> {
    /*
     * Running the reads inside one transaction reduces the possibility of
     * exporting related tables from different logical points in time.
     */
    let databaseSchemaVersion = 0;
    let scores: BackupScore[] = [];
    let setlists: BackupSetlist[] = [];
    let setlistItems: BackupSetlistItem[] = [];
    let bookmarks: BackupBookmark[] = [];

    await this.db.withTransactionAsync(async () => {
      [
        databaseSchemaVersion,
        scores,
        setlists,
        setlistItems,
        bookmarks,
      ] = await Promise.all([
        this.getDatabaseSchemaVersion(),
        this.getScores(),
        this.getSetlists(),
        this.getSetlistItems(),
        this.getBookmarks(),
      ]);
    });

    return {
      databaseSchemaVersion,
      scores,
      setlists,
      setlistItems,
      bookmarks,
    };
  }

  private async getDatabaseSchemaVersion(): Promise<number> {
    const row = await this.db.getFirstAsync<SQLiteUserVersionRow>(
      'PRAGMA user_version'
    );

    return row?.user_version ?? 0;
  }

  private async getScores(): Promise<BackupScore[]> {
    return this.db.getAllAsync<BackupScore>(`
      SELECT
        id,
        title,
        composer,
        file_name AS fileName,
        original_file_name AS originalFileName,
        created_at AS createdAt,
        updated_at AS updatedAt,
        last_opened_at AS lastOpenedAt
      FROM scores
      ORDER BY id ASC
    `);
  }

  private async getSetlists(): Promise<BackupSetlist[]> {
    return this.db.getAllAsync<BackupSetlist>(`
      SELECT
        id,
        name,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM setlists
      ORDER BY id ASC
    `);
  }

  private async getSetlistItems(): Promise<BackupSetlistItem[]> {
    return this.db.getAllAsync<BackupSetlistItem>(`
      SELECT
        id,
        setlist_id AS setlistId,
        score_id AS scoreId,
        position
      FROM setlist_items
      ORDER BY setlist_id ASC, position ASC
    `);
  }

  private async getBookmarks(): Promise<BackupBookmark[]> {
    /*
     * Remove this query or return [] if bookmarks are not yet stored in
     * their own table.
     */
    return this.db.getAllAsync<BackupBookmark>(`
      SELECT
        id,
        score_id AS scoreId,
        page_number AS pageNumber,
        name,
        created_at AS createdAt
      FROM bookmarks
      ORDER BY score_id ASC, page_number ASC
    `);
  }
}