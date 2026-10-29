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

interface Props {
  pageIndex: number;
  width: number;
  height: number;
  strokes: StrokeAnnotation[];
  settings: DrawingSettings;

  readOnly?: boolean;

  onAddStroke: (stroke: StrokeAnnotation) => void;
  onEraseStroke: (id: string) => void;
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
  onEraseStroke,
}: Props) {
  const [draft, setDraft] =
    useState<StrokeAnnotation | null>(null);

  const draftRef = useRef<StrokeAnnotation | null>(
    null
  );

  const acceptedRef = useRef(false);

  // Set only while a stylus stroke is in progress.
  const stylusActiveRef = useRef(false);

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

    if (
      settings.palmRejectionEnabled &&
      stylusActiveRef.current &&
      touch
    ) {
      return false;
    }

    // Auto mode accepts either input type.
    return stylus || touch;
  };

  const eraseAt = (point: AnnotationPoint) => {
    // Erase the topmost matching stroke.
    const hit = [...strokes]
      .reverse()
      .find((stroke) =>
        isStrokeHit(
          stroke,
          point.x,
          point.y,
          width,
          height
        )
      );

    if (hit) onEraseStroke(hit.id);
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
      eraseAt(point);
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
      // First prototype: eraser acts at contact.
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
    if (commit && draftRef.current) {
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

  const visible = draft
    ? [...strokes, draft]
    : strokes;

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