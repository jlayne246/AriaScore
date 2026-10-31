
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Path,
} from "react-native-svg";

type HSV = {
  h: number;
  s: number;
  v: number;
};

type DragTarget = "hue" | "sv" | null;

interface Props {
  color: string;
  onChange: (color: string) => void;
  accentColor: string;
}

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 97;
const RING_WIDTH = 20;
const SQUARE = 120;
const SQUARE_START = (SIZE - SQUARE) / 2;

const clamp = (
  value: number,
  min = 0,
  max = 1
) => Math.max(min, Math.min(max, value));

// HSV -> HEX

function hsvToHex({
  h,
  s,
  v,
}: HSV): string {
  const c = v * s;
  const hh =
    (((h % 360) + 360) % 360) / 60;

  const x =
    c * (1 - Math.abs((hh % 2) - 1));

  const m = v - c;

  const components: [
    number,
    number,
    number
  ][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
    [c, x, 0],
  ];

  const [r, g, b] =
    components[Math.floor(hh) % 6];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`.toUpperCase();
}

// HEX -> HSV

function hexToHsv(hex: string): HSV {
  const normalized = hex
    .trim()
    .replace(/^#/, "");

  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return {
      h: 0,
      s: 1,
      v: 1,
    };
  }

  const n = parseInt(full, 16);

  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;

  if (delta > 0) {
    if (max === r) {
      h =
        60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h =
        60 * ((b - r) / delta + 2);
    } else {
      h =
        60 * ((r - g) / delta + 4);
    }
  }

  return {
    h: (h + 360) % 360,
    s:
      max === 0
        ? 0
        : delta / max,
    v: max,
  };
}

// HUE RING GEOMETRY

function ringSegment(
  start: number,
  end: number
) {
  const radians = (
    degrees: number
  ) =>
    ((degrees - 90) * Math.PI) / 180;

  const x1 =
    CENTER +
    RADIUS *
      Math.cos(radians(start));

  const y1 =
    CENTER +
    RADIUS *
      Math.sin(radians(start));

  const x2 =
    CENTER +
    RADIUS *
      Math.cos(radians(end));

  const y2 =
    CENTER +
    RADIUS *
      Math.sin(radians(end));

  return (
    `M ${x1} ${y1} ` +
    `A ${RADIUS} ${RADIUS} ` +
    `0 0 1 ${x2} ${y2}`
  );
}

// Generated once, not on each render.

const HUE_SEGMENTS = Array.from(
  { length: 120 },
  (_, i) => ({
    d: ringSegment(
      i * 3 - 0.25,
      (i + 1) * 3 + 0.25
    ),
    color: hsvToHex({
      h: i * 3 + 1.5,
      s: 1,
      v: 1,
    }),
  })
);

// STATIC HUE RING

const HueRing = memo(function HueRing() {
  return (
    <>
      {HUE_SEGMENTS.map(
        (segment, index) => (
          <Path
            key={index}
            d={segment.d}
            stroke={segment.color}
            strokeWidth={RING_WIDTH}
            fill="none"
          />
        )
      )}
    </>
  );
});

// MAIN PICKER

function AnnotationColorPickerComponent({
  color,
  onChange,
  accentColor,
}: Props) {
  // Local HSV value.
  // Parent settings are NOT changed during dragging.

  const [localHsv, setLocalHsv] =
    useState<HSV>(() =>
      hexToHsv(color)
    );

  // Always contains the latest value,
  // even before React has rerendered.

  const hsvRef = useRef<HSV>(
    hexToHsv(color)
  );

  // Gesture tracking does not need
  // to trigger React rerenders.

  const draggingRef =
    useRef<DragTarget>(null);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Respond to colour changes originating
  // outside the picker (such as presets).

  useEffect(() => {
    if (draggingRef.current !== null) {
      return;
    }

    const next = hexToHsv(color);

    hsvRef.current = next;
    setLocalHsv(next);
  }, [color]);

  const selectedHex = useMemo(
    () => hsvToHex(localHsv),
    [localHsv]
  );

  // UPDATE LOCAL COLOUR ONLY

  const updateLocalHsv = useCallback(
    (next: HSV) => {
      hsvRef.current = next;
      setLocalHsv(next);
    },
    []
  );

  // HIT TEST

  const getTarget = useCallback(
    (
      x: number,
      y: number
    ): DragTarget => {
      const distance = Math.hypot(
        x - CENTER,
        y - CENTER
      );

      if (
        distance >=
          RADIUS -
            RING_WIDTH / 2 -
            9 &&
        distance <=
          RADIUS +
            RING_WIDTH / 2 +
            9
      ) {
        return "hue";
      }

      if (
        x >= SQUARE_START &&
        x <= SQUARE_START + SQUARE &&
        y >= SQUARE_START &&
        y <= SQUARE_START + SQUARE
      ) {
        return "sv";
      }

      return null;
    },
    []
  );

  // PROCESS POINTER POSITION

  const updateFromPoint = useCallback(
    (
      x: number,
      y: number,
      target: DragTarget
    ) => {
      if (!target) return;

      const current = hsvRef.current;

      if (target === "hue") {
        const angle =
          (Math.atan2(
            y - CENTER,
            x - CENTER
          ) *
            180) /
          Math.PI;

        const hue =
          (angle + 90 + 360) % 360;

        updateLocalHsv({
          ...current,
          h: hue,
        });

        return;
      }

      if (target === "sv") {
        const saturation = clamp(
          (x - SQUARE_START) / SQUARE
        );

        const brightness =
          1 -
          clamp(
            (y - SQUARE_START) /
              SQUARE
          );

        updateLocalHsv({
          ...current,
          s: saturation,
          v: brightness,
        });
      }
    },
    [updateLocalHsv]
  );

  // COMMIT TO PARENT ON RELEASE

  const commitColor = useCallback(() => {
    if (draggingRef.current === null) {
      return;
    }

    draggingRef.current = null;

    const finalColor = hsvToHex(
      hsvRef.current
    );

    if (
      finalColor.toUpperCase() !==
      color.toUpperCase()
    ) {
      onChangeRef.current(finalColor);
    }
  }, [color]);

  // INDICATOR POSITIONS

  const radians =
    ((localHsv.h - 90) * Math.PI) /
    180;

  const handleX =
    CENTER +
    RADIUS * Math.cos(radians);

  const handleY =
    CENTER +
    RADIUS * Math.sin(radians);

  const selectionX =
    SQUARE_START +
    localHsv.s * SQUARE;

  const selectionY =
    SQUARE_START +
    (1 - localHsv.v) * SQUARE;

  const pureHue = useMemo(
    () =>
      hsvToHex({
        h: localHsv.h,
        s: 1,
        v: 1,
      }),
    [localHsv.h]
  );

  return (
    <View style={styles.container}>
      {/* INTERACTIVE COLOUR WHEEL */}

      <View
        style={styles.picker}
        collapsable={false}
        onStartShouldSetResponder={(
          event
        ) => {
          const {
            locationX,
            locationY,
          } = event.nativeEvent;

          return (
            getTarget(
              locationX,
              locationY
            ) !== null
          );
        }}
        onMoveShouldSetResponder={() =>
          draggingRef.current !== null
        }
        onResponderGrant={(event) => {
          const {
            locationX,
            locationY,
          } = event.nativeEvent;

          const target = getTarget(
            locationX,
            locationY
          );

          draggingRef.current = target;

          updateFromPoint(
            locationX,
            locationY,
            target
          );
        }}
        onResponderMove={(event) => {
          const target =
            draggingRef.current;

          if (!target) return;

          const {
            locationX,
            locationY,
          } = event.nativeEvent;

          updateFromPoint(
            locationX,
            locationY,
            target
          );
        }}
        onResponderRelease={commitColor}
        onResponderTerminate={() => {
          draggingRef.current = null;
          // Cancelled gestures do not commit.
          const next = hexToHsv(color);
          hsvRef.current = next;
          setLocalHsv(next);
        }}
      >
        <Svg
          width={SIZE}
          height={SIZE}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient
              id="saturation"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <Stop
                offset="0"
                stopColor="#FFFFFF"
                stopOpacity="1"
              />
              <Stop
                offset="1"
                stopColor="#FFFFFF"
                stopOpacity="0"
              />
            </LinearGradient>

            <LinearGradient
              id="brightness"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop
                offset="0"
                stopColor="#000000"
                stopOpacity="0"
              />
              <Stop
                offset="1"
                stopColor="#000000"
                stopOpacity="1"
              />
            </LinearGradient>
          </Defs>

          {/* STATIC HUE RING */}

          <HueRing />

          {/* SATURATION / BRIGHTNESS AREA */}

          <Rect
            x={SQUARE_START}
            y={SQUARE_START}
            width={SQUARE}
            height={SQUARE}
            fill={pureHue}
          />

          <Rect
            x={SQUARE_START}
            y={SQUARE_START}
            width={SQUARE}
            height={SQUARE}
            fill="url(#saturation)"
          />

          <Rect
            x={SQUARE_START}
            y={SQUARE_START}
            width={SQUARE}
            height={SQUARE}
            fill="url(#brightness)"
          />

          <Rect
            x={SQUARE_START}
            y={SQUARE_START}
            width={SQUARE}
            height={SQUARE}
            stroke="#94A3B8"
            strokeWidth={1}
            fill="none"
          />

          {/* HUE INDICATOR */}

          <Circle
            cx={handleX}
            cy={handleY}
            r={11}
            stroke="#FFFFFF"
            strokeWidth={3}
            fill={pureHue}
          />

          {/* SATURATION / VALUE INDICATOR */}

          <Circle
            cx={selectionX}
            cy={selectionY}
            r={7}
            stroke="#FFFFFF"
            strokeWidth={2.5}
            fill="none"
          />

          <Circle
            cx={selectionX}
            cy={selectionY}
            r={9}
            stroke="#334155"
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </View>

      {/* LOCAL PREVIEW */}

      <View style={styles.previewRow}>
        <View
          style={[
            styles.preview,
            {
              backgroundColor:
                selectedHex,
            },
          ]}
        />

        <Text style={styles.hex}>
          {selectedHex}
        </Text>
      </View>
    </View>
  );
}

export const AnnotationColorPicker = memo(
  AnnotationColorPickerComponent
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 10,
  },

  picker: {
    width: SIZE,
    height: SIZE,
  },

  previewRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  preview: {
    width: 25,
    height: 25,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  hex: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
  },
});
