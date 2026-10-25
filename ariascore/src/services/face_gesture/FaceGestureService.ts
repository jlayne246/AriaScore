import { GestureDebouncer } from "./GestureDebouncer";
import { MouthGestureRecognizer } from "./MouthGestureRecognizer";

import {
  buildFaceGestureCalibration,
} from "./FaceGestureCalibration";

import {
  clearFaceGestureCalibration,
  loadFaceGestureCalibration,
  saveFaceGestureCalibration,
} from "./FaceGestureCalibrationStore";

import type {
  FaceGestureCalibration,
  FaceGestureCalibrationPhase,
  FaceGestureEvent,
  FaceLandmarks,
  MouthGestureSample,
} from "./types";

export type FaceGestureListener = (
  event: FaceGestureEvent,
) => void;

export type FaceGestureSampleListener = (
  sample: MouthGestureSample,
) => void;

export interface CalibrationProgress {
  phase: FaceGestureCalibrationPhase;
  collected: number;
  required: number;
}

interface CalibrationSession {
  phase: FaceGestureCalibrationPhase;
  samples: FaceLandmarks[];
  resolve: (success: boolean) => void;

  timeout:
    ReturnType<typeof setTimeout> | null;
}

interface CalibrationSamples {
  neutral: FaceLandmarks[];
  left: FaceLandmarks[];
  right: FaceLandmarks[];
}

export class FaceGestureService {
  private readonly recognizer =
    new MouthGestureRecognizer();

  private readonly debouncer =
    new GestureDebouncer();

  private listeners =
    new Set<FaceGestureListener>();

  private sampleListeners =
    new Set<FaceGestureSampleListener>();

  private running = false;

  /**
   * Active calibration phase.
   */
  private calibration:
    | CalibrationSession
    | null = null;

  /**
   * Samples collected across the current calibration
   * sequence.
   *
   * neutral -> left -> right
   */
  private calibrationSamples:
    CalibrationSamples = {
      neutral: [],
      left: [],
      right: [],
    };

  private static readonly CALIBRATION_SAMPLE_COUNT = 8;
  private static readonly CALIBRATION_TIMEOUT_MS = 30000;

  async loadSavedCalibration():
    Promise<boolean> {
    try {
      const calibration =
        await loadFaceGestureCalibration();

      if (!calibration) {
        return false;
      }

      this.recognizer.setCalibration(
        calibration,
      );

      this.debouncer.reset();

      console.log(
        "[FaceGestureService] Saved calibration restored.",
      );

      return true;
    } catch (error) {
      console.warn(
        "[FaceGestureService] Failed to restore calibration:",
        error,
      );

      return false;
    }
  }

  async clearSavedCalibration():
    Promise<void> {
    await clearFaceGestureCalibration();

    this.resetCalibration();
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    this.debouncer.reset();

    console.log(
      "[FaceGestureService] started",
    );
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.cancelCalibration();

    this.debouncer.reset();

    this.running = false;

    console.log(
      "[FaceGestureService] stopped",
    );
  }

  /**
   * Called by the camera / face-detection layer whenever
   * a valid face has been detected.
   */
  processLandmarks(
    landmarks: FaceLandmarks,
  ): void {
    if (!this.running) {
      return;
    }

    /*
     * Calibration always gets first access to landmarks.
     *
     * Do not perform gesture recognition while collecting
     * a calibration phase.
     */
    if (this.calibration) {
      this.handleCalibrationSample(
        landmarks,
      );

      return;
    }

    const sample =
      this.recognizer.process(
        landmarks,
      );

    this.emitSample(
      sample,
    );

    const event =
      this.debouncer.process(
        sample,
      );

    if (event) {
      this.emit(
        event,
      );
    }
  }

  /**
   * Capture one calibration phase.
   *
   * Expected order:
   *
   * neutral
   *   -> left
   *   -> right
   *
   * Completing the right phase automatically builds
   * and installs the final calibration profile.
   */
  async calibratePhase(
    phase: FaceGestureCalibrationPhase,
  ): Promise<boolean> {
    if (!this.running) {
      throw new Error(
        "Face gesture service must be running before calibration.",
      );
    }

    if (this.calibration) {
      throw new Error(
        "Calibration is already in progress.",
      );
    }

    this.validateCalibrationPhase(
      phase,
    );

    /*
     * Beginning neutral means beginning a completely new
     * calibration sequence.
     */
    if (
      phase === "neutral"
    ) {
      this.calibrationSamples = {
        neutral: [],
        left: [],
        right: [],
      };

      /*
       * Keep the old installed profile until the new
       * calibration completes successfully.
       *
       * This means a failed recalibration does not destroy
       * a previously working profile.
       */
    }

    this.debouncer.reset();

    return new Promise<boolean>(
      resolve => {
        const session: CalibrationSession = {
          phase,
          samples: [],
          resolve,
          timeout: null,
        };

        session.timeout =
          setTimeout(
            () => {
              if (
                this.calibration !==
                session
              ) {
                return;
              }

              console.warn(
                `[FaceGestureService] ${phase} calibration timed out.`,
              );

              this.calibration =
                null;

              this.debouncer.reset();

              resolve(false);
            },
            FaceGestureService
              .CALIBRATION_TIMEOUT_MS,
          );

        this.calibration =
          session;

        console.log(
          `[FaceGestureService] Calibration phase started: ${phase}`,
        );
      },
    );
  }

  /**
   * Convenience methods for UI code.
   */
  calibrateNeutral():
    Promise<boolean> {
    return this.calibratePhase(
      "neutral",
    );
  }

  calibrateLeft():
    Promise<boolean> {
    return this.calibratePhase(
      "left",
    );
  }

  calibrateRight():
    Promise<boolean> {
    return this.calibratePhase(
      "right",
    );
  }

  private handleCalibrationSample(
  landmarks: FaceLandmarks,
): void {
  const session =
    this.calibration;

  if (!session) {
    return;
  }

  /*
   * Every valid sample proves the detector is still
   * making progress, so restart the inactivity timeout.
   */
  if (
    session.timeout !==
    null
  ) {
    clearTimeout(
      session.timeout,
    );
  }

  session.timeout =
    setTimeout(
      () => {
        if (
          this.calibration !==
          session
        ) {
          return;
        }

        console.warn(
          `[FaceGestureService] ${session.phase} calibration timed out due to no new valid samples.`,
        );

        this.calibration =
          null;

        this.debouncer.reset();

        session.resolve(
          false,
        );
      },
      FaceGestureService
        .CALIBRATION_TIMEOUT_MS,
    );

  session.samples.push(
    landmarks,
  );

  console.log(
    `[Calibration:${session.phase}]`,
    session.samples.length,
    "/",
    FaceGestureService.CALIBRATION_SAMPLE_COUNT,
  );

  if (
    session.samples.length <
    FaceGestureService
      .CALIBRATION_SAMPLE_COUNT
  ) {
    return;
  }

  const {
    phase,
    samples,
    resolve,
    timeout,
  } = session;

  if (
    timeout !==
    null
  ) {
    clearTimeout(
      timeout,
    );
  }

  this.calibration =
    null;

  /*
   * Store the completed phase.
   */
  this.calibrationSamples[
    phase
  ] = [
    ...samples,
  ];

  console.log(
    `[FaceGestureService] Calibration phase completed: ${phase}`,
  );

  /*
   * Neutral and left are intermediate phases.
   */
  if (
    phase !==
    "right"
  ) {
    this.debouncer.reset();

    resolve(
      true,
    );

    return;
  }

  /*
   * Right completes the sequence.
   */
  const calibration =
    buildFaceGestureCalibration(
      this.calibrationSamples,
      {
        mirrorHorizontal:
          true,
      },
    );

  if (
    !calibration
  ) {
    console.warn(
      "[FaceGestureService] Unable to build calibration profile.",
    );

    this.debouncer.reset();

    resolve(
      false,
    );

    return;
  }

  this.recognizer
    .setCalibration(
      calibration,
    );

  void saveFaceGestureCalibration(
    calibration,
  ).catch(
    (error) => {
      console.warn(
        "[FaceGestureService] Failed to save calibration:",
        error,
      );
    },
  );

  this.debouncer.reset();

  console.log(
    "[FaceGestureService] Dynamic calibration complete.",
    {
      left:
        calibration.left,

      right:
        calibration.right,

      neutralPose:
        calibration.neutralPose,
    },
  );

  resolve(
    true,
  );
}

  /**
   * Enforce neutral -> left -> right.
   */
  private validateCalibrationPhase(
    phase: FaceGestureCalibrationPhase,
  ): void {
    if (
      phase === "neutral"
    ) {
      return;
    }

    if (
      phase === "left" &&
      this.calibrationSamples
        .neutral.length === 0
    ) {
      throw new Error(
        "Neutral calibration must be completed before left calibration.",
      );
    }

    if (
      phase === "right"
    ) {
      if (
        this.calibrationSamples
          .neutral.length === 0
      ) {
        throw new Error(
          "Neutral calibration must be completed before right calibration.",
        );
      }

      if (
        this.calibrationSamples
          .left.length === 0
      ) {
        throw new Error(
          "Left calibration must be completed before right calibration.",
        );
      }
    }
  }

  private cancelCalibration(): void {
    if (!this.calibration) {
      return;
    }

    if (
      this.calibration.timeout !==
      null
    ) {
      clearTimeout(
        this.calibration.timeout,
      );
    }

    this.calibration.resolve(
      false,
    );

    this.calibration =
      null;
  }

  /**
   * Cancel only the currently collecting phase.
   *
   * Previously completed neutral/left samples remain
   * available so the user can retry the failed phase.
   */
  cancelCalibrationPhase(): void {
    this.cancelCalibration();

    this.debouncer.reset();
  }

  /**
   * Discard the entire in-progress calibration sequence.
   */
  resetCalibrationSequence(): void {
    this.cancelCalibration();

    this.calibrationSamples = {
      neutral: [],
      left: [],
      right: [],
    };

    this.debouncer.reset();
  }

  getCalibrationProgress():
    | CalibrationProgress
    | null {
    if (!this.calibration) {
      return null;
    }

    return {
      phase:
        this.calibration.phase,

      collected:
        this.calibration.samples.length,

      required:
        FaceGestureService
          .CALIBRATION_SAMPLE_COUNT,
    };
  }

  getCalibrationPhase():
    | FaceGestureCalibrationPhase
    | null {
    return (
      this.calibration?.phase ??
      null
    );
  }

  /**
   * Returns which calibration stages have already been
   * successfully collected during the current sequence.
   */
  getCalibrationSequenceState(): {
    neutral: boolean;
    left: boolean;
    right: boolean;
  } {
    return {
      neutral:
        this.calibrationSamples
          .neutral.length > 0,

      left:
        this.calibrationSamples
          .left.length > 0,

      right:
        this.calibrationSamples
          .right.length > 0,
    };
  }

  subscribe(
    listener: FaceGestureListener,
  ): () => void {
    this.listeners.add(
      listener,
    );

    return () => {
      this.listeners.delete(
        listener,
      );
    };
  }

  subscribeToSamples(
    listener:
      FaceGestureSampleListener,
  ): () => void {
    this.sampleListeners.add(
      listener,
    );

    return () => {
      this.sampleListeners.delete(
        listener,
      );
    };
  }

  /**
   * Remove the installed calibration entirely.
   */
  resetCalibration(): void {
    this.cancelCalibration();

    this.calibrationSamples = {
      neutral: [],
      left: [],
      right: [],
    };

    this.recognizer
      .resetCalibration();

    this.debouncer.reset();
  }

  isCalibrated(): boolean {
    return this.recognizer
      .isCalibrated();
  }

  isCalibrating(): boolean {
    return (
      this.calibration !==
      null
    );
  }

  isRunning(): boolean {
    return this.running;
  }

  getCalibration():
    | FaceGestureCalibration
    | null {
    return this.recognizer
      .getCalibration();
  }

  private emit(
    event: FaceGestureEvent,
  ): void {
    for (
      const listener
      of this.listeners
    ) {
      listener(
        event,
      );
    }
  }

  private emitSample(
    sample: MouthGestureSample,
  ): void {
    for (
      const listener
      of this.sampleListeners
    ) {
      listener(
        sample,
      );
    }
  }
}