import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { BackupError } from './backup.errors';
import { BackupRepository } from './backup.repository';
import {
  AriaScoreBackupManifest,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
} from './backup.types';

const BACKUP_MIME_TYPE = 'application/json';

export interface BackupExportResult {
  uri: string;
  fileName: string;
  manifest: AriaScoreBackupManifest;
}

export class BackupService {
  constructor(private readonly repository: BackupRepository) {}

  public async createManifest(): Promise<AriaScoreBackupManifest> {
    try {
      const snapshot = await this.repository.createSnapshot();

      const manifest: AriaScoreBackupManifest = {
        format: BACKUP_FORMAT,
        formatVersion: BACKUP_FORMAT_VERSION,
        databaseSchemaVersion: snapshot.databaseSchemaVersion,

        application: {
          name: 'AriaScore',
          version: Application.nativeApplicationVersion ?? 'development',
          buildVersion: Application.nativeBuildVersion,
        },

        createdAt: new Date().toISOString(),

        data: {
          scores: snapshot.scores,
          setlists: snapshot.setlists,
          setlistItems: snapshot.setlistItems,
          bookmarks: snapshot.bookmarks,
        },

        statistics: {
          scoreCount: snapshot.scores.length,
          setlistCount: snapshot.setlists.length,
          setlistItemCount: snapshot.setlistItems.length,
          bookmarkCount: snapshot.bookmarks.length,
        },
      };

      this.assertManifestIsValid(manifest);

      return manifest;
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }

      throw new BackupError('Could not create the AriaScore backup.', error);
    }
  }

  public async createJsonExport(): Promise<BackupExportResult> {
    const manifest = await this.createManifest();

    if (!FileSystem.cacheDirectory) {
      throw new BackupError(
        'The application cache directory is unavailable.'
      );
    }

    const fileName = this.createBackupFileName(manifest.createdAt);
    const uri = `${FileSystem.cacheDirectory}${fileName}`;

    try {
      await FileSystem.writeAsStringAsync(
        uri,
        JSON.stringify(manifest, null, 2),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );

      return {
        uri,
        fileName,
        manifest,
      };
    } catch (error) {
      throw new BackupError(
        'The backup was created but could not be written to storage.',
        error
      );
    }
  }

  public async createAndShareJsonExport(): Promise<BackupExportResult> {
    const exportResult = await this.createJsonExport();

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      throw new BackupError(
        'File sharing is not available on this device.'
      );
    }

    try {
      await Sharing.shareAsync(exportResult.uri, {
        mimeType: BACKUP_MIME_TYPE,
        dialogTitle: 'Export AriaScore backup',
        UTI: 'public.json',
      });

      return exportResult;
    } catch (error) {
      throw new BackupError(
        'The backup was created but could not be shared.',
        error
      );
    }
  }

  private createBackupFileName(createdAt: string): string {
    const safeTimestamp = createdAt
      .replaceAll(':', '-')
      .replace(/\.\d{3}Z$/, 'Z');

    return `AriaScore-Backup-${safeTimestamp}.ariascore.json`;
  }

  private assertManifestIsValid(
    manifest: AriaScoreBackupManifest
  ): void {
    if (manifest.format !== BACKUP_FORMAT) {
      throw new BackupError('The backup format identifier is invalid.');
    }

    if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new BackupError('The backup format version is invalid.');
    }

    const scoreIds = new Set(
      manifest.data.scores.map((score) => score.id)
    );

    for (const item of manifest.data.setlistItems) {
      if (!scoreIds.has(item.scoreId)) {
        throw new BackupError(
          `Setlist item ${item.id} references missing score ${item.scoreId}.`
        );
      }
    }

    for (const bookmark of manifest.data.bookmarks) {
      if (!scoreIds.has(bookmark.scoreId)) {
        throw new BackupError(
          `Bookmark ${bookmark.id} references missing score ${bookmark.scoreId}.`
        );
      }
    }
  }
}