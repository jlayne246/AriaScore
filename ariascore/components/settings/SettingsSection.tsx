import { View, Text } from "react-native";

type Props = {
    title: string;
    children: React.ReactNode;
};

export default function SettingsSection({
    title,
    children,
}: Props) {

    return (
        <View style={{ marginBottom: 24 }}>
            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "700",
                    marginBottom: 12,
                }}
            >
                {title}
            </Text>

            <View
                style={{
                    backgroundColor: "white",
                    borderRadius: 12,
                    overflow: "hidden",
                }}
            >
                {children}
            </View>
        </View>
    );
}