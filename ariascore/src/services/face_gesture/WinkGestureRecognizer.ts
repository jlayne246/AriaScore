import type { FaceGestureEvent, FaceLandmarks } from "./types";

/**
 * Frame-based wink recognition with a minimum hold and explicit neutral rearm.
 * Eye classifications may be unavailable at extreme angles; fail closed.
 */
export class WinkGestureRecognizer {
  private candidate: "left" | "right" | null = null;
  private candidateSince = 0;
  private lastSampleAt = 0;
  private waitingForRelease = false;
  private neutralSince = 0;
  private lastTriggerAt = 0;

  reset(): void {
    this.candidate = null;
    this.candidateSince = 0;
    this.lastSampleAt = 0;
    this.waitingForRelease = false;
    this.neutralSince = 0;
    this.lastTriggerAt = 0;
  }

  process(face: FaceLandmarks): FaceGestureEvent | null {
    const left = face.leftEyeOpenProbability;
    const right = face.rightEyeOpenProbability;
    const now = face.timestamp;

    if (typeof left !== "number" || typeof right !== "number" ||
        !Number.isFinite(left) || !Number.isFinite(right)) {
      this.candidate = null;
      this.candidateSince = 0;
      this.neutralSince = 0;
      return null;
    }

    const neutral = left >= 0.7 && right >= 0.7;
    const direction: "left" | "right" | null =
      left <= 0.25 && right >= 0.75 ? "left" :
      right <= 0.25 && left >= 0.75 ? "right" : null;

    if (this.waitingForRelease) {
      if (neutral) {
        if (!this.neutralSince) this.neutralSince = now;
        if (now - this.neutralSince >= 200) {
          this.waitingForRelease = false;
          this.neutralSince = 0;
        }
      } else {
        this.neutralSince = 0;
      }
      return null;
    }

    if (!direction) {
      this.candidate = null;
      this.candidateSince = 0;
      return null;
    }

    if (this.candidate !== direction || now - this.lastSampleAt > 300) {
      this.candidate = direction;
      this.candidateSince = now;
    }
    this.lastSampleAt = now;

    if (now - this.candidateSince < 300 || now - this.lastTriggerAt < 700) {
      return null;
    }

    this.lastTriggerAt = now;
    this.waitingForRelease = true;
    this.candidate = null;
    this.candidateSince = 0;
    return {type: direction === "left" ? "wink-left" : "wink-right", timestamp: now};
  }
}
