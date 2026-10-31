import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Canvas,
  Path,
  Skia,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  PointerType,
} from "react-native-gesture-handler";

import {
  AnnotationPoint,
  DrawingSettings,
  StrokeAnnotation,
} from "./types";

import {
  useZoomPinchGesture,
  useZoomSinglePanGesture,
} from "../reader/ZoomablePage";

interface Props {
  pageIndex: number;
  width: number;
  height: number;
  strokes: StrokeAnnotation[];
  settings: DrawingSettings;

  readOnly?: boolean;

  onAddStroke: (stroke: StrokeAnnotation) => void;
  onEraseStrokes: (ids: string[]) => void;
}

const clamp = (value: number) =>
  Math.max(0, Math.min(1, value));

function buildPath(
  points: AnnotationPoint[],
  width: number,
  height: number
) {
  const path = Skia.Path.Make();

  if (points.length === 0) return path;

  const first = points[0];

  path.moveTo(
    first.x * width,
    first.y * height
  );

  if (points.length === 1) {
    // Render a tiny segment for a single tap.
    path.lineTo(
      first.x * width + 0.01,
      first.y * height
    );
  }

  for (let i = 1; i < points.length; i++) {
    path.lineTo(
      points[i].x * width,
      points[i].y * height
    );
  }

  return path;
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;

  if (length === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((px - ax) * dx + (py - ay) * dy) / length
    )
  );

  return Math.hypot(
    px - (ax + t * dx),
    py - (ay + t * dy)
  );
}

function isStrokeHitAlongMovement(
  stroke: StrokeAnnotation,
  from: AnnotationPoint,
  to: AnnotationPoint,
  width: number,
  height: number
): boolean {
  const distance = Math.hypot(
    (to.x - from.x) * width,
    (to.y - from.y) * height
  );

  // Test intermediate points so fast movements
  // cannot jump over narrow strokes.
  const steps = Math.max(
    1,
    Math.ceil(distance / 5)
  );

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;

    if (
      isStrokeHit(
        stroke,
        x,
        y,
        width,
        height
      )
    ) {
      return true;
    }
  }

  return false;
}

function isStrokeHit(
  stroke: StrokeAnnotation,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const points = stroke.points;
  if (!points.length) return false;

  const px = x * width;
  const py = y * height;

  const radius = Math.max(
    12,
    (stroke.strokeWidth * width) / 2 + 6
  );

  if (points.length === 1) {
    return (
      Math.hypot(
        px - points[0].x * width,
        py - points[0].y * height
      ) <= radius
    );
  }

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    if (
      distanceToSegment(
        px,
        py,
        a.x * width,
        a.y * height,
        b.x * width,
        b.y * height
      ) <= radius
    ) {
      return true;
    }
  }

  return false;
}

export function AnnotationCanvas({
  pageIndex,
  width,
  height,
  strokes,
  settings,
  readOnly = false,
  onAddStroke,
  onEraseStrokes,
}: Props) {
  const [draft, setDraft] =
    useState<StrokeAnnotation | null>(null);

  const draftRef = useRef<StrokeAnnotation | null>(
    null
  );

  const acceptedRef = useRef(false);

  // Set only while a stylus stroke is in progress.
  const stylusActiveRef = useRef(false);

  const erasedIdsRef = useRef<Set<string>>(new Set());

  const lastEraserPointRef =
    useRef<AnnotationPoint | null>(null);

  const [pendingErasedIds, setPendingErasedIds] =
    useState<Set<string>>(() => new Set());

  const zoomPinch = useZoomPinchGesture();
  const zoomSinglePan = useZoomSinglePanGesture();

  React.useEffect(() => {
    console.log("[Annotation DEBUG] Canvas received:", {
      pageIndex,
      readOnly,
      strokeCount: strokes.length,
      strokeIds: strokes.map((s) => s.id),
    });
  }, [pageIndex, readOnly, strokes]);

  const toPoint = (
    x: number,
    y: number,
    pressure?: number
  ): AnnotationPoint => ({
    x: clamp(x / width),
    y: clamp(y / height),
    pressure,
  });

  const acceptsInput = (pointer: PointerType) => {
    const stylus = pointer === PointerType.STYLUS;
    const touch = pointer === PointerType.TOUCH;

    if (settings.inputMode === "stylus") {
      return stylus;
    }

    if (settings.inputMode === "touch") {
      return touch;
    }

    if (settings.palmRejectionEnabled && touch) {
      return false;
    }

    // Auto mode accepts either input type.
    return stylus || touch;
  };

  const eraseAlongPath = (
    point: AnnotationPoint
  ) => {
    const previous =
      lastEraserPointRef.current ?? point;

    const newlyErased: string[] = [];

    for (const stroke of strokes) {
      if (erasedIdsRef.current.has(stroke.id)) {
        continue;
      }

      if (
        isStrokeHitAlongMovement(
          stroke,
          previous,
          point,
          width,
          height
        )
      ) {
        erasedIdsRef.current.add(stroke.id);
        newlyErased.push(stroke.id);
      }
    }

    lastEraserPointRef.current = point;

    if (newlyErased.length > 0) {
      setPendingErasedIds(
        new Set(erasedIdsRef.current)
      );
    }
  };

  const start = (
    x: number,
    y: number,
    pointer: PointerType,
    pressure?: number
  ) => {
    console.log("[Annotation] Touch started", {
        x,
        y,
        pointer,
        inputMode: settings.inputMode,
    });

    acceptedRef.current = acceptsInput(pointer);

    console.log(
        "[Annotation] Input accepted:",
        acceptedRef.current
    );

    if (!acceptedRef.current) return;

    stylusActiveRef.current =
      pointer === PointerType.STYLUS;

    const point = toPoint(x, y, pressure);

    if (settings.tool === "eraser") {
      erasedIdsRef.current = new Set();
      lastEraserPointRef.current = point;

      setPendingErasedIds(new Set());

      eraseAlongPath(point);
      return;
    }

    const now = Date.now();

    const stroke: StrokeAnnotation = {
      id: `${now}-${Math.random()
        .toString(36)
        .slice(2)}`,
      pageIndex,
      type: settings.tool,
      color: settings.color,
      opacity: settings.opacity,
      strokeWidth: settings.width / width,
      points: [point],
      createdAt: now,
      updatedAt: now,
    };

    draftRef.current = stroke;
    setDraft(stroke);
  };

  const move = (
    x: number,
    y: number,
    pressure?: number
  ) => {
    if (!acceptedRef.current) return;

    if (settings.tool === "eraser") {
      const point = toPoint(x, y, pressure);
      eraseAlongPath(point);
      return;
    }

    const current = draftRef.current;
    if (!current) return;

    const point = toPoint(x, y, pressure);

    const updated: StrokeAnnotation = {
      ...current,
      points: [...current.points, point],
      updatedAt: Date.now(),
    };

    draftRef.current = updated;
    setDraft(updated);
  };

  const finish = (commit: boolean) => {
    if (settings.tool === "eraser") {
      const ids = [...erasedIdsRef.current];

      if (
        commit &&
        acceptedRef.current &&
        ids.length > 0
      ) {
        console.log(
          "[Annotation] Batch erasing:",
          ids.length,
          "strokes"
        );

        onEraseStrokes(ids);
      }

      erasedIdsRef.current = new Set();
      lastEraserPointRef.current = null;
      setPendingErasedIds(new Set());

    } else if (
      commit &&
      acceptedRef.current &&
      draftRef.current
    ) {
      onAddStroke(draftRef.current);
    }

    draftRef.current = null;
    acceptedRef.current = false;
    stylusActiveRef.current = false;

    setDraft(null);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .runOnJS(true)
    .onBegin((event) => {
      if (event.numberOfPointers !== 1) return;

      start(
        event.x,
        event.y,
        event.pointerType,
        event.stylusData?.pressure
      );
    })
    .onUpdate((event) => {
      if (event.numberOfPointers !== 1) return;

      move(
        event.x,
        event.y,
        event.stylusData?.pressure
      );
    })
    .onFinalize((_event, success) => {
      finish(success);
    });

  if (zoomPinch) {
    pan.simultaneousWithExternalGesture(zoomPinch);
  }

  if (zoomSinglePan) {
    pan.simultaneousWithExternalGesture(zoomSinglePan);
  }

  const remainingStrokes = strokes.filter(
    (stroke) => !pendingErasedIds.has(stroke.id)
  );

  const visible = draft
    ? [...remainingStrokes, draft]
    : remainingStrokes;

    const canvasContent = (
    <View
        style={{ width, height }}
        collapsable={false}
        pointerEvents={readOnly ? "none" : "auto"}
    >
        <Canvas
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        >
        {visible.map((stroke) => (
            <Path
            key={stroke.id}
            path={buildPath(
                stroke.points,
                width,
                height
            )}
            color={stroke.color}
            style="stroke"
            strokeWidth={
                stroke.strokeWidth * width
            }
            strokeCap="round"
            strokeJoin="round"
            opacity={stroke.opacity}
            />
        ))}
        </Canvas>
    </View>
    );

    if (readOnly) {
    return canvasContent;
    }

    return (
    <GestureDetector gesture={pan}>
        {canvasContent}
    </GestureDetector>
    );
}