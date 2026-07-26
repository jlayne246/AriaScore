import type { SQLiteDatabase } from "expo-sqlite";

import type {
  BackupBookmark,
  BackupDatabaseSnapshot,
  BackupPreferences,
  BackupSetlist,
  BackupSetlistItem,
  BackupSourceScore,
} from "./backup.types";

interface UserVersionRow {
  user_version: number;
}

export class BackupRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async createSnapshot(): Promise<BackupDatabaseSnapshot> {
    let snapshot!: BackupDatabaseSnapshot;

    await this.db.withTransactionAsync(async () => {
        const databaseSchemaVersion =
        await this.getDatabaseSchemaVersion();

        const scores = await this.getScores();
        const setlists = await this.getSetlists();
        const setlistItems = await this.getSetlistItems();
        const bookmarks = await this.getBookmarks();
        const preferences = await this.getPreferences();

        snapshot = {
        databaseSchemaVersion,
        scores,
        setlists,
        setlistItems,
        bookmarks,
        preferences,
        };
    });

    return snapshot;
    }

  private async getDatabaseSchemaVersion(): Promise<number> {
    const row = await this.db.getFirstAsync<UserVersionRow>(
      "PRAGMA user_version"
    );

    return row?.user_version ?? 0;
  }

  private async getScores(): Promise<BackupSourceScore[]> {
    /*
     * Change these table and column names to match AriaScore's real schema.
     *
     * The important field is sourceUri: it must point to the locally stored PDF.
     */
    return this.db.getAllAsync<BackupSourceScore>(`
      SELECT
        id,
        title,
        composer,
        file_uri AS sourceUri,
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

  private async getPreferences(): Promise<BackupPreferences> {
    /*
     * Replace this with your actual preferences storage.
     * Return {} for now if preferences are stored in AsyncStorage.
     */
    return {};
  }
}