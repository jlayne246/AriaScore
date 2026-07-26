import type { SQLiteDatabase } from "expo-sqlite";

import type {
  BackupBookmark,
  BackupDatabaseSnapshot,
  BackupLabel,
  BackupMusicLabel,
  BackupMusicSetting,
  BackupReaderSetting,
  BackupSetlist,
  BackupSetlistItem,
  BackupSetlistProgress,
  BackupSetlistSetting,
  BackupSourceScore,
} from "./backup.types";

interface UserVersionRow {
  user_version: number;
}

export class BackupRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  public async createSnapshot(): Promise<BackupDatabaseSnapshot> {
    const databaseList =
        await this.db.getAllAsync<{
            name: string;
            file: string;
        }>("PRAGMA database_list");

    console.log(
        "[Backup] Connected database:",
        databaseList
    );

    const tables = await this.db.getAllAsync<{
        name: string;
    }>(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
      `);

     console.log(
        "[Backup] Available tables:",
        tables.map((table) => table.name)
     );

     const count = await this.db.getFirstAsync<{
        count: number;
        }>("SELECT COUNT(*) AS count FROM music");

        console.log("[Backup] Music count:", count?.count ?? 0);

    let snapshot: BackupDatabaseSnapshot | null = null;

    await this.db.withTransactionAsync(async () => {
      const databaseSchemaVersion =
        await this.getDatabaseSchemaVersion();

      const scores = await this.getScores();

      const setlists = await this.getSetlists();
      const setlistItems = await this.getSetlistItems();
      const setlistProgress = await this.getSetlistProgress();

      const bookmarks = await this.getBookmarks();

      const labels = await this.getLabels();
      const musicLabels = await this.getMusicLabels();

      const readerSettings = await this.getReaderSettings();
      const musicSettings = await this.getMusicSettings();
      const setlistSettings = await this.getSetlistSettings();

      snapshot = {
        databaseSchemaVersion,

        scores,

        setlists,
        setlistItems,
        setlistProgress,

        bookmarks,

        labels,
        musicLabels,

        readerSettings,
        musicSettings,
        setlistSettings,
      };
    });

    if (snapshot === null) {
      throw new Error(
        "The backup transaction completed without producing a database snapshot."
      );
    }

    return snapshot;
  }

  private async getDatabaseSchemaVersion(): Promise<number> {
    const row =
      await this.db.getFirstAsync<UserVersionRow>(
        "PRAGMA user_version"
      );

    return row?.user_version ?? 0;
  }

  private async getScores(): Promise<BackupSourceScore[]> {
    return this.db.getAllAsync<BackupSourceScore>(`
      SELECT
        m.id AS id,
        m.title AS title,
        m.uri AS sourceUri,
        m.original_filename AS originalFilename,

        mm.document_type AS documentType,
        mm.composer AS composer,
        mm.arranger AS arranger,
        mm.editor AS editor,
        mm.publisher AS publisher,
        mm.genre AS genre,
        mm.key_signature AS keySignature,
        mm.time_signature AS timeSignature,
        mm.page_count AS pageCount,

        m.created_at AS createdAt,
        m.updated_at AS updatedAt,
        m.last_opened_at AS lastOpenedAt

      FROM music m

      LEFT JOIN music_metadata mm
        ON mm.id = m.id

      ORDER BY m.id ASC
    `);
  }

  private async getSetlists(): Promise<BackupSetlist[]> {
    return this.db.getAllAsync<BackupSetlist>(`
      SELECT
        id,
        name,
        description,
        created_at AS createdAt,
        updated_at AS updatedAt,
        last_opened_at AS lastOpenedAt

      FROM setlists

      ORDER BY id ASC
    `);
  }

  private async getSetlistItems(): Promise<
    BackupSetlistItem[]
  > {
    return this.db.getAllAsync<BackupSetlistItem>(`
      SELECT
        music_id AS musicId,
        setlist_id AS setlistId,
        position,
        created_at AS createdAt,
        updated_at AS updatedAt

      FROM music_setlists

      ORDER BY
        setlist_id ASC,
        position ASC,
        music_id ASC
    `);
  }

  private async getSetlistProgress(): Promise<
    BackupSetlistProgress[]
  > {
    return this.db.getAllAsync<BackupSetlistProgress>(`
      SELECT
        setlist_id AS setlistId,
        music_id AS musicId,
        page_number AS pageNumber,
        updated_at AS updatedAt

      FROM setlist_progress

      ORDER BY setlist_id ASC
    `);
  }

  private async getBookmarks(): Promise<
    BackupBookmark[]
  > {
    return this.db.getAllAsync<BackupBookmark>(`
      SELECT
        id,
        music_id AS musicId,
        page_number AS pageNumber,
        label,
        created_at AS createdAt

      FROM music_bookmarks

      ORDER BY
        music_id ASC,
        page_number ASC,
        id ASC
    `);
  }

  private async getLabels(): Promise<BackupLabel[]> {
    return this.db.getAllAsync<BackupLabel>(`
      SELECT
        id,
        name,
        colour

      FROM labels

      ORDER BY id ASC
    `);
  }

  private async getMusicLabels(): Promise<
    BackupMusicLabel[]
  > {
    return this.db.getAllAsync<BackupMusicLabel>(`
      SELECT
        music_id AS musicId,
        label_id AS labelId

      FROM music_labels

      ORDER BY
        music_id ASC,
        label_id ASC
    `);
  }

  private async getReaderSettings(): Promise<
    BackupReaderSetting[]
  > {
    return this.db.getAllAsync<BackupReaderSetting>(`
      SELECT
        key,
        value

      FROM reader_settings

      ORDER BY key ASC
    `);
  }

  private async getMusicSettings(): Promise<
    BackupMusicSetting[]
  > {
    return this.db.getAllAsync<BackupMusicSetting>(`
      SELECT
        music_id AS musicId,
        key,
        value

      FROM music_settings

      ORDER BY
        music_id ASC,
        key ASC
    `);
  }

  private async getSetlistSettings(): Promise<
    BackupSetlistSetting[]
  > {
    return this.db.getAllAsync<BackupSetlistSetting>(`
      SELECT
        setlist_id AS setlistId,
        key,
        value

      FROM setlist_settings

      ORDER BY
        setlist_id ASC,
        key ASC
    `);
  }
}