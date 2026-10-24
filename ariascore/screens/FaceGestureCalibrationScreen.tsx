import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useCameraPermission,
} from "react-native-vision-camera";

import {
  useIsFocused,
  useNavigation,
} from "@react-navigation/native";

import {
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { Ionicons } from "@expo/vector-icons";

import FaceGestureCamera from "../components/FaceGestureCamera";

import {
  faceGestureService,
  FaceGestureCalibrationPhase,
  FaceGestureEvent,
} from "../src/services/face_gesture";

import {
  ACCENT_COLOR,
  COLORS,
  RootStackParamList,
} from "../types";

type NavigationProp =
  NativeStackNavigationProp<
    RootStackParamList,
    "FaceGestureCalibration"
  >;

type CalibrationStep =
  | "neutral"
  | "left"
  | "right"
  | "complete";

type StepDefinition = {
  phase: FaceGestureCalibrationPhase;
  title: string;
  description: string;
  instruction: string;
  icon:
    | "happy-outline"
    | "arrow-back-outline"
    | "arrow-forward-outline";
};

const STEPS: Record<
  Exclude<CalibrationStep, "complete">,
  StepDefinition
> = {
  neutral: {
    phase: "neutral",
    title: "Neutral position",
    description:
      "First, AriaScore needs to learn how your face looks while you normally read music.",
    instruction:
      "Relax your mouth and look naturally at the score.",
    icon: "happy-outline",
  },

  left: {
    phase: "left",
    title: "Previous page",
    description:
      "Now teach AriaScore the gesture you will use to turn to the previous page.",
    instruction:
      "Raise or pull the left corner of your mouth and hold it.",
    icon: "arrow-back-outline",
  },

  right: {
    phase: "right",
    title: "Next page",
    description:
      "Finally, teach AriaScore the gesture you will use to turn to the next page.",
    instruction:
      "Raise or pull the right corner of your mouth and hold it.",
    icon: "arrow-forward-outline",
  },
};

export default function FaceGestureCalibrationScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const isFocused =
    useIsFocused();

  const {
    hasPermission,
    requestPermission,
  } =
    useCameraPermission();

  const [loading, setLoading] =
    useState(true);

  const [running, setRunning] =
    useState(false);

  const [calibrated, setCalibrated] =
    useState(false);

  const [recalibrating, setRecalibrating] =
    useState(false);

  const [step, setStep] =
    useState<CalibrationStep>(
      "neutral",
    );

  const [capturing, setCapturing] =
    useState(false);

  const [faceDetected, setFaceDetected] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [
    lastTestEvent,
    setLastTestEvent,
  ] =
    useState<FaceGestureEvent | null>(
      null,
    );

  /*
   * Restore any existing calibration when
   * the screen first opens.
   */
  useEffect(() => {
    let cancelled = false;

    const restore =
      async () => {
        try {
          const restored =
            await faceGestureService
              .loadSavedCalibration();

          if (cancelled) {
            return;
          }

          setCalibrated(
            restored,
          );

          setStep(
            restored
              ? "complete"
              : "neutral",
          );
        } catch (restoreError) {
          console.warn(
            "[FaceGestureCalibration] Unable to restore calibration:",
            restoreError,
          );

          if (!cancelled) {
            setCalibrated(
              false,
            );

            setStep(
              "neutral",
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(
              false,
            );
          }
        }
      };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * The service and camera should only run while this
   * screen is actually focused and camera permission
   * is available.
   */
  useEffect(() => {
    if (
      !isFocused ||
      !hasPermission
    ) {
      faceGestureService.stop();

      setRunning(
        false,
      );

      setFaceDetected(
        false,
      );

      return;
    }

    faceGestureService.start();

    setRunning(
      true,
    );

    return () => {
      faceGestureService.stop();

      setRunning(
        false,
      );

      setFaceDetected(
        false,
      );
    };
  }, [
    hasPermission,
    isFocused,
  ]);

  /*
   * Once calibration has completed, emitted gestures
   * become a lightweight way of testing the profile.
   */
  useEffect(() => {
    const unsubscribe =
      faceGestureService.subscribe(
        event => {
          if (
            step !== "complete"
          ) {
            return;
          }

          setLastTestEvent(
            event,
          );
        },
      );

    return unsubscribe;
  }, [
    step,
  ]);

  const currentStep =
    useMemo(() => {
      if (
        step === "complete"
      ) {
        return null;
      }

      return STEPS[
        step
      ];
    }, [
      step,
    ]);

  const requestCameraAccess =
    useCallback(
      async () => {
        try {
          setError(
            null,
          );

          const granted =
            await requestPermission();

          if (!granted) {
            Alert.alert(
              "Camera access required",
              "AriaScore needs camera access to calibrate facial gestures.",
            );
          }
        } catch (permissionError) {
          console.error(
            "[FaceGestureCalibration] Camera permission error:",
            permissionError,
          );

          setError(
            "Unable to request camera access.",
          );
        }
      },
      [
        requestPermission,
      ],
    );

  const beginCalibration =
    useCallback(() => {
      faceGestureService
        .resetCalibrationSequence();

      setRecalibrating(
        true,
      );

      setStep(
        "neutral",
      );

      setCapturing(
        false,
      );

      setError(
        null,
      );

      setLastTestEvent(
        null,
      );
    }, []);

  const captureCurrentStep =
    useCallback(
      async () => {
        if (
          !currentStep ||
          capturing ||
          !running
        ) {
          return;
        }

        if (!faceDetected) {
          setError(
            "Make sure your face is visible to the camera before continuing.",
          );

          return;
        }

        setCapturing(
          true,
        );

        setError(
          null,
        );

        try {
          const success =
            await faceGestureService
              .calibratePhase(
                currentStep.phase,
              );

          if (!success) {
            throw new Error(
              "Calibration did not receive a stable gesture. Try again and hold the requested expression steadily.",
            );
          }

          switch (
            currentStep.phase
          ) {
            case "neutral":
              setStep(
                "left",
              );
              break;

            case "left":
              setStep(
                "right",
              );
              break;

            case "right": {
              const profile =
                faceGestureService
                  .getCalibration();

              if (!profile) {
                throw new Error(
                  "AriaScore could not build a usable calibration profile. Please try again.",
                );
              }

              setCalibrated(
                true,
              );

              setRecalibrating(
                false,
              );

              setStep(
                "complete",
              );

              break;
            }
          }
        } catch (captureError) {
          console.error(
            "[FaceGestureCalibration] Calibration error:",
            captureError,
          );

          setError(
            captureError instanceof Error
              ? captureError.message
              : "Calibration failed. Please try again.",
          );
        } finally {
          setCapturing(
            false,
          );
        }
      },
      [
        capturing,
        currentStep,
        faceDetected,
        running,
      ],
    );

  const cancelRecalibration =
    useCallback(() => {
      faceGestureService
        .resetCalibrationSequence();

      setRecalibrating(
        false,
      );

      setStep(
        calibrated
          ? "complete"
          : "neutral",
      );

      setCapturing(
        false,
      );

      setError(
        null,
      );
    }, [
      calibrated,
    ]);

  const resetCalibration =
    useCallback(() => {
      Alert.alert(
        "Reset facial gesture calibration?",
        "Your saved calibration will be removed. You will need to calibrate again before using facial page turns.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Reset",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await faceGestureService
                    .clearSavedCalibration();

                  setCalibrated(
                    false,
                  );

                  setRecalibrating(
                    false,
                  );

                  setStep(
                    "neutral",
                  );

                  setLastTestEvent(
                    null,
                  );

                  setError(
                    null,
                  );
                } catch (resetError) {
                  console.error(
                    "[FaceGestureCalibration] Unable to reset calibration:",
                    resetError,
                  );

                  setError(
                    "Unable to reset the saved calibration.",
                  );
                }
              })();
            },
          },
        ],
      );
    }, []);

  const testResultText =
    lastTestEvent?.type ===
    "mouth-left"
      ? "Previous page"
      : lastTestEvent?.type ===
          "mouth-right"
        ? "Next page"
        : null;

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading calibration…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View
          style={
            styles.introduction
          }
        >
          <View
            style={
              styles.iconCircle
            }
          >
            <Ionicons
              name="happy-outline"
              size={30}
              color={
                ACCENT_COLOR
              }
            />
          </View>

          <Text
            style={
              styles.title
            }
          >
            Facial Gesture Calibration
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Set up hands-free page
            turning for Performance
            Mode.
          </Text>
        </View>

        <View
          style={
            styles.positionCard
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={
              ACCENT_COLOR
            }
          />

          <Text
            style={
              styles.positionText
            }
          >
            Sit exactly as you normally
            would while reading music.
            Look naturally at the score
            rather than turning toward
            the camera.
          </Text>
        </View>

        {!hasPermission ? (
          <View
            style={
              styles.permissionCard
            }
          >
            <Ionicons
              name="camera-outline"
              size={42}
              color={
                COLORS.secondaryText
              }
            />

            <Text
              style={
                styles.permissionTitle
              }
            >
              Camera access required
            </Text>

            <Text
              style={
                styles.permissionText
              }
            >
              AriaScore uses the front
              camera to detect facial
              gestures. Camera images
              are processed for gesture
              recognition.
            </Text>

            <PrimaryButton
              title="Allow Camera Access"
              onPress={
                () => {
                  void requestCameraAccess();
                }
              }
            />
          </View>
        ) : (
          <>
            <View
              style={
                styles.cameraCard
              }
            >
              <View
                style={
                  styles.cameraPreview
                }
              >
                <FaceGestureCamera
                  enabled={
                    running
                  }
                  showPreview
                  onFaceDetectedChange={
                    setFaceDetected
                  }
                  onError={
                    (cameraError: any) => {
                      console.error(
                        "[FaceGestureCalibration] Camera error:",
                        cameraError,
                      );

                      setError(
                        cameraError instanceof Error
                          ? cameraError.message
                          : "Unable to use the front camera.",
                      );
                    }
                  }
                />
              </View>

              <View
                style={
                  styles.cameraStatus
                }
              >
                <View
                  style={[
                    styles.statusDot,

                    faceDetected
                      ? styles.statusDotActive
                      : styles.statusDotInactive,
                  ]}
                />

                <Text
                  style={
                    styles.cameraStatusText
                  }
                >
                  {faceDetected
                    ? "Face detected"
                    : "Position your face within view"}
                </Text>
              </View>
            </View>

            {step !==
            "complete" ? (
              <View
                style={
                  styles.calibrationCard
                }
              >
                <Text
                  style={
                    styles.stepCounter
                  }
                >
                  Step{" "}
                  {step === "neutral"
                    ? "1"
                    : step === "left"
                      ? "2"
                      : "3"}{" "}
                  of 3
                </Text>

                <View
                  style={
                    styles.stepHeader
                  }
                >
                  <View
                    style={
                      styles.stepIcon
                    }
                  >
                    <Ionicons
                      name={
                        currentStep!
                          .icon
                      }
                      size={24}
                      color={
                        ACCENT_COLOR
                      }
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.stepTitle
                      }
                    >
                      {
                        currentStep!
                          .title
                      }
                    </Text>

                    <Text
                      style={
                        styles.stepDescription
                      }
                    >
                      {
                        currentStep!
                          .description
                      }
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.instructionBox
                  }
                >
                  <Text
                    style={
                      styles.instructionLabel
                    }
                  >
                    WHEN READY
                  </Text>

                  <Text
                    style={
                      styles.instructionText
                    }
                  >
                    {
                      currentStep!
                        .instruction
                    }
                  </Text>
                </View>

                <PrimaryButton
                  title={
                    capturing
                      ? "Capturing…"
                      : step ===
                          "neutral"
                        ? "Capture Neutral Position"
                        : step ===
                            "left"
                          ? "Capture Previous Page Gesture"
                          : "Capture Next Page Gesture"
                  }
                  onPress={
                    () => {
                      void captureCurrentStep();
                    }
                  }
                  disabled={
                    capturing ||
                    !running ||
                    !faceDetected
                  }
                  loading={
                    capturing
                  }
                />

                {recalibrating &&
                  calibrated && (
                    <SecondaryButton
                      title="Cancel Recalibration"
                      onPress={
                        cancelRecalibration
                      }
                      disabled={
                        capturing
                      }
                    />
                  )}
              </View>
            ) : (
              <View
                style={
                  styles.successCard
                }
              >
                <View
                  style={
                    styles.successIcon
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={34}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={
                    styles.successTitle
                  }
                >
                  Calibration complete
                </Text>

                <Text
                  style={
                    styles.successText
                  }
                >
                  Your facial gestures
                  are ready to use with
                  hands-free page turning
                  in Performance Mode.
                </Text>

                <View
                  style={
                    styles.testCard
                  }
                >
                  <Text
                    style={
                      styles.testTitle
                    }
                  >
                    Test your gestures
                  </Text>

                  <Text
                    style={
                      styles.testDescription
                    }
                  >
                    Try either gesture.
                    AriaScore will show
                    what it detects.
                  </Text>

                  <View
                    style={
                      styles.testResult
                    }
                  >
                    {testResultText ? (
                      <>
                        <Ionicons
                          name={
                            lastTestEvent
                              ?.type ===
                            "mouth-left"
                              ? "arrow-back"
                              : "arrow-forward"
                          }
                          size={26}
                          color={
                            ACCENT_COLOR
                          }
                        />

                        <Text
                          style={
                            styles.testResultText
                          }
                        >
                          {
                            testResultText
                          }
                        </Text>
                      </>
                    ) : (
                      <Text
                        style={
                          styles.testWaitingText
                        }
                      >
                        Waiting for a
                        gesture…
                      </Text>
                    )}
                  </View>
                </View>

                <PrimaryButton
                  title="Done"
                  onPress={
                    () =>
                      navigation.goBack()
                  }
                />

                <SecondaryButton
                  title="Recalibrate"
                  onPress={
                    beginCalibration
                  }
                />

                <TouchableOpacity
                  onPress={
                    resetCalibration
                  }
                  activeOpacity={
                    0.7
                  }
                  style={
                    styles.resetButton
                  }
                >
                  <Text
                    style={
                      styles.resetButtonText
                    }
                  >
                    Reset Calibration
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {error && (
          <View
            style={
              styles.errorCard
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color="#B91C1C"
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.8
      }
      disabled={
        disabled
      }
      onPress={
        onPress
      }
      style={[
        styles.primaryButton,

        disabled &&
          styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color="#FFFFFF"
        />
      ) : (
        <Text
          style={
            styles.primaryButtonText
          }
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function SecondaryButton({
  title,
  onPress,
  disabled = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={
        0.7
      }
      disabled={
        disabled
      }
      onPress={
        onPress
      }
      style={[
        styles.secondaryButton,

        disabled &&
          styles.buttonDisabled,
      ]}
    >
      <Text
        style={
          styles.secondaryButtonText
        }
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 48,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },

    loadingText: {
      color:
        COLORS.secondaryText,
      fontSize: 15,
    },

    introduction: {
      alignItems: "center",
      marginBottom: 24,
    },

    iconCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        COLORS.accentVeryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    title: {
      color:
        COLORS.text,
      fontSize: 26,
      fontWeight: "700",
      textAlign: "center",
    },

    subtitle: {
      marginTop: 7,
      color:
        COLORS.secondaryText,
      fontSize: 16,
      lineHeight: 22,
      textAlign: "center",
      maxWidth: 420,
    },

    positionCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 14,
      borderRadius: 12,
      backgroundColor:
        COLORS.accentVeryLight,
      marginBottom: 18,
    },

    positionText: {
      flex: 1,
      color:
        COLORS.text,
      fontSize: 14,
      lineHeight: 20,
    },

    permissionCard: {
      alignItems: "center",
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor: "#FFFFFF",
      gap: 12,
    },

    permissionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color:
        COLORS.text,
    },

    permissionText: {
      textAlign: "center",
      color:
        COLORS.secondaryText,
      lineHeight: 21,
      maxWidth: 420,
    },

    cameraCard: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "#111827",
      marginBottom: 18,
    },

    cameraPreview: {
      height: 240,
      backgroundColor: "#111827",
    },

    cameraStatus: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: "#111827",
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    statusDotActive: {
      backgroundColor: "#22C55E",
    },

    statusDotInactive: {
      backgroundColor: "#9CA3AF",
    },

    cameraStatusText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
    },

    calibrationCard: {
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      padding: 18,
      backgroundColor: "#FFFFFF",
    },

    stepCounter: {
      fontSize: 12,
      fontWeight: "700",
      color:
        ACCENT_COLOR,
      textTransform: "uppercase",
      marginBottom: 14,
    },

    stepHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    stepIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        COLORS.accentVeryLight,
      alignItems: "center",
      justifyContent: "center",
    },

    stepTitle: {
      color:
        COLORS.text,
      fontSize: 20,
      fontWeight: "700",
    },

    stepDescription: {
      marginTop: 4,
      color:
        COLORS.secondaryText,
      lineHeight: 21,
    },

    instructionBox: {
      marginTop: 18,
      marginBottom: 18,
      padding: 14,
      borderRadius: 12,
      backgroundColor:
        COLORS.pageBackground,
    },

    instructionLabel: {
      color:
        COLORS.secondaryText,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 5,
    },

    instructionText: {
      color:
        COLORS.text,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "600",
    },

    primaryButton: {
      minHeight: 50,
      backgroundColor:
        ACCENT_COLOR,
      borderRadius: 12,
      paddingHorizontal: 18,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
    },

    secondaryButton: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      marginTop: 10,
    },

    secondaryButtonText: {
      color:
        COLORS.text,
      fontSize: 15,
      fontWeight: "600",
    },

    buttonDisabled: {
      opacity: 0.45,
    },

    successCard: {
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      padding: 20,
      alignItems: "center",
    },

    successIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#16A34A",
      marginBottom: 14,
    },

    successTitle: {
      fontSize: 22,
      fontWeight: "700",
      color:
        COLORS.text,
      textAlign: "center",
    },

    successText: {
      marginTop: 7,
      color:
        COLORS.secondaryText,
      fontSize: 15,
      lineHeight: 21,
      textAlign: "center",
      maxWidth: 420,
    },

    testCard: {
      width: "100%",
      marginTop: 22,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor:
        COLORS.pageBackground,
    },

    testTitle: {
      color:
        COLORS.text,
      fontWeight: "700",
      fontSize: 16,
    },

    testDescription: {
      color:
        COLORS.secondaryText,
      fontSize: 14,
      marginTop: 4,
    },

    testResult: {
      minHeight: 58,
      marginTop: 12,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor:
        COLORS.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 12,
    },

    testResultText: {
      color:
        COLORS.text,
      fontSize: 17,
      fontWeight: "700",
    },

    testWaitingText: {
      color:
        COLORS.secondaryText,
      fontSize: 15,
    },

    resetButton: {
      marginTop: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    resetButtonText: {
      color: "#B91C1C",
      fontSize: 14,
      fontWeight: "600",
    },

    errorCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      marginTop: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FECACA",
    },

    errorText: {
      flex: 1,
      color: "#991B1B",
      fontSize: 14,
      lineHeight: 20,
    },
  });