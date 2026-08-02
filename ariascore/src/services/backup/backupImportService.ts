import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { unzip } from "react-native-zip-archive";

import { BackupError } from "./backup.errors";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type AriaScoreBackupManifest,
  type AriaScoreLibraryBackup,
  type PortableBackupScore,
  type RestoredScoreFile,
  type RestoreBackupOptions,
  type RestoreBackupResult,
  type RestoreBackupWarning,
} from "./backup.types";
import { BackupRepository } from "./backup.repository";
import {
  ensureDirectory,
  joinUri,
  requireCacheDirectory,
  toNativePath,
} from "./backup.files";

export class BackupImportService {
  constructor(
    private readonly repository: BackupRepository
  ) {}

  public async pickAndRestoreBackup(
    options: RestoreBackupOptions = {
      mode: "replace",
    }
  ): Promise<RestoreBackupResult | null> {
    const result =
      await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });

    if (result.canceled) {
      return null;
    }

    const selectedFile = result.assets[0];

    if (!selectedFile) {
      throw new BackupError(
        "No backup file was selected."
      );
    }

    const lowerName =
        selectedFile.name.toLowerCase();

    const hasExpectedExtension =
        lowerName.endsWith(".ariascore") ||
        lowerName.endsWith(".ariascore.zip") ||
        lowerName.endsWith(".zip");

    if (!hasExpectedExtension) {
        console.warn(
            `[Backup] Selected file has an unexpected extension: ${selectedFile.name}`
        );
    }

    return this.restoreBackup(
      selectedFile.uri,
      options
    );
  }

  public async restoreBackup(
    archiveUri: string,
    options: RestoreBackupOptions
  ): Promise<RestoreBackupResult> {
    const cacheDirectory = requireCacheDirectory();

    const operationId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    const extractionDirectoryUri = joinUri(
      cacheDirectory,
      `ariascore-restore-${operationId}`
    );

    try {
      await ensureDirectory(
        extractionDirectoryUri
      );

      await unzip(
        toNativePath(archiveUri),
        toNativePath(extractionDirectoryUri)
      );

      const manifestUri = joinUri(
        extractionDirectoryUri,
        "manifest.json"
      );

      const manifest =
        await this.readJsonFile<AriaScoreBackupManifest>(
          manifestUri
        );

      this.validateManifest(manifest);

      const libraryUri = joinUri(
        extractionDirectoryUri,
        manifest.contents.libraryFile
      );

      const library =
        await this.readJsonFile<AriaScoreLibraryBackup>(
          libraryUri
        );

      this.validateLibrary(library);

      const restoredFiles =
        await this.restoreScoreFiles(
          library.scores,
          extractionDirectoryUri,
          manifest
        );

      return await this.repository.restoreLibrary({
        library,
        restoredFiles,
        mode: options.mode,
      });
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }

      throw new BackupError(
        "AriaScore could not restore the selected backup.",
        error
      );
    } finally {
      await FileSystem.deleteAsync(
        extractionDirectoryUri,
        {
          idempotent: true,
        }
      ).catch((error) => {
        console.warn(
          "[Backup] Could not remove restore workspace:",
          error
        );
      });
    }
  }

  private async readJsonFile<T>(
    uri: string
  ): Promise<T> {
    const info =
      await FileSystem.getInfoAsync(uri);

    if (!info.exists) {
      throw new BackupError(
        `The backup is missing ${this.getFilename(uri)}.`
      );
    }

    const content =
      await FileSystem.readAsStringAsync(
        uri,
        {
          encoding:
            FileSystem.EncodingType.UTF8,
        }
      );

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new BackupError(
        `${this.getFilename(uri)} contains invalid JSON.`,
        error
      );
    }
  }

  private validateManifest(
    manifest: AriaScoreBackupManifest
  ): void {
    if (manifest.format !== BACKUP_FORMAT) {
      throw new BackupError(
        "The selected archive is not an AriaScore backup."
      );
    }

    if (
      manifest.formatVersion >
      BACKUP_FORMAT_VERSION
    ) {
      throw new BackupError(
        "This backup was created by a newer version of AriaScore."
      );
    }

    if (
      manifest.formatVersion < 1
    ) {
      throw new BackupError(
        "The backup format version is invalid."
      );
    }

    if (
      !manifest.contents?.libraryFile ||
      !manifest.contents?.scoresDirectory
    ) {
      throw new BackupError(
        "The backup manifest does not describe its contents correctly."
      );
    }
  }

  private validateLibrary(
    library: AriaScoreLibraryBackup
  ): void {
    const requiredCollections: Array<
      keyof AriaScoreLibraryBackup
    > = [
      "scores",
      "setlists",
      "setlistItems",
      "setlistProgress",
      "bookmarks",
      "labels",
      "musicLabels",
      "readerSettings",
      "musicSettings",
      "setlistSettings",
    ];

    for (const key of requiredCollections) {
      if (!Array.isArray(library[key])) {
        throw new BackupError(
          `The backup contains an invalid ${key} collection.`
        );
      }
    }

    this.validateRelations(library);
  }

  private async restoreScoreFiles(
    scores: PortableBackupScore[],
    extractionDirectoryUri: string,
    manifest: AriaScoreBackupManifest
  ): Promise<{
    files: RestoredScoreFile[];
    warnings: RestoreBackupWarning[];
  }> {
    if (!FileSystem.documentDirectory) {
      throw new BackupError(
        "Application document storage is unavailable."
      );
    }

    const destinationScoresDirectory =
      joinUri(
        FileSystem.documentDirectory,
        "scores"
      );

    await ensureDirectory(
      destinationScoresDirectory
    );

    const extractedScoresDirectory =
      joinUri(
        extractionDirectoryUri,
        manifest.contents.scoresDirectory
      );

    const files: RestoredScoreFile[] = [];
    const warnings: RestoreBackupWarning[] =
      [];

    for (const score of scores) {
      if (
        !score.fileIncluded ||
        !score.storedFileName
      ) {
        warnings.push({
          reason: "pdf-not-included",
          musicId: score.id,
          message:
            `The PDF for "${score.title}" was not included in the backup.`,
        });

        continue;
      }

      const sourceUri = joinUri(
        extractedScoresDirectory,
        score.storedFileName
      );

      const sourceInfo =
        await FileSystem.getInfoAsync(
          sourceUri
        );

      if (!sourceInfo.exists) {
        warnings.push({
          reason:
            "pdf-missing-from-archive",
          musicId: score.id,
          message:
            `The backup archive is missing the PDF for "${score.title}".`,
        });

        continue;
      }

      /*
       * Generate a fresh filename so existing managed files are not
       * accidentally overwritten.
       */
      const destinationFileName =
        `${Date.now()}-${score.id}-${Math.random()
          .toString(36)
          .slice(2, 10)}.pdf`;

      const destinationUri = joinUri(
        destinationScoresDirectory,
        destinationFileName
      );

      try {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationUri,
        });

        const copiedInfo =
          await FileSystem.getInfoAsync(
            destinationUri
          );

        if (!copiedInfo.exists) {
          throw new Error(
            "The copied file could not be verified."
          );
        }

        files.push({
          musicId: score.id,
          localUri: destinationUri,
        });
      } catch (error) {
        warnings.push({
          reason: "pdf-copy-failed",
          musicId: score.id,
          message:
            error instanceof Error
              ? error.message
              : `The PDF for "${score.title}" could not be restored.`,
        });
      }
    }

    return {
      files,
      warnings,
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

    for (const bookmark of library.bookmarks) {
      if (!musicIds.has(bookmark.musicId)) {
        throw new BackupError(
          `Bookmark ${bookmark.id} refers to missing music record ${bookmark.musicId}.`
        );
      }
    }

    for (
      const progress of
      library.setlistProgress
    ) {
      if (
        !musicIds.has(progress.musicId) ||
        !setlistIds.has(progress.setlistId)
      ) {
        throw new BackupError(
          "The backup contains invalid setlist progress data."
        );
      }
    }

    for (
      const relation of
      library.musicLabels
    ) {
      if (
        !musicIds.has(relation.musicId) ||
        !labelIds.has(relation.labelId)
      ) {
        throw new BackupError(
          "The backup contains an invalid label assignment."
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

  private getFilename(uri: string): string {
    return (
      uri.split("/").pop() ??
      "backup file"
    );
  }
}