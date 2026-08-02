import * as FileSystem from "expo-file-system";
import { BackupFileResolutionError } from "./backup.errors";

export interface ResolvedBackupFile {
  uri: string;
  temporary: boolean;
}

export async function resolveBackupFileUri(
  sourceUri: string,
  temporaryDirectoryUri: string,
  scoreId: string
): Promise<ResolvedBackupFile> {
  if (sourceUri.startsWith("file://")) {
    return {
      uri: sourceUri,
      temporary: false,
    };
  }

  if (sourceUri.startsWith("content://")) {
    const temporaryUri =
      `${temporaryDirectoryUri}/${scoreId}.pdf`;

    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: temporaryUri,
      });

      const info =
        await FileSystem.getInfoAsync(temporaryUri);

      if (!info.exists) {
        throw new Error(
          "The content URI could not be copied."
        );
      }

      return {
        uri: temporaryUri,
        temporary: true,
      };
    } catch (error) {
      throw new BackupFileResolutionError(
        "unreadable",
        "The PDF is referenced through Android document storage, but AriaScore no longer has permission to read it.",
        error
      );
    }
  }

  throw new BackupFileResolutionError(
    "unsupported-uri",
    `Unsupported score URI scheme: ${sourceUri}`
  );
}