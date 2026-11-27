
import React, { useMemo } from "react";

import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
  renderers,
} from "react-native-popup-menu";

import {useAppTheme} from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

const { Popover } = renderers;

export type MusicUtilityAction =
  | "metronome"
  | "pitch-keyboard"
  | "audio-playback"
  | "audio-recording";

interface ReaderMusicUtilitiesMenuProps {
  disabled?: boolean;

  onOpen?: () => void;
  onClose?: () => void;

  onSelectAction?: (
    action: MusicUtilityAction
  ) => void;
}

interface UtilityItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;

  label: string;
  description: string;
  action: MusicUtilityAction;


  available?: boolean;
}

const UtilityItem = ({
  icon,
  label,
  description,
  action,
  available = false,
}: UtilityItemProps) => {
  const {colors} = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );
  return (
    <MenuOption
      value={action}
      disabled={!available}
      customStyles={{
        optionWrapper: {
          padding: 0,
        },
      }}
    >
      <View
        style={[
          styles.item,
          !available && styles.disabledItem,
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={icon}
            size={25}
            color={colors.accent}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.itemLabel}>
            {label}
          </Text>

          <Text style={styles.description}>
            {description}
          </Text>

          {!available && (
            <Text style={styles.comingSoon}>
              Coming soon
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.tertiaryText}
        />
      </View>
    </MenuOption>
  );
};

const ReaderMusicUtilitiesMenu = ({
  disabled = false,
  onOpen,
  onClose,
  onSelectAction,
}: ReaderMusicUtilitiesMenuProps) => {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();

  const styles = useMemo(
      () => createStyles(colors),
      [colors]
    );

  const menuWidth = Math.min(
    340,
    width - 24
  );

  return (
    <Menu
      renderer={Popover}
      rendererProps={{
        placement: "bottom",
        anchorStyle: {
          backgroundColor: colors.elevated,
        },
      }}

      onOpen={onOpen}
      onClose={onClose}

      onSelect={(action: MusicUtilityAction) => {
        onSelectAction?.(action);
      }}
    >
      {/* TOOLBAR BUTTON */}

      <MenuTrigger
        disabled={disabled}
        customStyles={{
          triggerWrapper: {
            ...styles.trigger,
            opacity: disabled ? 0.35 : 1,
          },
        }}
      >
        <Ionicons
          name="musical-notes-outline"
          size={24}
          color={colors.accent}
          accessibilityLabel="Music Utilities"
        />
      </MenuTrigger>

      {/* POPOVER */}

      <MenuOptions
        customStyles={{
          optionsContainer: {
            width: menuWidth,
            borderRadius: 14,
            backgroundColor: colors.elevated,
            elevation: 10,
          },
        }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.heading}>
              Music Utilities
            </Text>

            <Ionicons
              name="musical-notes-outline"
              size={22}
              color={colors.accent}
            />
          </View>

          <View style={styles.divider} />

          <UtilityItem
            icon="metronome"
            label="Metronome"
            description="Tempo and time signature"
            action="metronome"
          />

          <UtilityItem
            icon="piano"
            label="Pitch & Keyboard"
            description="Virtual piano and pitch reference"
            action="pitch-keyboard"
          />

          <UtilityItem
            icon="headphones"
            label="Audio Playback"
            description="Play associated audio tracks"
            action="audio-playback"
          />

          <UtilityItem
            icon="microphone-outline"
            label="Audio Recording"
            description="Record rehearsals and performances"
            action="audio-recording"
          />
        </View>
      </MenuOptions>
    </Menu>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    padding: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: 6,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 6,
    paddingVertical: 12,

    borderRadius: 8,
    gap: 12,
  },

  disabledItem: {
    opacity: 0.5,
  },

  iconContainer: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  itemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  description: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.secondaryText,
    marginTop: 3,
  },

  comingSoon: {
    fontSize: 11,
    color: colors.secondaryText,
    fontStyle: "italic",
    marginTop: 4,
  },
});

export default ReaderMusicUtilitiesMenu;
