import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AnnotationCanvas } from "../../src/services/annotations/AnnotationCanvas";
import { AnnotationToolbar } from "../../src/services/annotations/AnnotationToolbar";

import {
  DrawingSettings,
  StrokeAnnotation,
} from "../../src/services/annotations/types";

// Adjust the imports to your project structure.

export default function AnnotationTestScreen() {
  const { width } = useWindowDimensions();

  const pageWidth = width - 32;
  const pageHeight = pageWidth * 1.414;

  const [settings, setSettings] =
    useState<DrawingSettings>({
      tool: "pen",
      color: "#E04545",
      width: 3,
      opacity: 1,
      inputMode: "auto",
      palmRejectionEnabled: true,
    });

  const [history, setHistory] = useState<
    StrokeAnnotation[][]
  >([[]]);

  const [cursor, setCursor] = useState(0);
  const strokes = history[cursor];

  const commit = (next: StrokeAnnotation[]) => {
    setHistory((previous) => [
      ...previous.slice(0, cursor + 1),
      next,
    ]);

    setCursor((value) => value + 1);
  };

  const addStroke = (stroke: StrokeAnnotation) => {
    commit([...strokes, stroke]);
  };

  const eraseStroke = (id: string) => {
    commit(strokes.filter((s) => s.id !== id));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        AriaScore — Annotation Test
      </Text>

      <AnnotationToolbar
        settings={settings}
        onChange={setSettings}
        onUndo={() =>
          setCursor((i) => Math.max(0, i - 1))
        }
        onRedo={() =>
          setCursor((i) =>
            Math.min(history.length - 1, i + 1)
          )
        }
        canUndo={cursor > 0}
        canRedo={cursor < history.length - 1}
      />

      <View
        style={[
          styles.page,
          {
            width: pageWidth,
            height: pageHeight,
          },
        ]}
      >
        <AnnotationCanvas
          pageIndex={0}
          width={pageWidth}
          height={pageHeight}
          strokes={strokes}
          settings={settings}
          onAddStroke={addStroke}
          onEraseStroke={eraseStroke}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  content: {
    padding: 16,
    gap: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#202020",
  },
  page: {
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    elevation: 2,
  },
});