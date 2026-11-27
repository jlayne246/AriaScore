import { useAppTheme } from "../utils/theme/useAppTheme";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
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
deleteSetlist, 
markSetlistOpened} from "../utils/database";
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";

function MenuItem({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <MenuOption onSelect={onPress}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={destructive ? colors.danger : colors.text}
          style={{ width: 26 }}
        />
        <Text style={{ marginLeft: 10, color: destructive ? colors.danger : colors.text, fontSize: 16 }}>{label}</Text>
      </TouchableOpacity>
    </MenuOption>
  );
}


type SetlistSummary = {
  id: number;
  name: string;
  description?: string | null;
  item_count: number;
  total_pages: number;
  created_at?: string | null;
  updated_at?: string | null;
  last_opened_at?: string | null;
};

type SortMode =
    | "name"
    | "updated"
    | "opened"
    | "scores";


    function StatChip({ label }: { label: string }) {
  const { colors } = useAppTheme();
    return (
      <View
        style={{
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          marginRight: 8,
        }}
      >
        <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: "600" }}>
          {label}
        </Text>
      </View>
    );
  }

  function SetlistCard({
    item,
    onOpen,
    onEdit,
    onSettings,
    onDelete,
  }: {
    item: SetlistSummary;
    onOpen: () => void;
    onEdit: () => void;
    onSettings: () => void;
    onDelete: () => void;
  }) {
  const { colors } = useAppTheme();
    const description = item.description?.trim();
    const isEmpty = item.item_count === 0;

    return (
      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.75}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            width: 54,
            height: 66,
            borderRadius: 12,
            backgroundColor: colors.selectedBackground,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons name="list-outline" size={28} color={colors.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 19,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            {item.name}
          </Text>

          {!!description && (
            <Text
              numberOfLines={1}
              style={{
                color: colors.secondaryText,
                marginTop: 3,
                fontSize: 14,
              }}
            >
              {description}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: description ? 10 : 8,
            }}
          >
            <StatChip
              label={
                isEmpty
                  ? "No scores yet"
                  : `${item.item_count} ${item.item_count === 1 ? "score" : "scores"}`
              }
            />

            {!isEmpty && typeof item.total_pages === "number" && (
              <StatChip
                label={`${item.total_pages} ${
                  item.total_pages === 1 ? "page" : "pages"
                }`}
              />
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            <DateMeta
              icon="time-outline"
              label={formatOpened(item.last_opened_at)}
            />

            <DateMeta
              icon="create-outline"
              label={formatUpdated(item.updated_at)}
            />
          </View>
        </View>

        <Menu>
          <MenuTrigger style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.accent} />
          </MenuTrigger>

          <MenuOptions
            customStyles={{
              optionsContainer: {
                width: 220,
                borderRadius: 14,
                paddingVertical: 6,
                backgroundColor: colors.elevated,
                elevation: 10,
              },
            }}
          >
            <MenuItem icon="open-outline" label="Open" onPress={onOpen} />
            <MenuItem icon="create-outline" label="Edit" onPress={onEdit} />
            <MenuItem icon="settings-outline" label="Settings" onPress={onSettings} />
            <MenuItem
              icon="trash-outline"
              label="Delete"
              destructive
              onPress={onDelete}
            />
          </MenuOptions>
        </Menu>
      </TouchableOpacity>
    );
  }

  const formatRelativeDate = (value?: string | null) => {
    if (!value) return null;

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatOpened = (value?: string | null) => {
    const formatted = formatRelativeDate(value);
    return formatted ? `Opened ${formatted}` : "Never opened";
  };

  const formatUpdated = (value?: string | null) => {
    const formatted = formatRelativeDate(value);
    return formatted ? `Updated ${formatted}` : "Updated unknown";
  };

  function DateMeta({
    icon,
    label,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }) {
  const { colors } = useAppTheme();
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginRight: 12,
          marginTop: 2,
        }}
      >
        <Ionicons name={icon} size={13} color={colors.tertiaryText} />
        <Text style={{ marginLeft: 4, color: colors.secondaryText, fontSize: 12 }}>
          {label}
        </Text>
      </View>
    );
  }

const SetlistsScreen = () => {
  const { colors } = useAppTheme();
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

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] =
    useState<SortMode>("name");

  const sortedSetlists = useMemo(() => {
    const copy = [...setlists];

    switch (sortMode) {
      case "opened":
        return copy.sort(
          (a, b) =>
            new Date(b.last_opened_at ?? 0).getTime() -
            new Date(a.last_opened_at ?? 0).getTime()
        );

      case "updated":
        return copy.sort(
          (a, b) =>
            new Date(b.updated_at ?? 0).getTime() -
            new Date(a.updated_at ?? 0).getTime()
        );

      case "scores":
        return copy.sort((a, b) => b.item_count - a.item_count);

      case "name":
      default:
        return copy.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [setlists, sortMode]);

  const filteredSetlists = useMemo(() => {
      const q = search.trim().toLowerCase();

      if (!q) return sortedSetlists;

      return sortedSetlists.filter(setlist =>
          setlist.name.toLowerCase().includes(q) ||
          (setlist.description ?? "")
              .toLowerCase()
              .includes(q)
      );
  }, [sortedSetlists, search]);

  const openCreateModal = () => setCreateVisible(true);

  const closeCreateModal = () => {
    setCreateVisible(false);
    setNewName("");
    setNewDescription("");
  };

  const loadSetlists = useCallback(async () => {
    try {
      setLoading(true);

      const results =
        await getSetlistSummaries();

      console.log(
        `Setlists loaded: ${results.length}`,
        results
      );

      setSetlists(results);
    } catch (error) {
      console.error(
        "Failed to load setlists:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSetlists();
    }, [loadSetlists])
  );

  const handleUpdateSetlist = async () => {
    if (!editingSetlist) return;

    const name = editName.trim();
    const description = editDescription.trim();

    if (!name) {
      Alert.alert("Name required", "Please enter a setlist name.");
      return;
    }

    try {
      await updateSetlist(editingSetlist.id, name, description || undefined);
      setEditVisible(false);
      setEditingSetlist(null);
      setEditName("");
      setEditDescription("");
      await loadSetlists();
    } catch {
      Alert.alert(
        "Could not update setlist",
        "A setlist with that name may already exist."
      );
    }
  };

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
  const { colors } = useAppTheme();
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
            color={destructive ? colors.danger : colors.text}
            style={{ width: 28 }}
          />

          <Text style={{
            marginLeft: 10,
            fontSize: 16,
            color: destructive ? colors.danger : colors.text,
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
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.separator,
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
              <Ionicons name="chevron-back" size={28} color={colors.accent} />
            </TouchableOpacity>

            <Text
              style={{
                flex: 1,
                fontSize: 24,
                color: colors.text,
                fontWeight: '400',
              }}
            >
              Setlists
            </Text>

            <Menu>
              <MenuTrigger style={{ paddingHorizontal: 8 }}>
                <Ionicons name="swap-vertical-outline" size={24} color={colors.accent} />
              </MenuTrigger>

              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    width: 230,
                    borderRadius: 14,
                    paddingVertical: 6,
                    backgroundColor: colors.elevated,
                    elevation: 10,
                  },
                }}
              >
                <MenuItem
                  icon={sortMode === "name" ? "radio-button-on" : "radio-button-off"}
                  label="Sort by Name"
                  onPress={() => setSortMode("name")}
                />
                <MenuItem
                  icon={sortMode === "opened" ? "radio-button-on" : "radio-button-off"}
                  label="Recently Opened"
                  onPress={() => setSortMode("opened")}
                />
                <MenuItem
                  icon={sortMode === "updated" ? "radio-button-on" : "radio-button-off"}
                  label="Recently Updated"
                  onPress={() => setSortMode("updated")}
                />
                <MenuItem
                  icon={sortMode === "scores" ? "radio-button-on" : "radio-button-off"}
                  label="Most Scores"
                  onPress={() => setSortMode("scores")}
                />
              </MenuOptions>
            </Menu>

            <TouchableOpacity onPress={openCreateModal} style={{ marginLeft: 12 }}>
              <Ionicons name="add" size={28} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      ),
    });
  }, [navigation, sortMode, colors]);

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
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <View style={{ marginBottom: 14 }}>
        <TextInput
          cursorColor={colors.accent}
          selectionColor={colors.accent}
          placeholderTextColor={colors.tertiaryText}
          value={search}
          onChangeText={setSearch}
          placeholder="Search setlists..."
          style={{ color: colors.text, backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 16,
            marginBottom: 10,
          }}
        />

        <Text style={{ color: colors.secondaryText, fontSize: 13 }}>
          {setlists.length} {setlists.length === 1 ? "setlist" : "setlists"} ·{" "}
          {(() => {
            const totalScores = setlists.reduce((sum, s) => sum + s.item_count, 0);

            return `${totalScores} ${totalScores === 1 ? "score" : "scores"}`;
          })()}
        </Text>
      </View>
      <FlatList
        data={filteredSetlists}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={loadSetlists}
        renderItem={({ item }) => (
          <SetlistCard
            item={item}
            onOpen={async () => {
              await markSetlistOpened(item.id);
              navigation.navigate("SetlistDetail", { setlistId: item.id });
            }}
            onEdit={() => {
              setEditingSetlist(item);
              setEditName(item.name);
              setEditDescription(item.description ?? "");
              setEditVisible(true);
            }}
            onSettings={() =>
              navigation.navigate("SetlistSettings", { setlistId: item.id })
            }
            onDelete={() => confirmDeleteSetlist(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={colors.tertiaryText}
              />

              <Text style={{ color: colors.text, marginTop: 12, fontSize: 18, fontWeight: "600" }}>
                {search.trim() ? "No matching setlists" : "No setlists yet"}
              </Text>

              <Text
                style={{
                  color: colors.secondaryText,
                  textAlign: "center",
                  marginTop: 6,
                  paddingHorizontal: 28,
                }}
              >
                {search.trim()
                  ? "Try a different name or description."
                  : "Organise music into rehearsal, service, and recital collections."}
              </Text>

              <TouchableOpacity
                onPress={openCreateModal}
                style={{
                  marginTop: 16,
                  backgroundColor: colors.accent,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: colors.onAccent, fontWeight: "700" }}>
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
            backgroundColor: colors.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "70%",
              maxWidth: 520,
              backgroundColor: colors.elevated,
              borderRadius: 18,
              padding: 20,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 16 }}
            >
              New Setlist
            </Text>

            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholderTextColor={colors.tertiaryText}
              value={newName}
              onChangeText={setNewName}
              placeholder="Setlist name"
              autoFocus
              style={{ color: colors.text, backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 12,
              }}
            />

            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholderTextColor={colors.tertiaryText}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Description optional"
              multiline
              style={{ color: colors.text, backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
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
                <Text style={{ color: colors.secondaryText, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCreateSetlist}>
                <Text
                  style={{
                    color: colors.accent,
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

      <Modal visible={editVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "70%",
              maxWidth: 520,
              backgroundColor: colors.elevated,
              borderRadius: 18,
              padding: 20,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
              Edit Setlist
            </Text>

            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholderTextColor={colors.tertiaryText}
              value={editName}
              onChangeText={setEditName}
              placeholder="Setlist name"
              autoFocus
              style={{ color: colors.text, backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 12,
              }}
            />

            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholderTextColor={colors.tertiaryText}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description optional"
              multiline
              style={{ color: colors.text, backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
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
              <TouchableOpacity
                onPress={() => {
                  setEditVisible(false);
                  setEditingSetlist(null);
                }}
              >
                <Text style={{ color: colors.secondaryText, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleUpdateSetlist}>
                <Text
                  style={{
                    color: colors.accent,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Save
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