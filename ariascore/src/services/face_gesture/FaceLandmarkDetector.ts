import type {
  FaceLandmarks,
  Point,
} from "./types";

export interface DetectedFace {
  leftEye?: Point;
  rightEye?: Point;
  mouthLeft?: Point;
  mouthRight?: Point;
  nose?: Point;
}

export class FaceLandmarkDetector {
  convert(
    face: DetectedFace,
    timestamp: number,
  ): FaceLandmarks | null {
    const {
      leftEye,
      rightEye,
      mouthLeft,
      mouthRight,
      nose,
    } = face;

    if (
      !leftEye ||
      !rightEye ||
      !mouthLeft ||
      !mouthRight
    ) {
      return null;
    }

    const mouthCenter =
      FaceLandmarkDetector.midpoint(
        mouthLeft,
        mouthRight,
      );

    return {
      leftEye,
      rightEye,
      mouthLeft,
      mouthRight,
      mouthCenter,
      nose,
      timestamp,
    };
  }

  private static midpoint(
    a: Point,
    b: Point,
  ): Point {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }
}