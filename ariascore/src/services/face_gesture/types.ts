export interface Point {
  x: number;
  y: number;
}

export interface CameraFrame {
  /**
   * Library/native-specific frame object.
   *
   * Keep this opaque so the rest of the gesture system does not
   * depend directly on a particular camera implementation.
   */
  nativeFrame: unknown;

  width: number;
  height: number;
  timestamp: number;
}

export interface FaceLandmarks {
  leftEye: Point;
  rightEye: Point;

  mouthLeft: Point;
  mouthRight: Point;
  mouthCenter: Point;

  /**
   * Optional, but useful later for better normalization.
   */
  nose?: Point;

  timestamp: number;
}

export type MouthGestureDirection =
  | "left"
  | "neutral"
  | "right";

export interface MouthGestureSample {
  direction: MouthGestureDirection;

  /**
   * Horizontal mouth displacement relative to calibrated neutral.
   *
   * Negative = left
   * Positive = right
   */
  displacement: number;

  /**
   * 0–1 indication of how strongly the sample exceeds its threshold.
   *
   * This is not ML confidence. It is recognition confidence generated
   * by our own gesture algorithm.
   */
  confidence: number;

  timestamp: number;
}

export type FaceGestureType =
  | "mouth-left"
  | "mouth-right";

export interface FaceGestureEvent {
  type: FaceGestureType;
  timestamp: number;
}