
import React, { ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {useSafeAreaInsets} from "react-native-safe-area-context";

interface ReaderTopBarProps {
  title: string;
  pageLabel: string;
  setlistLabel?: string;

  accentColor: string;
  performanceMode: boolean;
  annotationsReady: boolean;

  onBack: () => void;
  onJump: () => void;
  onOpenLibrary: () => void;
  onBookmarks: () => void;
  onSetlists?: () => void;
  onScoreInfo: () => void;

  onTogglePerformanceMode: () => void;
  onAnnotate: () => void;
  onAudioUtilities?: () => void;

  toolsMenu: ReactNode;
}

interface ToolbarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accentColor: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
}

const ToolbarButton = ({
  icon,
  label,
  accentColor,
  onPress,
  active = false,
  disabled = false,
}: ToolbarButtonProps) => {
  const isDisabled = disabled || !onPress;

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
          backgroundColor: `${accentColor}20`,
        },
        isDisabled && {
          opacity: 0.35,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={accentColor}
      />
    </TouchableOpacity>
  );
};

const ReaderTopBar = ({
  title,
  pageLabel,
  setlistLabel,
  accentColor,
  performanceMode,
  annotationsReady,
  onBack,
  onJump,
  onOpenLibrary,
  onBookmarks,
  onSetlists,
  onScoreInfo,
  onTogglePerformanceMode,
  onAnnotate,
  onAudioUtilities,
  toolsMenu,
}: ReaderTopBarProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 600;

  return (
    <View style={[styles.container, {paddingTop: insets.top + 6}]}>
      {/* Left: Navigation */}
      <View style={styles.group}>
        <ToolbarButton
          icon="chevron-back"
          label="Back"
          accentColor={accentColor}
          onPress={onBack}
        />

        {!compact && (
          <ToolbarButton
            icon="musical-note-outline"
            label="Library"
            accentColor={accentColor}
            onPress={onOpenLibrary}
          />
        )}

        <ToolbarButton
          icon="bookmarks-outline"
          label="Bookmarks"
          accentColor={accentColor}
          onPress={onBookmarks}
        />

        {!compact && onSetlists && (
          <ToolbarButton
            icon="list-outline"
            label="Setlists"
            accentColor={accentColor}
            onPress={onSetlists}
          />
        )}
      </View>

      {/* Centre: Score information */}
      <TouchableOpacity
        style={styles.scoreTitle}
        onPress={onScoreInfo}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Score information"
      >
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {title}
        </Text>

        {!compact && setlistLabel && (
            <Text
                style={styles.subtitle}
                numberOfLines={1}
            >
                {setlistLabel}
                {/* {pageLabel} */}
            </Text>
        )}
        
      </TouchableOpacity>

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
          accentColor={accentColor}
          active={performanceMode}
          onPress={onTogglePerformanceMode}
        />

        <ToolbarButton
          icon="create-outline"
          label="Annotate"
          accentColor={accentColor}
          onPress={onAnnotate}
          disabled={!annotationsReady}
        />

        {!compact && onAudioUtilities && (
          <ToolbarButton
            icon="musical-notes-outline"
            label="Audio utilities"
            accentColor={accentColor}
            onPress={onAudioUtilities}
          />
        )}

        {toolsMenu}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,

    zIndex: 1300,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.96)",

    borderBottomWidth: 1,
    borderBottomColor: "#ddd",

    paddingHorizontal: 8,
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

    backgroundColor: "#f0f0f0",
    borderRadius: 8,

    paddingHorizontal: 8,
    paddingVertical: 6,

    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },

  subtitle: {
    fontSize: 12,
    color: "#666",
  },
});

export default ReaderTopBar;
