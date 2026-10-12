import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  faceGestureService,
  FaceGestureCalibration,
  FaceGestureCalibrationPhase,
  FaceGestureEvent,
  FaceLandmarks,
  MouthGestureSample,
} from "../../src/services/face_gesture";

import {
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";

import {
  Camera as FaceCamera,
  Face,
} from "react-native-vision-camera-face-detector";

const DEBUG_UI_UPDATE_INTERVAL_MS = 200;
const PERFORMANCE_UPDATE_INTERVAL_MS = 1000;
const GESTURE_TOAST_DURATION_MS = 1800;

interface CalibrationSequenceState {
  neutral: boolean;
  left: boolean;
  right: boolean;
}

interface GestureToast {
  action: string;
  eventType: string;
  timestamp: number;
}

const EMPTY_SEQUENCE:
  CalibrationSequenceState = {
    neutral: false,
    left: false,
    right: false,
  };

export default function FaceGestureDebugScreen() {
  const [running, setRunning] =
    useState(false);

  const [
    showCameraPreview,
    setShowCameraPreview,
  ] = useState(false);

  const [sample, setSample] =
    useState<MouthGestureSample | null>(
      null,
    );

  const [lastEvent, setLastEvent] =
    useState<FaceGestureEvent | null>(
      null,
    );

  const [
    gestureToast,
    setGestureToast,
  ] =
    useState<GestureToast | null>(
      null,
    );

  const [calibrating, setCalibrating] =
    useState(false);

  const [
    calibrationPhase,
    setCalibrationPhase,
  ] =
    useState<
      FaceGestureCalibrationPhase | null
    >(null);

  const [
    calibrationSequence,
    setCalibrationSequence,
  ] =
    useState<CalibrationSequenceState>(
      EMPTY_SEQUENCE,
    );

  const [calibrated, setCalibrated] =
    useState(
      faceGestureService.isCalibrated(),
    );

  const [
    calibrationProfile,
    setCalibrationProfile,
  ] =
    useState<FaceGestureCalibration | null>(
      faceGestureService.getCalibration(),
    );

  const [error, setError] =
    useState<string | null>(null);

  const [
    faceDetected,
    setFaceDetected,
  ] =
    useState(false);

  const [
    detectorFps,
    setDetectorFps,
  ] =
    useState(0);

  const [
    frameGapMs,
    setFrameGapMs,
  ] =
    useState<number | null>(
      null,
    );

  const runningRef =
    useRef(false);

  const faceDetectedRef =
    useRef(false);

  const lastUiUpdateRef =
    useRef(0);

  const previousDetectorFrameRef =
    useRef<number | null>(
      null,
    );

  const latestFrameGapRef =
    useRef<number | null>(
      null,
    );

  const performanceWindowStartRef =
    useRef(Date.now());

  const performanceFrameCountRef =
    useRef(0);

  const gestureToastTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const device =
    useCameraDevice("front");

  const {
    hasPermission,
    requestPermission,
  } =
    useCameraPermission();

  /*
   * Restore persistent calibration.
   */
  useEffect(() => {
    let cancelled = false;

    const restore =
      async (): Promise<void> => {
        const restored =
          await faceGestureService
            .loadSavedCalibration();

        if (cancelled) {
          return;
        }

        if (restored) {
          setCalibrated(true);

          setCalibrationProfile(
            faceGestureService
              .getCalibration(),
          );
        }
      };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    runningRef.current =
      running;
  }, [running]);

  /*
   * Subscribe to recognizer samples and final
   * debounced gesture events.
   */
  useEffect(() => {
    const unsubscribeSamples =
      faceGestureService
        .subscribeToSamples(
          (
            nextSample,
          ) => {
            const now =
              Date.now();

            if (
              now -
                lastUiUpdateRef.current <
              DEBUG_UI_UPDATE_INTERVAL_MS
            ) {
              return;
            }

            lastUiUpdateRef.current =
              now;

            setSample(
              nextSample,
            );
          },
        );

    const unsubscribeEvents =
      faceGestureService.subscribe(
        (
          event,
        ) => {
          setLastEvent(
            event,
          );

          const action =
            event.type ===
            "mouth-left"
              ? "← PREVIOUS PAGE"
              : "NEXT PAGE →";

          setGestureToast({
            action,
            eventType:
              event.type,
            timestamp:
              event.timestamp,
          });

          if (
            gestureToastTimerRef.current
          ) {
            clearTimeout(
              gestureToastTimerRef.current,
            );
          }

          gestureToastTimerRef.current =
            setTimeout(
              () => {
                setGestureToast(
                  null,
                );

                gestureToastTimerRef.current =
                  null;
              },
              GESTURE_TOAST_DURATION_MS,
            );
        },
      );

    return () => {
      unsubscribeSamples();
      unsubscribeEvents();

      if (
        gestureToastTimerRef.current
      ) {
        clearTimeout(
          gestureToastTimerRef.current,
        );

        gestureToastTimerRef.current =
          null;
      }

      faceGestureService.stop();
    };
  }, []);

  const requestCameraPermission =
    async (): Promise<void> => {
      try {
        setError(null);

        const granted =
          await requestPermission();

        if (!granted) {
          Alert.alert(
            "Camera permission required",
            "AriaScore needs camera access to detect face gestures for hands-free page turning.",
          );
        }
      } catch (err) {
        console.error(
          "[FaceGesture] Camera permission error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to request camera permission.",
        );
      }
    };

  const resetPerformanceStats =
    (): void => {
      previousDetectorFrameRef.current =
        null;

      latestFrameGapRef.current =
        null;

      performanceWindowStartRef.current =
        Date.now();

      performanceFrameCountRef.current =
        0;

      setDetectorFps(
        0,
      );

      setFrameGapMs(
        null,
      );
    };

  const start =
    (): void => {
      try {
        setError(null);

        resetPerformanceStats();

        faceGestureService.start();

        runningRef.current =
          true;

        setRunning(
          true,
        );
      } catch (err) {
        console.error(
          "[FaceGesture] Unable to start:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start face gesture service.",
        );
      }
    };

  const stop =
    (): void => {
      faceGestureService.stop();

      runningRef.current =
        false;

      setRunning(
        false,
      );

      setCalibrating(
        false,
      );

      setCalibrationPhase(
        null,
      );

      setGestureToast(
        null,
      );

      if (
        gestureToastTimerRef.current
      ) {
        clearTimeout(
          gestureToastTimerRef.current,
        );

        gestureToastTimerRef.current =
          null;
      }

      resetPerformanceStats();
    };

  const updateFaceDetected =
    useCallback(
      (
        detected: boolean,
      ) => {
        if (
          faceDetectedRef.current ===
          detected
        ) {
          return;
        }

        faceDetectedRef.current =
          detected;

        setFaceDetected(
          detected,
        );
      },
      [],
    );

  const updateDetectorPerformance =
    useCallback(
      () => {
        const now =
          Date.now();

        if (
          previousDetectorFrameRef.current !==
          null
        ) {
          latestFrameGapRef.current =
            now -
            previousDetectorFrameRef.current;
        }

        previousDetectorFrameRef.current =
          now;

        performanceFrameCountRef.current +=
          1;

        const elapsed =
          now -
          performanceWindowStartRef.current;

        if (
          elapsed <
          PERFORMANCE_UPDATE_INTERVAL_MS
        ) {
          return;
        }

        const fps =
          (
            performanceFrameCountRef.current *
            1000
          ) /
          elapsed;

        setDetectorFps(
          Math.round(
            fps,
          ),
        );

        if (
          latestFrameGapRef.current !==
          null
        ) {
          setFrameGapMs(
            latestFrameGapRef.current,
          );
        }

        performanceFrameCountRef.current =
          0;

        performanceWindowStartRef.current =
          now;
      },
      [],
    );

const handleFacesDetected =
  useCallback(
    (faces: Face[]) => {
      updateDetectorPerformance();

      if (
        faces.length === 0
      ) {
        updateFaceDetected(
          false,
        );

        return;
      }

      updateFaceDetected(
        true,
      );

      if (
        !runningRef.current
      ) {
        return;
      }

      const landmarks =
        mapFaceToLandmarks(
          faces[0],
        );

      if (
        !landmarks
      ) {
        return;
      }

      faceGestureService
        .processLandmarks(
          landmarks,
        );
    },
    [
      updateDetectorPerformance,
      updateFaceDetected,
    ],
  );

  const captureCalibrationPhase =
    async (
      phase: FaceGestureCalibrationPhase,
    ): Promise<void> => {
      if (
        calibrating
      ) {
        return;
      }

      try {
        setError(
          null,
        );

        setCalibrating(
          true,
        );

        setCalibrationPhase(
          phase,
        );

        const success =
          await faceGestureService
            .calibratePhase(
              phase,
            );

        if (
          !success
        ) {
          throw new Error(
            `${formatPhaseName(
              phase,
            )} calibration failed. Try again and hold the requested expression steadily.`,
          );
        }

        const sequence =
          faceGestureService
            .getCalibrationSequenceState();

        setCalibrationSequence(
          sequence,
        );

        if (
          phase ===
          "right"
        ) {
          const profile =
            faceGestureService
              .getCalibration();

          setCalibrationProfile(
            profile,
          );

          setCalibrated(
            profile !==
              null,
          );
        }
      } catch (err) {
        console.error(
          "[FaceGesture] Calibration phase error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Calibration failed.",
        );
      } finally {
        setCalibrationPhase(
          null,
        );

        setCalibrating(
          false,
        );
      }
    };

  const startRecalibration =
    (): void => {
      faceGestureService
        .resetCalibrationSequence();

      setCalibrationSequence(
        EMPTY_SEQUENCE,
      );

      setCalibrationPhase(
        null,
      );

      setError(
        null,
      );
    };

  const forgetCalibration =
    (): void => {
      Alert.alert(
        "Reset face calibration?",
        "The saved face-gesture calibration will be removed and you will need to calibrate again.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Reset",
            style: "destructive",
            onPress:
              () => {
                void (async () => {
                  await faceGestureService
                    .clearSavedCalibration();

                  setCalibrated(
                    false,
                  );

                  setCalibrationProfile(
                    null,
                  );

                  setCalibrationSequence(
                    EMPTY_SEQUENCE,
                  );

                  setSample(
                    null,
                  );

                  setLastEvent(
                    null,
                  );

                  setGestureToast(
                    null,
                  );
                })();
              },
          },
        ],
      );
    };

  const directionLabel =
    sample
      ?.direction
      .toUpperCase() ??
    "—";

  const displacementLabel =
    sample
      ? formatSigned(
          sample.displacement,
          3,
        )
      : "—";

  const horizontalLabel =
    sample
      ?.horizontalDisplacement !==
    undefined
      ? formatSigned(
          sample.horizontalDisplacement,
          3,
        )
      : "—";

  const liftLabel =
    sample
      ?.liftDisplacement !==
    undefined
      ? formatSigned(
          sample.liftDisplacement,
          3,
        )
      : "—";

  const strengthLabel =
    sample
      ?.normalizedStrength !==
    undefined
      ? `${Math.round(
          sample.normalizedStrength *
            100,
        )}%`
      : "—";

  const confidenceLabel =
    sample
      ? `${Math.round(
          sample.confidence *
            100,
        )}%`
      : "—";

  const poseLabel =
    !sample
      ? "—"
      : sample.poseValid ===
          false
        ? "OUTSIDE CALIBRATION"
        : "OK";

  const yawLabel =
    sample
      ?.yawDelta !==
    undefined
      ? `${formatSigned(
          sample.yawDelta,
          1,
        )}°`
      : "—";

  const pitchLabel =
    sample
      ?.pitchDelta !==
    undefined
      ? `${formatSigned(
          sample.pitchDelta,
          1,
        )}°`
      : "—";

  const rollLabel =
    sample
      ?.rollDelta !==
    undefined
      ? `${formatSigned(
          sample.rollDelta,
          1,
        )}°`
      : "—";

  const frameGapLabel =
    frameGapMs !==
    null
      ? `${frameGapMs} ms`
      : "—";

  const detectorStatus =
    detectorFps ===
    0
      ? "—"
      : detectorFps >=
          10
        ? "GOOD"
        : detectorFps >=
            6
          ? "USABLE"
          : "SLOW";

  const indicatorPosition =
    useMemo(
      () => {
        if (
          !sample
        ) {
          return 50;
        }

        const normalized =
          50 +
          (
            sample.displacement /
            0.25
          ) *
            50;

        return Math.min(
          100,
          Math.max(
            0,
            normalized,
          ),
        );
      },
      [
        sample,
      ],
    );

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <Text
          style={
            styles.title
          }
        >
          Face Gesture Debug
        </Text>

        <View
          style={
            styles.card
          }
        >
          <DebugRow
            label="Service"
            value={
              running
                ? "RUNNING"
                : "STOPPED"
            }
          />

          <DebugRow
            label="Face"
            value={
              faceDetected
                ? "DETECTED"
                : "NOT DETECTED"
            }
          />

          <DebugRow
            label="Calibrated"
            value={
              calibrated
                ? "YES"
                : "NO"
            }
          />

          <DebugRow
            label="Detector FPS"
            value={
              detectorFps >
              0
                ? `${detectorFps}`
                : "—"
            }
          />

          <DebugRow
            label="Detector status"
            value={
              detectorStatus
            }
          />

          <DebugRow
            label="Frame gap"
            value={
              frameGapLabel
            }
          />

          <DebugRow
            label="Pose"
            value={
              poseLabel
            }
          />

          <DebugRow
            label="Yaw Δ"
            value={
              yawLabel
            }
          />

          <DebugRow
            label="Pitch Δ"
            value={
              pitchLabel
            }
          />

          <DebugRow
            label="Roll Δ"
            value={
              rollLabel
            }
          />

          <DebugRow
            label="Direction"
            value={
              directionLabel
            }
          />

          <DebugRow
            label="Horizontal"
            value={
              horizontalLabel
            }
          />

          <DebugRow
            label="Corner lift"
            value={
              liftLabel
            }
          />

          <DebugRow
            label="Strength"
            value={
              strengthLabel
            }
          />

          <DebugRow
            label="Confidence"
            value={
              confidenceLabel
            }
          />
        </View>

        {!hasPermission ? (
          <View
            style={
              styles.cameraPlaceholder
            }
          >
            <Text
              style={
                styles.help
              }
            >
              Camera permission is
              required for face
              gestures.
            </Text>

            <TouchableOpacity
              onPress={
                requestCameraPermission
              }
              activeOpacity={
                0.85
              }
              style={
                styles.permissionButton
              }
            >
              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Allow Camera Access
              </Text>
            </TouchableOpacity>
          </View>
        ) : !device ? (
          <View
            style={
              styles.cameraPlaceholder
            }
          >
            <Text
              style={
                styles.help
              }
            >
              No front camera
              available.
            </Text>
          </View>
        ) : (
          <>
            {running && (
              <View
                style={
                  showCameraPreview
                    ? styles.cameraContainer
                    : styles.hiddenCameraContainer
                }
              >
                <FaceCamera
                  style={
                    StyleSheet.absoluteFill
                  }
                  device={
                    device
                  }
                  isActive={
                    running
                  }
                  runLandmarks
                  performanceMode="fast"
                  onFacesDetected={
                    handleFacesDetected
                  }
                  onError={(
                    cameraError,
                  ) => {
                    console.error(
                      "[FaceCamera] error:",
                      cameraError,
                    );

                    setError(
                      cameraError instanceof
                      Error
                        ? cameraError.message
                        : "Face camera error.",
                    );
                  }}
                />
              </View>
            )}

            <DebugButton
              title={
                showCameraPreview
                  ? "Hide Camera Preview"
                  : "Show Camera Preview"
              }
              onPress={
                () => {
                  setShowCameraPreview(
                    (
                      current,
                    ) =>
                      !current,
                  );
                }
              }
              disabled={
                !running
              }
            />
          </>
        )}

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Dynamic Calibration
          </Text>

          <Text
            style={
              styles.help
            }
          >
            Calibrate while sitting
            exactly as you normally
            would when reading music.
            Do not turn toward the
            physical camera.
          </Text>

          <CalibrationStep
            number={
              1
            }
            title="Neutral"
            description="Relax your mouth and look naturally at the score."
            complete={
              calibrationSequence.neutral
            }
            active={
              calibrationPhase ===
              "neutral"
            }
          />

          <DebugButton
            title={
              calibrationPhase ===
              "neutral"
                ? "Capturing Neutral..."
                : calibrationSequence.neutral
                  ? "Neutral Captured"
                  : "Capture Neutral"
            }
            onPress={
              () => {
                void captureCalibrationPhase(
                  "neutral",
                );
              }
            }
            disabled={
              !running ||
              !faceDetected ||
              calibrating ||
              calibrationSequence.neutral
            }
          />

          <CalibrationStep
            number={
              2
            }
            title="Previous Page"
            description="Raise or pull the LEFT corner of your mouth naturally and hold it."
            complete={
              calibrationSequence.left
            }
            active={
              calibrationPhase ===
              "left"
            }
          />

          <DebugButton
            title={
              calibrationPhase ===
              "left"
                ? "Capturing Left..."
                : calibrationSequence.left
                  ? "Left Captured"
                  : "Capture Left Gesture"
            }
            onPress={
              () => {
                void captureCalibrationPhase(
                  "left",
                );
              }
            }
            disabled={
              !running ||
              !faceDetected ||
              calibrating ||
              !calibrationSequence.neutral ||
              calibrationSequence.left
            }
          />

          <CalibrationStep
            number={
              3
            }
            title="Next Page"
            description="Raise or pull the RIGHT corner of your mouth naturally and hold it."
            complete={
              calibrationSequence.right
            }
            active={
              calibrationPhase ===
              "right"
            }
          />

          <DebugButton
            title={
              calibrationPhase ===
              "right"
                ? "Capturing Right..."
                : calibrationSequence.right
                  ? "Right Captured"
                  : "Capture Right Gesture"
            }
            onPress={
              () => {
                void captureCalibrationPhase(
                  "right",
                );
              }
            }
            disabled={
              !running ||
              !faceDetected ||
              calibrating ||
              !calibrationSequence.left ||
              calibrationSequence.right
            }
          />

          {calibrated && (
            <DebugButton
              title="Start Recalibration"
              onPress={
                startRecalibration
              }
              disabled={
                calibrating
              }
            />
          )}
        </View>

        {calibrationProfile && (
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Learned Gesture Profile
            </Text>

            <DebugRow
              label="Left horizontal"
              value={
                formatAmplitude(
                  calibrationProfile
                    .left
                    .horizontalAmplitude,
                )
              }
            />

            <DebugRow
              label="Left corner lift"
              value={
                formatAmplitude(
                  calibrationProfile
                    .left
                    .liftAmplitude,
                )
              }
            />

            <DebugRow
              label="Right horizontal"
              value={
                formatAmplitude(
                  calibrationProfile
                    .right
                    .horizontalAmplitude,
                )
              }
            />

            <DebugRow
              label="Right corner lift"
              value={
                formatAmplitude(
                  calibrationProfile
                    .right
                    .liftAmplitude,
                )
              }
            />

            {calibrationProfile
              .neutralPose && (
              <>
                <DebugRow
                  label="Neutral yaw"
                  value={`${formatSigned(
                    calibrationProfile
                      .neutralPose
                      .yaw,
                    1,
                  )}°`}
                />

                <DebugRow
                  label="Neutral pitch"
                  value={`${formatSigned(
                    calibrationProfile
                      .neutralPose
                      .pitch,
                    1,
                  )}°`}
                />

                <DebugRow
                  label="Neutral roll"
                  value={`${formatSigned(
                    calibrationProfile
                      .neutralPose
                      .roll,
                    1,
                  )}°`}
                />
              </>
            )}
          </View>
        )}

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Mouth displacement
          </Text>

          <View
            style={
              styles.labels
            }
          >
            <Text
              style={
                styles.axisLabel
              }
            >
              LEFT
            </Text>

            <Text
              style={
                styles.axisLabel
              }
            >
              NEUTRAL
            </Text>

            <Text
              style={
                styles.axisLabel
              }
            >
              RIGHT
            </Text>
          </View>

          <View
            style={
              styles.track
            }
          >
            <View
              style={[
                styles.indicator,
                {
                  left:
                    `${indicatorPosition}%`,
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.rawValue
            }
          >
            {
              displacementLabel
            }
          </Text>
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Last emitted gesture
          </Text>

          <Text
            style={
              styles.eventText
            }
          >
            {lastEvent
              ?.type ??
              "None"}
          </Text>

          {lastEvent && (
            <Text
              style={
                styles.timestamp
              }
            >
              {
                formatEventTimestamp(
                  lastEvent.timestamp,
                )
              }
            </Text>
          )}
        </View>

        {error && (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {
                error
              }
            </Text>
          </View>
        )}

        <View
          style={
            styles.controls
          }
        >
          {!running ? (
            <DebugButton
              title="Start"
              onPress={
                start
              }
              disabled={
                !hasPermission ||
                !device
              }
            />
          ) : (
            <DebugButton
              title="Stop"
              onPress={
                stop
              }
              disabled={
                calibrating
              }
            />
          )}

          {calibrated && (
            <DebugButton
              title="Forget Saved Calibration"
              onPress={
                forgetCalibration
              }
              disabled={
                calibrating
              }
            />
          )}
        </View>
      </ScrollView>

      {gestureToast && (
        <View
          pointerEvents="none"
          style={
            styles.gestureToast
          }
        >
          <Text
            style={
              styles.gestureToastAction
            }
          >
            {
              gestureToast.action
            }
          </Text>

          <Text
            style={
              styles.gestureToastDetails
            }
          >
            {
              gestureToast.eventType
            }
            {"  •  "}
            {
              formatEventTimestamp(
                gestureToast.timestamp,
              )
            }
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function mapFaceToLandmarks(
  face: Face,
): FaceLandmarks | null {
  const landmarks =
    face.landmarks;

  if (
    !landmarks
  ) {
    return null;
  }

  const leftEye =
    landmarks.LEFT_EYE;

  const rightEye =
    landmarks.RIGHT_EYE;

  const mouthLeft =
    landmarks.MOUTH_LEFT;

  const mouthRight =
    landmarks.MOUTH_RIGHT;

  const leftCheek =
    landmarks.LEFT_CHEEK;

  const rightCheek =
    landmarks.RIGHT_CHEEK;

  if (
    !leftEye ||
    !rightEye ||
    !mouthLeft ||
    !mouthRight
  ) {
    return null;
  }

  const mouthCenter = {
    x:
      (
        mouthLeft.x +
        mouthRight.x
      ) /
      2,

    y:
      (
        mouthLeft.y +
        mouthRight.y
      ) /
      2,
  };

  const faceWithPose =
    face as Face & {
      yawAngle?: number;
      pitchAngle?: number;
      rollAngle?: number;
    };

  const hasPose =
    typeof faceWithPose
      .yawAngle ===
      "number" &&
    typeof faceWithPose
      .pitchAngle ===
      "number" &&
    typeof faceWithPose
      .rollAngle ===
      "number";

  return {
    leftEye: {
      x:
        leftEye.x,
      y:
        leftEye.y,
    },

    rightEye: {
      x:
        rightEye.x,
      y:
        rightEye.y,
    },

    mouthLeft: {
      x:
        mouthLeft.x,
      y:
        mouthLeft.y,
    },

    mouthRight: {
      x:
        mouthRight.x,
      y:
        mouthRight.y,
    },

    mouthCenter,

    leftCheek:
      leftCheek
        ? {
            x: leftCheek.x,
            y: leftCheek.y,
          }
        : undefined,

    rightCheek:
      rightCheek
        ? {
            x: rightCheek.x,
            y: rightCheek.y,
          }
        : undefined,

    nose:
      landmarks.NOSE_BASE
        ? {
            x:
              landmarks
                .NOSE_BASE
                .x,

            y:
              landmarks
                .NOSE_BASE
                .y,
          }
        : undefined,

    pose:
      hasPose
        ? {
            yaw:
              faceWithPose
                .yawAngle!,

            pitch:
              faceWithPose
                .pitchAngle!,

            roll:
              faceWithPose
                .rollAngle!,
          }
        : undefined,

    timestamp:
      Date.now(),
  };
}

interface DebugRowProps {
  label: string;
  value: string;
}

function DebugRow({
  label,
  value,
}: DebugRowProps) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.rowLabel
        }
      >
        {
          label
        }
      </Text>

      <Text
        style={
          styles.rowValue
        }
      >
        {
          value
        }
      </Text>
    </View>
  );
}

interface CalibrationStepProps {
  number: number;
  title: string;
  description: string;
  complete: boolean;
  active: boolean;
}

function CalibrationStep({
  number,
  title,
  description,
  complete,
  active,
}: CalibrationStepProps) {
  return (
    <View
      style={
        styles.calibrationStep
      }
    >
      <Text
        style={
          styles.calibrationStepTitle
        }
      >
        {
          complete
            ? "✓"
            : number
        }
        {"  "}
        {
          title
        }
        {
          active
            ? " — CAPTURING"
            : ""
        }
      </Text>

      <Text
        style={
          styles.help
        }
      >
        {
          description
        }
      </Text>
    </View>
  );
}

interface DebugButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

function DebugButton({
  title,
  onPress,
  disabled = false,
}: DebugButtonProps) {
  return (
    <TouchableOpacity
      onPress={
        onPress
      }
      disabled={
        disabled
      }
      activeOpacity={
        0.65
      }
      style={[
        styles.button,

        disabled &&
          styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,

          disabled &&
            styles.buttonTextDisabled,
        ]}
      >
        {
          title
        }
      </Text>
    </TouchableOpacity>
  );
}

function formatPhaseName(
  phase: FaceGestureCalibrationPhase,
): string {
  switch (
    phase
  ) {
    case "neutral":
      return "Neutral";

    case "left":
      return "Left gesture";

    case "right":
      return "Right gesture";
  }
}

function formatAmplitude(
  value: number,
): string {
  return value.toFixed(
    4,
  );
}

function formatSigned(
  value: number,
  decimals: number,
): string {
  const prefix =
    value >
    0
      ? "+"
      : "";

  return `${prefix}${value.toFixed(
    decimals,
  )}`;
}

function formatEventTimestamp(
  timestamp: number,
): string {
  const date =
    new Date(
      timestamp,
    );

  const milliseconds =
    date
      .getMilliseconds()
      .toString()
      .padStart(
        3,
        "0",
      );

  return (
    `${date.toLocaleTimeString()}` +
    `.${milliseconds}`
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        "#111",
    },

    container: {
      padding: 20,

      gap: 16,

      paddingBottom:
        60,
    },

    title: {
      fontSize:
        24,

      fontWeight:
        "700",

      color:
        "#fff",
    },

    card: {
      backgroundColor:
        "#1e1e1e",

      borderRadius:
        14,

      padding:
        16,

      gap:
        12,
    },

    sectionTitle: {
      color:
        "#fff",

      fontSize:
        16,

      fontWeight:
        "600",
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      gap:
        16,
    },

    rowLabel: {
      color:
        "#aaa",

      fontSize:
        15,
    },

    rowValue: {
      color:
        "#fff",

      fontSize:
        15,

      fontWeight:
        "600",

      textAlign:
        "right",

      flexShrink:
        1,
    },

    calibrationStep: {
      backgroundColor:
        "#181818",

      borderRadius:
        10,

      padding:
        12,

      gap:
        6,
    },

    calibrationStepTitle: {
      color:
        "#fff",

      fontSize:
        15,

      fontWeight:
        "700",
    },

    labels: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    axisLabel: {
      color:
        "#888",

      fontSize:
        11,

      fontWeight:
        "600",
    },

    track: {
      height:
        8,

      borderRadius:
        4,

      backgroundColor:
        "#444",

      position:
        "relative",

      marginVertical:
        10,
    },

    indicator: {
      position:
        "absolute",

      top:
        -6,

      width:
        20,

      height:
        20,

      borderRadius:
        10,

      backgroundColor:
        "#fff",

      transform: [
        {
          translateX:
            -10,
        },
      ],
    },

    rawValue: {
      textAlign:
        "center",

      color:
        "#fff",

      fontVariant: [
        "tabular-nums",
      ],
    },

    eventText: {
      color:
        "#fff",

      fontSize:
        22,

      fontWeight:
        "700",
    },

    timestamp: {
      color:
        "#888",

      fontSize:
        12,

      fontVariant: [
        "tabular-nums",
      ],
    },

    controls: {
      gap:
        10,
    },

    button: {
      backgroundColor:
        "#292929",

      borderRadius:
        12,

      paddingVertical:
        14,

      paddingHorizontal:
        16,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    buttonText: {
      color:
        "#fff",

      fontSize:
        16,

      fontWeight:
        "600",
    },

    buttonDisabled: {
      opacity:
        0.35,
    },

    buttonTextDisabled: {
      color:
        "#777",
    },

    permissionButton: {
      marginTop:
        14,

      paddingVertical:
        12,

      paddingHorizontal:
        18,

      borderRadius:
        10,

      backgroundColor:
        "#292929",
    },

    permissionButtonText: {
      color:
        "#fff",

      fontWeight:
        "600",
    },

    errorCard: {
      backgroundColor:
        "#321818",

      borderRadius:
        12,

      padding:
        14,
    },

    errorText: {
      color:
        "#ffaaaa",
    },

    help: {
      color:
        "#999",

      lineHeight:
        20,
    },

    cameraContainer: {
      height:
        280,

      borderRadius:
        16,

      overflow:
        "hidden",

      backgroundColor:
        "#1e1e1e",
    },

    hiddenCameraContainer: {
      position:
        "absolute",

      width:
        2,

      height:
        2,

      left:
        0,

      top:
        0,

      opacity:
        0,

      overflow:
        "hidden",
    },

    cameraPlaceholder: {
      minHeight:
        120,

      justifyContent:
        "center",

      alignItems:
        "center",

      padding:
        24,

      backgroundColor:
        "#1e1e1e",

      borderRadius:
        14,
    },

    /*
     * This represents a gesture that survived the
     * recognizer AND debouncer and therefore would
     * cause an actual page turn.
     */
    gestureToast: {
      position:
        "absolute",

      top:
        16,

      left:
        20,

      right:
        20,

      zIndex:
        1000,

      elevation:
        12,

      backgroundColor:
        "#292929",

      borderRadius:
        14,

      paddingVertical:
        14,

      paddingHorizontal:
        18,

      alignItems:
        "center",
    },

    gestureToastAction: {
      color:
        "#fff",

      fontSize:
        20,

      fontWeight:
        "700",

      textAlign:
        "center",
    },

    gestureToastDetails: {
      color:
        "#aaa",

      fontSize:
        12,

      marginTop:
        4,

      textAlign:
        "center",

      fontVariant: [
        "tabular-nums",
      ],
    },
  });