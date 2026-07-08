// components/settings/SettingsSegmentedRow.tsx

import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT_COLOR } from "../../types";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: T;
  options: Option<T>[];
  onValueChange: (value: T) => void;
};

const SettingsSegmentedRow = <T extends string>({
  icon,
  title,
  subtitle,
  value,
  options,
  onValueChange,
}: Props<T>) => {
  return (
    <View style={{ padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 10,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={22}
            color={ACCENT_COLOR}
            style={{ width: 26, marginTop: 1 }}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
            {title}
          </Text>

          {subtitle && (
            <Text style={{ color: "#6B7280", marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#E5E7EB",
          borderRadius: 10,
          padding: 3,
        }}
      >
        {options.map(option => {
          const selected = option.value === value;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onValueChange(option.value)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 8,
                backgroundColor: selected ? "white" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: selected ? ACCENT_COLOR : "#6B7280",
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default SettingsSegmentedRow;