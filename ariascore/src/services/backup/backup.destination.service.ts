import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  exportFile,
} from "../../../native/AriaScoreFileExporter";

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

function getFilenameFromUri(
  uri: string
): string {
  const filename =
    uri.split("/").pop();

  if (!filename) {
    throw new Error(
      "Could not determine the backup filename."
    );
  }

  return decodeURIComponent(filename);
}

export async function exportBackupFile(
  archiveUri: string
): Promise<BackupExportResult> {
  if (Platform.OS === "android") {
    return saveBackupWithStorageAccessFramework(
      archiveUri
    );
  }

  return shareBackupFile(
    archiveUri
  );
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
    getFilenameFromUri(
      archiveUri
    );

  const destinationUri =
    await FileSystem
      .StorageAccessFramework
      .createFileAsync(
        permissionResult.directoryUri,
        filename,
        BACKUP_MIME_TYPE
      );

  try {
    await exportFile(
      archiveUri,
      destinationUri
    );
  } catch (error) {
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
  const available =
    await Sharing.isAvailableAsync();

  if (!available) {
    throw new Error(
      "File sharing is not available on this device."
    );
  }

  await Sharing.shareAsync(
    archiveUri,
    {
      dialogTitle:
        "Share AriaScore backup",
      mimeType:
        BACKUP_MIME_TYPE,
      UTI:
        "public.zip-archive",
    }
  );

  return {
    status: "shared",
  };
}