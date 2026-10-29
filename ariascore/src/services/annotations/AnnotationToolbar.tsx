
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import type {
  DrawingSettings,
  DrawingTool,
  InputMode,
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

type Panel = "tool" | "input" | null;

type IconName =
  keyof typeof MaterialCommunityIcons.glyphMap;

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
  {
    id: "pen",
    icon: "pen",
    label: "Pen",
  },
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
  const [panel, setPanel] = useState<Panel>(null);

  const accentTint = `${accentColor}16`;

  const update = (
    patch: Partial<DrawingSettings>
  ) => {
    onChange({
      ...settings,
      ...patch,
    });
  };

  // TOOL SELECTION

  const selectTool = (tool: DrawingTool) => {
    if (settings.tool === tool) {
      setPanel((current) =>
        current === "tool" ? null : "tool"
      );
      return;
    }

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

    setPanel(null);
  };

  // STROKE SETTINGS

  const changeWidth = (delta: number) => {
    update({
      width: Math.max(
        1,
        Math.min(24, settings.width + delta)
      ),
    });
  };

  const changeOpacity = (delta: number) => {
    update({
      opacity: Math.max(
        0.1,
        Math.min(
          1,
          Math.round(
            (settings.opacity + delta) * 10
          ) / 10
        )
      ),
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
              : options?.color
              ? options.color
              : active
              ? accentColor
              : "#475569"
          }
        />
      </Pressable>
    );
  };

  // MAIN TOOLBAR

  const renderToolbar = () => (
    <View style={styles.toolbarRow}>
      <ScrollView
        horizontal
        style={styles.toolbarScroll}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.scrollContent}
      >
        {/* PEN / HIGHLIGHTER / ERASER */}

        {TOOLS.map((tool) => (
          <React.Fragment key={tool.id}>
            {renderIconButton(
              tool.icon,
              tool.label,
              () => selectTool(tool.id),
              {
                active: settings.tool === tool.id,
              }
            )}
          </React.Fragment>
        ))}

        <View style={styles.separator} />

        {/* COLOUR PRESETS */}

        {COLORS.map((color) => {
          const selected = settings.color === color;

          return (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`Ink colour ${color}`}
              accessibilityState={{ selected }}
              onPress={() => update({ color })}
              style={[
                styles.colorButton,
                selected && {
                  borderColor: accentColor,
                },
              ]}
            >
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                ]}
              />
            </Pressable>
          );
        })}

        <View style={styles.separator} />

        {/* STROKE SETTINGS */}

        {renderIconButton(
          "circle-outline",
          "Stroke settings",
          () =>
            setPanel((current) =>
              current === "tool" ? null : "tool"
            ),
          {
            active: panel === "tool",
          }
        )}

        <View style={styles.separator} />

        {/* UNDO / REDO */}

        {renderIconButton(
          "undo",
          "Undo",
          onUndo,
          { disabled: !canUndo }
        )}

        {renderIconButton(
          "redo",
          "Redo",
          onRedo,
          { disabled: !canRedo }
        )}

        <View style={styles.separator} />

        {/* INPUT SETTINGS */}

        {renderIconButton(
          "tune-variant",
          "Drawing input settings",
          () =>
            setPanel((current) =>
              current === "input" ? null : "input"
            ),
          {
            active: panel === "input",
          }
        )}
      </ScrollView>

      {/* FIXED DONE BUTTON */}

      <View style={styles.doneArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Finish annotating"
          onPress={onDone}
          style={[
            styles.doneButton,
            { backgroundColor: accentColor },
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
  );

  // CONTEXTUAL SETTINGS PANEL

  const renderToolSettings = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          {settings.tool === "highlighter"
            ? "Highlighter"
            : settings.tool === "eraser"
            ? "Eraser"
            : "Pen"}{" "}
          Settings
        </Text>

        {renderIconButton(
          "close",
          "Close settings",
          () => setPanel(null)
        )}
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          Stroke Width
        </Text>

        <View style={styles.stepper}>
          {renderIconButton(
            "minus",
            "Decrease stroke width",
            () => changeWidth(-1),
            { disabled: settings.width <= 1 }
          )}

          <Text style={styles.settingValue}>
            {settings.width}
          </Text>

          {renderIconButton(
            "plus",
            "Increase stroke width",
            () => changeWidth(1),
            { disabled: settings.width >= 24 }
          )}
        </View>
      </View>

      {settings.tool !== "eraser" && (
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Opacity
          </Text>

          <View style={styles.stepper}>
            {renderIconButton(
              "minus",
              "Decrease opacity",
              () => changeOpacity(-0.1),
              { disabled: settings.opacity <= 0.1 }
            )}

            <Text style={styles.settingValue}>
              {Math.round(settings.opacity * 100)}%
            </Text>

            {renderIconButton(
              "plus",
              "Increase opacity",
              () => changeOpacity(0.1),
              { disabled: settings.opacity >= 1 }
            )}
          </View>
        </View>
      )}
    </View>
  );

  // INPUT SETTINGS PANEL

  const renderInputSettings = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          Drawing Input
        </Text>

        {renderIconButton(
          "close",
          "Close settings",
          () => setPanel(null)
        )}
      </View>

      <View style={styles.inputModes}>
        {(
          ["auto", "stylus", "touch"] as InputMode[]
        ).map((mode) => {
          const active =
            settings.inputMode === mode;

          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{
                selected: active,
              }}
              onPress={() =>
                update({ inputMode: mode })
              }
              style={[
                styles.modeButton,
                active && {
                  backgroundColor: accentTint,
                  borderColor: accentColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeLabel,
                  active && {
                    color: accentColor,
                  },
                ]}
              >
                {mode === "auto"
                  ? "Automatic"
                  : mode === "stylus"
                  ? "Stylus"
                  : "Finger"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{
          checked: settings.palmRejectionEnabled,
        }}
        onPress={() =>
          update({
            palmRejectionEnabled:
              !settings.palmRejectionEnabled,
          })
        }
        style={styles.palmRow}
      >
        <MaterialCommunityIcons
          name={
            settings.palmRejectionEnabled
              ? "checkbox-marked"
              : "checkbox-blank-outline"
          }
          size={23}
          color={
            settings.palmRejectionEnabled
              ? accentColor
              : "#64748B"
          }
        />

        <Text style={styles.settingLabel}>
          Palm Rejection
        </Text>
      </Pressable>
    </View>
  );

  const renderPanel = () => {
    if (panel === "tool") {
      return renderToolSettings();
    }

    if (panel === "input") {
      return renderInputSettings();
    }

    return null;
  };

  // RENDER

  return (
    <View
      style={[
        styles.container,
        position === "bottom" &&
          styles.bottomContainer,
      ]}
    >
      {/* Bottom: expand panels upward */}
      {position === "bottom" && renderPanel()}

      {renderToolbar()}

      {/* Top: expand panels downward */}
      {position === "top" && renderPanel()}
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
    flex: 1,
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

  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  colorSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
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

  panel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
    backgroundColor: "#FFFFFF",
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

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },

  settingValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    minWidth: 42,
    textAlign: "center",
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  inputModes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  modeButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },

  modeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },

  palmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
});
