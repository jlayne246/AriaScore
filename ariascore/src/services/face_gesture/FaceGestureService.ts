import { CameraFrameSource } from "./CameraFrameSource";
import { FaceLandmarkDetector } from "./FaceLandmarkDetector";
import { GestureDebouncer } from "./GestureDebouncer";
import { MouthGestureRecognizer } from "./MouthGestureRecognizer";

import {
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
  private readonly camera =
    new CameraFrameSource();

  private readonly detector =
    new FaceLandmarkDetector();

  private readonly recognizer =
    new MouthGestureRecognizer();

  private readonly debouncer =
    new GestureDebouncer();

  private listeners =
    new Set<FaceGestureListener>();

  private sampleListeners =
    new Set<FaceGestureSampleListener>();

  private running = false;
  private processingFrame = false;

  private calibration:
    | CalibrationSession
    | null = null;

  private static readonly CALIBRATION_SAMPLE_COUNT = 20;
  private static readonly CALIBRATION_TIMEOUT_MS = 3000;

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    await this.camera.start(
      async (frame) => {
        if (this.processingFrame) {
          return;
        }

        this.processingFrame = true;

        try {
          const landmarks =
            await this.detector.detect(frame);

          if (!landmarks) {
            return;
          }

          /*
           * If calibration is active, collect the landmarks
           * before running normal recognition.
           */
          this.handleCalibrationSample(
            landmarks,
          );

          const sample =
            this.recognizer.process(
              landmarks,
            );

          this.emitSample(sample);

          /*
           * I'd suppress actual gesture events while
           * calibration is in progress.
           */
          if (this.calibration) {
            return;
          }

          const event =
            this.debouncer.process(
              sample,
            );

          if (event) {
            this.emit(event);
          }
        } catch (error) {
          console.error(
            "[FaceGestureService] Frame processing failed:",
            error,
          );
        } finally {
          this.processingFrame = false;
        }
      },
    );
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.cancelCalibration();

    this.camera.stop();
    this.debouncer.reset();

    this.running = false;
    this.processingFrame = false;
  }

  async calibrate(): Promise<boolean> {
    if (!this.running) {
      throw new Error(
        "Face gesture service must be running before calibration.",
      );
    }

    /*
     * Prevent overlapping calibration attempts.
     */
    if (this.calibration) {
      throw new Error(
        "Calibration is already in progress.",
      );
    }

    /*
     * Reset old state so stale gestures don't fire immediately
     * after calibration.
     */
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

    /*
     * Clear calibration first, so the service returns
     * to normal processing after this frame.
     */
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
      const listener of this.sampleListeners
    ) {
      listener(sample);
    }
  }
}