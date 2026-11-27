// components/settings/SettingsSegmentedRow.tsx

import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../utils/theme/useAppTheme";

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
  const { colors } = useAppTheme();
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
            color={colors.accent}
            style={{ width: 26, marginTop: 1 }}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
            {title}
          </Text>

          {subtitle && (
            <Text style={{ color: colors.secondaryText, marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.surfaceSecondary,
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
                backgroundColor: selected ? colors.selectedBackground : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  color: selected ? colors.accent : colors.secondaryText,
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
