import type {
  BackupSourceScore,
  PortableBackupScore,
} from "./backup.types";

import {
  copyFileToContentUri,
} from "../../../native/AriaScoreFileExporter";

export function mapScoreToPortable(
  score: BackupSourceScore,
  storedFileName: string | null,
  fileIncluded: boolean
): PortableBackupScore {
  return {
    id: score.id,
    title: score.title,
    originalFilename: score.originalFilename,

    documentType: score.documentType,
    composer: score.composer,
    arranger: score.arranger,
    editor: score.editor,
    publisher: score.publisher,
    genre: score.genre,
    keySignature: score.keySignature,
    timeSignature: score.timeSignature,
    pageCount: score.pageCount,

    storedFileName,
    fileIncluded,

    createdAt: score.createdAt,
    updatedAt: score.updatedAt,
    lastOpenedAt: score.lastOpenedAt,
  };
}

// backupFileExporter.ts

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const BACKUP_MIME_TYPE = "application/zip";

export type BackupExportResult =
  | {
      status: "saved";
      uri: string;
    }
  | {
      status: "cancelled";
    }
  | {
      status: "shared";
    };

function getFilenameFromUri(uri: string): string {
  const filename = uri.split("/").pop();

  if (!filename) {
    throw new Error("Could not determine the backup filename.");
  }

  return decodeURIComponent(filename);
}

/**
 * Saves an existing .ariascore archive outside the app.
 *
 * Android:
 * Opens a directory picker and writes the file into the selected folder.
 *
 * iOS:
 * Opens the system share sheet, where the user can select "Save to Files".
 */
export async function exportBackupFile(
  archiveUri: string
): Promise<BackupExportResult> {
  if (Platform.OS === "android") {
    return saveBackupWithStorageAccessFramework(archiveUri);
  }

  return shareBackupFile(archiveUri);
}

async function saveBackupWithStorageAccessFramework(
  archiveUri: string
): Promise<BackupExportResult> {
  const archiveInfo =
    await FileSystem.getInfoAsync(
      archiveUri
    );

  if (!archiveInfo.exists) {
    throw new Error(
      "The generated backup file could not be found."
    );
  }

  const permissionResult =
    await FileSystem
      .StorageAccessFramework
      .requestDirectoryPermissionsAsync();

  if (!permissionResult.granted) {
    return {
      status: "cancelled",
    };
  }

  const filename =
    getFilenameFromUri(archiveUri);

  const destinationUri =
    await FileSystem
      .StorageAccessFramework
      .createFileAsync(
        permissionResult.directoryUri,
        filename,
        BACKUP_MIME_TYPE
      );

  try {
    await copyFileToContentUri(
      archiveUri,
      destinationUri
    );
  } catch (error) {
    /*
     * Avoid leaving an empty or partially written
     * document if streaming fails.
     */
    await FileSystem.deleteAsync(
      destinationUri,
      {
        idempotent: true,
      }
    ).catch((cleanupError) => {
      console.warn(
        "[Backup] Could not remove incomplete exported backup:",
        cleanupError
      );
    });

    throw error;
  }

  return {
    status: "saved",
    uri: destinationUri,
  };
}

export async function shareBackupFile(
  archiveUri: string
): Promise<BackupExportResult> {
  const available = await Sharing.isAvailableAsync();

  if (!available) {
    throw new Error("File sharing is not available on this device.");
  }

  await Sharing.shareAsync(archiveUri, {
    dialogTitle: "Share AriaScore backup",
    mimeType: BACKUP_MIME_TYPE,
    UTI: "public.zip-archive",
  });

  return {
    status: "shared",
  };
}

