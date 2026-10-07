import { CameraFrame } from "./types";

export type FrameListener = (frame: CameraFrame) => void;

export class CameraFrameSource {
  private listener: FrameListener | null = null;
  private running = false;

  async start(listener: FrameListener): Promise<void> {
    if (this.running) {
      return;
    }

    this.listener = listener;
    this.running = true;

    /**
     * TODO:
     *
     * Connect to your actual front-camera frame processor here.
     *
     * Whenever a frame becomes available:
     *
     * this.listener?.({
     *   nativeFrame: frame,
     *   width: frame.width,
     *   height: frame.height,
     *   timestamp: Date.now(),
     * });
     */
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    /**
     * TODO:
     * Detach/stop the native camera frame processor here.
     */

    this.listener = null;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}