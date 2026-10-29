import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DrawingSettings,
  DrawingTool,
  InputMode,
} from "./types";

interface Props {
  settings: DrawingSettings;
  onChange: (settings: DrawingSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const COLORS = [
  "#E04545",
  "#E1B525",
  "#3585D9",
  "#2D9A70",
  "#252525",
];

export function AnnotationToolbar({
  settings,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: Props) {
  const update = (
    patch: Partial<DrawingSettings>
  ) => {
    onChange({ ...settings, ...patch });
  };

  const selectTool = (tool: DrawingTool) => {
    update({
      tool,
      width: tool === "highlighter" ? 14 : 3,
      opacity: tool === "highlighter" ? 0.35 : 1,
    });
  };

  const selectMode = (mode: InputMode) => {
    update({ inputMode: mode });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {(["pen", "highlighter", "eraser"] as const)
          .map((tool) => (
            <Pressable
              key={tool}
              onPress={() => selectTool(tool)}
              style={[
                styles.button,
                settings.tool === tool &&
                  styles.selected,
              ]}
            >
              <Text style={styles.text}>
                {tool === "pen"
                  ? "✎ Pen"
                  : tool === "highlighter"
                  ? "Highlight"
                  : "Erase"}
              </Text>
            </Pressable>
          ))}

        <Pressable
          onPress={onUndo}
          disabled={!canUndo}
        >
          <Text style={[
            styles.action,
            !canUndo && styles.disabled,
          ]}>↶</Text>
        </Pressable>

        <Pressable
          onPress={onRedo}
          disabled={!canRedo}
        >
          <Text style={[
            styles.action,
            !canRedo && styles.disabled,
          ]}>↷</Text>
        </Pressable>
      </View>

      {settings.tool !== "eraser" && (
        <>
          <View style={styles.row}>
            {COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => update({ color })}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  settings.color === color &&
                    styles.activeSwatch,
                ]}
              />
            ))}
          </View>

          <View style={styles.row}>
            <Pressable
              onPress={() =>
                update({
                  width: Math.max(
                    1,
                    settings.width - 1
                  ),
                })
              }
            >
              <Text style={styles.action}>−</Text>
            </Pressable>

            <Text style={styles.text}>
              Width: {settings.width}
            </Text>

            <Pressable
              onPress={() =>
                update({
                  width: Math.min(
                    24,
                    settings.width + 1
                  ),
                })
              }
            >
              <Text style={styles.action}>+</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.row}>
        {(["auto", "stylus", "touch"] as const)
          .map((mode) => (
            <Pressable
              key={mode}
              onPress={() => selectMode(mode)}
              style={[
                styles.button,
                settings.inputMode === mode &&
                  styles.selected,
              ]}
            >
              <Text style={styles.text}>
                {mode === "auto"
                  ? "Auto"
                  : mode === "stylus"
                  ? "Stylus"
                  : "Finger"}
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    gap: 12,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    backgroundColor: "#EEEEEE",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selected: {
    backgroundColor: "#BBD8FF",
  },
  text: {
    color: "#202020",
    fontSize: 13,
  },
  action: {
    fontSize: 24,
    color: "#202020",
    paddingHorizontal: 6,
  },
  disabled: {
    opacity: 0.25,
  },
  swatch: {
    width: 25,
    height: 25,
    borderRadius: 13,
  },
  activeSwatch: {
    borderWidth: 3,
    borderColor: "#111111",
  },
});