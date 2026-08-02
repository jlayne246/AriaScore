import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BackupSummary } from "./backup.types";

const LAST_BACKUP_KEY =
  "ariascore:backup:last-successful";

export async function getLastBackupSummary():
  Promise<BackupSummary | null> {
  const value =
    await AsyncStorage.getItem(
      LAST_BACKUP_KEY
    );

  if (!value) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(value) as BackupSummary;

    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.scoreCount !== "number" ||
      typeof parsed.setlistCount !== "number" ||
      typeof parsed.bookmarkCount !== "number" ||
      typeof parsed.fileName !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(
      "[Backup] Could not parse last backup summary:",
      error
    );

    return null;
  }
}

export async function saveLastBackupSummary(
  summary: BackupSummary
): Promise<void> {
  await AsyncStorage.setItem(
    LAST_BACKUP_KEY,
    JSON.stringify(summary)
  );
}

export async function clearLastBackupSummary():
  Promise<void> {
  await AsyncStorage.removeItem(
    LAST_BACKUP_KEY
  );
}