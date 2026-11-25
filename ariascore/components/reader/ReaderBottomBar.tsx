import React from "react";
import { View, StyleSheet } from "react-native";

import ReaderPageSlider from "./ReaderPageSlider";
import type { ReaderPageSliderProps } from "./ReaderPageSlider";

interface ReaderBottomBarProps
  extends ReaderPageSliderProps {
  bottomInset: number;
}

const ReaderBottomBar = ({
  bottomInset,
  ...sliderProps
}: ReaderBottomBarProps) => {
  return (
    <View
        style={[
            styles.container,
            {
            bottom: bottomInset,
            },
        ]}
    >
        <ReaderPageSlider {...sliderProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,

    zIndex: 1300,

    minHeight: 64,

    backgroundColor: "rgba(255,255,255,0.96)",

    borderTopWidth: 1,
    borderTopColor: "#ddd",

    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,

    overflow: "visible",
  },
});

export default ReaderBottomBar;