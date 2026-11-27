
import React, { useMemo } from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { useAppTheme } from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

import { Ionicons } from "@expo/vector-icons";

export type DisplayMode =
  | "single"
  | "double";

export type OrientationMode =
  | "auto"
  | "portrait"
  | "landscape";

export interface ReaderDisplayOptionsProps {

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  displayMode,
  coverOffset,
  orientationLock,

  onDisplayModeChange,
  onCoverOffsetChange,
  onOrientationChange,
}: ReaderDisplayOptionsProps) => {
  const { colors } = useAppTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

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
                    borderColor: colors.accent,
                    backgroundColor:
                      colors.selectedBackground,
                  },
                ]}
              >
                <PageIllustration
                  double={mode === "double"}
                  color={
                    active
                      ? colors.accent
                      : colors.tertiaryText
                  }
                />

                <Text
                  style={[
                    styles.layoutLabel,
                    active && {
                      color: colors.accent,
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
                      ? colors.accent
                      : colors.tertiaryText
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
                  ? colors.accent
                  : colors.tertiaryText
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
              color={colors.secondaryText}
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
                  colors.selectedBackground,
              },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={23}
              color={
                active
                  ? colors.accent
                  : colors.secondaryText
              }
            />

            <View style={styles.optionDetails}>
              <Text
                style={[
                  styles.optionLabel,
                  active && {
                    color: colors.accent,
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
                color={colors.accent}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingTop: 12,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
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
    borderColor: colors.border,
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

    backgroundColor: colors.elevated,

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
    color: colors.secondaryText,
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
    color: colors.text,
  },

  description: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.secondaryText,
    marginTop: 4,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",

    padding: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    gap: 6,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.secondaryText,
  },

  divider: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 6,
  },
});

export default ReaderDisplayOptions;
