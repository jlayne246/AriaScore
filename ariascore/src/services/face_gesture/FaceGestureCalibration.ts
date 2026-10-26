import {
  FaceGestureCalibration,
  FaceLandmarks,
  FacePose,
  GestureAmplitudeCalibration,
  NeutralMouthCalibration,
  Point,
} from "./types";

export interface MouthFeatures {
  centerX: number;
  leftCornerY: number;
  rightCornerY: number;
}

export interface CalibrationBuildOptions {
  mirrorHorizontal: boolean;
  minimumSamplesPerPhase: number;
  minimumUsefulAmplitude: number;

  minimumGestureSeparation: number;
  minimumSignalToNoiseRatio: number;
}

const DEFAULT_BUILD_OPTIONS = {
  mirrorHorizontal: true,
  minimumSamplesPerPhase: 5,
  minimumUsefulAmplitude: 0.005,

  minimumGestureSeparation: 0.015,
  minimumSignalToNoiseRatio: 3.0, // up to 3.5
};

export interface CalibrationSampleSet {
  neutral: FaceLandmarks[];
  left: FaceLandmarks[];
  right: FaceLandmarks[];
}

/**
 * Build a complete calibration profile from the three
 * calibration stages:
 *
 * neutral -> left gesture -> right gesture
 */
export function buildFaceGestureCalibration(
  samples: CalibrationSampleSet,
  options: Partial<CalibrationBuildOptions> = {},
): FaceGestureCalibration | null {
  const config = {
    ...DEFAULT_BUILD_OPTIONS,
    ...options,
  };

  if (
    samples.neutral.length <
      config.minimumSamplesPerPhase ||
    samples.left.length <
      config.minimumSamplesPerPhase ||
    samples.right.length <
      config.minimumSamplesPerPhase
  ) {
    return null;
  }

  const neutralFeatures =
    samples.neutral.map(
      extractMouthFeatures,
    );

  const neutral =
    calculateNeutralMouthCalibration(
      neutralFeatures,
    );

  const neutralNoise =
    calculateNeutralNoise(
      neutralFeatures,
      neutral,
    );

  const neutralPose =
    calculateNeutralPose(
      samples.neutral,
    );

  const leftProfile =
    calculateGestureAmplitude(
      samples.left,
      neutral,
      "left",
      config.mirrorHorizontal,
      config.minimumUsefulAmplitude,
    );

  const rightProfile =
    calculateGestureAmplitude(
      samples.right,
      neutral,
      "right",
      config.mirrorHorizontal,
      config.minimumUsefulAmplitude,
    );

  console.log(
    "[FaceGestureCalibration] Profiles",
    {
      neutral,
      neutralNoise,
      leftProfile,
      rightProfile,
    },
  );

  /*
   * We need at least one useful signal for each side.
   */
  const leftValid =
    leftProfile.horizontalAmplitude >
      config.minimumUsefulAmplitude ||
    leftProfile.cornerAmplitude >
      config.minimumUsefulAmplitude;

  const rightValid =
    rightProfile.horizontalAmplitude >
      config.minimumUsefulAmplitude ||
    rightProfile.cornerAmplitude >
      config.minimumUsefulAmplitude;

  if (!leftValid) {
    console.warn(
      "[FaceGestureCalibration] Left gesture produced no usable signal.",
      {
        profile: leftProfile,
        minimumUsefulAmplitude:
          config.minimumUsefulAmplitude,
      },
    );

    return null;
  }

  if (!rightValid) {
    console.warn(
      "[FaceGestureCalibration] Right gesture produced no usable signal.",
      {
        profile: rightProfile,
        minimumUsefulAmplitude:
          config.minimumUsefulAmplitude,
      },
    );

    return null;
  }

  /*
   * Reject gestures that are technically measurable
   * but still too close to the user's neutral noise.
   */
  if (
    !isGestureDistinctEnough(
      leftProfile,
      neutralNoise,
      config,
    )
  ) {
    console.warn(
      "[FaceGestureCalibration] Left gesture is too close to neutral.",
    );

    return null;
  }

  if (
    !isGestureDistinctEnough(
      rightProfile,
      neutralNoise,
      config,
    )
  ) {
    console.warn(
      "[FaceGestureCalibration] Right gesture is too close to neutral.",
    );

    return null;
  }

  return {
    version: 3,

    createdAt: Date.now(),

    mirrorHorizontal:
      config.mirrorHorizontal,

    neutral,

    neutralPose,

    neutralNoise: {
      horizontal: neutralNoise.horizontalNoise,
      lift: neutralNoise.liftNoise,
    },

    left: leftProfile,
    right: rightProfile,
  };
}

function isGestureDistinctEnough(
  gesture: GestureAmplitudeCalibration,
  neutralNoise: {
    horizontalNoise: number;
    liftNoise: number;
  },
  options: CalibrationBuildOptions,
): boolean {
  const horizontalDistinct =
    gesture.horizontalAmplitude >=
      options.minimumGestureSeparation &&
    gesture.horizontalAmplitude >=
      neutralNoise.horizontalNoise *
        options.minimumSignalToNoiseRatio;

  const cornerDistinct =
    gesture.cornerAmplitude >=
      options.minimumGestureSeparation &&
    gesture.cornerAmplitude >=
      neutralNoise.liftNoise *
        options.minimumSignalToNoiseRatio;

  return (
    horizontalDistinct ||
    cornerDistinct
  );
}

/**
 * Convert screen-space landmarks into a face-relative
 * coordinate system.
 *
 * X axis:
 *   left eye -> right eye
 *
 * Y axis:
 *   perpendicular to eye line
 *
 * Distances are normalized by inter-eye distance.
 *
 * This substantially reduces sensitivity to:
 * - screen rotation
 * - slight head roll
 * - distance from camera
 */
export function extractMouthFeatures(
  landmarks: FaceLandmarks,
): MouthFeatures {
  const leftEye =
    landmarks.leftEye;

  const rightEye =
    landmarks.rightEye;

  /*
   * Stable origin.
   *
   * Prefer the nose so blinking does not move
   * the reference point.
   */
  const origin =
    landmarks.nose ??
    midpoint(
      leftEye,
      rightEye,
    );

  /*
   * Eye line is used only to establish the
   * face-local orientation and scale.
   *
   * It is no longer used as the origin.
   */
  const eyeVector = {
    x:
      rightEye.x -
      leftEye.x,

    y:
      rightEye.y -
      leftEye.y,
  };

  const eyeDistance =
    Math.hypot(
      eyeVector.x,
      eyeVector.y,
    );

  if (
    eyeDistance <= 0
  ) {
    return {
      centerX: 0,
      leftCornerY: 0,
      rightCornerY: 0,
    };
  }

  /*
   * Face-local horizontal axis.
   */
  const axisX = {
    x:
      eyeVector.x /
      eyeDistance,

    y:
      eyeVector.y /
      eyeDistance,
  };

  /*
   * Face-local vertical axis.
   */
  const axisY = {
    x:
      -axisX.y,

    y:
      axisX.x,
  };

  const project =
    (point: Point) => {
      const relative = {
        x:
          point.x -
          origin.x,

        y:
          point.y -
          origin.y,
      };

      return {
        x:
          (
            relative.x *
              axisX.x +
            relative.y *
              axisX.y
          ) /
          eyeDistance,

        y:
          (
            relative.x *
              axisY.x +
            relative.y *
              axisY.y
          ) /
          eyeDistance,
      };
    };

  const mouthCenter =
    project(
      landmarks.mouthCenter,
    );

  const mouthLeft =
    project(
      landmarks.mouthLeft,
    );

  const mouthRight =
    project(
      landmarks.mouthRight,
    );

  return {
    centerX:
      mouthCenter.x,

    leftCornerY:
      mouthLeft.y,

    rightCornerY:
      mouthRight.y,
  };
}

export interface GestureSignals {
  horizontal: number;

  /**
   * Kept for the existing debug UI.
   *
   * Negative = user's left
   * Positive = user's right
   */
  lift: number;

  /**
   * Individual corner movement in user-relative
   * orientation.
   *
   * Positive/negative indicates vertical direction,
   * but recognition uses magnitude because some users
   * raise a corner while others mostly pull it.
   */
  leftCornerLift: number;
  rightCornerLift: number;
}

export function calculateGestureSignals(
  features: MouthFeatures,
  neutral: NeutralMouthCalibration,
  mirrorHorizontal: boolean,
): GestureSignals {
  const rawHorizontal =
    features.centerX -
    neutral.centerX;

  const horizontal =
    mirrorHorizontal
      ? -rawHorizontal
      : rawHorizontal;

  /*
   * Face-local Y increases downward.
   *
   * neutral - current > 0 means the corner
   * moved upward.
   */
  const detectorLeftLift =
    neutral.leftCornerY -
    features.leftCornerY;

  const detectorRightLift =
    neutral.rightCornerY -
    features.rightCornerY;

  /*
   * Convert detector-side corner names into the same
   * user-relative orientation used by horizontal.
   *
   * With a mirrored front-camera coordinate system,
   * detector-right corresponds to the user's left.
   */
  const leftCornerLift =
    mirrorHorizontal
      ? detectorRightLift
      : detectorLeftLift;

  const rightCornerLift =
    mirrorHorizontal
      ? detectorLeftLift
      : detectorRightLift;

  /*
   * Preserve the old signed differential signal for
   * the debug screen only.
   *
   * Recognition should no longer depend on this.
   */
  const lift =
    rightCornerLift -
    leftCornerLift;

  return {
    horizontal,
    lift,
    leftCornerLift,
    rightCornerLift,
  };
}

function calculateNeutralMouthCalibration(
  features: MouthFeatures[],
): NeutralMouthCalibration {
  return {
    centerX:
      median(
        features.map(
          (item) =>
            item.centerX,
        ),
      ),

    leftCornerY:
      median(
        features.map(
          (item) =>
            item.leftCornerY,
        ),
      ),

    rightCornerY:
      median(
        features.map(
          (item) =>
            item.rightCornerY,
        ),
      ),
  };
}

function calculateNeutralPose(
  samples: FaceLandmarks[],
): FacePose | undefined {
  const poses =
    samples
      .map(
        (sample) =>
          sample.pose,
      )
      .filter(
        (
          pose,
        ): pose is FacePose =>
          pose !== undefined,
      );

  if (poses.length === 0) {
    return undefined;
  }

  return {
    yaw:
      median(
        poses.map(
          (pose) =>
            pose.yaw,
        ),
      ),

    pitch:
      median(
        poses.map(
          (pose) =>
            pose.pitch,
        ),
      ),

    roll:
      median(
        poses.map(
          (pose) =>
            pose.roll,
        ),
      ),
  };
}

function calculateNeutralNoise(
  neutralFeatures: MouthFeatures[],
  neutral: NeutralMouthCalibration,
): {
  horizontalNoise: number;
  liftNoise: number;
} {
  const horizontalValues =
    neutralFeatures.map(
      (features) =>
        Math.abs(
          features.centerX -
            neutral.centerX,
        ),
    );

  const liftValues =
    neutralFeatures.map(
      (features) => {
        const left =
          Math.abs(
            features.leftCornerY -
              neutral.leftCornerY,
          );

        const right =
          Math.abs(
            features.rightCornerY -
              neutral.rightCornerY,
          );

        return Math.max(
          left,
          right,
        );
      },
    );

  return {
    horizontalNoise:
      robustNoiseLevel(
        horizontalValues,
      ),

    liftNoise:
      robustNoiseLevel(
        liftValues,
      ),
  };
}

function robustNoiseLevel(
  values: number[],
): number {
  if (
    values.length === 0
  ) {
    return 0;
  }

  return median(
    [...values].sort(
      (a, b) => a - b,
    ),
  );
}

function calculateGestureAmplitude(
  samples: FaceLandmarks[],
  neutral: NeutralMouthCalibration,
  expectedDirection:
    | "left"
    | "right",
  mirrorHorizontal: boolean,
  minimumUsefulAmplitude: number,
): GestureAmplitudeCalibration {
  const horizontalValues: number[] =
    [];

  const liftValues: number[] =
    [];

  const cornerValues: number[] =
    [];

  for (const sample of samples) {
    const features =
      extractMouthFeatures(
        sample,
      );

    const signals =
      calculateGestureSignals(
        features,
        neutral,
        mirrorHorizontal,
      );

    if (
      expectedDirection ===
      "left"
    ) {
      if (
        signals.horizontal <
        0
      ) {
        horizontalValues.push(
          Math.abs(
            signals.horizontal,
          ),
        );
      }

      /*
       * The intended left corner may move upward,
       * downward or mostly sideways depending on the
       * user's expression and landmark estimation.
       *
       * For calibration we care about how much that
       * corner moves, not the sign of its Y movement.
       */
      cornerValues.push(
        Math.abs(
          signals.leftCornerLift,
        ),
      );

      if (
        signals.lift <
        0
      ) {
        liftValues.push(
          Math.abs(
            signals.lift,
          ),
        );
      }
    } else {
      if (
        signals.horizontal >
        0
      ) {
        horizontalValues.push(
          signals.horizontal,
        );
      }

      cornerValues.push(
        Math.abs(
          signals.rightCornerLift,
        ),
      );

      if (
        signals.lift >
        0
      ) {
        liftValues.push(
          signals.lift,
        );
      }
    }
  }

  return {
    horizontalAmplitude:
      Math.max(
        robustGestureAmplitude(
          horizontalValues,
        ),
        minimumUsefulAmplitude,
      ),

    cornerAmplitude:
      Math.max(
        robustGestureAmplitude(
          cornerValues,
        ),
        minimumUsefulAmplitude,
      ),

    /*
     * Legacy/debug value.
     */
    liftAmplitude:
      Math.max(
        robustGestureAmplitude(
          liftValues,
        ),
        minimumUsefulAmplitude,
      ),
  };
}

/**
 * We deliberately do NOT use the single largest frame.
 *
 * Take the stronger 40% of samples and return their
 * median. This captures a deliberate gesture while
 * ignoring both weak transition frames and one-frame
 * detector spikes.
 */
function robustGestureAmplitude(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted =
    [...values].sort(
      (a, b) =>
        a - b,
    );

  const startIndex =
    Math.floor(
      sorted.length *
        0.6,
    );

  const strongerSamples =
    sorted.slice(
      startIndex,
    );

  return median(
    strongerSamples.length >
      0
      ? strongerSamples
      : sorted,
  );
}

function midpoint(
  a: Point,
  b: Point,
): Point {
  return {
    x:
      (a.x + b.x) /
      2,

    y:
      (a.y + b.y) /
      2,
  };
}

function median(
  values: number[],
): number {
  if (
    values.length === 0
  ) {
    return 0;
  }

  const sorted =
    [...values].sort(
      (a, b) =>
        a - b,
    );

  const middle =
    Math.floor(
      sorted.length /
        2,
    );

  if (
    sorted.length % 2 ===
    0
  ) {
    return (
      sorted[
        middle - 1
      ] +
      sorted[middle]
    ) / 2;
  }

  return sorted[middle];
}