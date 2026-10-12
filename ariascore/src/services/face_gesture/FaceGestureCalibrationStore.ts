import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  FaceGestureCalibration,
} from "./types";

const CALIBRATION_STORAGE_KEY =
  "ariascore:face-gesture-calibration:v1";

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

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as FaceGestureCalibration;

    if (parsed.version !== 1) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(
      "[FaceGesture] Could not parse saved calibration:",
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