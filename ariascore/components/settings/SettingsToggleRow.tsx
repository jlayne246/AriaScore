import { Switch, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT_COLOR } from "../../types";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange(value: boolean): void;
};

export default function SettingsToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onValueChange(!value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
      }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={22}
          color={ACCENT_COLOR}
          style={{ width: 26 }}
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

      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={ACCENT_COLOR}
        trackColor={{
          false: "#D1D5DB",
          true: "#93C5FD",
        }}
      />
    </TouchableOpacity>
  );
}