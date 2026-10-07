import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Ionicons } from "@expo/vector-icons";

import {
  MusicItemWithAllData,
} from "../types";

export type ExcerptToAdd = {
  musicId: number;
  entryTitle: string | null;
  startPage: number;
  endPage: number;
};

interface AddScoreToSetlistModalProps {
  visible: boolean;

  scores: MusicItemWithAllData[];

  onClose: () => void;

  onAddFullScores: (
    selectedIds: number[]
  ) => Promise<void> | void;

  onAddExcerpt: (
    excerpt: ExcerptToAdd
  ) => Promise<void> | void;
}

type ExcerptDraft = {
  musicId: number;
  scoreTitle: string;
  entryTitle: string;
  startPage: string;
  endPage: string;
};

const ACCENT_COLOR = "#2563EB";

const AddScoreToSetlistModal = ({
  visible,
  scores,
  onClose,
  onAddFullScores,
  onAddExcerpt,
}: AddScoreToSetlistModalProps) => {
  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<number[]>([]);

  const [
    excerptEditor,
    setExcerptEditor,
  ] = useState<ExcerptDraft | null>(
    null
  );

  const [
    busy,
    setBusy,
  ] = useState(false);

  useEffect(() => {
    if (visible) {
      return;
    }

    setSearchText("");
    setSelectedIds([]);
    setExcerptEditor(null);
    setBusy(false);
  }, [visible]);

  const availableScores =
    useMemo(() => {
      const query =
        searchText
          .trim()
          .toLowerCase();

      return scores
        .filter(
          (
            score
          ): score is MusicItemWithAllData & {
            id: number;
          } =>
            typeof score.id === "number"
        )
        .filter((score) => {
          if (!query) {
            return true;
          }

          const title = (
            score.metadata?.title ??
            score.title ??
            ""
          ).toLowerCase();

          const creator = (
            score.metadata?.composer ??
            score.metadata?.editor ??
            score.metadata?.publisher ??
            ""
          ).toLowerCase();

          return (
            title.includes(query) ||
            creator.includes(query)
          );
        });
    }, [
      scores,
      searchText,
    ]);

  const toggleScore = (
    id: number
  ) => {
    if (busy) {
      return;
    }

    setSelectedIds((previous) => {
      const isSelected =
        previous.includes(id);

      if (
        isSelected &&
        excerptEditor?.musicId === id
      ) {
        setExcerptEditor(null);
      }

      return isSelected
        ? previous.filter(
            existingId =>
              existingId !== id
          )
        : [
            ...previous,
            id,
          ];
    });
  };

  const resetAndClose = () => {
    if (busy) {
      return;
    }

    setSelectedIds([]);
    setSearchText("");
    setExcerptEditor(null);

    onClose();
  };

  const handleAddFullScores =
    async () => {
      if (
        selectedIds.length === 0 ||
        busy
      ) {
        return;
      }

      setBusy(true);

      try {
        await onAddFullScores(
          selectedIds
        );

        setSelectedIds([]);
        setSearchText("");
      } catch (error) {
        console.error(
          "Failed to add full scores:",
          error
        );

        Alert.alert(
          "Error",
          "Failed to add the selected scores."
        );
      } finally {
        setBusy(false);
      }
    };

  const handleAddExcerpt =
    async () => {
      if (
        !excerptEditor ||
        busy
      ) {
        return;
      }

      const startPage =
        Number(
          excerptEditor.startPage
        );

      const endPage =
        Number(
          excerptEditor.endPage
        );

      if (
        !Number.isInteger(
          startPage
        ) ||
        !Number.isInteger(
          endPage
        ) ||
        startPage < 1 ||
        endPage < 1
      ) {
        Alert.alert(
          "Invalid pages",
          "Start and end pages must be positive whole numbers."
        );

        return;
      }

      if (endPage < startPage) {
        Alert.alert(
          "Invalid page range",
          "The end page cannot be before the start page."
        );

        return;
      }

      setBusy(true);

      try {
        await onAddExcerpt({
          musicId:
            excerptEditor.musicId,

          entryTitle:
            excerptEditor
              .entryTitle
              .trim() ||
            null,

          startPage,
          endPage,
        });

        setExcerptEditor(null);
      } catch (error) {
        console.error(
          "Failed to add excerpt:",
          error
        );

        Alert.alert(
          "Error",
          "Failed to add excerpt."
        );
      } finally {
        setBusy(false);
      }
    };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={
        resetAndClose
      }
    >
      <View
        style={{
          flex: 1,
          backgroundColor:
            "rgba(0,0,0,0.4)",
          justifyContent:
            "center",
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor:
              "white",
            borderRadius: 16,
            maxHeight: "84%",
            padding: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection:
                "row",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              marginBottom: 14,
            }}
          >
            <View
              style={{
                flex: 1,
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                Add Scores
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 4,
                }}
              >
                Add full scores or
                create page excerpts.
                Scores may appear more
                than once.
              </Text>
            </View>

            <TouchableOpacity
              onPress={
                resetAndClose
              }
              disabled={busy}
              style={{
                padding: 4,
              }}
            >
              <Ionicons
                name="close"
                size={26}
                color={
                  ACCENT_COLOR
                }
              />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <TextInput
            placeholder="Search scores..."
            value={searchText}
            onChangeText={
              setSearchText
            }
            editable={!busy}
            style={{
              borderWidth: 1,
              borderColor:
                "#E5E7EB",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
              fontSize: 16,
            }}
          />

          {/* Score list */}
          <FlatList
            data={
              availableScores
            }
            keyExtractor={(item) =>
              item.id.toString()
            }
            keyboardShouldPersistTaps="handled"
            style={{
              maxHeight:
                excerptEditor
                  ? 260
                  : 420,
            }}
            renderItem={({
              item,
            }) => {
              const id =
                item.id;

              const selected =
                selectedIds.includes(
                  id
                );

              const title =
                item.metadata
                  ?.title
                  ?.trim() ||
                item.title?.trim() ||
                "Untitled Score";

              const creator =
                item.metadata
                  ?.composer
                  ?.trim() ||
                item.metadata
                  ?.editor
                  ?.trim() ||
                item.metadata
                  ?.publisher
                  ?.trim() ||
                "Unknown";

              const pageCount =
                item.metadata
                  ?.page_count;

              return (
                <View
                  style={{
                    flexDirection:
                      "row",
                    alignItems:
                      "center",
                    paddingVertical:
                      10,
                    borderBottomWidth:
                      1,
                    borderBottomColor:
                      "#F3F4F6",
                  }}
                >
                  {/* Full-score selector */}
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() =>
                      toggleScore(
                        id
                      )
                    }
                    style={{
                      flexDirection:
                        "row",
                      alignItems:
                        "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name={
                        selected
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={24}
                      color={
                        ACCENT_COLOR
                      }
                    />

                    <View
                      style={{
                        marginLeft: 12,
                        flex: 1,
                      }}
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={{
                          fontSize: 16,
                          fontWeight:
                            "600",
                          color:
                            "#111827",
                        }}
                      >
                        {title}
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={{
                          color:
                            "#6B7280",
                          marginTop: 2,
                          fontSize: 13,
                        }}
                      >
                        {creator}
                        {typeof pageCount ===
                        "number"
                          ? ` · ${pageCount} pages`
                          : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Add excerpt */}
                  <TouchableOpacity
                    disabled={busy || !selected}
                    onPress={() =>
                      setExcerptEditor({
                        musicId: id,
                        scoreTitle: title,
                        entryTitle: "",
                        startPage: "",
                        endPage: "",
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      opacity: selected ? 1 : 0.4,
                    }}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color={
                        selected
                          ? ACCENT_COLOR
                          : "#9CA3AF"
                      }
                    />

                    <Text
                      style={{
                        marginLeft: 5,
                        color:
                          selected
                            ? ACCENT_COLOR
                            : "#9CA3AF",
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      Excerpt
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text
                style={{
                  color:
                    "#6B7280",
                  textAlign:
                    "center",
                  padding: 20,
                }}
              >
                No scores found.
              </Text>
            }
          />

          {/* Excerpt editor */}
          {excerptEditor && (
            <View
              style={{
                marginTop: 14,
                padding: 14,
                borderWidth: 1,
                borderColor:
                  "#D1D5DB",
                borderRadius: 12,
                backgroundColor:
                  "#F9FAFB",
              }}
            >
              <View
                style={{
                  flexDirection:
                    "row",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-start",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight:
                        "700",
                      color:
                        "#111827",
                    }}
                  >
                    Add Excerpt
                  </Text>

                  <Text
                    numberOfLines={
                      1
                    }
                    style={{
                      fontSize: 13,
                      color:
                        "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    {
                      excerptEditor.scoreTitle
                    }
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={busy}
                  onPress={() =>
                    setExcerptEditor(
                      null
                    )
                  }
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Optional title */}
              <View
                style={{
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      "#6B7280",
                    marginBottom: 4,
                  }}
                >
                  Name
                </Text>

                <TextInput
                  value={
                    excerptEditor.entryTitle
                  }
                  editable={!busy}
                  onChangeText={(
                    value
                  ) =>
                    setExcerptEditor(
                      (
                        previous
                      ) =>
                        previous
                          ? {
                              ...previous,
                              entryTitle:
                                value,
                            }
                          : null
                    )
                  }
                  placeholder="e.g. Kyrie"
                  style={{
                    borderWidth: 1,
                    borderColor:
                      "#D1D5DB",
                    borderRadius: 8,
                    backgroundColor:
                      "white",
                    paddingHorizontal:
                      10,
                    paddingVertical:
                      9,
                  }}
                />
              </View>

              {/* Page range */}
              <View
                style={{
                  flexDirection:
                    "row",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    Start page
                  </Text>

                  <TextInput
                    keyboardType="number-pad"
                    editable={!busy}
                    value={
                      excerptEditor.startPage
                    }
                    onChangeText={(
                      value
                    ) =>
                      setExcerptEditor(
                        (
                          previous
                        ) =>
                          previous
                            ? {
                                ...previous,
                                startPage:
                                  value,
                              }
                            : null
                      )
                    }
                    placeholder="1"
                    style={{
                      borderWidth: 1,
                      borderColor:
                        "#D1D5DB",
                      borderRadius: 8,
                      backgroundColor:
                        "white",
                      paddingHorizontal:
                        10,
                      paddingVertical:
                        9,
                    }}
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        "#6B7280",
                      marginBottom: 4,
                    }}
                  >
                    End page
                  </Text>

                  <TextInput
                    keyboardType="number-pad"
                    editable={!busy}
                    value={
                      excerptEditor.endPage
                    }
                    onChangeText={(
                      value
                    ) =>
                      setExcerptEditor(
                        (
                          previous
                        ) =>
                          previous
                            ? {
                                ...previous,
                                endPage:
                                  value,
                              }
                            : null
                      )
                    }
                    placeholder="5"
                    style={{
                      borderWidth: 1,
                      borderColor:
                        "#D1D5DB",
                      borderRadius: 8,
                      backgroundColor:
                        "white",
                      paddingHorizontal:
                        10,
                      paddingVertical:
                        9,
                    }}
                  />
                </View>
              </View>

              {/* Excerpt actions */}
              <View
                style={{
                  flexDirection:
                    "row",
                  justifyContent:
                    "flex-end",
                  alignItems:
                    "center",
                  gap: 16,
                  marginTop: 14,
                }}
              >
                <TouchableOpacity
                  disabled={busy}
                  onPress={() =>
                    setExcerptEditor(
                      null
                    )
                  }
                >
                  <Text
                    style={{
                      color:
                        "#6B7280",
                      fontSize: 15,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={busy}
                  onPress={() =>
                    void handleAddExcerpt()
                  }
                >
                  <Text
                    style={{
                      color:
                        ACCENT_COLOR,
                      fontWeight:
                        "700",
                      fontSize: 15,
                      opacity:
                        busy
                          ? 0.6
                          : 1,
                    }}
                  >
                    {busy
                      ? "Adding..."
                      : "Add Excerpt"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent:
                "flex-end",
              alignItems:
                "center",
              marginTop: 16,
            }}
          >
            <TouchableOpacity
              onPress={
                resetAndClose
              }
              disabled={busy}
              style={{
                marginRight: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color:
                    "#6B7280",
                  paddingHorizontal:
                    16,
                  paddingVertical:
                    10,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                void handleAddFullScores()
              }
              disabled={
                selectedIds.length ===
                  0 ||
                busy
              }
              style={{
                backgroundColor:
                  selectedIds.length ===
                    0 ||
                  busy
                    ? "#9CA3AF"
                    : ACCENT_COLOR,
                paddingHorizontal:
                  16,
                paddingVertical:
                  10,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "600",
                }}
              >
                {busy &&
                selectedIds.length >
                  0
                  ? "Adding..."
                  : `Add Scores (${selectedIds.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddScoreToSetlistModal;