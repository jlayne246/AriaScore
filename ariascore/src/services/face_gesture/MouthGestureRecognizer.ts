import {
  FaceLandmarks,
  MouthGestureSample,
  Point,
} from "./types";

export interface MouthGestureRecognizerOptions {
  leftThreshold: number;
  rightThreshold: number;
}

const DEFAULT_OPTIONS: MouthGestureRecognizerOptions = {
  leftThreshold: 0.10,
  rightThreshold: 0.10,
};

export class MouthGestureRecognizer {
  private baseline: number | null = null;

  private readonly options:
    MouthGestureRecognizerOptions;

  constructor(
    options: Partial<MouthGestureRecognizerOptions> = {},
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * Establish neutral mouth position from a collection of samples.
   */
  calibrate(samples: FaceLandmarks[]): boolean {
    if (samples.length === 0) {
      return false;
    }

    const offsets = samples
      .map((sample) =>
        this.calculateNormalizedMouthOffset(sample),
      )
      .sort((a, b) => a - b);

    this.baseline = this.median(offsets);

    return true;
  }

  resetCalibration(): void {
    this.baseline = null;
  }

  isCalibrated(): boolean {
    return this.baseline !== null;
  }

  getBaseline(): number | null {
    return this.baseline;
  }

  process(
    landmarks: FaceLandmarks,
  ): MouthGestureSample {
    const rawOffset =
      this.calculateNormalizedMouthOffset(
        landmarks,
      );

    const baseline = this.baseline ?? 0;

    const displacement =
      rawOffset - baseline;

    if (
      displacement <=
      -this.options.leftThreshold
    ) {
      return {
        direction: "left",
        displacement,
        confidence: this.calculateConfidence(
          Math.abs(displacement),
          this.options.leftThreshold,
        ),
        timestamp: landmarks.timestamp,
      };
    }

    if (
      displacement >=
      this.options.rightThreshold
    ) {
      return {
        direction: "right",
        displacement,
        confidence: this.calculateConfidence(
          displacement,
          this.options.rightThreshold,
        ),
        timestamp: landmarks.timestamp,
      };
    }

    return {
      direction: "neutral",
      displacement,
      confidence: 0,
      timestamp: landmarks.timestamp,
    };
  }

  private calculateNormalizedMouthOffset(
    landmarks: FaceLandmarks,
  ): number {
    const eyeCenter = this.midpoint(
      landmarks.leftEye,
      landmarks.rightEye,
    );

    const eyeDistance = this.distance(
      landmarks.leftEye,
      landmarks.rightEye,
    );

    if (eyeDistance === 0) {
      return 0;
    }

    return (
      (landmarks.mouthCenter.x -
        eyeCenter.x) /
      eyeDistance
    );
  }

  private calculateConfidence(
    displacement: number,
    threshold: number,
  ): number {
    /**
     * Threshold itself = 0 confidence.
     * Roughly twice the threshold = 1.
     */
    const excess =
      displacement - threshold;

    return this.clamp(
      excess / threshold,
      0,
      1,
    );
  }

  private midpoint(
    a: Point,
    b: Point,
  ): Point {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }

  private distance(
    a: Point,
    b: Point,
  ): number {
    return Math.hypot(
      b.x - a.x,
      b.y - a.y,
    );
  }

  private median(values: number[]): number {
    const middle = Math.floor(
      values.length / 2,
    );

    if (values.length % 2 === 0) {
      return (
        (values[middle - 1] +
          values[middle]) /
        2
      );
    }

    return values[middle];
  }

  private clamp(
    value: number,
    min: number,
    max: number,
  ): number {
    return Math.min(
      Math.max(value, min),
      max,
    );
  }
}