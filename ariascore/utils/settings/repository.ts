import { openDatabase } from "../database";
import { ReaderSettings } from "./types";

type SettingRow = {
  key: keyof ReaderSettings;
  value: string;
};

const parseSettingValue = (
  key: keyof ReaderSettings,
  value: string
): ReaderSettings[keyof ReaderSettings] => {
  switch (key) {
    case "keepScreenAwake":
    case "autoHideControls":
    case "tapZones":
    case "swipeNavigation":
    case "pageAnimation":
    case "performanceMode":
    case "facialGestures":
    case "resumeLastPage":
    case "coverOffset":
      return value === "true";

    case "viewMode":
        return value === "double" || value === "twoPage"
            ? "double"
            : "single";

    default:
      return value as never;
  }
};

const rowsToSettings = (
  rows: SettingRow[]
): Partial<ReaderSettings> => {
  const settings: Partial<ReaderSettings> = {};

  for (const row of rows) {
    settings[row.key] = parseSettingValue(row.key, row.value) as any;
  }

  return settings;
};

export const getGlobalReaderSettings =
  async (): Promise<Partial<ReaderSettings>> => {
    const db = await openDatabase();

    const rows = await db.getAllAsync<SettingRow>(
      `
      SELECT key, value
      FROM reader_settings
      `
    );

    return rowsToSettings(rows);
  };

export const getSetlistReaderSettings =
  async (setlistId: number): Promise<Partial<ReaderSettings>> => {
    const db = await openDatabase();

    const rows = await db.getAllAsync<SettingRow>(
      `
      SELECT key, value
      FROM setlist_settings
      WHERE setlist_id = ?
      `,
      [setlistId]
    );

    return rowsToSettings(rows);
  };

export const getMusicReaderSettings =
  async (musicId: number): Promise<Partial<ReaderSettings>> => {
    const db = await openDatabase();

    const rows = await db.getAllAsync<SettingRow>(
      `
      SELECT key, value
      FROM music_settings
      WHERE music_id = ?
      `,
      [musicId]
    );

    return rowsToSettings(rows);
  }; 

const serialiseSettingValue = (
  value: ReaderSettings[keyof ReaderSettings]
): string => {
  return String(value);
};

export const saveGlobalReaderSetting = async (
  key: keyof ReaderSettings,
  value: ReaderSettings[keyof ReaderSettings]
): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    INSERT INTO reader_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
    `,
    [key, serialiseSettingValue(value)]
  );
};

export const saveSetlistReaderSetting = async (
  setlistId: number,
  key: keyof ReaderSettings,
  value: ReaderSettings[keyof ReaderSettings]
): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    INSERT INTO setlist_settings (setlist_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(setlist_id, key)
    DO UPDATE SET value = excluded.value
    `,
    [setlistId, key, serialiseSettingValue(value)]
  );
};

export const saveMusicReaderSetting = async (
  musicId: number,
  key: keyof ReaderSettings,
  value: ReaderSettings[keyof ReaderSettings]
): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    INSERT INTO music_settings (music_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(music_id, key)
    DO UPDATE SET value = excluded.value
    `,
    [musicId, key, serialiseSettingValue(value)]
  );
};

// OVERRIDE REMOVERS

export const deleteSetlistReaderSetting = async (
  setlistId: number,
  key: keyof ReaderSettings
): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    DELETE FROM setlist_settings
    WHERE setlist_id = ?
      AND key = ?
    `,
    [setlistId, key]
  );
};

export const deleteMusicReaderSetting = async (
  musicId: number,
  key: keyof ReaderSettings
): Promise<void> => {
  const db = await openDatabase();

  await db.runAsync(
    `
    DELETE FROM music_settings
    WHERE music_id = ?
      AND key = ?
    `,
    [musicId, key]
  );
};

export const clearSetlistReaderSettings = async (
    setlistId: number
) => {

    const db = await openDatabase();

    await db.runAsync(
        `
        DELETE FROM setlist_settings
        WHERE setlist_id = ?
        `,
        [setlistId]
    );
};

export const clearMusicReaderSettings = async (
    musicId: number
) => {

    const db = await openDatabase();

    await db.runAsync(
        `
        DELETE FROM music_settings
        WHERE music_id = ?
        `,
        [musicId]
    );
};