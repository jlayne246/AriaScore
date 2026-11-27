import { View, Text } from "react-native";
import { useAppTheme } from "../../utils/theme/useAppTheme";

type Props = {
    title: string;
    children: React.ReactNode;
};

export default function SettingsSection({
    title,
    children,
}: Props) {

    const { colors } = useAppTheme();

    return (
        <View style={{ marginBottom: 24 }}>
            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "700",
                    marginBottom: 12,
                    color: colors.text,
                }}
            >
                {title}
            </Text>

            <View
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    overflow: "hidden",
                }}
            >
                {children}
            </View>
        </View>
    );
}