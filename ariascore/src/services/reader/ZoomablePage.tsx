
import React, {
  createContext,
  useContext,
  useEffect,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  Gesture,
  GestureDetector,
  PointerType,
} from "react-native-gesture-handler";

interface ZoomablePageProps {
  children: React.ReactNode;

  viewportWidth: number;
  viewportHeight: number;

  pageWidth: number;
  pageHeight: number;

  maxScale?: number;
  resetKey?: string | number;

  annotationMode: boolean;
  palmRejectionEnabled: boolean;
}

type PinchGestureType = ReturnType<
  typeof Gesture.Pinch
>;

type PanGestureType = ReturnType<
  typeof Gesture.Pan
>;

const ZoomPinchContext =
  createContext<PinchGestureType | null>(null);

const ZoomSinglePanContext =
  createContext<PanGestureType | null>(null);

export function useZoomPinchGesture() {
  return useContext(ZoomPinchContext);
}

export function useZoomSinglePanGesture() {
  return useContext(ZoomSinglePanContext);
}

const MIN_SCALE = 1;
const DEFAULT_MAX_SCALE = 3;

const clamp = (
  value: number,
  minimum: number,
  maximum: number
) => {
  "worklet";

  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
};

export function ZoomablePage({
  children,
  viewportWidth,
  viewportHeight,
  pageWidth,
  pageHeight,
  maxScale = DEFAULT_MAX_SCALE,
  resetKey,
  annotationMode,
  palmRejectionEnabled,
}: ZoomablePageProps) {
  // CURRENT TRANSFORMATION

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // PINCH STATE

  const pinchStartScale = useSharedValue(1);

  const pinchContentX = useSharedValue(0);
  const pinchContentY = useSharedValue(0);

  const pinchActive = useSharedValue(false);

  const previousFocalX = useSharedValue(0);
  const previousFocalY = useSharedValue(0);
  const previousPinchScale = useSharedValue(1);
  const previousPointerCount = useSharedValue(2);

  // SINGLE-FINGER PAN STATE

  const singlePanStartX = useSharedValue(0);
  const singlePanStartY = useSharedValue(0);
  const singlePanActive = useSharedValue(false);

  // GEOMETRY

  const viewportW = useSharedValue(viewportWidth);
  const viewportH = useSharedValue(viewportHeight);

  const contentW = useSharedValue(pageWidth);
  const contentH = useSharedValue(pageHeight);

  useEffect(() => {
    viewportW.value = viewportWidth;
    viewportH.value = viewportHeight;

    contentW.value = pageWidth;
    contentH.value = pageHeight;
  }, [
    viewportWidth,
    viewportHeight,
    pageWidth,
    pageHeight,
  ]);

  // TRANSLATION BOUNDS

  const boundX = (s: number) => {
    "worklet";

    return Math.max(
      0,
      (contentW.value * s - viewportW.value) / 2
    );
  };

  const boundY = (s: number) => {
    "worklet";

    return Math.max(
      0,
      (contentH.value * s - viewportH.value) / 2
    );
  };

  // RESET ZOOM

  const reset = () => {
    "worklet";

    pinchActive.value = false;
    singlePanActive.value = false;

    scale.value = withTiming(1, {
      duration: 180,
    });

    translateX.value = withTiming(0, {
      duration: 180,
    });

    translateY.value = withTiming(0, {
      duration: 180,
    });
  };

  // RESET WHEN PAGE CHANGES

  useEffect(() => {
    reset();
  }, [resetKey]);

  // PINCH + TWO-FINGER MOVEMENT
  //
  // This gesture owns both scaling and translation
  // while two fingers are active.
  //
  // There is intentionally NO separate two-finger pan.

  
const pinch = Gesture.Pinch()
  .onStart((event) => {
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);

    pinchActive.value = true;
    singlePanActive.value = false;

    pinchStartScale.value = scale.value;

    previousPinchScale.value = scale.value;
    previousFocalX.value = event.focalX;
    previousFocalY.value = event.focalY;
    previousPointerCount.value =
      event.numberOfPointers;
  })
  .onUpdate((event) => {
    if (!pinchActive.value) return;

    const nextScale = clamp(
      pinchStartScale.value * event.scale,
      MIN_SCALE,
      maxScale
    );

    const focalX =
      event.focalX - viewportW.value / 2;

    const focalY =
      event.focalY - viewportH.value / 2;

    const oldFocalX =
      previousFocalX.value -
      viewportW.value / 2;

    const oldFocalY =
      previousFocalY.value -
      viewportH.value / 2;

    const ratio =
      nextScale /
      Math.max(previousPinchScale.value, 0.001);

    const dx = focalX - oldFocalX;
    const dy = focalY - oldFocalY;

    // A pointer-count change can abruptly move
    // the reported focal point.
    //
    // Also reject exceptionally large focal
    // jumps within one update. Normal dragging
    // continues to work.

    const pointerCountChanged =
      event.numberOfPointers !==
      previousPointerCount.value;

    const focalJump =
      Math.hypot(dx, dy) > 48;

    const useFocalMovement =
      !pointerCountChanged && !focalJump;

    const safeFocalX = useFocalMovement
      ? focalX
      : oldFocalX;

    const safeFocalY = useFocalMovement
      ? focalY
      : oldFocalY;

    const nextX =
      safeFocalX -
      ratio * (
        oldFocalX - translateX.value
      );

    const nextY =
      safeFocalY -
      ratio * (
        oldFocalY - translateY.value
      );

    scale.value = nextScale;

    translateX.value = clamp(
      nextX,
      -boundX(nextScale),
      boundX(nextScale)
    );

    translateY.value = clamp(
      nextY,
      -boundY(nextScale),
      boundY(nextScale)
    );

    previousPinchScale.value = nextScale;

    // Rebase to the latest reported focal point
    // so a rejected jump isn't accumulated.
    previousFocalX.value = event.focalX;
    previousFocalY.value = event.focalY;

    previousPointerCount.value =
      event.numberOfPointers;
  })
  .onEnd(() => {
    pinchActive.value = false;

    if (scale.value <= 1.001) {
      reset();
    }
  })
  .onFinalize(() => {
    pinchActive.value = false;
  });


  // SINGLE-FINGER PAN
  //
  // Enabled when annotating with palm rejection.
  // Touch moves the page; S Pen remains available
  // for drawing through AnnotationCanvas.

  const singleFingerPan = Gesture.Pan()
    .enabled(
      annotationMode &&
        palmRejectionEnabled
    )
    .minPointers(1)
    .maxPointers(1)
    .minDistance(5)
    .onStart((event) => {
      singlePanActive.value = false;

      if (
        event.pointerType !== PointerType.TOUCH ||
        pinchActive.value
      ) {
        return;
      }

      cancelAnimation(translateX);
      cancelAnimation(translateY);

      singlePanStartX.value = translateX.value;
      singlePanStartY.value = translateY.value;

      singlePanActive.value = true;
    })
    .onUpdate((event) => {
      if (
        !singlePanActive.value ||
        pinchActive.value ||
        event.pointerType !== PointerType.TOUCH ||
        event.numberOfPointers !== 1 ||
        scale.value <= MIN_SCALE
      ) {
        return;
      }

      translateX.value = clamp(
        singlePanStartX.value +
          event.translationX,
        -boundX(scale.value),
        boundX(scale.value)
      );

      translateY.value = clamp(
        singlePanStartY.value +
          event.translationY,
        -boundY(scale.value),
        boundY(scale.value)
      );
    })
    .onEnd(() => {
      singlePanActive.value = false;
    })
    .onFinalize(() => {
      singlePanActive.value = false;
    });

  // GESTURE COMPOSITION
  //
  // Pinch handles all two-finger movement.
  // Single-finger pan handles touch-only dragging
  // when palm rejection is enabled.

  const gesture = Gesture.Simultaneous(
    pinch,
    singleFingerPan
  );

  // ANIMATED PAGE TRANSFORMATION
  //
  // The PDF and annotation canvas share
  // the same transformation.

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
      },
      {
        translateY: translateY.value,
      },
      {
        scale: scale.value,
      },
    ],
  }));

  return (
    <ZoomPinchContext.Provider value={pinch}>
      <ZoomSinglePanContext.Provider
        value={singleFingerPan}
      >
        <GestureDetector gesture={gesture}>
          <View
            collapsable={false}
            style={styles.viewport}
          >
            <Animated.View
              style={[
                styles.page,
                {
                  width: pageWidth,
                  height: pageHeight,
                },
                animatedStyle,
              ]}
            >
              {children}
            </Animated.View>
          </View>
        </GestureDetector>
      </ZoomSinglePanContext.Provider>
    </ZoomPinchContext.Provider>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  page: {
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
});
