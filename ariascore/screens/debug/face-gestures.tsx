import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  faceGestureService,
  FaceGestureEvent,
  MouthGestureSample,
} from "@/services/face_gesture";

export default function FaceGestureDebugScreen() {
  const [running, setRunning] =
    useState(false);

  const [sample, setSample] =
    useState<MouthGestureSample | null>(
      null,
    );

  const [lastEvent, setLastEvent] =
    useState<FaceGestureEvent | null>(
      null,
    );

  const [calibrating, setCalibrating] =
    useState(false);

  const [calibrated, setCalibrated] =
  useState(
    faceGestureService.isCalibrated(),
  );

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const unsubscribeSamples =
      faceGestureService.subscribeToSamples(
        (nextSample) => {
          setSample(nextSample);
        },
      );

    const unsubscribeEvents =
      faceGestureService.subscribe(
        (event) => {
          setLastEvent(event);
        },
      );

    return () => {
      unsubscribeSamples();
      unsubscribeEvents();

      faceGestureService.stop();
    };
  }, []);

  const start = async () => {
    try {
      setError(null);

      await faceGestureService.start();

      setRunning(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start face gesture service.",
      );

      setRunning(false);
    }
  };

  const stop = () => {
    faceGestureService.stop();
    setRunning(false);
  };

  const directionLabel =
    sample?.direction.toUpperCase() ??
    "—";

  const displacementLabel =
    sample
      ? formatSigned(
          sample.displacement,
          3,
        )
      : "—";

  const confidenceLabel =
    sample
      ? `${Math.round(
          sample.confidence * 100,
        )}%`
      : "—";

  const indicatorPosition =
    useMemo(() => {
      if (!sample) {
        return 50;
      }

      /*
       * Debug visualization only.
       *
       * Maps displacement approximately from
       * -0.25 ... +0.25
       * onto 0 ... 100%.
       */
      const normalized =
        50 +
        (sample.displacement / 0.25) *
          50;

      return Math.min(
        100,
        Math.max(0, normalized),
      );
    }, [sample]);

  const calibrate = async () => {
    try {
        setError(null);
        setCalibrating(true);

        const success =
        await faceGestureService.calibrate();

        if (success) {
            console.log("Calibration complete");
            setCalibrated(true);
        } else {
            setError(
                "Calibration failed. Make sure your face is visible and try again.",
            );
        }
    } catch (err) {
        console.error(
            "Calibration error:",
            err,
        );

        setError(
            err instanceof Error
                ? err.message
                : "Unable to calibrate face gestures.",
        );
    } finally {
        setCalibrating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <Text style={styles.title}>
          Face Gesture Debug
        </Text>

        <View style={styles.card}>
          <DebugRow
            label="Service"
            value={
              running
                ? "RUNNING"
                : "STOPPED"
            }
          />

          <DebugRow
            label="Calibrated"
            value={
                calibrated ? "YES" : "NO"
            }
          />

          <DebugRow
            label="Direction"
            value={directionLabel}
          />

          <DebugRow
            label="Displacement"
            value={displacementLabel}
          />

          <DebugRow
            label="Confidence"
            value={confidenceLabel}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Mouth displacement
          </Text>

          <View style={styles.labels}>
            <Text style={styles.axisLabel}>
              LEFT
            </Text>

            <Text style={styles.axisLabel}>
              NEUTRAL
            </Text>

            <Text style={styles.axisLabel}>
              RIGHT
            </Text>
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.indicator,
                {
                  left: `${indicatorPosition}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.rawValue}>
            {displacementLabel}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Last emitted gesture
          </Text>

          <Text style={styles.eventText}>
            {lastEvent?.type ?? "None"}
          </Text>

          {lastEvent && (
            <Text style={styles.timestamp}>
              {new Date(
                lastEvent.timestamp,
              ).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
            {!running ? (
                <DebugButton
                title="Start"
                onPress={start}
                />
            ) : (
                <DebugButton
                title="Stop"
                onPress={stop}
                disabled={calibrating}
                />
            )}

            <DebugButton
                title={
                calibrating
                    ? "Calibrating..."
                    : "Calibrate"
                }
                onPress={calibrate}
                disabled={!running || calibrating}
            />

            <DebugButton
                title="Reset calibration"
                onPress={() => {
                    faceGestureService.resetCalibration();
                    setCalibrated(false);
                    setSample(null);
                }}
                disabled={
                    !running || calibrating
                }
            />
        </View>
        
        {calibrating && (
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                Calibrating...
                </Text>

                <Text style={styles.help}>
                Look naturally at the screen and
                keep your mouth relaxed until
                calibration completes.
                </Text>
            </View>
        )}

        <Text style={styles.help}>
          Move your mouth left and right
          while keeping your head reasonably
          still. The indicator should move
          with the detected displacement.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
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
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text style={styles.rowValue}>
        {value}
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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed &&
          !disabled &&
          styles.buttonPressed,
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
        {title}
      </Text>
    </Pressable>
  );
}

function formatSigned(
  value: number,
  decimals: number,
): string {
  const prefix =
    value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(
    decimals,
  )}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111",
  },

  container: {
    padding: 20,
    gap: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },

  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rowLabel: {
    color: "#aaa",
    fontSize: 15,
  },

  rowValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  axisLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },

  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#444",
    position: "relative",
    marginVertical: 10,
  },

  indicator: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",

    /*
     * Makes the indicator's centre align
     * with the calculated percentage.
     */
    transform: [
      {
        translateX: -10,
      },
    ],
  },

  rawValue: {
    textAlign: "center",
    color: "#fff",
    fontVariant: [
      "tabular-nums",
    ],
  },

  eventText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  timestamp: {
    color: "#888",
    fontSize: 12,
  },

  controls: {
    gap: 10,
  },

  button: {
    backgroundColor: "#292929",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },

  buttonPressed: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  buttonTextDisabled: {
    color: "#777",
  },

  errorCard: {
    backgroundColor: "#321818",
    borderRadius: 12,
    padding: 14,
  },

  errorText: {
    color: "#ffaaaa",
  },

  help: {
    color: "#888",
    lineHeight: 20,
  },
});