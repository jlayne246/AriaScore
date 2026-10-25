import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  FaceGestureCalibration,
} from "./types";

const CALIBRATION_STORAGE_KEY =
  "ariascore:face-gesture-calibration:v2";

export async function saveFaceGestureCalibration(
  calibration: FaceGestureCalibration,
): Promise<void> {
  await AsyncStorage.setItem(
    CALIBRATION_STORAGE_KEY,
    JSON.stringify(calibration),
  );
}

export async function loadFaceGestureCalibration():
  Promise<FaceGestureCalibration | null> {
  const raw =
    await AsyncStorage.getItem(
      CALIBRATION_STORAGE_KEY,
    );

  console.log(
    "[FaceGestureCalibrationStore] Stored value:",
    raw ? "FOUND" : "NOT FOUND",
  );

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as FaceGestureCalibration;

    console.log(
      "[FaceGestureCalibrationStore] Parsed version:",
      parsed.version,
    );

    if (
      parsed.version !== 2
    ) {
      console.warn(
        "[FaceGestureCalibrationStore] Unsupported calibration version:",
        parsed.version,
      );

      return null;
    }

    if (
      !parsed.neutralNoise ||
      typeof parsed.neutralNoise.horizontal !== "number" ||
      typeof parsed.neutralNoise.lift !== "number"
    ) {
      console.warn(
        "[FaceGestureCalibrationStore] Invalid v2 calibration.",
      );

      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(
      "[FaceGestureCalibrationStore] Could not parse saved calibration:",
      error,
    );

    return null;
  }
}

export async function clearFaceGestureCalibration():
  Promise<void> {
  await AsyncStorage.removeItem(
    CALIBRATION_STORAGE_KEY,
  );
}