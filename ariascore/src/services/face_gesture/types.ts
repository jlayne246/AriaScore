export interface Point {
  x: number;
  y: number;
}

export interface FacePose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FaceLandmarks {
  leftEye: Point;
  rightEye: Point;

  leftCheek?: Point;
  rightCheek?: Point;

  mouthLeft: Point;
  mouthRight: Point;
  mouthCenter: Point;

  nose?: Point;
  pose?: FacePose;

  timestamp: number;
}

export type MouthGestureDirection =
  | "left"
  | "neutral"
  | "right";

export interface MouthGestureSample {
  direction: MouthGestureDirection;

  /**
   * Raw signed signal used mainly by the debug UI.
   *
   * Negative = user's left
   * Positive = user's right
   */
  displacement: number;

  confidence: number;
  timestamp: number;

  /**
   * Debug/tuning values.
   */
  horizontalDisplacement?: number;
  liftDisplacement?: number;

  /**
   * Gesture strength after normalization against
   * the user's calibration.
   *
   * Approximately:
   *   0.0 = neutral
   *   0.5 = half the calibrated gesture
   *   1.0 = approximately the demonstrated gesture
   */
  normalizedStrength?: number;

  poseValid?: boolean;

  yawDelta?: number;
  pitchDelta?: number;
  rollDelta?: number;
}

export type FaceGestureType =
  | "mouth-left"
  | "mouth-right";

export interface FaceGestureEvent {
  type: FaceGestureType;
  timestamp: number;
}

export type FaceGestureCalibrationPhase =
  | "neutral"
  | "left"
  | "right";

export interface NeutralMouthCalibration {
  centerX: number;
  leftCornerY: number;
  rightCornerY: number;
}

export interface GestureAmplitudeCalibration {
  /**
   * Typical horizontal movement produced by this gesture.
   * Always stored as a positive magnitude.
   */
  horizontalAmplitude: number;

  /**
   * Typical asymmetric corner-lift movement produced
   * by this gesture.
   * Always stored as a positive magnitude.
   */
  liftAmplitude: number;
}

export interface GestureNoiseCalibration {
  horizontal: number;
  lift: number;
}

export interface FaceGestureCalibration {
  version: 2;

  createdAt: number;
  mirrorHorizontal: boolean;

  neutral: NeutralMouthCalibration;
  neutralNoise: GestureNoiseCalibration;

  neutralPose?: FacePose;

  left: GestureAmplitudeCalibration;
  right: GestureAmplitudeCalibration;
}