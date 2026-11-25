import React from "react";
import { Text, TouchableOpacity } from "react-native";

interface ReaderScoreTitleProps {
  title: string;
  attribution?: string;
  pageLabel: string;
  setlistLabel?: string;
  accentColor: string;
  onPress: () => void;
}

const ReaderScoreTitle = ({
  title,
  attribution,
  pageLabel,
  setlistLabel,
  accentColor,
  onPress,
}: ReaderScoreTitleProps) => {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
      }}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 22,
          color: accentColor,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>

      {attribution ? (
        <Text
          style={{ fontSize: 14, color: "#666" }}
          numberOfLines={1}
        >
          {attribution}
        </Text>
      ) : (
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            fontStyle: "italic",
          }}
          numberOfLines={1}
        >
          No composer/editor information available
        </Text>
      )}

      <Text
        style={{ fontSize: 13, color: "#888" }}
        numberOfLines={1}
      >
        {setlistLabel ? `${setlistLabel} · ` : ""}
        {pageLabel}
      </Text>
    </TouchableOpacity>
  );
};

export default ReaderScoreTitle;