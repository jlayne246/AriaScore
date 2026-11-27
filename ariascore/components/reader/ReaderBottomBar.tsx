import React, { useMemo } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReaderPageSlider from "./ReaderPageSlider";
import type { ReaderPageSliderProps } from "./ReaderPageSlider";

import { useAppTheme } from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

const BAR_MIN_HEIGHT = 64;
const BAR_BOTTOM_PADDING = 8;

const ReaderBottomBar = (sliderProps: ReaderPageSliderProps) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const scoreUsesSafeArea = Platform.OS === "ios";
  // Reach past the iOS score's safe-area boundary while keeping the slider
  // at its existing offset from that boundary.
  const bottom = scoreUsesSafeArea ? -insets.bottom : 0;
  const extension = insets.bottom - bottom;
  const left = scoreUsesSafeArea ? insets.left : 0;
  const right = scoreUsesSafeArea ? insets.right : 0;

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  return (
    <View
      style={[
        styles.container,
        {
          bottom,
          left: -left,
          right: -right,
          minHeight: BAR_MIN_HEIGHT + extension,
          paddingBottom: BAR_BOTTOM_PADDING + extension,
          paddingLeft: 16 + left,
          paddingRight: 16 + right,
        },
      ]}
    >
      <ReaderPageSlider {...sliderProps} />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      zIndex: 1300,

      backgroundColor: colors.readerChrome,

      borderTopWidth: 1,
      borderTopColor: colors.separator,
      paddingTop: 4,

      overflow: "visible",
    },
  });

export default ReaderBottomBar;
