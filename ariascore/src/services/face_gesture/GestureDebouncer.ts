import {
  FaceGestureEvent,
  MouthGestureDirection,
  MouthGestureSample,
} from "./types";

export interface GestureDebouncerOptions {
  /**
   * Minimum time between emitted gestures.
   */
  cooldownMs: number;

  /**
   * Samples required for a weaker but still valid gesture.
   */
  weakRequiredSamples: number;

  /**
   * Samples required once the gesture is clearly strong.
   */
  strongRequiredSamples: number;

  /**
   * Calibrated normalized strength at which we treat
   * the gesture as strong.
   *
   * Example:
   * 0.65 means 65% of the gesture demonstrated during
   * calibration.
   */
  strongStrengthThreshold: number;

  /**
   * Neutral frames allowed while building a candidate
   * before abandoning it.
   */
  neutralToleranceSamples: number;

  /**
   * Consecutive neutral frames required after a gesture
   * fires before another gesture may fire.
   */
  neutralReleaseSamples: number;

  /**
   * Maximum time between contributing samples before
   * the current candidate is considered stale.
   */
  candidateTimeoutMs: number;
}

// const DEFAULT_OPTIONS: GestureDebouncerOptions = {
//   cooldownMs: 400,

//   weakRequiredSamples: 2, // next, 5
//   strongRequiredSamples: 1, // next, 4

//   strongStrengthThreshold: 0.9,

//   neutralToleranceSamples: 1,
//   neutralReleaseSamples: 2,

//   candidateTimeoutMs: 600,
// };

const DEFAULT_OPTIONS: GestureDebouncerOptions = {
  cooldownMs: 400,

  weakRequiredSamples: 2,
  strongRequiredSamples: 1,
  strongStrengthThreshold: 0.8,

  neutralToleranceSamples: 1,
  neutralReleaseSamples: 2,

  candidateTimeoutMs: 600,
};

type ActiveDirection = Exclude<
  MouthGestureDirection,
  "neutral"
>;

export class GestureDebouncer {
  private readonly options:
    GestureDebouncerOptions;

  private candidate:
    | ActiveDirection
    | null = null;

  private candidateCount = 0;

  /**
   * Highest normalized strength seen for the current
   * candidate.
   */
  private candidatePeakStrength = 0;

  /**
   * Number of neutral frames tolerated while building
   * the current candidate.
   */
  private candidateNeutralCount = 0;

  /**
   * Timestamp of the last non-neutral sample belonging
   * to the current candidate.
   */
  private lastCandidateSampleTime = 0;

  /**
   * Once a gesture fires, another cannot fire until
   * the mouth has returned to neutral for several
   * consecutive samples.
   */
  private waitingForNeutral = false;

  private releaseNeutralCount = 0;

  private lastTriggerTime = 0;

  constructor(
    options: Partial<GestureDebouncerOptions> = {},
  ) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  process(
    sample: MouthGestureSample,
  ): FaceGestureEvent | null {
    /*
     * First handle the release state after a gesture
     * has already fired.
     */
    if (this.waitingForNeutral) {
      if (
        sample.direction === "neutral"
      ) {
        this.releaseNeutralCount += 1;

        if (
          this.releaseNeutralCount >=
          this.options
            .neutralReleaseSamples
        ) {
          this.waitingForNeutral =
            false;

          this.releaseNeutralCount =
            0;

          this.resetCandidate();
        }
      } else {
        /*
         * Neutral release must be consecutive.
         */
        this.releaseNeutralCount = 0;
      }

      return null;
    }

    /*
     * Respect global cooldown.
     */
    if (
      sample.timestamp -
        this.lastTriggerTime <
      this.options.cooldownMs
    ) {
      return null;
    }

    /*
     * Neutral while building a candidate.
     *
     * One noisy neutral frame can be tolerated.
     */
    if (
      sample.direction === "neutral"
    ) {
      if (!this.candidate) {
        return null;
      }

      this.candidateNeutralCount +=
        1;

      if (
        this.candidateNeutralCount >
        this.options
          .neutralToleranceSamples
      ) {
        this.resetCandidate();
      }

      return null;
    }

    /*
     * Prevent stale evidence from accumulating.
     */
    if (
      this.candidate &&
      this.lastCandidateSampleTime >
        0 &&
      sample.timestamp -
        this.lastCandidateSampleTime >
        this.options
          .candidateTimeoutMs
    ) {
      this.resetCandidate();
    }

    const strength =
      sample.normalizedStrength ??
      0;

    /*
     * Continue existing directional candidate.
     */
    if (
      sample.direction ===
      this.candidate
    ) {
      this.candidateCount += 1;

      this.candidatePeakStrength =
        Math.max(
          this.candidatePeakStrength,
          strength,
        );

      this.candidateNeutralCount =
        0;
    } else {
      /*
       * Opposite direction immediately starts a new
       * candidate.
       */
      this.candidate =
        sample.direction;

      this.candidateCount =
        1;

      this.candidatePeakStrength =
        strength;

      this.candidateNeutralCount =
        0;
    }

    this.lastCandidateSampleTime =
      sample.timestamp;

    const requiredSamples =
      this.getRequiredSamples(
        this.candidatePeakStrength,
      );

    if (
      this.candidateCount <
      requiredSamples
    ) {
      return null;
    }

    const event =
      this.createEvent(sample);

    this.lastTriggerTime =
      sample.timestamp;

    this.waitingForNeutral =
      true;

    this.releaseNeutralCount =
      0;

    this.resetCandidate();

    return event;
  }

  reset(): void {
    this.resetCandidate();

    this.waitingForNeutral =
      false;

    this.releaseNeutralCount =
      0;

    this.lastTriggerTime = 0;
  }

  private getRequiredSamples(
    strength: number,
  ): number {
    if (
      strength >=
      this.options
        .strongStrengthThreshold
    ) {
      return this.options
        .strongRequiredSamples;
    }

    return this.options
      .weakRequiredSamples;
  }

  private createEvent(
    sample: MouthGestureSample,
  ): FaceGestureEvent {
    switch (
      sample.direction
    ) {
      case "left":
        return {
          type: "mouth-left",
          timestamp:
            sample.timestamp,
        };

      case "right":
        return {
          type: "mouth-right",
          timestamp:
            sample.timestamp,
        };

      default:
        throw new Error(
          "Cannot create gesture event from neutral sample.",
        );
    }
  }

  private resetCandidate(): void {
    this.candidate = null;

    this.candidateCount = 0;

    this.candidatePeakStrength =
      0;

    this.candidateNeutralCount =
      0;

    this.lastCandidateSampleTime =
      0;
  }
}