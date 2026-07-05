/** 
 * This module allows the app to access a database that can be queried through a SQLite API
 * @see {@link https://docs.expo.dev/versions/latest/sdk/sqlite/}
*/
import * as SQLite from 'expo-sqlite';
import { Asset } from "expo-asset";
/** 
 * Imports the Expo file system module which allows the app access to a device's local file system
 * @see {@link https://docs.expo.dev/versions/latest/sdk/filesystem/}
 * */ 
import * as FileSystem from "expo-file-system";

import * as troubleshooting from "./troubleshooting";

import {
  MusicItem,
  Setlist,
  Label,
  MusicMetadata,
  MusicMetadataWithLabels,
  MusicItemWithAllData,
} from "../types";

/**
 * Opens the SQLite database
 * @returns SQLite Database object
 */
let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

export const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (_db) return _db;

    _db = await SQLite.openDatabaseAsync('airscore.db');
    return _db;
};


/**
 * Initialises the SQLite database by creating the necessary tables.
 */
export const initDB = async (): Promise<void> => {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const db = await openDatabase();

    try {
      console.log("DB init: enabling foreign keys");
      await db.execAsync(`PRAGMA foreign_keys = ON;`);

      console.log("DB init: creating music table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          uri TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          last_opened_at TEXT DEFAULT (datetime('now'))
        );
      `);

      console.log("DB init: creating setlists table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS setlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      console.log("DB init: creating music_setlists table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_setlists (
          music_id INTEGER,
          setlist_id INTEGER,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (music_id, setlist_id),
          FOREIGN KEY (music_id) REFERENCES music (id) ON DELETE CASCADE,
          FOREIGN KEY (setlist_id) REFERENCES setlists (id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating setlist_progress table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS setlist_progress (
          setlist_id INTEGER PRIMARY KEY,
          music_id INTEGER NOT NULL,
          page_number INTEGER DEFAULT 1,
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
          FOREIGN KEY (music_id) REFERENCES music(id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating music_metadata table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_metadata (
          id INTEGER PRIMARY KEY,
          title TEXT NOT NULL,
          document_type TEXT DEFAULT 'Single Work',
          composer TEXT,
          arranger TEXT,
          editor TEXT,
          publisher TEXT,
          genre TEXT,
          key_signature TEXT,
          time_signature TEXT,
          page_count INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (id) REFERENCES music (id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating labels table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS labels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          colour TEXT
        );
      `);

      console.log("DB init: creating music_labels table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_labels (
          music_id INTEGER,
          label_id INTEGER,
          PRIMARY KEY (music_id, label_id),
          FOREIGN KEY (music_id) REFERENCES music (id) ON DELETE CASCADE,
          FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating music_bookmarks table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          music_id INTEGER NOT NULL,
          page_number INTEGER NOT NULL,
          label TEXT,
          created_at TEXT NOT NULL,

          FOREIGN KEY (music_id)
            REFERENCES music(id)
            ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating reader_settings table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reader_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
      `);

      console.log("DB init: creating setlist_settings table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS setlist_settings (
          setlist_id INTEGER,
          key TEXT,
          value TEXT,

          PRIMARY KEY(setlist_id, key),

          FOREIGN KEY(setlist_id)
              REFERENCES setlists(id)
              ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating music_settings table");
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS music_settings (
          music_id INTEGER,
          key TEXT,
          value TEXT,

          PRIMARY KEY(music_id, key),

          FOREIGN KEY(music_id)
              REFERENCES music(id)
              ON DELETE CASCADE
        );
      `);

      console.log("DB init: creating duplicate metadata index");
      await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_music_metadata_title_composer
        ON music_metadata (title, composer);
      `);

      await ensureColumn(
        db,
        "music_metadata",
        "document_type",
        `
        ALTER TABLE music_metadata
        ADD COLUMN document_type TEXT DEFAULT 'Single Work';
        `
      );

      await ensureColumn(
        db,
        "music_metadata",
        "editor",
        `
        ALTER TABLE music_metadata
        ADD COLUMN editor TEXT DEFAULT '';
        `
      );

      await ensureColumn(
        db,
        "music_metadata",
        "publisher",
        `
        ALTER TABLE music_metadata
        ADD COLUMN publisher TEXT DEFAULT '';
        `
      );

      await ensureColumn(
        db,
        "music_metadata",
        "arranger",
        `
        ALTER TABLE music_metadata
        ADD COLUMN arranger TEXT DEFAULT '';
        `
      );

      await ensureColumn(
        db,
        "music",
        "original_filename",
        `
        ALTER TABLE music
        ADD COLUMN original_filename TEXT;
        `
      );

      // await db.runAsync(`
      //   UPDATE music
      //   SET original_filename = substr(uri, length(rtrim(uri, replace(uri, '/', ''))) + 1)
      //   WHERE original_filename IS NULL
      //     OR trim(original_filename) = '';
      // `);

      // await ensureColumn(
      //   "music_setlists",
      //   "description",
      //   `
      //   ALTER TABLE music_metadata
      //   ADD COLUMN description TEXT DEFAULT '';
      //   `
      // );

      // await ensureColumn(
      //   "music_setlists",
      //   "created_at",
      //   `
      //   ALTER TABLE music_metadata
      //   ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
      //   `
      // );

      await ensureColumn(
        db,
        "music",
        "updated_at",
        `
        ALTER TABLE music
        ADD COLUMN updated_at TEXT;
        `
      );

      console.log("Database initialized");
    } catch (error) {
      _initPromise = null;
      console.error("Database startup failed:", error);
      throw error;
    }
  })();

  return _initPromise;
};

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  addColumnSql: string
) {
  // const db = await openDatabase();

  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName});`
  );

  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await db.execAsync(addColumnSql);
  }
}

export const getRecentlyOpenedMusic = async (
  limit: number = 10
): Promise<MusicItemWithAllData[]> => {
  const allMusic = await getMusicWithAllData();

  return allMusic
    .filter(item => !!item.last_opened_at)
    .sort(
      (a, b) =>
        new Date(b.last_opened_at!).getTime() -
        new Date(a.last_opened_at!).getTime()
    )
    .slice(0, limit);
};

export const markMusicAsOpened = async (musicId: number): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    UPDATE music
    SET last_opened_at = ?
    WHERE id = ?
    `,
    [new Date().toISOString(), musicId]
  );
};

/**
 * Inserts a new music item into the database
 * @param title - The title of the music item
 * @param uri - The uri / path of the music item
 * @param setlistNames - The setlist names selected for the music item
 * @returns musicId - The id of the music item inserted
 */
export const insertMusic = async (
  title: string,
  uri: string,
  originalFileName: string,
  setlistNames: string[],
  created_at: string
) : Promise<number> => {
    const db = await openDatabase();
    const created = created_at || new Date().toISOString();

    try {
        // Begins transaction to ensure atomicity
        await db.execAsync('BEGIN TRANSACTION');

        // Checks to see if a title is undefined
        if (!title || typeof title == 'undefined') {
            throw new Error("No title given");
        }

        // Insert the music item
        const musicResult = await db.runAsync(
            'INSERT INTO music (title, uri, original_filename, created_at) VALUES (?, ?, ?, ?)', [title, uri, originalFileName, created]
        );

        const musicId = musicResult.lastInsertRowId;

        // Process each setlist
        for (const setlistName of setlistNames) {
            // Insert setlist if it doesn't exist
            await db.runAsync(
                'INSERT OR IGNORE INTO setlists (name) VALUES (?)', [setlistName]
            );

            // Get the setlist ID
            const setlist = await db.getFirstAsync<Setlist>(
                'SELECT id FROM setlists WHERE name = ?', [setlistName]
            );

            // Checks to see if a setlist id was returned, otherwise, an error is thrown
            if (!setlist || typeof setlist.id == 'undefined') {
                throw new Error(`Setlist "${setlistName}" not found after insertion`)
            }

            const position = await getNextSetlistPosition(db, setlist.id);

            // Create the relationship between the music item and the setlist(s)
            await db.runAsync(
                'INSERT INTO music_setlists (music_id, setlist_id, position) VALUES (?, ?, ?)', [musicId, setlist.id, position]
            );
        }

        // Commit the transaction
        await db.execAsync('COMMIT');

        return musicId;
    } catch (error) {
        // Rollback on error
        await db.execAsync('ROLLBACK');
        throw error;
    }
};

export const metadataExists = async (
  title: string,
  composer?: string,
  excludeMusicId?: number
): Promise<boolean> => {
  const db = await openDatabase();

  const normalisedTitle = title.trim().toLowerCase();
  const normalisedComposer = (composer ?? "").trim().toLowerCase();

  const existing = await db.getFirstAsync<{ id: number }>(
    `
    SELECT id
    FROM music_metadata
    WHERE lower(trim(title)) = ?
      AND lower(trim(coalesce(composer, ''))) = ?
      AND (? IS NULL OR id != ?)
    LIMIT 1
    `,
    [
      normalisedTitle,
      normalisedComposer,
      excludeMusicId ?? null,
      excludeMusicId ?? null,
    ]
  );

  return !!existing;
};

export const musicExistsByUri = async (
  uri: string,
  excludeMusicId?: number
): Promise<boolean> => {
  const db = await openDatabase();

  const existing = await db.getFirstAsync<{ id: number }>(
    `
    SELECT id
    FROM music
    WHERE uri = ?
      AND (? IS NULL OR id != ?)
    LIMIT 1
    `,
    [
      uri,
      excludeMusicId ?? null,
      excludeMusicId ?? null
    ]
  );

  return !!existing;
};

export const updateMusic = async (
  id: number,
  title: string,
  uri: string,
  setlistNames: string[],
  updated_at: string
): Promise<void> => {
  const db = await openDatabase();
  const updated = updated_at || new Date().toISOString();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM music WHERE id = ?",
      [id]
    );

    if (!existing) {
      throw new Error(`Music item with id ${id} does not exist`);
    }

    await db.runAsync(
      "UPDATE music SET title = ?, uri = ?, updated_at = ? WHERE id = ?",
      [title, uri, updated, id]
    );

    for (const setlistName of setlistNames) {
      await db.runAsync(
        "INSERT OR IGNORE INTO setlists (name) VALUES (?)",
        [setlistName]
      );
    }

    const setlistIds: number[] = [];

    for (const name of setlistNames) {
      const setlist = await db.getFirstAsync<Setlist>(
        "SELECT id FROM setlists WHERE name = ?",
        [name]
      );

      if (!setlist || setlist.id === undefined) {
        throw new Error(`Setlist "${name}" not found after insertion`);
      }

      setlistIds.push(setlist.id);
    }

    const uniqueSetlistIds = [...new Set(setlistIds)];

    const existingRows = await db.getAllAsync<{ setlist_id: number }>(
      `
      SELECT setlist_id
      FROM music_setlists
      WHERE music_id = ?
      `,
      [id]
    );

    const existingSetlistIds = new Set(
      existingRows.map((row) => row.setlist_id)
    );

    if (uniqueSetlistIds.length === 0) {
      await db.runAsync(
        `
        DELETE FROM music_setlists
        WHERE music_id = ?
        `,
        [id]
      );
    } else {
      const placeholders = uniqueSetlistIds.map(() => "?").join(",");

      await db.runAsync(
        `
        DELETE FROM music_setlists
        WHERE music_id = ?
          AND setlist_id NOT IN (${placeholders})
        `,
        [id, ...uniqueSetlistIds]
      );
    }

    for (const setlistId of uniqueSetlistIds) {
      if (existingSetlistIds.has(setlistId)) {
        continue;
      }

      const position = await getNextSetlistPosition(db, setlistId);

      await db.runAsync(
        `
        INSERT INTO music_setlists (
          music_id,
          setlist_id,
          position
        )
        VALUES (?, ?, ?)
        `,
        [id, setlistId, position]
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
};
  

/**
 * Gets all music with their setlists
 * @returns Array of music items with their setlists
 */
export const getAllMusicWithSetlists = async (): Promise<
  Array<MusicItem & { setlists: string[] }>
> => {
    const db = await openDatabase();

    // Get all music items from the music table
    const musicItems = await db.getAllAsync<MusicItem>('SELECT * FROM music');

    if (!musicItems) {
        console.log("No music here");
    }

    console.log("Here!")

    try {
        // For each music item, get its setlists
        const result = await Promise.all(
            musicItems.map(async (music) => {
            // Checks to see if the music item exists and is retrievable
            if (!music || typeof music.id == "undefined") {
                throw new Error("Unable to retrieve music item");
            }

            const setlists = await db.getAllAsync<{ name: string }>(
                `SELECT g.name
                    FROM setlists g
                    JOIN music_setlists mg ON g.id = mg.setlist_id
                    WHERE mg.music_id = ?`,
                [music.id]
            );

            // Returns the music array mapped to the setlists from sub-function
            return {
                ...music, // Expanded music array
                setlists: setlists.map((g) => g.name),
            };
            })
        );

        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Get music items that belong to all of the specified setlists
 * @param setlistNames - Array of setlist names to filter by
 * @returns Array of music items that belong to all specified setlists
 */
export const getMusicByMultipleSetlists = async (setlistNames: string[]) : Promise<MusicItem[]> => {
    // If the setlistNames param is empty, return an empty array
    if (setlistNames.length === 0) {
        return [];
    }

    const db = await openDatabase();

    // Create placeholders for the query
    const placeholders = setlistNames.map(() => '?').join(',');

    // Query for all music items that match the specified setlists, setlisted by setlistName
    const result = await db.getAllAsync<MusicItem>(
        `SELECT m.*
        FROM music m
        JOIN music_setlists mg ON m.id = mg.music_id
        JOIN setlists g ON mg.setlist_id = g.id
        WHERE g.name IN (${placeholders})
        GROUP BY m.id
        HAVING COUNT(DISTINCT g.name) = ?`, 
        [...setlistNames, setlistNames.length]
    );

    return result;
} 

/**
 * Delete a music item by ID
 * @param id - ID of the music item to delete
 */
export const deleteMusic = async (id: number) => {
  const db = openDatabase();

  // Due to ON DELETE CASCADE, this will also remove entries in music_setlists
  (await db).runAsync('DELETE FROM music WHERE id = ?', [id]);
}

/**
 * Add a music item to a setlist
 * @param musicId - ID of the music item
 * @param setlistName - Name of the setlist
 */
export const addMusicToSetlist = async (
  musicId: number,
  setlistName: string
) => {
  const db = await openDatabase();

  await db.runAsync(
    "INSERT OR IGNORE INTO setlists (name) VALUES (?)",
    [setlistName]
  );

  const setlist = await db.getFirstAsync<Setlist>(
    "SELECT id FROM setlists WHERE name = ?",
    [setlistName]
  );

  if (!setlist?.id) {
    throw new Error(`Setlist "${setlistName}" not found`);
  }

  await addMusicToSetlistById(musicId, setlist.id);
};

/**
 * Removes a music item from a setlist
 * @param musicId - ID of the music item
 * @param setlistName - Name of the setlist
 */
export const removeMusicFromSetlist = async (musicId: number, setlistName: string) => {
    const db = await openDatabase();

    // Deletes item from setlist by ID
    await db.runAsync(
        `DELETE FROM music_setlists
        WHERE music_id = ? AND setlist_id = (
            SELECT id FROM setlists WHERE name = ?
        )`, [musicId, setlistName]
    );
}

const getNextSetlistPosition = async (
    db: SQLite.SQLiteDatabase,
    setlistId: number
): Promise<number> => {
    const row = await db.getFirstAsync<{ position: number }>(
        `
        SELECT COALESCE(MAX(position), 0) + 1 AS position
        FROM music_setlists
        WHERE setlist_id = ?
        `,
        [setlistId]
    );

    return row?.position ?? 1;
};

export const setMusicSetlists = async (
  musicId: number,
  setlistNames: string[]
): Promise<void> => {
  const db = await openDatabase();

  try {
    await db.execAsync("BEGIN TRANSACTION");

    const cleanedSetlistNames = setlistNames
      .map((name) => name.trim())
      .filter((name) => name !== "");

    for (const setlistName of cleanedSetlistNames) {
      await db.runAsync(
        "INSERT OR IGNORE INTO setlists (name) VALUES (?)",
        [setlistName]
      );
    }

    const selectedSetlists: Array<{ id: number }> = [];

    for (const setlistName of cleanedSetlistNames) {
      const setlist = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM setlists WHERE name = ?",
        [setlistName]
      );

      if (!setlist?.id) {
        throw new Error(`Setlist "${setlistName}" not found after insertion`);
      }

      selectedSetlists.push(setlist);
    }

    const selectedSetlistIds = selectedSetlists.map((setlist) => setlist.id);

    const existingRows = await db.getAllAsync<{ setlist_id: number }>(
      `
      SELECT setlist_id
      FROM music_setlists
      WHERE music_id = ?
      `,
      [musicId]
    );

    const existingSetlistIds = new Set(
      existingRows.map((row) => row.setlist_id)
    );

    if (selectedSetlistIds.length === 0) {
      await db.runAsync(
        "DELETE FROM music_setlists WHERE music_id = ?",
        [musicId]
      );
    } else {
      const placeholders = selectedSetlistIds.map(() => "?").join(",");

      await db.runAsync(
        `
        DELETE FROM music_setlists
        WHERE music_id = ?
          AND setlist_id NOT IN (${placeholders})
        `,
        [musicId, ...selectedSetlistIds]
      );
    }

    for (const setlistId of selectedSetlistIds) {
      if (existingSetlistIds.has(setlistId)) {
        continue;
      }

      const position = await getNextSetlistPosition(db, setlistId);

      await db.runAsync(
        `
        INSERT INTO music_setlists (
          music_id,
          setlist_id,
          position
        )
        VALUES (?, ?, ?)
        `,
        [musicId, setlistId, position]
      );
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    console.error("Failed to set music setlists:", error);
    throw error;
  }
};
  

/**
 * Drops specified tables from the database
 * @param tableNames - Array of table names to drop
 * @returns Promise that resolves when all tables are dropped
 */
export const dropTables = async (
  tableNames: string[] = [
    "music_labels",
    "music_setlists",
    "music_metadata",
    "labels",
    "setlists",
    "music"
  ]
) => {
  const db = await openDatabase();

  try {
    await db.execAsync("PRAGMA foreign_keys = OFF;");
    await db.execAsync("BEGIN TRANSACTION;");

    for (const tableName of tableNames) {
      await db.execAsync(`DROP TABLE IF EXISTS ${tableName};`);
      console.log(`Table ${tableName} dropped successfully`);
    }

    await db.execAsync(`
        DROP INDEX IF EXISTS idx_music_metadata_title_composer;
    `);

    await db.execAsync("COMMIT;");
    await db.execAsync("PRAGMA foreign_keys = ON;");

    return true;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    await db.execAsync("PRAGMA foreign_keys = ON;");
    console.error("Error dropping tables:", error);
    throw error;
  }
};
  
  /**
   * Reset the database by dropping all tables and reinitializing
   * Useful during development or for features like "Reset App Data"
   */
  export const resetDatabase = async () => {
    try {
      // Drop tables in the correct order (respecting foreign key constraints)
      await dropTables();
      
      // Reinitialize the database structure
      await initDB();
      
      console.log('Database has been reset successfully');
      return true;
    } catch (error) {
      console.error('Failed to reset database:', error);
      throw error;
    }
  };

/**
 * Saves or updates metadata for a music item
 * @param musicId - The ID of the music item
 * @param metadata - The metadata object (without id field)
 * @returns Promise<void>
 */
export const saveMusicMetadata = async (
    musicId: number, 
    metadata: Omit<MusicMetadata, 'id'>
): Promise<void> => {
    const db = await openDatabase();

    try {
        await db.execAsync('BEGIN TRANSACTION');

        // Insert or replace metadata
        await db.runAsync(`
            INSERT OR REPLACE INTO music_metadata (
                id, title, document_type, composer, arranger, editor, publisher, genre, key_signature, 
                time_signature, page_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            musicId,
            metadata.title,
            metadata.document_type,
            metadata.composer ?? "",
            metadata.arranger ?? "",
            metadata.editor ?? "",
            metadata.publisher ?? "",
            metadata.genre ?? "",
            metadata.key_signature ?? "",
            metadata.time_signature ?? "",
            metadata.page_count ?? 0,
            metadata.created_at ?? new Date().toISOString()
        ]);

        await db.execAsync('COMMIT');
        console.log(`Metadata saved for music ID: ${musicId}`);
    } catch (error) {
        await db.execAsync('ROLLBACK');
        console.error("Failed to save music metadata:", error);
        throw error;
    }
};

/**
 * Creates a new label or returns existing one
 * @param name - Label name
 * @param colour - Optional color for the label
 * @returns Promise<number> - The label ID
 */
export const createOrGetLabel = async (name: string, colour?: string): Promise<number> => {
    const db = await openDatabase();

    try {
        // Try to get existing label
        const existing = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM labels WHERE name = ?', [name]
        );

        if (existing) {
            return existing.id;
        }

        // Create new label
        const result = await db.runAsync(
            'INSERT INTO labels (name, colour) VALUES (?, ?)', 
            [name, colour || null]
        );

        return result.lastInsertRowId;
    } catch (error) {
        console.error("Failed to create or get label:", error);
        throw error;
    }
};

/**
 * Assigns labels to a music item
 * @param musicId - The ID of the music item
 * @param labelNames - Array of label names to assign
 * @returns Promise<void>
 */
export const assignLabelsToMusic = async (
    musicId: number, 
    labelNames: string[]
): Promise<void> => {
    console.log("Assigning - Stage 1: ", labelNames);

    // if (labelNames.length === 0) return;

    const db = await openDatabase();

    try {
        await db.execAsync('BEGIN TRANSACTION');

        // Remove existing labels for this music item
        await db.runAsync('DELETE FROM music_labels WHERE music_id = ?', [musicId]);

        console.log("Assigning - Stage 2 : ", labelNames);

        // Add new labels
        for (const labelName of labelNames) {
            const labelId = await createOrGetLabel(labelName);
            
            await db.runAsync(
                'INSERT INTO music_labels (music_id, label_id) VALUES (?, ?)',
                [musicId, labelId]
            );
        }

        await db.execAsync('COMMIT');
        console.log(`Labels assigned to music ID: ${musicId}`);
    } catch (error) {
        await db.execAsync('ROLLBACK');
        console.error("Failed to assign labels to music:", error);
        throw error;
    }
};

/**
 * Saves complete music metadata including labels
 * @param musicId - The ID of the music item
 * @param metadata - The metadata object
 * @param labelNames - Array of label names
 * @returns Promise<void>
 */
export const saveCompleteMetadata = async (
    musicId: number,
    metadata: Omit<MusicMetadata, 'id'>,
    labelNames: string[] = []
): Promise<void> => {
    try {
        // Save metadata
        console.log("Saving complete metadata for music ID:", musicId, " with data: ", metadata, " and labels: ", labelNames);
        await saveMusicMetadata(musicId, metadata);
        
        // Assign labels
        await assignLabelsToMusic(musicId, labelNames);
        
        console.log(`Complete metadata saved for music ID: ${musicId}`);
    } catch (error) {
        console.error("Failed to save complete metadata:", error);
        throw error;
    }
};

/**
 * Retrieves metadata for a music item including labels
 * @param musicId - The ID of the music item
 * @returns Promise<MusicMetadataWithLabels | null>
 */
export const getMusicWithMetadata = async (
    musicId: number
): Promise<MusicMetadataWithLabels | null> => {
    const db = await openDatabase();

    try {
        // Get metadata
        const metadata = await db.getFirstAsync<MusicMetadata>(
            'SELECT * FROM music_metadata WHERE id = ?', [musicId]
        );

        if (!metadata) return null;

        // Get labels
        const labels = await db.getAllAsync<{ name: string }>(
            `SELECT l.name 
             FROM labels l 
             JOIN music_labels ml ON l.id = ml.label_id 
             WHERE ml.music_id = ?`, 
            [musicId]
        );

        return {
            ...metadata,
            labels: labels.map(l => l.name)
        };
    } catch (error) {
        console.error("Failed to get music metadata:", error);
        throw error;
    }
};

/**
 * Gets all available labels
 * @returns Promise<Label[]>
 */
export const getAllLabels = async (): Promise<Label[]> => {
    const db = await openDatabase();

    console.log("Label DB - ", db)
    
    try {
        const labels = await db.getAllAsync<Label>('SELECT * FROM labels ORDER BY name'); // Seemingly error line
        console.log(labels)
        return labels;
    } catch (error) {
        console.error("Failed to get all labels:", error);
        throw error;
    }
};


export const getMusicWithAllData = async (): Promise<
  MusicItemWithAllData[]
> => {
    const db = await openDatabase();

    // Fetch all music items
    const musicItems = await db.getAllAsync<MusicItem>("SELECT * FROM music");
    const musicMetaItems = await db.getAllAsync<MusicItem>("SELECT * FROM music_metadata");

    console.log(musicItems, musicMetaItems);

    if (!musicItems || musicItems.length === 0) {
        console.log("No music here");
        return [];
    }

    try {
        const result = await Promise.all(
        musicItems.map(async (music) => {
            if (!music || typeof music.id === "undefined") {
            throw new Error("Unable to retrieve music item");
            }

            // Get setlists
            const setlists = await db.getAllAsync<{ name: string }>(
            `SELECT g.name
                        FROM setlists g
                        JOIN music_setlists mg ON g.id = mg.setlist_id
                        WHERE mg.music_id = ?`,
            [music.id]
            );

            // Get metadata
            const metadata = await db.getFirstAsync<MusicMetadata>(
            "SELECT * FROM music_metadata WHERE id = ?",
            [music.id]
            );

            // Get labels for metadata (only if metadata exists)
            let labels: string[] = [];
            if (metadata) {
            const labelResults = await db.getAllAsync<{ name: string }>(
                `SELECT l.name 
                            FROM labels l 
                            JOIN music_labels ml ON l.id = ml.label_id 
                            WHERE ml.music_id = ?`,
                [music.id]
            );
            labels = labelResults.map((l) => l.name);
            }

            return {
            ...music,
            setlists: setlists.map((g) => g.name),
            metadata: metadata ? { ...metadata, labels, setlists } : null,
            };
        })
        );

        return result;
    } catch (error) {
        console.error("Error fetching music with setlists and metadata:", error);
        throw error;
    }
};


/**
 * 
 * @returns 
 */
export const getAllSetlists = async (): Promise<string[]> => {
    const db = await openDatabase();

    try {
        const setlists = await db.getAllAsync<{ setlist_name: string }>(`
            SELECT DISTINCT name as setlist_name
            FROM setlists
            WHERE name IS NOT NULL
            ORDER BY name ASC
        `);

        return setlists.map((g) => g.setlist_name);
    } catch (error) {
        console.error("Error getting all setlists:", error);
        return []; // No fallback 'Unsetlisted' needed here
    }
};
  

export const getSetlistNamesForMusic = async (musicId: number): Promise<string[]> => {
    const db = await openDatabase();

    try {
        // Query to get setlists associated with a specific music item
        // This assumes you have a junction table like 'music_setlists' or similar
        const setlists = await db.getAllAsync<{ setlist_name: string }>(
        `
            SELECT g.name as setlist_name
            FROM setlists g
            INNER JOIN music_setlists mg ON g.id = mg.setlist_id
            WHERE mg.music_id = ?
            ORDER BY g.name ASC
        `,
        [musicId]
        );

        console.log(setlists);

        return setlists.length > 0 ? setlists.map((g) => g.setlist_name) : [];      
    } catch (error) {
        console.error("Error getting setlists for music:", error);
        return []; // Return default setlist on error
    }
};

export const getSetlistsForMusicByIds = async (
  musicId: number
): Promise<number[]> => {
  const db = await openDatabase();

  const rows = await db.getAllAsync<{ setlist_id: number }>(
    `
    SELECT setlist_id
    FROM music_setlists
    WHERE music_id = ?
    `,
    [musicId]
  );

  return rows.map(row => row.setlist_id);
};

export const setMusicSetlistsByIds = async (
  musicId: number,
  setlistIds: number[]
): Promise<void> => {
  const db = await openDatabase();

  await db.withTransactionAsync(async () => {
    const uniqueSetlistIds = [...new Set(setlistIds)];

    const existingRows = await db.getAllAsync<{ setlist_id: number }>(
      `
      SELECT setlist_id
      FROM music_setlists
      WHERE music_id = ?
      `,
      [musicId]
    );

    const existingSetlistIds = new Set(
      existingRows.map((row) => row.setlist_id)
    );

    if (uniqueSetlistIds.length === 0) {
      await db.runAsync(
        `
        DELETE FROM music_setlists
        WHERE music_id = ?
        `,
        [musicId]
      );

      return;
    }

    const placeholders = uniqueSetlistIds.map(() => "?").join(",");

    await db.runAsync(
      `
      DELETE FROM music_setlists
      WHERE music_id = ?
        AND setlist_id NOT IN (${placeholders})
      `,
      [musicId, ...uniqueSetlistIds]
    );

    for (const setlistId of uniqueSetlistIds) {
      if (existingSetlistIds.has(setlistId)) {
        continue;
      }

      const position = await getNextSetlistPosition(db, setlistId);

      await db.runAsync(
        `
        INSERT INTO music_setlists (
          music_id,
          setlist_id,
          position,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `,
        [musicId, setlistId, position]
      );
    }
  });
};

export const getMusicIdsForSetlist = async (
  setlistId: number
): Promise<number[]> => {
  const db = await openDatabase();

  const rows = await db.getAllAsync<{ music_id: number }>(
    `
    SELECT music_id
    FROM music_setlists
    WHERE setlist_id = ?
    ORDER BY position ASC, music_id ASC
    `,
    [setlistId]
  );

  return rows.map(r => r.music_id);
};

export const createSetlist = async (
  name: string,
  description: string = ""
): Promise<number> => {
  const db = await openDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
    INSERT INTO setlists (name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    `,
    [name.trim(), description.trim(), now, now]
  );

  return result.lastInsertRowId;
};

export async function updateSetlist(
  id: number,
  name: string,
  description?: string
) {
  const db = await openDatabase();
  await db.runAsync(
    `
    UPDATE setlists
    SET name = ?, description = ?, updated_at = datetime('now')
    WHERE id = ?
    `,
    [name, description ?? null, id]
  );
}

export const deleteSetlist = async (id: number) => {
  const db = await openDatabase();
  await db.runAsync(
    `
    DELETE FROM setlists
    WHERE id = ?
    `,
    [id]
  );
}

export const getSetlistSummaries = async () => {
  const db = await openDatabase();

  return db.getAllAsync<{
    id: number;
    name: string;
    description?: string;
    item_count: number;
  }>(`
    SELECT
      s.id,
      s.name,
      s.description,
      COUNT(ms.music_id) AS item_count
    FROM setlists s
    LEFT JOIN music_setlists ms ON s.id = ms.setlist_id
    GROUP BY s.id, s.name, s.description
    ORDER BY s.name ASC
  `);
};

export const getSetlistById = async (id: number) => {
  const db = await openDatabase();

  const result = await db.getFirstAsync<{
    id: number;
    name: string;
    description: string | null;
    created_at: string;
  }>(
    `
    SELECT
      id,
      name,
      description,
      created_at
    FROM setlists
    WHERE id = ?
    `,
    [id]
  );

  return result ?? null;
};

export const addMusicToSetlistById = async (
  musicId: number,
  setlistId: number
) => {
  const db = await openDatabase();

  const position = await getNextSetlistPosition(db, setlistId);

  await db.runAsync(
    `
    INSERT OR IGNORE INTO music_setlists (
      music_id,
      setlist_id,
      position
    )
    VALUES (?, ?, ?)
    `,
    [musicId, setlistId, position]
  );
};

export const removeMusicFromSetlistById = async (
  musicId: number,
  setlistId: number
): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    DELETE FROM music_setlists
    WHERE music_id = ?
      AND setlist_id = ?
    `,
    [musicId, setlistId]
  );
};

export const saveSetlistProgress = async (
  setlistId: number,
  musicId: number,
  currentPage: number
): Promise<void> => {
  const db = await openDatabase();

  const safePage = Math.max(1, currentPage);

  await db.runAsync(
    `
    INSERT INTO setlist_progress (
      setlist_id,
      music_id,
      page_number,
      updated_at
    )
    VALUES (?, ?, ?, ?)

    ON CONFLICT(setlist_id)
    DO UPDATE SET
      music_id = excluded.music_id,
      page_number = excluded.page_number,
      updated_at = excluded.updated_at
    `,
    [setlistId, musicId, safePage, new Date().toISOString()]
  );
};

export const getSetlistProgress = async (
  setlistId: number
): Promise<{
  setlist_id: number;
  music_id: number;
  page_number: number;
  updated_at: string;
} | null> => {
  const db = await openDatabase();

  const row = await db.getFirstAsync<{
    setlist_id: number;
    music_id: number;
    page_number: number;
    updated_at: string;
  }>(
    `
    SELECT setlist_id, music_id, page_number, updated_at
    FROM setlist_progress
    WHERE setlist_id = ?
    `,
    [setlistId]
  );

  return row ?? null;
};

export const updateSetlistOrder = async (
  setlistId: number,
  musicIds: number[]
): Promise<void> => {
  const db = await openDatabase();

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < musicIds.length; i++) {
      await db.runAsync(
        `
        UPDATE music_setlists
        SET position = ?, updated_at = datetime('now')
        WHERE setlist_id = ? AND music_id = ?
        `,
        [i + 1, setlistId, musicIds[i]]
      );
    }
  });
};

// BOOKMARK HELPERS

export const addBookmark = async (
    musicId: number,
    pageNumber: number,
    label?: string
): Promise<void> => {
    const db = await openDatabase();

    try {
        await db.runAsync(
            `
            INSERT INTO music_bookmarks (music_id, page_number, label, created_at)
            VALUES (?, ?, ?, ?)
            `,
            [musicId, pageNumber, label || null, new Date().toISOString()]
        );
    } catch (error) {
        console.error("Error adding bookmark:", error);
        throw error;
    }
}

export async function removeBookmark(bookmarkId: number) {
  const db = await openDatabase();

  await db.runAsync(
    `DELETE FROM music_bookmarks WHERE id = ?`,
    [bookmarkId]
  );
}

export const getBookmarksForScore = async (musicId: number): Promise<Array<{ id: number, page_number: number, label?: string }>> => {
    const db = await openDatabase();

    try {
        const bookmarks = await db.getAllAsync<{
            id: number;
            page_number: number;
            label?: string;
        }>(
            `
            SELECT id, page_number, label
            FROM music_bookmarks
            WHERE music_id = ?
            ORDER BY created_at DESC
            `,
            [musicId]
        );

        return bookmarks;
    } catch (error) {
        console.error("Error getting bookmarks for music:", error);
        throw error;
    }
};

export const isBookmarked = async (musicId: number, pageNumber: number): Promise<boolean> => {
    const db = await openDatabase();

    try {
        const bookmark = await db.getFirstAsync<{ id: number }>(
            `
            SELECT id
            FROM music_bookmarks
            WHERE music_id = ? AND page_number = ?
            `,
            [musicId, pageNumber]
        );

        return !!bookmark;
    } catch (error) {
        console.error("Error checking if music is bookmarked:", error);
        throw error;
    }
};
