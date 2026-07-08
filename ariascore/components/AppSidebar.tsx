// components/AppSidebar.tsx
import { Pressable, Text, View, StyleSheet } from "react-native";

type SidebarItem = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

type Props = {
  items: SidebarItem[];
};

export function AppSidebar({ items }: Props) {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.title}>AIRScore</Text>

      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          style={[styles.item, item.active && styles.activeItem]}
        >
          <Text style={[styles.itemText, item.active && styles.activeText]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: "#ddd",
    paddingTop: 24,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  activeItem: {
    backgroundColor: "#eee",
  },
  itemText: {
    fontSize: 16,
  },
  activeText: {
    fontWeight: "700",
  },
});