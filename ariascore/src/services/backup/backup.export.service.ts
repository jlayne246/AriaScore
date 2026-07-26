import * as Application from "expo-application";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { zip } from "react-native-zip-archive";

import { BackupError, BackupFileResolutionError } from "./backup.errors";
import {
  ensureDirectory,
  ensureEmptyDirectory,
  joinUri,
  requireCacheDirectory,
  toNativePath,
  writeJson,
} from "./backup.files";
import {
  createBackupFileName,
  createStoredPdfFileName,
} from "./backup.naming";
import { BackupRepository } from "./backup.repository";
import {
  AriaScoreBackupManifest,
  AriaScoreLibraryBackup,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BackupFileIssue,
  BackupSourceScore,
  CreatedBackup,
  PortableBackupScore,
} from "./backup.types";
import { resolveBackupFileUri } from "./backup.fileResolver";
import { mapScoreToPortable } from "./backups.helpers";

interface CopyScoresResult {
  portableScores: PortableBackupScore[];
  fileIssues: BackupFileIssue[];
  includedPdfCount: number;
}

export class BackupExportService {
  constructor(private readonly repository: BackupRepository) {}

  public async createBackup(): Promise<CreatedBackup> {
    const createdAt = new Date().toISOString();
    const cacheDirectory = requireCacheDirectory();

    const operationId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const workDirectoryUri = joinUri(
      cacheDirectory,
      `ariascore-backup-${operationId}`
    );

    const scoresDirectoryUri = joinUri(
      workDirectoryUri,
      "scores"
    );

    // const resolutionDirectoryUri = joinUri(
    //     workDirectoryUri,
    //     "_resolved"
    // );

    const fileName = createBackupFileName(createdAt);
    const archiveUri = joinUri(cacheDirectory, fileName);

    try {
      await ensureEmptyDirectory(workDirectoryUri);
      await ensureDirectory(scoresDirectoryUri);
    //   await ensureDirectory(resolutionDirectoryUri);

      const snapshot = await this.repository.createSnapshot();

      const copiedScores = await this.copyScores(
        snapshot.scores,
        scoresDirectoryUri
      );

      const library: AriaScoreLibraryBackup = {
        scores: copiedScores.portableScores,
        setlists: snapshot.setlists,
        setlistItems: snapshot.setlistItems,
        bookmarks: snapshot.bookmarks,
        preferences: snapshot.preferences,
      };

      this.validateRelations(library);

      const manifest: AriaScoreBackupManifest = {
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        databaseSchemaVersion:
          snapshot.databaseSchemaVersion,

        application: {
          name: "AriaScore",
          version:
            Application.nativeApplicationVersion ??
            "development",
          buildVersion:
            Application.nativeBuildVersion,
        },

        createdAt,

        contents: {
          libraryFile: "library.json",
          scoresDirectory: "scores",
        },

        statistics: {
            scoreCount: library.scores.length,
            setlistCount: library.setlists.length,
            setlistItemCount: library.setlistItems.length,
            bookmarkCount: library.bookmarks.length,
            includedPdfCount:
                copiedScores.includedPdfCount,
            omittedPdfCount:
                copiedScores.fileIssues.length,
        },

        fileIssues: copiedScores.fileIssues,

        complete:
            copiedScores.fileIssues.length === 0,
      };

      await writeJson(
        joinUri(workDirectoryUri, "library.json"),
        library
      );

      await writeJson(
        joinUri(workDirectoryUri, "manifest.json"),
        manifest
      );

      /*
       * Remove a previous file with the same name if one somehow exists.
       */
      await FileSystem.deleteAsync(archiveUri, {
        idempotent: true,
      });

      const sourcePath = toNativePath(workDirectoryUri);
      const destinationPath = toNativePath(archiveUri);
      
    //   await FileSystem.deleteAsync(
    //     resolutionDirectoryUri,
    //     {
    //         idempotent: true,
    //     }
    //   );

      const generatedPath = await zip(
        sourcePath,
        destinationPath
      );

      const generatedUri = generatedPath.startsWith("file://")
        ? generatedPath
        : `file://${generatedPath}`;

      const archiveInfo =
        await FileSystem.getInfoAsync(generatedUri);

      if (!archiveInfo.exists) {
        throw new BackupError(
          "The backup archive was not created."
        );
      }

      return {
        uri: generatedUri,
        fileName,
        manifest,
      };
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }

      throw new BackupError(
        "AriaScore could not create the backup archive.",
        error
      );
    } finally {
      /*
       * Delete only the temporary unpacked directory.
       * Keep the generated .ariascore file for sharing.
       */
      await FileSystem.deleteAsync(workDirectoryUri, {
        idempotent: true,
      }).catch((cleanupError) => {
        console.warn(
          "Could not remove temporary backup directory:",
          cleanupError
        );
      });
    }
  }

  public async createAndShareBackup(): Promise<CreatedBackup> {
    const backup = await this.createBackup();

    const sharingAvailable =
      await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      throw new BackupError(
        "File sharing is unavailable on this device."
      );
    }

    try {
      await Sharing.shareAsync(backup.uri, {
        dialogTitle: "Export AriaScore backup",
        mimeType: "application/zip",
        UTI: "public.zip-archive",
      });

      return backup;
    } catch (error) {
      throw new BackupError(
        "The backup was created, but the share sheet could not be opened.",
        error
      );
    }
  }

  private async copyScores(
    scores: BackupSourceScore[],
    destinationDirectoryUri: string
  ): Promise<CopyScoresResult> {
    const portableScores: PortableBackupScore[] = [];
    const fileIssues: BackupFileIssue[] = [];

    let includedPdfCount = 0;

    for (const score of scores) {
        const storedFileName =
        createStoredPdfFileName(score.id);

        try {
        const sourceInfo =
            await FileSystem.getInfoAsync(
            score.sourceUri
            );

        if (!sourceInfo.exists) {
            fileIssues.push({
            scoreId: String(score.id),
            title: score.title,
            sourceUri: score.sourceUri,
            reason: "missing",
            message:
                "The managed PDF could not be found.",
            });

            portableScores.push(
            mapScoreToPortable(
                score,
                null,
                false
            )
            );

            continue;
        }

        const destinationUri = joinUri(
            destinationDirectoryUri,
            storedFileName
        );

        await FileSystem.copyAsync({
            from: score.sourceUri,
            to: destinationUri,
        });

        portableScores.push(
            mapScoreToPortable(
            score,
            storedFileName,
            true
            )
        );

        includedPdfCount += 1;
        } catch (error) {
        fileIssues.push({
            scoreId: String(score.id),
            title: score.title,
            sourceUri: score.sourceUri,
            reason: "copy-failed",
            message:
            error instanceof Error
                ? error.message
                : "The PDF could not be copied.",
        });

        portableScores.push(
            mapScoreToPortable(
            score,
            null,
            false
            )
        );
        }
    }

    return {
        portableScores,
        fileIssues,
        includedPdfCount,
    };
    }

//   private toPortableScore(
//     score: BackupSourceScore,
//     storedFileName: string | null,
//     fileIncluded: boolean
//     ): PortableBackupScore {
//     return {
//         id: score.id,
//         title: score.title,
//         composer: score.composer,
//         storedFileName,
//         fileIncluded,
//         originalFileName: score.originalFileName,
//         createdAt: score.createdAt,
//         updatedAt: score.updatedAt,
//         lastOpenedAt: score.lastOpenedAt,
//     };
//   }

  private validateRelations(
    library: AriaScoreLibraryBackup
  ): void {
    const scoreIds = new Set(
      library.scores.map((score) =>
        String(score.id)
      )
    );

    const setlistIds = new Set(
      library.setlists.map((setlist) =>
        String(setlist.id)
      )
    );

    for (const item of library.setlistItems) {
      if (!scoreIds.has(String(item.scoreId))) {
        throw new BackupError(
          `Setlist item ${item.id} refers to missing score ${item.scoreId}.`
        );
      }

      if (!setlistIds.has(String(item.setlistId))) {
        throw new BackupError(
          `Setlist item ${item.id} refers to missing setlist ${item.setlistId}.`
        );
      }
    }

    for (const bookmark of library.bookmarks) {
      if (!scoreIds.has(String(bookmark.scoreId))) {
        throw new BackupError(
          `Bookmark ${bookmark.id} refers to missing score ${bookmark.scoreId}.`
        );
      }
    }
  }
}