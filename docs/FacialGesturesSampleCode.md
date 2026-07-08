Yes. Put this aside as a future `feature/facial-gesture-poc` scaffold.

```ts
// facialGestures/types.ts

export type FacialGestureAction =
  | "nextPage"
  | "previousPage"
  | "toggleControls"
  | "bookmark";

export type FaceVector = {
  timestamp: number;

  leftEyeOpen: number;   // 0 closed → 1 open
  rightEyeOpen: number;  // 0 closed → 1 open

  mouthLeftY: number;
  mouthRightY: number;
  mouthOpen: number;

  headYaw?: number;
  headPitch?: number;
};

export type GestureProfile = {
  id: string;
  name: string;
  action: FacialGestureAction;

  neutralSample: FaceVector;
  gestureSamples: FaceVector[];

  threshold: number;
  holdMs: number;
  cooldownMs: number;
};
```

```ts
// facialGestures/vector.ts

import { FaceVector } from "./types";

export const normaliseFaceVector = (
  vector: FaceVector,
  neutral: FaceVector
): number[] => {
  return [
    vector.leftEyeOpen - neutral.leftEyeOpen,
    vector.rightEyeOpen - neutral.rightEyeOpen,
    vector.mouthLeftY - neutral.mouthLeftY,
    vector.mouthRightY - neutral.mouthRightY,
    vector.mouthOpen - neutral.mouthOpen,
    (vector.headYaw ?? 0) - (neutral.headYaw ?? 0),
    (vector.headPitch ?? 0) - (neutral.headPitch ?? 0),
  ];
};

export const distance = (a: number[], b: number[]) => {
  return Math.sqrt(
    a.reduce((sum, value, index) => {
      const diff = value - b[index];
      return sum + diff * diff;
    }, 0)
  );
};

export const averageVector = (vectors: number[][]) => {
  const length = vectors[0]?.length ?? 0;

  return Array.from({ length }, (_, index) => {
    const total = vectors.reduce((sum, vector) => sum + vector[index], 0);
    return total / vectors.length;
  });
};
```

```ts
// facialGestures/engine.ts

import {
  FaceVector,
  GestureProfile,
  FacialGestureAction,
} from "./types";

import {
  normaliseFaceVector,
  distance,
  averageVector,
} from "./vector";

type GestureEngineOptions = {
  profiles: GestureProfile[];
  onGesture: (action: FacialGestureAction, profile: GestureProfile) => void;
};

export class FacialGestureEngine {
  private profiles: GestureProfile[];
  private onGesture: GestureEngineOptions["onGesture"];

  private activeCandidateId: string | null = null;
  private candidateStartedAt = 0;
  private lastTriggeredAt = 0;
  private awaitingNeutral = false;

  constructor(options: GestureEngineOptions) {
    this.profiles = options.profiles;
    this.onGesture = options.onGesture;
  }

  update(frame: FaceVector) {
    const now = frame.timestamp;

    if (this.awaitingNeutral) {
      if (this.isNeutral(frame)) {
        this.awaitingNeutral = false;
      }

      return;
    }

    for (const profile of this.profiles) {
      if (now - this.lastTriggeredAt < profile.cooldownMs) {
        continue;
      }

      const score = this.matchScore(frame, profile);
      const matched = score >= profile.threshold;

      if (!matched) {
        if (this.activeCandidateId === profile.id) {
          this.activeCandidateId = null;
          this.candidateStartedAt = 0;
        }

        continue;
      }

      if (this.activeCandidateId !== profile.id) {
        this.activeCandidateId = profile.id;
        this.candidateStartedAt = now;
        continue;
      }

      const heldLongEnough =
        now - this.candidateStartedAt >= profile.holdMs;

      if (heldLongEnough) {
        this.lastTriggeredAt = now;
        this.activeCandidateId = null;
        this.candidateStartedAt = 0;
        this.awaitingNeutral = true;

        this.onGesture(profile.action, profile);
      }
    }
  }

  private matchScore(frame: FaceVector, profile: GestureProfile): number {
    const neutral = profile.neutralSample;

    const live = normaliseFaceVector(frame, neutral);

    const samples = profile.gestureSamples.map(sample =>
      normaliseFaceVector(sample, neutral)
    );

    const target = averageVector(samples);

    const d = distance(live, target);

    return 1 / (1 + d);
  }

  private isNeutral(frame: FaceVector): boolean {
    return (
      frame.leftEyeOpen > 0.75 &&
      frame.rightEyeOpen > 0.75 &&
      frame.mouthOpen < 0.25
    );
  }
}
```

```ts
// facialGestures/recorder.ts

import { FaceVector, GestureProfile, FacialGestureAction } from "./types";

export const createGestureProfile = ({
  id,
  name,
  action,
  neutralSample,
  gestureSamples,
}: {
  id: string;
  name: string;
  action: FacialGestureAction;
  neutralSample: FaceVector;
  gestureSamples: FaceVector[];
}): GestureProfile => {
  return {
    id,
    name,
    action,
    neutralSample,
    gestureSamples,

    threshold: 0.72,
    holdMs: 350,
    cooldownMs: 1200,
  };
};
```

Example usage later inside `BufferedPDFViewer`:

```ts
const engine = useRef<FacialGestureEngine | null>(null);

useEffect(() => {
  engine.current = new FacialGestureEngine({
    profiles,
    onGesture: (action) => {
      if (action === "nextPage") handleNextPage();
      if (action === "previousPage") handlePreviousPage();
      if (action === "toggleControls") toggleChrome();
    },
  });
}, [profiles, handleNextPage, handlePreviousPage, toggleChrome]);
```

Then your camera/face-landmark layer only needs to call:

```ts
engine.current?.update(faceVector);
```

The important abstraction is:

```text
camera / face landmarks
        ↓
FaceVector
        ↓
FacialGestureEngine
        ↓
reader action
```

So later you can swap the face-detection library without rewriting the reader.

---

That's actually one of the reasons I like this architecture—you don't have to decide today.

`engine.current?.update(faceVector)` **doesn't belong in the Reader**.

It belongs in whatever component is producing the facial landmark stream.

Think of it like this:

```text
Camera
      │
      ▼
Face Landmark Detector
      │
      ▼
FaceVector
      │
      ▼
FacialGestureEngine
      │
      ▼
Reader Actions
```

So later, you'd likely have something like:

```
src/
├── components/
│   ├── BufferedPDFViewer.tsx
│   └── FacialGestureController.tsx   👈
│
├── facialGestures/
│   ├── engine.ts
│   ├── recorder.ts
│   ├── vector.ts
│   └── types.ts
```

Then `FacialGestureController` would own the camera.

```tsx
const FacialGestureController = ({
    enabled,
    onNextPage,
    onPreviousPage,
}: Props) => {

    const engine = useRef(...);

    // Camera callback
    const onFaceDetected = (face: FaceLandmarkData) => {

        const faceVector = convertToFaceVector(face);

        engine.current?.update(faceVector);
    };

    ...
}
```

Notice the Reader never even sees `FaceVector`.

The Reader simply does:

```tsx
<BufferedPDFViewer
    ...
    onNextPage={handleNextPage}
    onPreviousPage={handlePreviousPage}
/>

{settings.performanceMode &&
 settings.inputMethod === "facial" && (
    <FacialGestureController
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        onToggleControls={toggleChrome}
    />
)}
```

The nice thing is that your reader already has the abstraction you need.

Today:

```
Tap Zone
      │
      ▼
handleNextPage()
```

Tomorrow:

```
Tap Zone ───────────────┐
Bluetooth Pedal ────────┤
Facial Gesture ─────────┤
Keyboard Arrow ─────────┤
Voice Command (future) ─┘
           │
           ▼
     handleNextPage()
```

Every input method ends up calling exactly the same Reader functions.

---

I actually think there's an even cleaner abstraction for AriaScore in the future.

Instead of calling the Reader directly, define a `ReaderController`:

```ts
interface ReaderController {
    nextPage(): void;
    previousPage(): void;

    nextScore(): void;
    previousScore(): void;

    toggleChrome(): void;

    bookmarkPage(): void;
}
```

Then:

```
FacialGestureController
        │
        ▼
ReaderController
        │
        ▼
BufferedPDFViewer
```

That would make AriaScore extremely extensible. Whether the input comes from a finger tap, facial gesture, external keyboard, or something you haven't even thought of yet, they're all just different "controllers" driving the same reader API. Given how you've been refactoring the app over the past few weeks, that architecture fits very naturally with the direction you're already taking.

---

Here’s a **future-POC scaffold**, assuming the face detector calls `onFaceDetected(...)`.

```tsx
// components/FacialGestureController.tsx

import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";

import {
  FacialGestureEngine,
} from "../facialGestures/engine";

import {
  FaceVector,
  GestureProfile,
  FacialGestureAction,
} from "../facialGestures/types";

type Props = {
  enabled: boolean;
  profiles: GestureProfile[];

  onNextPage: () => void;
  onPreviousPage: () => void;
  onToggleControls?: () => void;
};

const FacialGestureController = ({
  enabled,
  profiles,
  onNextPage,
  onPreviousPage,
  onToggleControls,
}: Props) => {
  const engineRef = useRef<FacialGestureEngine | null>(null);

  useEffect(() => {
    if (!enabled) {
      engineRef.current = null;
      return;
    }

    engineRef.current = new FacialGestureEngine({
      profiles,
      onGesture: (action: FacialGestureAction) => {
        if (action === "nextPage") onNextPage();
        if (action === "previousPage") onPreviousPage();
        if (action === "toggleControls") onToggleControls?.();
      },
    });

    return () => {
      engineRef.current = null;
    };
  }, [enabled, profiles, onNextPage, onPreviousPage, onToggleControls]);

  const onFaceDetected = (face: any) => {
    if (!enabled || !engineRef.current) return;

    const faceVector = convertFaceToVector(face);

    engineRef.current.update(faceVector);
  };

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 120,
        right: 16,
        zIndex: 3000,
        backgroundColor: "rgba(0,0,0,0.55)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>
        Facial gestures active
      </Text>

      {/* Future camera/face detector goes here.
          It should call onFaceDetected(face). */}
    </View>
  );
};

const convertFaceToVector = (face: any): FaceVector => {
  return {
    timestamp: Date.now(),

    leftEyeOpen: face.leftEyeOpenProbability ?? 1,
    rightEyeOpen: face.rightEyeOpenProbability ?? 1,

    mouthLeftY: face.landmarks?.mouthLeft?.y ?? 0,
    mouthRightY: face.landmarks?.mouthRight?.y ?? 0,
    mouthOpen:
      Math.abs(
        (face.landmarks?.mouthBottom?.y ?? 0) -
        (face.landmarks?.mouthTop?.y ?? 0)
      ) || 0,

    headYaw: face.yawAngle ?? 0,
    headPitch: face.pitchAngle ?? 0,
  };
};

export default FacialGestureController;
```

Then later in `BufferedPDFViewer`:

```tsx
<FacialGestureController
  enabled={settings.performanceMode && settings.facialGestures}
  profiles={gestureProfiles}
  onNextPage={handleNextPage}
  onPreviousPage={handlePreviousPage}
  onToggleControls={toggleChrome}
/>
```

This keeps the facial-gesture system separate from the reader. The controller detects gestures; the reader just receives normal page-turn commands.
