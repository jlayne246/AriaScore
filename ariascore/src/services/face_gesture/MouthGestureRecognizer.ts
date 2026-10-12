import {
  FaceGestureCalibration,
  FaceLandmarks,
  FacePose,
  MouthGestureDirection,
  MouthGestureSample,
} from "./types";

import {
  calculateGestureSignals,
  extractMouthFeatures,
} from "./FaceGestureCalibration";

export interface MouthGestureRecognizerOptions {
  /**
   * Fraction of the demonstrated gesture required
   * before it is classified as intentional.
   *
   * 0.45 means approximately 45% of the gesture
   * demonstrated during calibration.
   */
  triggerStrength: number;

  /**
   * EMA smoothing factors.
   *
   * Smaller values = more smoothing.
   * Larger values = more responsive.
   */
  // horizontalSmoothingAlpha: number;
  // liftSmoothingAlpha: number;

  /**
   * Maximum deviation from the calibrated natural
   * head posture.
   */
  maxYawDelta: number;
  maxPitchDelta: number;
  maxRollDelta: number;
}

const DEFAULT_OPTIONS:
  MouthGestureRecognizerOptions = {
    triggerStrength: 0.5,

    // horizontalSmoothingAlpha: 0.5,
    // liftSmoothingAlpha: 0.5,

    maxYawDelta: 10,
    maxPitchDelta: 10,
    maxRollDelta: 10,
  };

interface PoseResult {
  valid: boolean;

  yawDelta: number;
  pitchDelta: number;
  rollDelta: number;
}

export class MouthGestureRecognizer {
  private calibration:
    FaceGestureCalibration | null =
    null;

  private readonly options:
    MouthGestureRecognizerOptions;

  /*
   * Smoothed live signals.
   */
  private smoothedHorizontal:
    number | null = null;

  private smoothedLift:
    number | null = null;

  constructor(
    options: Partial<MouthGestureRecognizerOptions> = {},
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * New calibration API.
   */
  setCalibration(
    calibration:
      FaceGestureCalibration,
  ): void {
    this.calibration =
      calibration;

    this.resetSmoothing();
  }

  getCalibration():
    | FaceGestureCalibration
    | null {
    return this.calibration;
  }

  resetCalibration(): void {
    this.calibration =
      null;

    this.resetSmoothing();
  }

  isCalibrated(): boolean {
    return (
      this.calibration !==
      null
    );
  }

  /**
   * Kept for compatibility with the old debug screen.
   *
   * It now returns the calibrated neutral centre value.
   */
  getBaseline(): number | null {
    return (
      this.calibration
        ?.neutral.centerX ??
      null
    );
  }

  process(
    landmarks: FaceLandmarks,
  ): MouthGestureSample {
    const calibration =
      this.calibration;

    if (!calibration) {
      return {
        direction:
          "neutral",

        displacement: 0,
        confidence: 0,

        normalizedStrength:
          0,

        poseValid: true,

        yawDelta: 0,
        pitchDelta: 0,
        rollDelta: 0,

        timestamp:
          landmarks.timestamp,
      };
    }

    const pose =
      this.calculatePoseDelta(
        landmarks.pose,
        calibration.neutralPose,
      );

    if (!pose.valid) {
      /*
       * Don't keep old gesture momentum alive while
       * the face is outside its calibrated posture.
       */
      this.resetSmoothing();

      return {
        direction:
          "neutral",

        displacement: 0,
        confidence: 0,

        horizontalDisplacement:
          0,

        liftDisplacement:
          0,

        normalizedStrength:
          0,

        poseValid: false,

        yawDelta:
          pose.yawDelta,

        pitchDelta:
          pose.pitchDelta,

        rollDelta:
          pose.rollDelta,

        timestamp:
          landmarks.timestamp,
      };
    }

    const features =
      extractMouthFeatures(
        landmarks,
      );

    const rawSignals =
      calculateGestureSignals(
        features,
        calibration.neutral,
        calibration.mirrorHorizontal,
      );

    this.smoothedHorizontal =
      this.smoothSignal(
        this.smoothedHorizontal,
        rawSignals.horizontal,
      );

    this.smoothedLift =
      this.smoothSignal(
        this.smoothedLift,
        rawSignals.lift,
      );

    const horizontal =
      this.smoothedHorizontal;

    const lift =
      this.smoothedLift;

    /*
     * Each direction is normalized independently
     * against the gesture demonstrated during
     * calibration.
     */
    const leftHorizontalStrength =
      horizontal < 0
        ? this.safeStrength(
            this.removeNoiseFloor(
              Math.abs(horizontal),
              calibration.neutralNoise.horizontal,
            ),
            calibration.left.horizontalAmplitude,
          )
        : 0;

    const leftLiftStrength =
      lift < 0
        ? this.safeStrength(
            this.removeNoiseFloor(
              Math.abs(lift),
              calibration.neutralNoise.lift,
            ),
            calibration.left.liftAmplitude,
          )
        : 0;

    const rightHorizontalStrength =
      horizontal > 0
        ? this.safeStrength(
            this.removeNoiseFloor(
              Math.abs(horizontal),
              calibration.neutralNoise.horizontal,
            ),
            calibration.right.horizontalAmplitude,
          )
        : 0;

    const rightLiftStrength =
      lift > 0
        ? this.safeStrength(
            this.removeNoiseFloor(
              Math.abs(lift),
              calibration.neutralNoise.lift,
            ),
            calibration.right
              .liftAmplitude,
          )
        : 0;

    /*
     * Either signal can represent a valid gesture.
     *
     * This allows:
     * - a mostly-horizontal mouth pull
     * - a mostly-vertical cheek/corner raise
     * - a combination of both
     */
    const leftStrength =
      this.combineDirectionalStrength(
        leftHorizontalStrength,
        leftLiftStrength,
        calibration.left
          .horizontalAmplitude,
        calibration.left
          .liftAmplitude,
        calibration,
      );

    const rightStrength =
      this.combineDirectionalStrength(
        rightHorizontalStrength,
        rightLiftStrength,
        calibration.right
          .horizontalAmplitude,
        calibration.right
          .liftAmplitude,
        calibration,
      );

    const leftTriggered =
      leftStrength >=
      this.options
        .triggerStrength;

    const rightTriggered =
      rightStrength >=
      this.options
        .triggerStrength;

    let direction:
      MouthGestureDirection =
      "neutral";

    let normalizedStrength =
      Math.max(
        leftStrength,
        rightStrength,
      );

    if (
      leftTriggered &&
      rightTriggered
    ) {
      /*
       * Unusual noisy frame: choose whichever
       * calibrated direction has stronger evidence.
       */
      direction =
        leftStrength >
        rightStrength
          ? "left"
          : "right";
    } else if (
      leftTriggered
    ) {
      direction =
        "left";

      normalizedStrength =
        leftStrength;
    } else if (
      rightTriggered
    ) {
      direction =
        "right";

      normalizedStrength =
        rightStrength;
    }

    /*
     * Keep raw signed displacement available for the
     * existing debug indicator.
     *
     * Select whichever raw signal has stronger
     * CALIBRATED significance, not simply the larger
     * numerical value.
     */
    const strongestSignal =
      this.getStrongestRawSignal(
        horizontal,
        lift,
        calibration,
      );

    const confidence =
      direction ===
      "neutral"
        ? 0
        : this.strengthToConfidence(
            normalizedStrength,
          );

    return {
      direction,

      displacement:
        strongestSignal,

      confidence,

      normalizedStrength,

      horizontalDisplacement:
        horizontal,

      liftDisplacement:
        lift,

      poseValid:
        true,

      yawDelta:
        pose.yawDelta,

      pitchDelta:
        pose.pitchDelta,

      rollDelta:
        pose.rollDelta,

      timestamp:
        landmarks.timestamp,
    };
  }

  private calculateChannelWeights(
  horizontalAmplitude: number,
  liftAmplitude: number,
  horizontalNoise: number,
  liftNoise: number,
): {
  horizontal: number;
  lift: number;
} {
  const horizontalSnr =
    horizontalNoise > 0
      ? horizontalAmplitude /
        horizontalNoise
      : horizontalAmplitude > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  const liftSnr =
    liftNoise > 0
      ? liftAmplitude /
        liftNoise
      : liftAmplitude > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  /*
   * A channel below this SNR isn't reliable enough
   * to influence recognition.
   */
  const minimumReliableSnr =
    3.0;

  const horizontalReliability =
    horizontalSnr >=
    minimumReliableSnr
      ? horizontalSnr
      : 0;

  const liftReliability =
    liftSnr >=
    minimumReliableSnr
      ? liftSnr
      : 0;

  const total =
    horizontalReliability +
    liftReliability;

  if (total <= 0) {
    return {
      horizontal: 0,
      lift: 0,
    };
  }

  return {
    horizontal:
      horizontalReliability /
      total,

    lift:
      liftReliability /
      total,
  };
}

private combineDirectionalStrength(
  horizontalStrength: number,
  liftStrength: number,
  horizontalAmplitude: number,
  liftAmplitude: number,
  calibration: FaceGestureCalibration,
): number {
  const weights =
    this.calculateChannelWeights(
      horizontalAmplitude,
      liftAmplitude,
      calibration.neutralNoise.horizontal,
      calibration.neutralNoise.lift,
    );

  return (
    horizontalStrength *
      weights.horizontal +
    liftStrength *
      weights.lift
  );
}

  private calculatePoseDelta(
    current:
      | FacePose
      | undefined,

    baseline:
      | FacePose
      | undefined,
  ): PoseResult {
    /*
     * Pose information is optional.
     *
     * If unavailable, allow recognition rather than
     * disabling the feature completely.
     */
    if (
      !current ||
      !baseline
    ) {
      return {
        valid: true,
        yawDelta: 0,
        pitchDelta: 0,
        rollDelta: 0,
      };
    }

    const yawDelta =
      current.yaw -
      baseline.yaw;

    const pitchDelta =
      current.pitch -
      baseline.pitch;

    const rollDelta =
      current.roll -
      baseline.roll;

    const valid =
      Math.abs(
        yawDelta,
      ) <=
        this.options
          .maxYawDelta &&
      Math.abs(
        pitchDelta,
      ) <=
        this.options
          .maxPitchDelta &&
      Math.abs(
        rollDelta,
      ) <=
        this.options
          .maxRollDelta;

    return {
      valid,

      yawDelta,
      pitchDelta,
      rollDelta,
    };
  }

  private getStrongestRawSignal(
    horizontal: number,
    lift: number,
    calibration:
      FaceGestureCalibration,
  ): number {
    let horizontalStrength =
      0;

    let liftStrength =
      0;

    if (horizontal < 0) {
      horizontalStrength =
        this.safeStrength(
          this.removeNoiseFloor(
            Math.abs(horizontal),
            calibration.neutralNoise.horizontal,
          ),
          calibration.left.horizontalAmplitude,
        )
    } else if (
      horizontal > 0
    ) {
      horizontalStrength =
        this.safeStrength(
          this.removeNoiseFloor(
            Math.abs(horizontal),
            calibration.neutralNoise.horizontal,
          ),
          calibration.right
            .horizontalAmplitude,
        );
    }

    if (lift < 0) {
      liftStrength =
        this.safeStrength(
          this.removeNoiseFloor(
            Math.abs(lift),
            calibration.neutralNoise.lift,
          ),
          calibration.left
            .liftAmplitude,
        );
    } else if (
      lift > 0
    ) {
      liftStrength =
        this.safeStrength(
          this.removeNoiseFloor(
            Math.abs(lift),
            calibration.neutralNoise.lift,
          ),
          calibration.right
            .liftAmplitude,
        );
    }

    return (
      liftStrength >
      horizontalStrength
        ? lift
        : horizontal
    );
  }

  private removeNoiseFloor(
    magnitude: number,
    noise: number,
  ): number {
    const deadZone =
      noise * 2.5;

    return Math.max(
      0,
      magnitude - deadZone,
    );
  }

  private safeStrength(
    magnitude: number,
    calibratedAmplitude: number,
  ): number {
    if (
      calibratedAmplitude <=
      0
    ) {
      return 0;
    }

    return (
      magnitude /
      calibratedAmplitude
    );
  }

  private strengthToConfidence(
    strength: number,
  ): number {
    const trigger =
      this.options
        .triggerStrength;

    /*
     * Trigger strength -> 0 confidence
     * Demonstrated calibration strength -> 1
     */
    return this.clamp(
      (
        strength -
        trigger
      ) /
        (
          1 -
          trigger
        ),
      0,
      1,
    );
  }

  private ema(
    current: number,
    previous:
      | number
      | null,
    alpha: number,
  ): number {
    if (
      previous === null
    ) {
      return current;
    }

    return (
      alpha *
        current +
      (
        1 -
        alpha
      ) *
        previous
    );
  }

  private resetSmoothing(): void {
    this.smoothedHorizontal =
      null;

    this.smoothedLift =
      null;
  }

  private clamp(
    value: number,
    min: number,
    max: number,
  ): number {
    return Math.min(
      Math.max(
        value,
        min,
      ),
      max,
    );
  }

  private smoothSignal(
    previous: number | null,
    current: number,
  ): number {
    if (previous === null) {
      return current;
    }

    const alpha =
      Math.abs(current) >
      Math.abs(previous)
        ? 0.5
        : 0.2;

    return (
      alpha * current +
      (1 - alpha) * previous
    );
  }
}