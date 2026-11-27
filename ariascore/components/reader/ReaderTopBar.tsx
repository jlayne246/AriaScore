
import React, { ReactNode, useMemo } from "react";
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import { useAppTheme } from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

interface ReaderTopBarProps {
  performanceMode: boolean;
  annotationsReady: boolean;

  onBack: () => void;
  libraryMenu: ReactNode;
  bookmarksMenu: ReactNode;
  setlistMenu?: ReactNode;
  scoreInfoMenu: ReactNode;

  onTogglePerformanceMode: () => void;
  onAnnotate: () => void;
  musicUtilitiesMenu?: ReactNode;

  toolsMenu: ReactNode;
}

interface ToolbarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
}

const ToolbarButton = ({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: ToolbarButtonProps) => {
  const isDisabled = disabled || !onPress;

  const { colors } = useAppTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: isDisabled,
        selected: active,
      }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.button,
        active && {
          backgroundColor: colors.selectedBackground,
        },
        isDisabled && {
          opacity: 0.35,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={colors.accent}
      />
    </TouchableOpacity>
  );
};

const ReaderTopBar = ({
  performanceMode,
  annotationsReady,
  onBack,
  libraryMenu,
  bookmarksMenu,
  setlistMenu,
  scoreInfoMenu,
  onTogglePerformanceMode,
  onAnnotate,
  musicUtilitiesMenu,
  toolsMenu,
}: ReaderTopBarProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 600;
  const { colors } = useAppTheme();
  const scoreUsesSafeArea = Platform.OS === "ios";

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 6,
          paddingLeft: 8 + (scoreUsesSafeArea ? insets.left : 0),
          paddingRight: 8 + (scoreUsesSafeArea ? insets.right : 0),
        },
      ]}
    >
      {/* Left: Navigation */}
      <View style={styles.group}>
        <ToolbarButton
          icon="chevron-back"
          label="Back"
          onPress={onBack}
        />

        {/* {!compact && (
          <ToolbarButton
            icon="musical-note-outline"
            label="Library"
            onPress={onOpenLibrary}
          />
        )} */}

        {libraryMenu}

        {bookmarksMenu}

        {setlistMenu}
      </View>

      {/* Centre: Score information */}
      {scoreInfoMenu}

      {/* Right: Reader utilities */}
      <View style={styles.group}>
        <ToolbarButton
          icon={
            performanceMode
              ? "flash"
              : "flash-outline"
          }
          label={
            performanceMode
              ? "Leave Performance Mode"
              : "Performance Mode"
          }
          active={performanceMode}
          onPress={onTogglePerformanceMode}
        />

        <ToolbarButton
          icon="create-outline"
          label="Annotate"
          onPress={onAnnotate}
          disabled={!annotationsReady}
        />

        {!compact && musicUtilitiesMenu}

        {toolsMenu}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: colors.readerChrome,

    borderBottomWidth: 1,
    borderBottomColor: colors.separator,

    paddingVertical: 6,

    minHeight: 60,
    gap: 6,
  },

  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  button: {
    width: 44,
    height: 44,
    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",
  },

  scoreTitle: {
    flex: 1,
    minWidth: 0,

    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,

    paddingHorizontal: 8,
    paddingVertical: 6,

    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  subtitle: {
    fontSize: 12,
    color: colors.secondaryText,
  },
});

export default ReaderTopBar;
