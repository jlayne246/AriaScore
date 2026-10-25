export interface Point {
  x: number;
  y: number;
}

export interface FaceLandmarks {
  leftEye: Point;
  rightEye: Point;

  mouthLeft: Point;
  mouthRight: Point;
  mouthCenter: Point;

  nose?: Point;

  timestamp: number;
}

export type MouthGestureDirection =
  | "left"
  | "neutral"
  | "right";

export interface MouthGestureSample {
  direction: MouthGestureDirection;
  displacement: number;
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