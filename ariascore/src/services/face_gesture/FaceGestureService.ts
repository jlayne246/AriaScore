import { GestureDebouncer } from "./GestureDebouncer";
import { MouthGestureRecognizer } from "./MouthGestureRecognizer";

import type {
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

interface CalibrationSession {
  samples: FaceLandmarks[];
  resolve: (success: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
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

  private calibration:
    | CalibrationSession
    | null = null;

  private static readonly CALIBRATION_SAMPLE_COUNT = 15;
  private static readonly CALIBRATION_TIMEOUT_MS = 5000;

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
   * Called by the camera/face-detection layer whenever
   * a valid face has been detected.
   */
  processLandmarks(
    landmarks: FaceLandmarks,
  ): void {
    if (!this.running) {
      return;
    }

    /*
     * Calibration gets first access to each valid sample.
     */
    if (this.calibration) {
      this.handleCalibrationSample(
        landmarks,
      );

      /*
       * Do not emit gestures while calibrating.
       */
      return;
    }

    const sample =
      this.recognizer.process(
        landmarks,
      );

    this.emitSample(sample);

    const event =
      this.debouncer.process(sample);

    if (event) {
      this.emit(event);
    }
  }

  async calibrate(): Promise<boolean> {
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

    this.debouncer.reset();

    return new Promise<boolean>(
      (resolve) => {
        const timeout = setTimeout(() => {
          if (!this.calibration) {
            return;
          }

          console.warn(
            "[FaceGestureService] Calibration timed out.",
          );

          this.calibration = null;

          resolve(false);
        }, FaceGestureService.CALIBRATION_TIMEOUT_MS);

        this.calibration = {
          samples: [],
          resolve,
          timeout,
        };
      },
    );
  }

  private handleCalibrationSample(
    landmarks: FaceLandmarks,
  ): void {
    if (!this.calibration) {
      return;
    }

    this.calibration.samples.push(
      landmarks,
    );

    console.log(
      "[Calibration]",
      this.calibration.samples.length,
      "/",
      FaceGestureService.CALIBRATION_SAMPLE_COUNT,
    );

    if (
      this.calibration.samples.length <
      FaceGestureService.CALIBRATION_SAMPLE_COUNT
    ) {
      return;
    }

    const {
      samples,
      resolve,
      timeout,
    } = this.calibration;

    clearTimeout(timeout);

    this.calibration = null;

    const success =
      this.recognizer.calibrate(
        samples,
      );

    this.debouncer.reset();

    resolve(success);
  }

  private cancelCalibration(): void {
    if (!this.calibration) {
      return;
    }

    clearTimeout(
      this.calibration.timeout,
    );

    this.calibration.resolve(false);

    this.calibration = null;
  }

  subscribe(
    listener: FaceGestureListener,
  ): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeToSamples(
    listener: FaceGestureSampleListener,
  ): () => void {
    this.sampleListeners.add(listener);

    return () => {
      this.sampleListeners.delete(
        listener,
      );
    };
  }

  resetCalibration(): void {
    this.recognizer.resetCalibration();
    this.debouncer.reset();
  }

  isCalibrated(): boolean {
    return this.recognizer.isCalibrated();
  }

  isCalibrating(): boolean {
    return this.calibration !== null;
  }

  isRunning(): boolean {
    return this.running;
  }

  private emit(
    event: FaceGestureEvent,
  ): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private emitSample(
    sample: MouthGestureSample,
  ): void {
    for (
      const listener
      of this.sampleListeners
    ) {
      listener(sample);
    }
  }
}