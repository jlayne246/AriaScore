import {
  CameraFrame,
  FaceLandmarks,
  Point,
} from "./types";

export class FaceLandmarkDetector {
  async detect(
    frame: CameraFrame,
  ): Promise<FaceLandmarks | null> {
    /**
     * TODO:
     *
     * Pass frame.nativeFrame to your actual face detector.
     *
     * Example flow:
     *
     * const faces = await detector.detect(frame.nativeFrame);
     *
     * if (faces.length === 0) {
     *   return null;
     * }
     *
     * const face = faces[0];
     *
     * Convert the detector-specific landmark format into the
     * application-level FaceLandmarks interface below.
     */

    return null;
  }

  /**
   * Helper for calculating the midpoint between two landmarks.
   */
  static midpoint(a: Point, b: Point): Point {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  }
}