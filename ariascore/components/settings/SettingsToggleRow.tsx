import { Switch, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT_COLOR } from "../../types";
import { useAppTheme } from "../../utils/theme/useAppTheme";

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
  const { colors } = useAppTheme();

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
          color={colors.accent}
          style={{ width: 26 }}
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

      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={colors.accent}
        trackColor={{
          false: colors.trackInactive,
          true: colors.trackActive,
        }}
      />
    </TouchableOpacity>
  );
}