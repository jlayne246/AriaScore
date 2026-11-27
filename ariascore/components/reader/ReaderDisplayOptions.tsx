
import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

export type DisplayMode =
  | "single"
  | "double";

export type OrientationMode =
  | "auto"
  | "portrait"
  | "landscape";

export interface ReaderDisplayOptionsProps {
  accentColor: string;

  displayMode: DisplayMode;
  coverOffset: boolean;
  orientationLock: OrientationMode;

  onDisplayModeChange: (
    mode: DisplayMode
  ) => void | Promise<void>;

  onCoverOffsetChange: (
    enabled: boolean
  ) => void | Promise<void>;

  onOrientationChange: (
    mode: OrientationMode
  ) => void | Promise<void>;
}

type IconName =
  keyof typeof Ionicons.glyphMap;

const ORIENTATION_OPTIONS: {
  value: OrientationMode;
  label: string;
  icon: IconName;
}[] = [
  {
    value: "auto",
    label: "Auto rotate",
    icon: "sync-outline",
  },
  {
    value: "portrait",
    label: "Portrait",
    icon: "tablet-portrait-outline",
  },
  {
    value: "landscape",
    label: "Landscape",
    icon: "tablet-landscape-outline",
  },
];

const PageIllustration = ({
  double,
  color,
}: {
  double: boolean;
  color: string;
}) => {
  return (
    <View style={styles.pageIllustration}>
      {Array.from({
        length: double ? 2 : 1,
      }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.illustratedPage,
            {
              borderColor: color,
            },
          ]}
        >
          {[0, 1, 2].map((system) => (
            <View
              key={system}
              style={styles.illustratedSystem}
            >
              {[0, 1, 2, 3, 4].map((line) => (
                <View
                  key={line}
                  style={[
                    styles.staffLine,
                    {
                      backgroundColor: color,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const ReaderDisplayOptions = ({
  accentColor,
  displayMode,
  coverOffset,
  orientationLock,

  onDisplayModeChange,
  onCoverOffsetChange,
  onOrientationChange,
}: ReaderDisplayOptionsProps) => {
  return (
    <View style={styles.container}>

      {/* PAGE LAYOUT */}

      <Text style={styles.sectionTitle}>
        PAGE LAYOUT
      </Text>

      <View style={styles.layoutRow}>
        {(["single", "double"] as const).map(
          (mode) => {
            const active =
              displayMode === mode;

            const label =
              mode === "single"
                ? "Single page"
                : "Two pages";

            return (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  void onDisplayModeChange(mode);
                }}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{
                  checked: active,
                }}
                activeOpacity={0.7}
                style={[
                  styles.layoutCard,
                  active && {
                    borderColor: accentColor,
                    backgroundColor:
                      `${accentColor}08`,
                  },
                ]}
              >
                <PageIllustration
                  double={mode === "double"}
                  color={
                    active
                      ? accentColor
                      : "#94A3B8"
                  }
                />

                <Text
                  style={[
                    styles.layoutLabel,
                    active && {
                      color: accentColor,
                    },
                  ]}
                >
                  {label}
                </Text>

                <Ionicons
                  name={
                    active
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={18}
                  color={
                    active
                      ? accentColor
                      : "#94A3B8"
                  }
                />
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* COVER OFFSET */}

      {displayMode === "double" && (
        <View style={styles.coverSection}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {
              void onCoverOffsetChange(
                !coverOffset
              );
            }}
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: coverOffset,
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                coverOffset
                  ? "checkbox"
                  : "square-outline"
              }
              size={23}
              color={
                coverOffset
                  ? accentColor
                  : "#94A3B8"
              }
            />

            <View style={styles.optionDetails}>
              <Text style={styles.optionLabel}>
                Treat first page as cover
              </Text>

              <Text style={styles.description}>
                Begin with a single cover page
                before showing page spreads.
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#64748B"
            />

            <Text style={styles.noticeText}>
              Two-page viewing is available
              in landscape orientation.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      {/* ORIENTATION */}

      <Text style={styles.sectionTitle}>
        ORIENTATION
      </Text>

      {ORIENTATION_OPTIONS.map((option) => {
        const active =
          orientationLock === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => {
              void onOrientationChange(
                option.value
              );
            }}
            accessibilityRole="radio"
            accessibilityState={{
              checked: active,
            }}
            activeOpacity={0.7}
            style={[
              styles.optionRow,
              active && {
                backgroundColor:
                  `${accentColor}0D`,
              },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={23}
              color={
                active
                  ? accentColor
                  : "#64748B"
              }
            />

            <View style={styles.optionDetails}>
              <Text
                style={[
                  styles.optionLabel,
                  active && {
                    color: accentColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {option.label}
              </Text>
            </View>

            {active && (
              <Ionicons
                name="checkmark"
                size={20}
                color={accentColor}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  layoutRow: {
    flexDirection: "row",
    gap: 10,
  },

  layoutCard: {
    flex: 1,
    minWidth: 0,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 10,

    paddingHorizontal: 8,
    paddingVertical: 12,

    gap: 8,
  },

  pageIllustration: {
    height: 70,
    width: "100%",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 4,
  },

  illustratedPage: {
    width: 43,
    height: 61,

    borderWidth: 1.2,
    borderRadius: 3,

    paddingHorizontal: 5,
    paddingVertical: 7,

    backgroundColor: "#FFFFFF",

    justifyContent: "space-between",
  },

  illustratedSystem: {
    gap: 1.3,
    opacity: 0.65,
  },

  staffLine: {
    width: "100%",
    height: 0.6,
  },

  layoutLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  coverSection: {
    gap: 6,
    paddingTop: 4,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",

    minHeight: 44,

    paddingHorizontal: 8,
    paddingVertical: 10,

    borderRadius: 8,
    gap: 10,
  },

  optionDetails: {
    flex: 1,
    minWidth: 0,
  },

  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#222",
  },

  description: {
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
    marginTop: 4,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",

    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    gap: 6,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
});

export default ReaderDisplayOptions;
