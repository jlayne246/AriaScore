export * from "./types";

export * from "./FaceGestureCalibration";
export * from "./FaceGestureCalibrationStore";

export * from "./GestureDebouncer";
export * from "./MouthGestureRecognizer";
export * from "./FaceGestureService";

import {
  FaceGestureService,
} from "./FaceGestureService";

export const faceGestureService =
  new FaceGestureService();