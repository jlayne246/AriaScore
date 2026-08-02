import * as Application from "expo-application";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { zip } from "react-native-zip-archive";

import { BackupError } from "./backup.errors";
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
import { mapScoreToPortable } from "./backups.helpers";

interface CopyScoresResult {
  portableScores: PortableBackupScore[];
  fileIssues: BackupFileIssue[];
  includedPdfCount: number;
}

export class BackupExportService {
  constructor(
    private readonly repository: BackupRepository
  ) {}

  public async createBackup(): Promise<CreatedBackup> {
    const createdAt = new Date().toISOString();
    const cacheDirectory = requireCacheDirectory();

    const operationId =
      `${Date.now()}-${Math.random()
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

    const fileName = createBackupFileName(createdAt);

    /*
     * Create an actual ZIP first. After ZIP creation, rename it to
     * the custom .ariascore extension.
     */
    const temporaryZipUri = joinUri(
      cacheDirectory,
      `ariascore-backup-${operationId}.zip`
    );

    const archiveUri = joinUri(
      cacheDirectory,
      fileName
    );

    try {
      await ensureEmptyDirectory(workDirectoryUri);
      await ensureDirectory(scoresDirectoryUri);

      console.log("[Backup] Reading database snapshot");

      const snapshot =
        await this.repository.createSnapshot();

      console.log(
        `[Backup] Copying ${snapshot.scores.length} score PDFs`
      );

      const copiedScores = await this.copyScores(
        snapshot.scores,
        scoresDirectoryUri
      );

      const library: AriaScoreLibraryBackup = {
        scores: copiedScores.portableScores,

        setlists: snapshot.setlists,
        setlistItems: snapshot.setlistItems,
        setlistProgress: snapshot.setlistProgress,

        bookmarks: snapshot.bookmarks,

        labels: snapshot.labels,
        musicLabels: snapshot.musicLabels,

        readerSettings: snapshot.readerSettings,
        musicSettings: snapshot.musicSettings,
        setlistSettings: snapshot.setlistSettings,
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

          setlistCount:
            library.setlists.length,

          setlistItemCount:
            library.setlistItems.length,

          setlistProgressCount:
            library.setlistProgress.length,

          bookmarkCount:
            library.bookmarks.length,

          labelCount:
            library.labels.length,

          musicLabelCount:
            library.musicLabels.length,

          readerSettingCount:
            library.readerSettings.length,

          musicSettingCount:
            library.musicSettings.length,

          setlistSettingCount:
            library.setlistSettings.length,

          includedPdfCount:
            copiedScores.includedPdfCount,

          omittedPdfCount:
            copiedScores.fileIssues.length,
        },

        fileIssues: copiedScores.fileIssues,

        complete:
          copiedScores.fileIssues.length === 0,
      };

      console.log("[Backup] Writing library.json");

      await writeJson(
        joinUri(workDirectoryUri, "library.json"),
        library
      );

      console.log("[Backup] Writing manifest.json");

      await writeJson(
        joinUri(workDirectoryUri, "manifest.json"),
        manifest
      );

      await FileSystem.deleteAsync(
        temporaryZipUri,
        {
          idempotent: true,
        }
      );

      await FileSystem.deleteAsync(
        archiveUri,
        {
          idempotent: true,
        }
      );

      console.log("[Backup] Creating ZIP archive");

      const generatedPath = await zip(
        toNativePath(workDirectoryUri),
        toNativePath(temporaryZipUri)
      );

      const generatedZipUri =
        generatedPath.startsWith("file://")
          ? generatedPath
          : `file://${generatedPath}`;

      const zipInfo =
        await FileSystem.getInfoAsync(
          generatedZipUri
        );

      if (!zipInfo.exists) {
        throw new BackupError(
          "The backup ZIP archive was not created."
        );
      }

      /*
       * Rename the generated ZIP to the custom .ariascore extension.
       */
      await FileSystem.moveAsync({
        from: generatedZipUri,
        to: archiveUri,
      });

      const archiveInfo =
        await FileSystem.getInfoAsync(
          archiveUri
        );

      if (!archiveInfo.exists) {
        throw new BackupError(
          "The backup archive could not be finalised."
        );
      }

      console.log(
        `[Backup] Archive created: ${archiveUri}`
      );

      return {
        uri: archiveUri,
        fileName,
        manifest,
      };
    } catch (error) {
      console.error(
        "[Backup] Export failed:",
        error
      );

      if (error instanceof BackupError) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      throw new BackupError(
        `AriaScore could not create the backup archive. ${message}`,
        error
      );
    } finally {
      await FileSystem.deleteAsync(
        workDirectoryUri,
        {
          idempotent: true,
        }
      ).catch((cleanupError) => {
        console.warn(
          "Could not remove temporary backup directory:",
          cleanupError
        );
      });

      /*
       * Usually this path has already been moved. This only cleans it
       * up if ZIP creation succeeded but a later operation failed.
       */
      await FileSystem.deleteAsync(
        temporaryZipUri,
        {
          idempotent: true,
        }
      ).catch((cleanupError) => {
        console.warn(
          "Could not remove temporary ZIP:",
          cleanupError
        );
      });
    }
  }

  public async createAndShareBackup():
    Promise<CreatedBackup> {
    const backup = await this.createBackup();

    const sharingAvailable =
      await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      throw new BackupError(
        "The backup was created, but file sharing is unavailable on this device."
      );
    }

    try {
      await Sharing.shareAsync(backup.uri, {
        dialogTitle:
          "Export AriaScore backup",

        /*
         * The contents are still ZIP data despite the custom extension.
         */
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
    const portableScores:
      PortableBackupScore[] = [];

    const fileIssues:
      BackupFileIssue[] = [];

    let includedPdfCount = 0;

    for (const score of scores) {
      const storedFileName =
        createStoredPdfFileName(score.id);

      if (
        typeof score.sourceUri !== "string" ||
        score.sourceUri.trim().length === 0
      ) {
        fileIssues.push({
          scoreId: score.id,
          title: score.title,
          sourceUri: "",
          reason: "missing",
          message:
            "The score does not have a stored PDF URI.",
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

      try {
        const sourceInfo =
          await FileSystem.getInfoAsync(
            score.sourceUri
          );

        if (!sourceInfo.exists) {
          fileIssues.push({
            scoreId: score.id,
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

        const copiedInfo =
          await FileSystem.getInfoAsync(
            destinationUri
          );

        if (!copiedInfo.exists) {
          throw new Error(
            "The copied PDF could not be verified."
          );
        }

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
          scoreId: score.id,
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

  private validateRelations(
    library: AriaScoreLibraryBackup
  ): void {
    const musicIds = new Set(
      library.scores.map(
        (score) => score.id
      )
    );

    const setlistIds = new Set(
      library.setlists.map(
        (setlist) => setlist.id
      )
    );

    const labelIds = new Set(
      library.labels.map(
        (label) => label.id
      )
    );

    for (const item of library.setlistItems) {
      if (!musicIds.has(item.musicId)) {
        throw new BackupError(
          `A setlist item refers to missing music record ${item.musicId}.`
        );
      }

      if (!setlistIds.has(item.setlistId)) {
        throw new BackupError(
          `A setlist item refers to missing setlist ${item.setlistId}.`
        );
      }
    }

    for (
      const progress of
      library.setlistProgress
    ) {
      if (
        !setlistIds.has(progress.setlistId)
      ) {
        throw new BackupError(
          `Setlist progress refers to missing setlist ${progress.setlistId}.`
        );
      }

      if (!musicIds.has(progress.musicId)) {
        throw new BackupError(
          `Setlist progress refers to missing music record ${progress.musicId}.`
        );
      }
    }

    for (const bookmark of library.bookmarks) {
      if (!musicIds.has(bookmark.musicId)) {
        throw new BackupError(
          `Bookmark ${bookmark.id} refers to missing music record ${bookmark.musicId}.`
        );
      }
    }

    for (
      const relation of
      library.musicLabels
    ) {
      if (!musicIds.has(relation.musicId)) {
        throw new BackupError(
          `A label assignment refers to missing music record ${relation.musicId}.`
        );
      }

      if (!labelIds.has(relation.labelId)) {
        throw new BackupError(
          `A label assignment refers to missing label ${relation.labelId}.`
        );
      }
    }

    for (
      const setting of
      library.musicSettings
    ) {
      if (!musicIds.has(setting.musicId)) {
        throw new BackupError(
          `A music setting refers to missing music record ${setting.musicId}.`
        );
      }
    }

    for (
      const setting of
      library.setlistSettings
    ) {
      if (
        !setlistIds.has(setting.setlistId)
      ) {
        throw new BackupError(
          `A setlist setting refers to missing setlist ${setting.setlistId}.`
        );
      }
    }
  }
}

