import type {
  BackupSourceScore,
  PortableBackupScore,
} from "./backup.types";

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
  const permissionResult =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissionResult.granted) {
    return {
      status: "cancelled",
    };
  }

  const filename =
    getFilenameFromUri(archiveUri);

  const archiveInfo =
    await FileSystem.getInfoAsync(
      archiveUri
    );

  const MAX_DIRECT_EXPORT_BYTES =
    100 * 1024 * 1024;

  if (
    archiveInfo.exists &&
    typeof archiveInfo.size === "number" &&
    archiveInfo.size >
      MAX_DIRECT_EXPORT_BYTES
  ) {
    throw new Error(
      "This backup is too large for direct folder export. " +
        "Use Share Backup and save it through the system file picker instead."
    );
  }

  const archiveBase64 =
    await FileSystem.readAsStringAsync(
      archiveUri,
      {
        encoding:
          FileSystem.EncodingType.Base64,
      }
    );

  const destinationUri =
    await FileSystem.StorageAccessFramework.createFileAsync(
      permissionResult.directoryUri,
      filename,
      BACKUP_MIME_TYPE
    );

  await FileSystem.writeAsStringAsync(destinationUri, archiveBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

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