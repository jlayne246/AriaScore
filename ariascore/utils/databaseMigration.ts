import * as FileSystem from "expo-file-system";

const SQLITE_DIRECTORY = `${FileSystem.documentDirectory}SQLite/`;

export const LEGACY_DATABASE_NAME = "airscore.db";
export const DATABASE_NAME = "ariascore.db";

export async function migrateDatabaseIfNeeded(): Promise<void> {
  const oldPath = `${SQLITE_DIRECTORY}${LEGACY_DATABASE_NAME}`;
  const newPath = `${SQLITE_DIRECTORY}${DATABASE_NAME}`;

  const [oldDb, newDb] = await Promise.all([
    FileSystem.getInfoAsync(oldPath),
    FileSystem.getInfoAsync(newPath),
  ]);

  // Fresh install
  if (!oldDb.exists && !newDb.exists) {
    return;
  }

  // Already migrated
  if (!oldDb.exists && newDb.exists) {
    return;
  }

  // Safety check
  if (oldDb.exists && newDb.exists) {
    throw new Error(
      `Both ${LEGACY_DATABASE_NAME} and ${DATABASE_NAME} exist. Migration cannot continue automatically.`
    );
  }

  console.log(
    `[Database] Migrating ${LEGACY_DATABASE_NAME} → ${DATABASE_NAME}`
  );

  await FileSystem.moveAsync({
    from: oldPath,
    to: newPath,
  });

  // Move SQLite sidecar files if present.
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    const oldSidecar = `${oldPath}${suffix}`;
    const newSidecar = `${newPath}${suffix}`;

    const info = await FileSystem.getInfoAsync(oldSidecar);

    if (info.exists) {
      await FileSystem.moveAsync({
        from: oldSidecar,
        to: newSidecar,
      });
    }
  }

  console.log("[Database] Migration complete");
}

