import {
  FaceGestureEvent,
  MouthGestureDirection,
  MouthGestureSample,
} from "./types";

export interface GestureDebouncerOptions {
  requiredSamples: number;
  cooldownMs: number;
}

const DEFAULT_OPTIONS: GestureDebouncerOptions = {
  requiredSamples: 3,
  cooldownMs: 400,
};

export class GestureDebouncer {
  private readonly options:
    GestureDebouncerOptions;

  private candidate:
    | MouthGestureDirection
    | null = null;

  private candidateCount = 0;

  /**
   * Once a gesture fires, another cannot fire until
   * the user's mouth returns to neutral.
   */
  private waitingForNeutral = false;

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
    if (sample.direction === "neutral") {
      this.resetCandidate();
      this.waitingForNeutral = false;

      return null;
    }

    if (this.waitingForNeutral) {
      return null;
    }

    if (
      sample.timestamp -
        this.lastTriggerTime <
      this.options.cooldownMs
    ) {
      return null;
    }

    if (
      sample.direction === this.candidate
    ) {
      this.candidateCount += 1;
    } else {
      this.candidate = sample.direction;
      this.candidateCount = 1;
    }

    if (
      this.candidateCount <
      this.options.requiredSamples
    ) {
      return null;
    }

    const event =
      this.createEvent(sample);

    this.lastTriggerTime =
      sample.timestamp;

    this.waitingForNeutral = true;

    this.resetCandidate();

    return event;
  }

  reset(): void {
    this.resetCandidate();

    this.waitingForNeutral = false;
    this.lastTriggerTime = 0;
  }

  private createEvent(
    sample: MouthGestureSample,
  ): FaceGestureEvent {
    switch (sample.direction) {
      case "left":
        return {
          type: "mouth-left",
          timestamp: sample.timestamp,
        };

      case "right":
        return {
          type: "mouth-right",
          timestamp: sample.timestamp,
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
  }
}