
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AnnotationColorPicker } from "./AnnotationColourPicker";

import type {
  DrawingSettings,
  DrawingTool,
} from "./types";

interface Props {
  settings: DrawingSettings;
  onChange: (settings: DrawingSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
  canUndo: boolean;
  canRedo: boolean;
  accentColor: string;
  position?: "top" | "bottom";
}

type IconName =
  keyof typeof MaterialCommunityIcons.glyphMap;

type Panel = "colors" | "opacity" | null;

const COLORS = [
  "#D84343",
  "#E7B92B",
  "#337CCF",
  "#258866",
  "#272727",
];

const TOOLS: {
  id: DrawingTool;
  icon: IconName;
  label: string;
}[] = [
  { id: "pen", icon: "pen", label: "Pen" },
  {
    id: "highlighter",
    icon: "marker",
    label: "Highlighter",
  },
  {
    id: "eraser",
    icon: "eraser",
    label: "Eraser",
  },
];

export function AnnotationToolbar({
  settings,
  onChange,
  onUndo,
  onRedo,
  onDone,
  canUndo,
  canRedo,
  accentColor,
  position = "bottom",
}: Props) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [panel, setPanel] = useState<Panel>(null);

  const [
    customPickerOpen,
    setCustomPickerOpen,
  ] = useState(false);

  const [recentColors, setRecentColors] =
    useState<string[]>([]);

  const [strokeWidth, setStrokeWidth] =
    useState(settings.width);

  const [isSlidingWidth, setIsSlidingWidth] =
    useState(false);

  const [opacity, setOpacity] =
    useState(settings.opacity);

  const [isSlidingOpacity, setIsSlidingOpacity] =
    useState(false);

  const accentTint = `${accentColor}16`;

  useEffect(() => {
    if (!isSlidingWidth) {
      setStrokeWidth(settings.width);
    }
  }, [settings.width, isSlidingWidth]);

  useEffect(() => {
    if (!isSlidingOpacity) {
      setOpacity(settings.opacity);
    }
  }, [settings.opacity, isSlidingOpacity]);

  // SETTINGS UPDATE

  const update = (
    patch: Partial<DrawingSettings>
  ) => {
    onChange({
      ...settings,
      ...patch,
    });
  };

  // COLOUR SELECTION

  const chooseColor = (color: string) => {
    const normalized = color.toUpperCase();

    update({ color: normalized });

    if (
      !COLORS.some(
        (preset) =>
          preset.toUpperCase() === normalized
      )
    ) {
      setRecentColors((previous) =>
        [
          normalized,
          ...previous.filter(
            (item) => item !== normalized
          ),
        ].slice(0, 6)
      );
    }
  };

  // TOOL SELECTION

  const selectTool = (tool: DrawingTool) => {
    if (settings.tool === tool) return;

    setPanel(null);

    update({
      tool,
      width:
        tool === "highlighter"
          ? 14
          : tool === "pen"
          ? 3
          : settings.width,
      opacity:
        tool === "highlighter"
          ? 0.35
          : tool === "pen"
          ? 1
          : settings.opacity,
    });
  };

  // PALM REJECTION

  const palmRejectionActive =
    settings.inputMode === "stylus" ||
    settings.palmRejectionEnabled;

  const togglePalmRejection = () => {
    const enabled = !palmRejectionActive;

    update({
      inputMode: enabled ? "stylus" : "auto",
      palmRejectionEnabled: enabled,
    });
  };

  // SHARED ICON BUTTON

  const renderIconButton = (
    icon: IconName,
    label: string,
    onPress: () => void,
    options?: {
      active?: boolean;
      disabled?: boolean;
      color?: string;
    }
  ) => {
    const active = options?.active ?? false;
    const disabled = options?.disabled ?? false;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          disabled,
          selected: active,
        }}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.iconButton,
          active && {
            backgroundColor: accentTint,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={23}
          color={
            disabled
              ? "#CBD5E1"
              : options?.color ??
                (active
                  ? accentColor
                  : "#475569")
          }
        />
      </Pressable>
    );
  };

  // COLOUR SWATCH

  const swatch = (color: string) => {
    const active =
      settings.color.toUpperCase() ===
      color.toUpperCase();

    return (
      <Pressable
        key={color}
        accessibilityRole="button"
        accessibilityLabel={`Choose colour ${color}`}
        accessibilityState={{
          selected: active,
        }}
        onPress={() => chooseColor(color)}
        style={[
          styles.swatchButton,
          active && {
            borderColor: accentColor,
          },
        ]}
      >
        <View
          style={[
            styles.swatch,
            {
              backgroundColor: color,
            },
          ]}
        />
      </Pressable>
    );
  };

  // EXPANDABLE COLOUR PANEL

  const colorsPanel = (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          Ink colours
        </Text>

        {renderIconButton(
          "close",
          "Close colour picker",
          () => setPanel(null)
        )}
      </View>

      <Text style={styles.sectionLabel}>
        Presets
      </Text>

      <View style={styles.swatchRow}>
        {COLORS.map(swatch)}
      </View>

      {recentColors.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>
            Recently used (this session)
          </Text>

          <View style={styles.swatchRow}>
            {recentColors.map(swatch)}
          </View>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          customPickerOpen
            ? "Hide custom colour wheel"
            : "Show custom colour wheel"
        }
        onPress={() =>
          setCustomPickerOpen(
            (previous) => !previous
          )
        }
        style={styles.customToggle}
      >
        <MaterialCommunityIcons
          name="palette"
          size={20}
          color={accentColor}
        />

        <Text
          style={[
            styles.customToggleLabel,
            { color: accentColor },
          ]}
        >
          Custom colour wheel
        </Text>

        <MaterialCommunityIcons
          name={
            customPickerOpen
              ? "chevron-up"
              : "chevron-down"
          }
          size={21}
          color={accentColor}
        />
      </Pressable>

      {customPickerOpen && (
        <AnnotationColorPicker
          color={settings.color}
          onChange={chooseColor}
          accentColor={accentColor}
        />
      )}
    </View>
  );

  // EXPANDABLE OPACITY PANEL

  const opacityPanel = (
    <View style={styles.opacityPanel}>
      <Text style={styles.opacityLabel}>
        Opacity
      </Text>

      <Slider
        style={styles.opacitySlider}
        minimumValue={0.1}
        maximumValue={1}
        step={0.05}
        value={opacity}
        minimumTrackTintColor={accentColor}
        maximumTrackTintColor="#CBD5E1"
        thumbTintColor={accentColor}
        onSlidingStart={() =>
          setIsSlidingOpacity(true)
        }
        onValueChange={(value) =>
          setOpacity(
            Math.round(value * 100) / 100
          )
        }
        onSlidingComplete={(value) => {
          const next =
            Math.round(value * 100) / 100;

          setOpacity(next);
          update({ opacity: next });
          setIsSlidingOpacity(false);
        }}
        accessibilityLabel="Stroke opacity"
      />

      <Text style={styles.opacityValue}>
        {Math.round(opacity * 100)}%
      </Text>

      {renderIconButton(
        "close",
        "Close opacity slider",
        () => setPanel(null)
      )}
    </View>
  );

  const expandedPanel =
    panel === "colors"
      ? colorsPanel
      : panel === "opacity" &&
        settings.tool !== "eraser"
      ? opacityPanel
      : null;

  // MAIN TOOLBAR

  return (
    <View
      style={[
        styles.container,
        position === "bottom" &&
          styles.bottomContainer,
      ]}
    >
      {position === "bottom" && expandedPanel}

      <View style={styles.toolbarRow}>
        {/* SCROLLABLE CONTROLS */}

        <ScrollView
          horizontal
          style={styles.toolbarScroll}
          contentContainerStyle={
            styles.scrollContent
          }
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* PEN / HIGHLIGHTER / ERASER */}

          {TOOLS.map((tool) => (
            <React.Fragment key={tool.id}>
              {renderIconButton(
                tool.icon,
                tool.label,
                () => selectTool(tool.id),
                {
                  active:
                    settings.tool === tool.id,
                }
              )}
            </React.Fragment>
          ))}

          <View style={styles.separator} />

          {/* PALETTE */}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open ink colours"
            accessibilityState={{
              selected: panel === "colors",
            }}
            onPress={() =>
              setPanel((current) =>
                current === "colors"
                  ? null
                  : "colors"
              )
            }
            style={[
              styles.paletteButton,
              panel === "colors" && {
                backgroundColor: accentTint,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="palette"
              size={23}
              color={
                panel === "colors"
                  ? accentColor
                  : "#475569"
              }
            />

            <View
              style={[
                styles.paletteIndicator,
                {
                  backgroundColor: settings.color,
                },
              ]}
            />
          </Pressable>

          {/* OPACITY */}

          {settings.tool !== "eraser" &&
            renderIconButton(
              "opacity",
              "Adjust opacity",
              () =>
                setPanel((current) =>
                  current === "opacity"
                    ? null
                    : "opacity"
                ),
              {
                active: panel === "opacity",
              }
            )}

          <View style={styles.separator} />

          {/* UNDO / REDO */}

          {renderIconButton(
            "undo",
            "Undo",
            onUndo,
            {
              disabled: !canUndo,
            }
          )}

          {renderIconButton(
            "redo",
            "Redo",
            onRedo,
            {
              disabled: !canRedo,
            }
          )}

          <View style={styles.separator} />

          {/* PALM REJECTION */}

          {renderIconButton(
            "hand-back-right",
            palmRejectionActive
              ? "Palm rejection on: stylus only"
              : "Palm rejection off: stylus and finger",
            togglePalmRejection,
            {
              active: palmRejectionActive,
            }
          )}
        </ScrollView>

        {/* FIXED STROKE WIDTH */}

        <View style={styles.fixedWidthArea}>
          <MaterialCommunityIcons
            name="circle-outline"
            size={18}
            color="#475569"
          />

          <Slider
            style={styles.widthSlider}
            minimumValue={1}
            maximumValue={24}
            step={1}
            value={strokeWidth}
            minimumTrackTintColor={
              accentColor
            }
            maximumTrackTintColor="#CBD5E1"
            thumbTintColor={accentColor}
            onSlidingStart={() =>
              setIsSlidingWidth(true)
            }
            onValueChange={(value) =>
              setStrokeWidth(Math.round(value))
            }
            onSlidingComplete={(value) => {
              const next = Math.round(value);

              setStrokeWidth(next);
              update({ width: next });
              setIsSlidingWidth(false);
            }}
            accessibilityLabel="Stroke width"
          />

          <Text style={styles.widthValue}>
            {strokeWidth}
          </Text>
        </View>

        {/* FIXED DONE BUTTON */}

        <View style={styles.doneArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Finish annotating"
            onPress={onDone}
            style={[
              styles.doneButton,
              {
                backgroundColor: accentColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="check"
              size={24}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>

      {position === "top" && expandedPanel}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    elevation: 5,
  },

  bottomContainer: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  toolbarRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
  },

  toolbarScroll: {
    flexGrow: 0,
    flexShrink: 1,
    width: "auto",
    maxWidth: "55%",
    minWidth: 0,
  },

  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 5,
  },

  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },

  separator: {
    width: 1,
    height: 25,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },

  paletteButton: {
    width: 43,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },

  paletteIndicator: {
    position: "absolute",
    bottom: 2,
    width: 20,
    height: 4,
    borderRadius: 2,
  },

  fixedWidthArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
  },

  widthSlider: {
    flex: 1,
    minWidth: 0,
    height: 40,
  },

  widthValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    minWidth: 22,
    textAlign: "center",
  },

  panel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  panelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },

  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap",
  },

  swatchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  customToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },

  customToggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  opacityPanel: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },

  opacityLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },

  opacitySlider: {
    flex: 1,
    height: 40,
  },

  opacityValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    width: 44,
    textAlign: "right",
  },

  doneArea: {
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  doneButton: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
