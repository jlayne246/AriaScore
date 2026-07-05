import React, { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { createSetlist, getSetlistSummaries, updateSetlist,
deleteSetlist } from "../utils/database";
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";

const ACCENT_COLOR = "#2563EB";

type SetlistSummary = {
  id: number;
  name: string;
  description?: string | null;
  item_count: number;
};



const SetlistsScreen = () => {
  const navigation = useNavigation<any>();

  const [setlists, setSetlists] = useState<SetlistSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editingSetlist, setEditingSetlist] = useState<SetlistSummary | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const openCreateModal = () => setCreateVisible(true);

  const closeCreateModal = () => {
    setCreateVisible(false);
    setNewName("");
    setNewDescription("");
  };

  const loadSetlists = useCallback(async () => {
    try {
      setLoading(true);
      const results = await getSetlistSummaries();
      setSetlists(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSetlists();
    }, [loadSetlists])
  );

  const confirmDeleteSetlist = (item: SetlistSummary) => {
    Alert.alert(
      `Delete "${item.name}"?`,
      "This removes the setlist only. Scores remain in your library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSetlist(item.id);
            await loadSetlists();
          },
        },
      ]
    );
  };

  function MenuItem({
    icon,
    label,
    onPress,
    destructive = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }) {
    return (
      <MenuOption onSelect={onPress}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <Ionicons
            name={icon}
            size={20}
            color={destructive ? "#DC2626" : "#374151"}
            style={{ width: 28 }}
          />

          <Text style={{
            marginLeft: 10,
            fontSize: 16,
            color: destructive ? "#DC2626" : "#111827",
          }}>
            {label}
          </Text>
        </View>
      </MenuOption>
    );
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <View
          style={{
            height: 92,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            justifyContent: "flex-end",
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 12 }}
            >
              <Ionicons name="chevron-back" size={28} color={ACCENT_COLOR} />
            </TouchableOpacity>

            <Text
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: "300",
                color: "#111827",
              }}
            >
              Setlists
            </Text>

            <TouchableOpacity onPress={openCreateModal}>
              <Ionicons name="add" size={28} color={ACCENT_COLOR} />
            </TouchableOpacity>
          </View>
        </View>
      ),
    });
  }, [navigation]);

  const handleCreateSetlist = async () => {
    const name = newName.trim();
    const description = newDescription.trim();

    if (!name) {
      Alert.alert("Name required", "Please enter a setlist name.");
      return;
    }

    try {
      await createSetlist(name, description || undefined);
      closeCreateModal();
      await loadSetlists();
    } catch {
      Alert.alert(
        "Could not create setlist",
        "A setlist with that name may already exist."
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", padding: 16 }}>
      <FlatList
        data={setlists}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={loadSetlists}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("SetlistDetail", { setlistId: item.id })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>{item.name}</Text>

              {!!item.description?.trim() && (
                <Text numberOfLines={1} style={{ color: "#6B7280", marginTop: 4 }}>
                  {item.description.trim()}
                </Text>
              )}

              <Text style={{ color: "#666", marginTop: 4 }}>
                {item.item_count} {item.item_count === 1 ? "score" : "scores"}
              </Text>
            </View>

            <Menu>
              <MenuTrigger>
                <Ionicons name="ellipsis-vertical" size={24} color={ACCENT_COLOR} />
              </MenuTrigger>

              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    width: 220,
                    borderRadius: 14,
                    paddingVertical: 6,
                    backgroundColor: "white",
                    elevation: 10,
                  },
                }}
              >
                <MenuItem
                  icon="open-outline"
                  label="Open"
                  onPress={() =>
                    navigation.navigate("SetlistDetail", { setlistId: item.id })
                  }
                />

                <MenuItem
                  icon="create-outline"
                  label="Edit"
                  onPress={() => {
                    setEditingSetlist(item);
                    setEditName(item.name);
                    setEditDescription(item.description ?? "");
                    setEditVisible(true);
                  }}
                />

                <MenuItem
                  icon="settings-outline"
                  label="Settings"
                  onPress={() =>
                    navigation.navigate("SetlistSettings", { setlistId: item.id })
                  }
                />

                <MenuItem
                  icon="trash-outline"
                  label="Delete"
                  destructive
                  onPress={() => confirmDeleteSetlist(item)}
                />
              </MenuOptions>
            </Menu>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color="#9CA3AF"
              />

              <Text
                style={{
                  marginTop: 12,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                No setlists yet
              </Text>

              <TouchableOpacity
                onPress={openCreateModal}
                style={{
                  marginTop: 16,
                  backgroundColor: ACCENT_COLOR,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Add Setlist
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <Modal visible={createVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "70%",
              maxWidth: 520,
              backgroundColor: "white",
              borderRadius: 18,
              padding: 20,
            }}
          >
            <Text
              style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}
            >
              New Setlist
            </Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Setlist name"
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 12,
              }}
            />

            <TextInput
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Description optional"
              multiline
              style={{
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                minHeight: 90,
                textAlignVertical: "top",
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity onPress={closeCreateModal}>
                <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCreateSetlist}>
                <Text
                  style={{
                    color: ACCENT_COLOR,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SetlistsScreen;