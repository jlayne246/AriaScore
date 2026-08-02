import * as FileSystem from "expo-file-system";

import { BackupError } from "./backup.errors";

export function requireCacheDirectory(): string {
  if (!FileSystem.cacheDirectory) {
    throw new BackupError(
      "The application cache directory is unavailable."
    );
  }

  return FileSystem.cacheDirectory;
}

export function joinUri(base: string, child: string): string {
  const normalisedBase = base.endsWith("/") ? base : `${base}/`;
  const normalisedChild = child.replace(/^\/+/, "");

  return `${normalisedBase}${normalisedChild}`;
}

/**
 * react-native-zip-archive generally expects a native filesystem path.
 * Expo filesystem functions generally work with file:// URIs.
 */
export function toNativePath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

export async function ensureEmptyDirectory(
  uri: string
): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);

  if (info.exists) {
    await FileSystem.deleteAsync(uri, {
      idempotent: true,
    });
  }

  await FileSystem.makeDirectoryAsync(uri, {
    intermediates: true,
  });
}

export async function ensureDirectory(
  uri: string
): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, {
      intermediates: true,
    });
  }
}

export async function writeJson(
  uri: string,
  value: unknown
): Promise<void> {
  await FileSystem.writeAsStringAsync(
    uri,
    JSON.stringify(value, null, 2),
    {
      encoding: FileSystem.EncodingType.UTF8,
    }
  );
}