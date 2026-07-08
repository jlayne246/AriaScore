import { DEFAULT_SETTINGS } from "./defaults";
import { ReaderSettings } from "./types";
import {
  getGlobalReaderSettings,
  getSetlistReaderSettings,
  getMusicReaderSettings,
} from "./repository";

export const getResolvedReaderSettings = async (
  musicId?: number,
  setlistId?: number
): Promise<ReaderSettings> => {
  const globalSettings = await getGlobalReaderSettings();

  const setlistSettings = setlistId
    ? await getSetlistReaderSettings(setlistId)
    : {};

  const musicSettings = musicId
    ? await getMusicReaderSettings(musicId)
    : {};

  return {
    ...DEFAULT_SETTINGS,
    ...globalSettings,
    ...setlistSettings,
    ...musicSettings,
  };
};