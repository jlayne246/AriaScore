
import React, { useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
  renderers,
} from "react-native-popup-menu";

import ReaderDisplayOptions, {
  type ReaderDisplayOptionsProps,
} from "./ReaderDisplayOptions";

import ReaderJumpToPage, {
  type JumpToPageSelection,
} from "./ReaderJumpToPage";

const { Popover } = renderers;

type IconName = keyof typeof Ionicons.glyphMap;

export type ReaderToolAction =
  | "jump"
  | "score-settings"
  | "setlist-settings"
  | "global-settings"
  | "favorite"
  | "export";

interface ReaderToolsMenuProps
  extends ReaderDisplayOptionsProps {

  currentPage: number;
  totalPages: number;
  minimumPage: number;
  maximumPage: number;

  hasSetlist?: boolean;
  disabled?: boolean;

  onOpen?: () => void;
  onClose?: () => void;

  onSelectAction: (
    action: ReaderToolAction
  ) => void;

  onJumpToPage: (page: number) => void;
}

interface ToolItemProps {
  icon: IconName;
  label: string;
  sublabel?: string;
  action: ReaderToolAction;
  accentColor: string;
  disabled?: boolean;
}

const ToolItem = ({
  icon,
  label,
  sublabel,
  action,
  accentColor,
  disabled = false,
}: ToolItemProps) => {
  return (
    <MenuOption
      value={action}
      disabled={disabled}
      customStyles={{
        optionWrapper: {
          padding: 0,
        },
      }}
    >
      <View
        style={[
          styles.item,
          disabled && styles.disabledItem,
        ]}
      >
        <View style={styles.itemIcon}>
          <Ionicons
            name={icon}
            size={22}
            color={
              disabled
                ? "#94A3B8"
                : accentColor
            }
          />
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemLabel}>
            {label}
          </Text>

          {sublabel && (
            <Text style={styles.itemSublabel}>
              {sublabel}
            </Text>
          )}
        </View>

        {!disabled && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#94A3B8"
          />
        )}
      </View>
    </MenuOption>
  );
};

const ToolSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>
      {title.toUpperCase()}
    </Text>

    {children}
  </View>
);

const ReaderToolsMenu = ({
  accentColor,
  hasSetlist = false,
  disabled = false,

  displayMode,
  coverOffset,
  orientationLock,

  onDisplayModeChange,
  onCoverOffsetChange,
  onOrientationChange,

  onOpen,
  onClose,
  onSelectAction,

  currentPage,
    totalPages,
    minimumPage,
    maximumPage,
    onJumpToPage,
}: ReaderToolsMenuProps) => {
  const { width, height } =
    useWindowDimensions();

  const [activeView, setActiveView] =
    useState<"tools" | "display" | "jump">(
        "tools"
    );

  const menuWidth = Math.min(
    330,
    width - 24
  );

  return (
    <Menu
      renderer={Popover}
      rendererProps={{
        placement: "bottom",
        anchorStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}

      onOpen={() => {
        setActiveView("tools");
        onOpen?.();
      }}

      onClose={() => {
        setActiveView("tools");
        onClose?.();
      }}

      onSelect={(
        selection:
            | ReaderToolAction
            | JumpToPageSelection
      ) => {
        if (typeof selection === "string") {
            onSelectAction(selection);
            return;
        }

        if (selection.type === "go-to-page") {
            onJumpToPage(selection.page);
        }
      }}
    >
      {/* TOOLBAR BUTTON */}

      <MenuTrigger
        disabled={disabled}
        customStyles={{
          triggerWrapper: [
            styles.trigger,
            disabled && {
              opacity: 0.35,
            },
          ],
        }}
      >
        <Ionicons
          name="briefcase-outline"
          size={24}
          color={accentColor}
          accessibilityLabel="Reader tools"
        />
      </MenuTrigger>

      {/* POPOVER */}

      <MenuOptions
        customStyles={{
          optionsContainer: {
            width: menuWidth,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            elevation: 10,
          },
        }}
      >
        <View style={styles.container}>

          {/* HEADER */}
            
            <View style={styles.header}>
            {activeView !== "tools" ? (
                <View style={styles.headerNavigation}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setActiveView("tools")}
                    accessibilityLabel="Back to tools"
                >
                    <Ionicons
                    name="chevron-back"
                    size={23}
                    color={accentColor}
                    />
                </TouchableOpacity>

                <Text style={styles.heading}>
                    {activeView === "display"
                    ? "Display Options"
                    : "Jump to Page"}
                </Text>
                </View>
            ) : (
                <>
                <Text style={styles.heading}>
                    Tools
                </Text>

                <Ionicons
                    name="briefcase-outline"
                    size={22}
                    color={accentColor}
                />
                </>
            )}
            </View>

            <ScrollView
                style={{
                    maxHeight: Math.min(
                    560,
                    height * 0.65
                    ),
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                >
            {activeView === "display" ? (
                <ReaderDisplayOptions
                accentColor={accentColor}

                displayMode={displayMode}
                coverOffset={coverOffset}
                orientationLock={orientationLock}

                onDisplayModeChange={
                    onDisplayModeChange
                }

                onCoverOffsetChange={
                    onCoverOffsetChange
                }

                onOrientationChange={
                    onOrientationChange
                }
                />
            ) : activeView === "jump" ? (
                <ReaderJumpToPage
                accentColor={accentColor}
                currentPage={currentPage}
                totalPages={totalPages}
                minimumPage={minimumPage}
                maximumPage={maximumPage}
                />
            ) : (
                <>

                    {/* DOCUMENT */}

                    <ToolSection title="Document">
                    
                    <TouchableOpacity
                    style={styles.item}
                    activeOpacity={0.7}
                    onPress={() => setActiveView("jump")}
                    accessibilityRole="button"
                    accessibilityLabel="Jump to page"
                    >
                    <View style={styles.itemIcon}>
                        <Ionicons
                        name="grid-outline"
                        size={22}
                        color={accentColor}
                        />
                    </View>

                    <View style={styles.itemDetails}>
                        <Text style={styles.itemLabel}>
                        Jump to Page
                        </Text>

                        <Text style={styles.itemSublabel}>
                        Page {currentPage} of {totalPages}
                        </Text>
                    </View>

                    <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#94A3B8"
                    />
                    </TouchableOpacity>

                    <ToolItem
                        icon="star-outline"
                        label="Add to Favourites"
                        sublabel="Coming soon"
                        action="favorite"
                        accentColor={accentColor}
                        disabled
                    />

                    <ToolItem
                        icon="share-outline"
                        label="Export Score"
                        sublabel="Coming soon"
                        action="export"
                        accentColor={accentColor}
                        disabled
                    />
                    </ToolSection>

                    <View style={styles.divider} />

                    {/* DISPLAY */}
                    
                    <ToolSection title="Display">
                        <TouchableOpacity
                            style={styles.item}
                            activeOpacity={0.7}
                            onPress={() => setActiveView("display")}
                            accessibilityRole="button"
                            accessibilityLabel="Display options"
                        >
                            <View style={styles.itemIcon}>
                            <Ionicons
                                name="albums-outline"
                                size={22}
                                color={accentColor}
                            />
                            </View>

                            <View style={styles.itemDetails}>
                            <Text style={styles.itemLabel}>
                                Display Options
                            </Text>

                            <Text style={styles.itemSublabel}>
                                {displayMode === "single"
                                ? "Single page"
                                : "Two pages"}

                                {" · "}

                                {orientationLock === "auto"
                                ? "Auto rotate"
                                : orientationLock === "portrait"
                                    ? "Portrait"
                                    : "Landscape"}
                            </Text>
                            </View>

                            <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#94A3B8"
                            />
                        </TouchableOpacity>
                    </ToolSection>


                    <View style={styles.divider} />

                    {/* SETTINGS */}

                    <ToolSection title="Settings">
                    <ToolItem
                        icon="document-text-outline"
                        label="Score Settings"
                        action="score-settings"
                        accentColor={accentColor}
                    />

                    {hasSetlist && (
                        <ToolItem
                        icon="list-outline"
                        label="Setlist Settings"
                        action="setlist-settings"
                        accentColor={accentColor}
                        />
                    )}

                    <ToolItem
                        icon="settings-outline"
                        label="Global Settings"
                        action="global-settings"
                        accentColor={accentColor}
                    />
                    </ToolSection>
                    </>
                )}
            </ScrollView>
        </View>
      </MenuOptions>
    </Menu>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
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
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },

  section: {
    paddingVertical: 6,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.7,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 10,
    borderRadius: 8,
  },

  itemIcon: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  itemDetails: {
    flex: 1,
    minWidth: 0,
  },

  itemLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#222",
  },

  itemSublabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },

  disabledItem: {
    opacity: 0.55,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },

  headerNavigation: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

backButton: {
  width: 28,
  height: 32,
  alignItems: "center",
  justifyContent: "center",
},
});

export default ReaderToolsMenu;
