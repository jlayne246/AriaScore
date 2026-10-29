
import * as SQLite from "expo-sqlite";

import type {
  StrokeAnnotation,
} from "./types";

const DATABASE_NAME = "ariascore-annotations.db";

type AnnotationRow = {
  annotations_json: string;
};

let databasePromise:
  Promise<SQLite.SQLiteDatabase> | null = null;

// Serializes writes so an older save cannot overwrite
// a newer one when drawing quickly.
const pendingWrites = new Map<
  number,
  Promise<void>
>();

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(
        DATABASE_NAME
      );

      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS document_annotations (
          music_id INTEGER PRIMARY KEY NOT NULL,
          annotations_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      return db;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

export async function loadAnnotations(
  musicId: number
): Promise<StrokeAnnotation[]> {
  // Wait for any outstanding write for this score.
  await pendingWrites.get(musicId);

  const db = await getDatabase();

  const row = await db.getFirstAsync<AnnotationRow>(
    `
      SELECT annotations_json
      FROM document_annotations
      WHERE music_id = ?
    `,
    [musicId]
  );

  if (!row) {
    return [];
  }

  const parsed: unknown = JSON.parse(
    row.annotations_json
  );

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Stored annotations have an invalid format."
    );
  }

  return parsed as StrokeAnnotation[];
}

export function saveAnnotations(
  musicId: number,
  annotations: StrokeAnnotation[]
): Promise<void> {
  // Capture a snapshot, not the mutable state object.
  const json = JSON.stringify(annotations);

  const previous =
    pendingWrites.get(musicId) ??
    Promise.resolve();

  const write = previous
    .catch(() => {
      // Continue the queue even if an earlier write failed.
    })
    .then(async () => {
      const db = await getDatabase();

      await db.runAsync(
        `
          INSERT INTO document_annotations (
            music_id,
            annotations_json,
            updated_at
          )
          VALUES (?, ?, ?)
          ON CONFLICT(music_id)
          DO UPDATE SET
            annotations_json = excluded.annotations_json,
            updated_at = excluded.updated_at
        `,
        [musicId, json, Date.now()]
      );
    });

  pendingWrites.set(musicId, write);

  void write.finally(() => {
    if (pendingWrites.get(musicId) === write) {
      pendingWrites.delete(musicId);
    }
  }).catch(() => {
    // The original promise is still returned to the caller.
  });

  return write;
}
