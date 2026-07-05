import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { MusicItemWithAllData, Setlist } from '../types';
import { addMusicToSetlistById, getMusicIdsForSetlist, getMusicWithAllData, getSetlistById, removeMusicFromSetlistById, updateSetlistOrder, updateSetlist,
deleteSetlist,
markSetlistOpened} from '../utils/database';
import MusicItemCard from '../components/MusicItemCard';
import AddScoreToSetlistModal from '../components/AddScoreToSetlistModal'
import { Ionicons } from '@expo/vector-icons';
import MetadataForm from '../components/MetadataForm';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

const ACCENT_COLOR = '#2563EB';

const SetlistDetailScreen = ({ route, navigation }: any) => {
  const { setlistId } = route.params;

  const scoresRef = useRef<MusicItemWithAllData[]>([]);

  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [scores, setScores] = useState<MusicItemWithAllData[]>([]);
  const [allScores, setAllScores] = useState<MusicItemWithAllData[]>([]);
  const [addScoresVisible, setAddScoresVisible] = useState(false);
  const [selectedMusicId, setSelectedMusicId] = useState<number | undefined>();
  const [selectedPdfUri, setSelectedPdfUri] = useState<string | undefined>();
  const [metadataFormVisible, setMetadataFormVisible] = useState(false);
  const [editSetlistVisible, setEditSetlistVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

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

    const loadScores = async () => {
        const ids = await getMusicIdsForSetlist(setlistId);
        const allMusic = await getMusicWithAllData();

        setAllScores(allMusic);

        const orderedScores = ids
            .map(id => allMusic.find(m => m.id === id))
            .filter((item): item is MusicItemWithAllData => !!item);

        setScores(orderedScores);
    };

    useEffect(() => {
        loadScores();
    }, [setlistId]);

    const handleAddScores = async (selectedIds: number[]) => {
        try {
            for (const musicId of selectedIds) {
                await addMusicToSetlistById(musicId, setlistId);
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

    const confirmDeleteSetlistItem = (item: MusicItemWithAllData) => {
      if (!item.id) return;

      const title = getScoreTitle(item);

      Alert.alert(
        `Remove "${title}"?`,
        "This removes the score from this setlist only. It will remain in your library.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await removeMusicFromSetlistById(item.id!, setlistId);

                const updatedScores = scoresRef.current.filter(
                  score => score.id !== item.id
                );

                scoresRef.current = updatedScores;
                setScores(updatedScores);

                const orderedIds = updatedScores
                  .map(score => score.id)
                  .filter((id): id is number => typeof id === "number");

                await updateSetlistOrder(setlistId, orderedIds);
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

  useEffect(() => {
    const load = async () => {
      const ids = await getMusicIdsForSetlist(setlistId);
      const allMusic = await getMusicWithAllData();

      const orderedScores = ids
        .map(id => allMusic.find(m => m.id === id))
        .filter((item): item is MusicItemWithAllData => !!item);

      setScores(orderedScores);
    };

    load();
  }, [setlistId]);

  const musicIds = scores
    .map(score => score.id)
    .filter((id): id is number => typeof id === 'number');

  const totalPages = scores.reduce((sum, score) => {
    return sum + (score.metadata?.page_count ?? 0);
  }, 0);

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
        data={scores}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={{
          paddingBottom: 32,
        }}
        onDragEnd={async ({ data }) => {
            scoresRef.current = data;
            setScores(data);

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
                  {scores.length} scores
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
        renderItem={({ item, drag, isActive }: RenderItemParams<MusicItemWithAllData>) => {
            const index = scores.findIndex(score => score.id === item.id);

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
                    <MusicItemCard
                        item={item}
                        onOpen={() => {
                            const currentScores = scoresRef.current;

                            const currentMusicIds = currentScores
                                .map(score => score.id)
                                .filter((id): id is number => typeof id === "number");

                            const currentIndex = currentMusicIds.indexOf(item.id!) + 1;

                            navigation.navigate("Reader", {
                                uri: item.uri,
                                musicId: item.id!,
                                startPage: 1,
                                context: {
                                    setlistId,
                                    setlistName: setlist?.name,
                                    setlistDescription: setlist?.description,
                                    currentIndex,
                                    totalItems: currentMusicIds.length,
                                    musicIds: currentMusicIds,
                                },
                            });
                        }}
                        onEditMetadata={() => {
                            setSelectedMusicId(item.id);
                            setSelectedPdfUri(item.uri);
                            setMetadataFormVisible(true);
                        }}
                        onDelete={() => confirmDeleteSetlistItem(item)}
                        deleteTitle={`Remove "${item?.title}"?`}
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

      <MetadataForm
            visible={metadataFormVisible}
            musicId={selectedMusicId}
            pdfUri={selectedPdfUri}
            mode="edit"
            onCancel={() => {
                setMetadataFormVisible(false);
                setSelectedMusicId(undefined);
                setSelectedPdfUri(undefined);
            }}
            onSave={async () => {
                setMetadataFormVisible(false);
                setSelectedMusicId(undefined);
                setSelectedPdfUri(undefined);
                await loadScores();
            }}
        />

      <AddScoreToSetlistModal
        visible={addScoresVisible}
        scores={allScores}
        existingMusicIds={musicIds}
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

function markSetlistAsOpened(setlistId: any) {
  throw new Error('Function not implemented.');
}
