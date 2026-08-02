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
  AriaScoreLibraryBackup,
  PortableBackupScore,
  RestoreBackupResult,
  RestoreBackupWarning,
  RestoredScoreFile,
} from "./backup.types";

interface UserVersionRow {
  user_version: number;
}

interface MusicUriRow {
  uri: string;
}

export interface RestoreLibraryOptions {
  library: AriaScoreLibraryBackup;

  restoredFiles: {
    files: RestoredScoreFile[];
    warnings: RestoreBackupWarning[];
  };

  mode: "replace";
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

  public async restoreLibrary({
    library,
    restoredFiles,
    mode,
  }: RestoreLibraryOptions): Promise<RestoreBackupResult> {
    const restoredUriMap = new Map<number, string>(
        restoredFiles.files.map((file) => [
            file.musicId,
            file.localUri,
        ])
    );

    const restoredMusicIds = new Set(
        restoredFiles.files.map((file) => file.musicId)
    );

    const warnings: RestoreBackupWarning[] = [
        ...restoredFiles.warnings,
    ];

    const replacedFileUris =
        mode === "replace"
            ? await this.getCurrentMusicUris()
            : [];

    await this.db.withTransactionAsync(async () => {
        if (mode === "replace") {
            await this.clearRestorableData();
        }

        await this.restoreScores(
            library.scores,
            restoredUriMap,
            warnings
        );

        await this.restoreSetlists(
            library.setlists
        );

        await this.restoreSetlistItems(
            library.setlistItems,
            restoredMusicIds,
            warnings
        );

        await this.restoreSetlistProgress(
            library.setlistProgress,
            restoredMusicIds,
            warnings
        );

        await this.restoreBookmarks(
            library.bookmarks,
            restoredMusicIds,
            warnings
        );

        await this.restoreLabels(
            library.labels
        );

        await this.restoreMusicLabels(
            library.musicLabels,
            restoredMusicIds,
            warnings
        );

        await this.restoreReaderSettings(
            library.readerSettings
        );

        await this.restoreMusicSettings(
            library.musicSettings,
            restoredMusicIds,
            warnings
        );

        await this.restoreSetlistSettings(
            library.setlistSettings
        );

        await this.resetSequences();
    });

    return {
        restoredScoreCount: restoredMusicIds.size,
        omittedScoreCount:
        library.scores.length - restoredMusicIds.size,

        restoredSetlistCount:
        library.setlists.length,

        restoredBookmarkCount:
        library.bookmarks.filter((bookmark) =>
            restoredMusicIds.has(bookmark.musicId)
        ).length,

        restoredLabelCount:
        library.labels.length,

        warnings,
        replacedFileUris,
    };
    }

  private async clearRestorableData(): Promise<void> {
  await this.db.runAsync(
    "DELETE FROM music_bookmarks"
  );

  await this.db.runAsync(
    "DELETE FROM setlist_progress"
  );

  await this.db.runAsync(
    "DELETE FROM setlist_settings"
  );

  await this.db.runAsync(
    "DELETE FROM music_settings"
  );

  await this.db.runAsync(
    "DELETE FROM music_labels"
  );

  await this.db.runAsync(
    "DELETE FROM music_setlists"
  );

  await this.db.runAsync(
    "DELETE FROM music_metadata"
  );

  await this.db.runAsync(
    "DELETE FROM reader_settings"
  );

  await this.db.runAsync(
    "DELETE FROM labels"
  );

  await this.db.runAsync(
    "DELETE FROM setlists"
  );

  await this.db.runAsync(
    "DELETE FROM music"
  );
}

  private async restoreScores(
  scores: PortableBackupScore[],
  restoredPdfUris: Map<number, string>,
  warnings: RestoreBackupWarning[]
): Promise<void> {
  for (const score of scores) {
    const localUri =
      restoredPdfUris.get(score.id);

    if (!localUri) {
      warnings.push({
        reason: "related-record-skipped",
        musicId: score.id,
        message:
          `The database record for "${score.title}" was skipped because its PDF was not restored.`,
      });

      continue;
    }

    await this.db.runAsync(
      `
        INSERT INTO music (
          id,
          title,
          uri,
          original_filename,
          created_at,
          updated_at,
          last_opened_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        score.id,
        score.title,
        localUri,
        score.originalFilename ??
          score.storedFileName ??
          `${score.id}.pdf`,
        score.createdAt,
        score.updatedAt,
        score.lastOpenedAt,
      ]
    );

    await this.db.runAsync(
      `
        INSERT INTO music_metadata (
          id,
          title,
          document_type,
          composer,
          arranger,
          editor,
          publisher,
          genre,
          key_signature,
          time_signature,
          page_count,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        score.id,
        score.title,
        score.documentType ?? "Single Work",
        score.composer,
        score.arranger,
        score.editor,
        score.publisher,
        score.genre,
        score.keySignature,
        score.timeSignature,
        score.pageCount,
        score.createdAt,
        score.updatedAt,
      ]
    );
  }
}

private async restoreSetlists(
  setlists: BackupSetlist[]
): Promise<void> {
  for (const setlist of setlists) {
    await this.db.runAsync(
      `
        INSERT INTO setlists (
          id,
          name,
          description,
          created_at,
          updated_at,
          last_opened_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        setlist.id,
        setlist.name,
        setlist.description,
        setlist.createdAt,
        setlist.updatedAt,
        setlist.lastOpenedAt,
      ]
    );
  }
}

private async restoreSetlistItems(
  items: BackupSetlistItem[],
  restoredMusicIds: Set<number>,
  warnings: RestoreBackupWarning[]
): Promise<void> {
  for (const item of items) {
    if (!restoredMusicIds.has(item.musicId)) {
      warnings.push({
        reason: "related-record-skipped",
        musicId: item.musicId,
        message:
          `A setlist item was skipped because music ${item.musicId} was not restored.`,
      });

      continue;
    }

    await this.db.runAsync(
      `
        INSERT INTO music_setlists (
          music_id,
          setlist_id,
          position,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        item.musicId,
        item.setlistId,
        item.position,
        item.createdAt,
        item.updatedAt,
      ]
    );
  }
}

private async restoreSetlistProgress(
  progressRows: BackupSetlistProgress[],
  restoredMusicIds: Set<number>,
  warnings: RestoreBackupWarning[]
): Promise<void> {
  for (const progress of progressRows) {
    if (!restoredMusicIds.has(progress.musicId)) {
      warnings.push({
        reason: "related-record-skipped",
        musicId: progress.musicId,
        message:
          `Setlist progress was skipped because music ${progress.musicId} was not restored.`,
      });

      continue;
    }

    await this.db.runAsync(
      `
        INSERT INTO setlist_progress (
          setlist_id,
          music_id,
          page_number,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        progress.setlistId,
        progress.musicId,
        progress.pageNumber,
        progress.updatedAt,
      ]
    );
  }
}

private async restoreBookmarks(
  bookmarks: BackupBookmark[],
  restoredMusicIds: Set<number>,
  warnings: RestoreBackupWarning[]
): Promise<void> {
  for (const bookmark of bookmarks) {
    if (!restoredMusicIds.has(bookmark.musicId)) {
      warnings.push({
        reason: "related-record-skipped",
        musicId: bookmark.musicId,
        message:
          `Bookmark ${bookmark.id} was skipped because its music record was not restored.`,
      });

      continue;
    }

    await this.db.runAsync(
      `
        INSERT INTO music_bookmarks (
          id,
          music_id,
          page_number,
          label,
          created_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        bookmark.id,
        bookmark.musicId,
        bookmark.pageNumber,
        bookmark.label,
        bookmark.createdAt,
      ]
    );
  }
}

private async restoreLabels(
  labels: BackupLabel[]
): Promise<void> {
  for (const label of labels) {
    await this.db.runAsync(
      `
        INSERT INTO labels (
          id,
          name,
          colour
        )
        VALUES (?, ?, ?)
      `,
      [
        label.id,
        label.name,
        label.colour,
      ]
    );
  }
}

private async restoreMusicLabels(
  relations: BackupMusicLabel[],
  restoredMusicIds: Set<number>,
  warnings: RestoreBackupWarning[]
): Promise<void> {
  for (const relation of relations) {
    if (!restoredMusicIds.has(relation.musicId)) {
      warnings.push({
        reason: "related-record-skipped",
        musicId: relation.musicId,
        message:
          `A label assignment was skipped because music ${relation.musicId} was not restored.`,
      });

      continue;
    }

    await this.db.runAsync(
      `
        INSERT INTO music_labels (
          music_id,
          label_id
        )
        VALUES (?, ?)
      `,
      [
        relation.musicId,
        relation.labelId,
      ]
    );
  }
}

private async restoreReaderSettings(
  settings: BackupReaderSetting[]
): Promise<void> {
  for (const setting of settings) {
    await this.db.runAsync(
      `
        INSERT INTO reader_settings (
          key,
          value
        )
        VALUES (?, ?)
      `,
      [
        setting.key,
        setting.value,
      ]
    );
  }
}

private async restoreMusicSettings(
  settings: BackupMusicSetting[],
  restoredMusicIds: Set<number>,
  warnings: RestoreBackupWarning[]
): Promise<void> {
  for (const setting of settings) {
    if (!restoredMusicIds.has(setting.musicId)) {
      warnings.push({
        reason: "related-record-skipped",
        musicId: setting.musicId,
        message:
          `A music setting was skipped because music ${setting.musicId} was not restored.`,
      });

      continue;
    }

    await this.db.runAsync(
      `
        INSERT INTO music_settings (
          music_id,
          key,
          value
        )
        VALUES (?, ?, ?)
      `,
      [
        setting.musicId,
        setting.key,
        setting.value,
      ]
    );
  }
}

private async restoreSetlistSettings(
  settings: BackupSetlistSetting[]
): Promise<void> {
  for (const setting of settings) {
    await this.db.runAsync(
      `
        INSERT INTO setlist_settings (
          setlist_id,
          key,
          value
        )
        VALUES (?, ?, ?)
      `,
      [
        setting.setlistId,
        setting.key,
        setting.value,
      ]
    );
  }
}

private async resetSequences(): Promise<void> {
  await this.db.runAsync(
    `
      INSERT OR REPLACE INTO sqlite_sequence (
        name,
        seq
      )
      VALUES (
        'music',
        COALESCE((SELECT MAX(id) FROM music), 0)
      )
    `
  );

  await this.db.runAsync(
    `
      INSERT OR REPLACE INTO sqlite_sequence (
        name,
        seq
      )
      VALUES (
        'setlists',
        COALESCE((SELECT MAX(id) FROM setlists), 0)
      )
    `
  );

  await this.db.runAsync(
    `
      INSERT OR REPLACE INTO sqlite_sequence (
        name,
        seq
      )
      VALUES (
        'labels',
        COALESCE((SELECT MAX(id) FROM labels), 0)
      )
    `
  );

  await this.db.runAsync(
    `
      INSERT OR REPLACE INTO sqlite_sequence (
        name,
        seq
      )
      VALUES (
        'music_bookmarks',
        COALESCE(
          (SELECT MAX(id) FROM music_bookmarks),
          0
        )
      )
    `
  );
}

private async getCurrentMusicUris(): Promise<string[]> {
  const rows =
    await this.db.getAllAsync<MusicUriRow>(`
      SELECT uri
      FROM music
      WHERE uri IS NOT NULL
        AND trim(uri) <> ''
    `);

  return rows.map((row) => row.uri);
}
}