import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { MusicItemWithAllData, Setlist, SetlistEntry } from '../types';
import {
  addSetlistEntry,
  getSetlistEntries,
  getMusicWithAllData,
  getSetlistById,
  removeSetlistEntry,
  updateSetlistOrder,
  updateSetlist,
  deleteSetlist,
  markSetlistOpened,
} from "../utils/database";
import MusicItemCard from '../components/MusicItemCard';
import AddScoreToSetlistModal from '../components/AddScoreToSetlistModal'
import { Ionicons } from '@expo/vector-icons';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";
import {
  useFocusEffect,
} from "@react-navigation/native";

const ACCENT_COLOR = '#2563EB';

type SetlistEntryWithMusic = SetlistEntry & {
  music: MusicItemWithAllData;
};

const SetlistDetailScreen = ({ route, navigation }: any) => {
  const { setlistId } = route.params;

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [entries, setEntries] =
    useState<SetlistEntryWithMusic[]>([]);

  const entriesRef =
    useRef<SetlistEntryWithMusic[]>([]);
  const [allScores, setAllScores] = useState<MusicItemWithAllData[]>([]);
  const [addScoresVisible, setAddScoresVisible] = useState(false);
  const [editSetlistVisible, setEditSetlistVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

    const loadSetlist = async () => {
      try {
        const result = await getSetlistById(setlistId);

        if (result != null) {
          setSetlist(result as Setlist);

          await markSetlistOpened(setlistId);
        }
      } catch (err) {
        console.error("Failed to load setlist", err);
      }
    };

    useEffect(() => {
      loadSetlist();
    }, [setlistId]);

    const loadScores = useCallback(async () => {
      const setlistEntries =
        await getSetlistEntries(setlistId);

      const allMusic =
        await getMusicWithAllData();

      setAllScores(allMusic);

      const entriesWithMusic: SetlistEntryWithMusic[] =
        setlistEntries
          .map((entry) => {
            const music = allMusic.find(
              (item) => item.id === entry.music_id
            );

            if (!music) {
              return null;
            }

            return {
              ...entry,
              music,
            };
          })
          .filter(
            (
              item
            ): item is SetlistEntryWithMusic =>
              item !== null
          );

      entriesRef.current = entriesWithMusic;
      setEntries(entriesWithMusic);
    }, [setlistId]);

    useFocusEffect(
      useCallback(() => {
        void loadScores();
      }, [loadScores])
    );

    const handleAddScores = async (selectedIds: number[]) => {
        try {
            for (const musicId of selectedIds) {
                await addSetlistEntry(musicId, setlistId);
            }

            setAddScoresVisible(false);
            await loadScores();
        } catch (error) {
            console.error("Failed to add scores to setlist:", error);
        }
    };

    const getScoreTitle = (item: MusicItemWithAllData) =>
      item.metadata?.title?.trim() ||
      item.title?.trim() ||
      "Untitled Score";

    const getEntryPageLabel = (
      entry: SetlistEntry
    ) => {
      if (
        entry.start_page != null &&
        entry.end_page != null
      ) {
        return `Pages ${entry.start_page}–${entry.end_page}`;
      }

      return "Full score";
    };

    const getEntryDisplayTitle = (
      entry: SetlistEntryWithMusic
    ) =>
      entry.entry_title?.trim() ||
      getScoreTitle(entry.music);

    const confirmDeleteSetlistItem = (
      entry: SetlistEntryWithMusic
    ) => {
      const title = getEntryDisplayTitle(entry);

      Alert.alert(
        `Remove "${title}"?`,
        "This removes this entry from the setlist only. The score remains in your library.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeSetlistEntry(entry.id);

                const updatedEntries =
                  entriesRef.current.filter(
                    item => item.id !== entry.id
                  );

                entriesRef.current = updatedEntries;
                setEntries(updatedEntries);

                const orderedEntryIds =
                  updatedEntries.map(
                    item => item.id
                  );

                await updateSetlistOrder(
                  setlistId,
                  orderedEntryIds
                );
              } catch (error) {
                Alert.alert(
                  "Could not remove score",
                  "Please try again."
                );
              }
            },
          },
        ]
      );
    };

  useLayoutEffect(() => {
    navigation.setOptions({
        header: () => (
        <View
            style={{
            height: 92,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            justifyContent: 'flex-end',
            paddingHorizontal: 20,
            paddingBottom: 12,
            }}
        >
            <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
            >
            <View
                style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                }}
            >
                <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginRight: 12 }}
                >
                <Ionicons
                    name="chevron-back"
                    size={28}
                    color={ACCENT_COLOR}
                />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                <Text
                    numberOfLines={1}
                    style={{
                    fontSize: 24,
                    color: '#111827',
                    fontWeight: '300',
                    }}
                >
                    {setlist?.name}
                </Text>

                {/* {!!setlistDescription && (
                    <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 14,
                        color: '#6B7280',
                        marginTop: 2,
                    }}
                    >
                    {setlistDescription}
                    </Text>
                )} */}
                </View>
            </View>

            <Menu>
              <MenuTrigger>
                <Ionicons name="ellipsis-vertical" size={24} color={ACCENT_COLOR} />
              </MenuTrigger>

              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    width: 240,
                    borderRadius: 14,
                    paddingVertical: 6,
                    backgroundColor: "white",
                    elevation: 10,
                  },
                }}
              >
                <MenuItem
                  icon="add-outline"
                  label="Add Scores"
                  onPress={() => setAddScoresVisible(true)}
                />

                <MenuItem
                  icon="create-outline"
                  label="Edit Setlist"
                  onPress={() => {
                    setEditName(setlist?.name ?? "");
                    setEditDescription(setlist?.description ?? "");
                    setEditSetlistVisible(true);
                  }}
                />

                <MenuItem
                  icon="settings-outline"
                  label="Setlist Settings"
                  onPress={() => {
                    navigation.navigate("SetlistSettings", { setlistId });
                  }}
                />

                <MenuItem
                  icon="trash-outline"
                  label="Delete Setlist"
                  destructive
                  onPress={() => {
                    Alert.alert(
                      "Delete setlist?",
                      "This removes the setlist, but not the scores in your library.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            await deleteSetlist(setlistId);
                            navigation.goBack();
                          },
                        },
                      ]
                    );
                  }}
                />
              </MenuOptions>
            </Menu>
            </View>
        </View>
        ),
    });
    }, [
        navigation,
        setlist
    ]);

  const existingMusicIds = entries.map(
    entry => entry.music_id
  );

  const totalPages = entries.reduce(
    (sum, entry) => {
      if (
        entry.start_page != null &&
        entry.end_page != null
      ) {
        return (
          sum +
          (entry.end_page -
            entry.start_page +
            1)
        );
      }

      return (
        sum +
        (entry.music.metadata?.page_count ??
          0)
      );
    },
    0
  );

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

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <DraggableFlatList
        data={entries}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={{
          paddingBottom: 32,
        }}
        onDragEnd={async ({ data }) => {
            entriesRef.current = data;
            setEntries(data);

            const orderedIds = data
                .map(score => score.id)
                .filter((id): id is number => typeof id === 'number');

            await updateSetlistOrder(setlistId, orderedIds);
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 }}>
            {/* <Text style={{ fontSize: 30, fontWeight: '800', color: '#111827' }}>
              {setlistName}
            </Text> */}

            {setlist?.description ? (
              <Text style={{ fontSize: 20, color: '#6B7280'}}>
                {setlist?.description}
              </Text>
            ) : (
                <Text style={{ fontSize: 20, color: '#6B7280'}}>
                    No description...
                </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 12,
                gap: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>
                  {entries.length} entries
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 13 }}>
                  {totalPages} pages
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 13 }}>
                  Performance order
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({
            item: entry,
            drag,
            isActive,
          }: RenderItemParams<SetlistEntryWithMusic>) => {
            const music = entry.music;
            const index = entries.findIndex(score => score.id === entry.id);

            const sourceTitle =
              getScoreTitle(music);

            const occurrenceTitle =
              getEntryDisplayTitle(entry);

            const pageLabel =
              getEntryPageLabel(entry);

            const isExcerpt =
              entry.start_page != null ||
              entry.end_page != null;

            const hasCustomTitle =
              !!entry.entry_title?.trim();

            return (
                <View
                    style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    marginBottom: 12,
                    opacity: isActive ? 0.85 : 1,
                    }}
                >
                    <TouchableOpacity
                    onLongPress={drag}
                    delayLongPress={150}
                    style={{
                        width: 34,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 6,
                    }}
                    >
                    <View>
                        <Text>{index + 1}</Text>
                    </View>

                    <Ionicons name="reorder-two-outline" size={22} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>

                    {(isExcerpt || hasCustomTitle) && (
                      <View
                        style={{
                          marginBottom: 6,
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#111827",
                          }}
                        >
                          {occurrenceTitle}
                        </Text>

                        <Text
                          style={{
                            marginTop: 2,
                            fontSize: 13,
                            color: "#6B7280",
                          }}
                        >
                          {hasCustomTitle
                            ? `${sourceTitle} · ${pageLabel}`
                            : pageLabel}
                        </Text>
                      </View>
                    )}

                    <MusicItemCard
                        item={music}
                        onOpen={() => {
                            const currentEntries =
                              entriesRef.current;

                            const currentIndex =
                              currentEntries.findIndex(
                                currentEntry =>
                                  currentEntry.id === entry.id
                              ) + 1;

                            // const currentIndex = currentMusicIds.indexOf(music.id!) + 1;

                            navigation.navigate("Reader", {
                                uri: music.uri,
                                musicId: music.id!,
                                startPage:
                                  entry.start_page ?? 1,
                                origin: "setlist",
                                context: {
                                  setlistId,
                                  setlistName: setlist?.name ?? "",
                                  setlistDescription:
                                    setlist?.description,

                                  currentIndex,
                                  totalItems:
                                    currentEntries.length,

                                  entries: currentEntries.map(
                                    ({
                                      music,
                                      ...entry
                                    }) => entry
                                  ),
                                },
                            });
                        }}
                        onDelete={() => confirmDeleteSetlistItem(entry)}
                        deleteTitle={
                          `Remove "${getEntryDisplayTitle(entry)}"?`
                        }
                        deleteMessage="This removes the score from this setlist only. The score remains in your library."
                        onShare={() => {}}
                    />
                    </View>
                </View>
            )}}
        ListEmptyComponent={
          <View
            style={{
                alignItems: 'center',
                paddingTop: 48,
            }}
            >
            <Ionicons
                name="musical-notes-outline"
                size={48}
                color="#9CA3AF"
            />

            <Text
                style={{
                marginTop: 12,
                fontSize: 18,
                fontWeight: '600',
                }}
            >
                No scores yet
            </Text>

            <TouchableOpacity
                onPress={() => setAddScoresVisible(true)}
                style={{
                marginTop: 16,
                backgroundColor: '#2563EB',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                }}
            >
                <Text style={{ color: 'white' }}>
                Add Scores
                </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <AddScoreToSetlistModal
        visible={addScoresVisible}
        scores={allScores}
        existingMusicIds={existingMusicIds}
        onClose={() => setAddScoresVisible(false)}
        onAdd={handleAddScores}
    />

    <Modal visible={editSetlistVisible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <View style={{
          width: "70%",
          maxWidth: 520,
          backgroundColor: "white",
          borderRadius: 18,
          padding: 20,
        }}>
          <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
            Edit Setlist
          </Text>

          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Setlist name"
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
            value={editDescription}
            onChangeText={setEditDescription}
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

          <View style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 20,
          }}>
            <TouchableOpacity onPress={() => setEditSetlistVisible(false)}>
              <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                const name = editName.trim();

                if (!name) {
                  Alert.alert("Name required", "Please enter a setlist name.");
                  return;
                }

                await updateSetlist(
                  setlistId,
                  name,
                  editDescription.trim()
                );

                setEditSetlistVisible(false);
                await loadSetlist();
              }}
            >
              <Text style={{ color: ACCENT_COLOR, fontWeight: "700", fontSize: 16 }}>
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

export default SetlistDetailScreen;
