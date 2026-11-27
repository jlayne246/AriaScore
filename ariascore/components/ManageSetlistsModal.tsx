import { useAppTheme } from "../utils/theme/useAppTheme";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  useNavigation,
} from "@react-navigation/native";

import {
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import {
  RootStackParamList,
  SetlistEntry,
  SetlistSummary,
} from "../types";

import {
  addSetlistEntry,
  createSetlist,
  getSetlistEntriesForMusicInSetlist,
  getSetlistSummaries,
  removeSetlistEntry,
  updateSetlistEntry,
} from "../utils/database";

interface ManageSetlistsModalProps {
  visible: boolean;
  musicId: number;
  onClose: () => void;
  onSaved: () => void;
}

type NavigationProp =
  NativeStackNavigationProp<
    RootStackParamList
  >;

type EntriesBySetlist =
  Record<number, SetlistEntry[]>;

type ExcerptDraft = {
  setlistId: number;
  entryId: number | null;
  entryTitle: string;
  startPage: string;
  endPage: string;
};


const getEntryLabel = (
  entry: SetlistEntry
) => {
  if (
    entry.start_page == null &&
    entry.end_page == null
  ) {
    return "Full score";
  }

  if (
    entry.start_page != null &&
    entry.end_page != null
  ) {
    if (
      entry.start_page ===
      entry.end_page
    ) {
      return `Page ${entry.start_page}`;
    }

    return `Pages ${entry.start_page}–${entry.end_page}`;
  }

  if (entry.start_page != null) {
    return `From page ${entry.start_page}`;
  }

  return `Through page ${entry.end_page}`;
};

const ManageSetlistsModal:
  React.FC<ManageSetlistsModalProps> = ({
    visible,
    musicId,
    onClose,
    onSaved,
  }) => {
  const { colors } = useAppTheme();
    const navigation =
      useNavigation<NavigationProp>();

    const [setlists, setSetlists] =
      useState<SetlistSummary[]>([]);

    const [
      entriesBySetlist,
      setEntriesBySetlist,
    ] = useState<EntriesBySetlist>({});

    const [searchText, setSearchText] =
      useState("");

    const [
      addNewSetlist,
      setAddNewSetlist,
    ] = useState(false);

    const [
      newSetlistName,
      setNewSetlistName,
    ] = useState("");

    const [
      excerptEditor,
      setExcerptEditor,
    ] = useState<ExcerptDraft | null>(
      null
    );

    const [loading, setLoading] =
      useState(false);

    const [busy, setBusy] =
      useState(false);

    const loadData = useCallback(
      async () => {
        setLoading(true);

        try {
          const all =
            await getSetlistSummaries();

          const entryPairs =
            await Promise.all(
              all.map(
                async (setlist) => {
                  const entries =
                    await getSetlistEntriesForMusicInSetlist(
                      musicId,
                      setlist.id
                    );

                  return [
                    setlist.id,
                    entries,
                  ] as const;
                }
              )
            );

          setSetlists(all);

          setEntriesBySetlist(
            Object.fromEntries(
              entryPairs
            )
          );
        } catch (error) {
          console.error(
            "Failed to load setlists:",
            error
          );

          Alert.alert(
            "Error",
            "Failed to load setlists."
          );
        } finally {
          setLoading(false);
        }
      },
      [musicId]
    );

    useEffect(() => {
      if (!visible) {
        return;
      }

      void loadData();
    }, [
      visible,
      loadData,
    ]);

    useEffect(() => {
      if (visible) {
        return;
      }

      setSearchText("");
      setAddNewSetlist(false);
      setNewSetlistName("");
      setExcerptEditor(null);
    }, [visible]);

    const filteredSetlists =
      useMemo(() => {
        const query =
          searchText
            .trim()
            .toLowerCase();

        if (!query) {
          return setlists;
        }

        return setlists.filter(
          (setlist) =>
            setlist.name
              .toLowerCase()
              .includes(query)
        );
      }, [
        setlists,
        searchText,
      ]);

    const notifyChanged =
      useCallback(() => {
        onSaved();
      }, [onSaved]);

    const navigateToSetlist = (
      setlistId: number
    ) => {
      onClose();

      navigation.navigate(
        "SetlistDetail",
        {
          setlistId,
        }
      );
    };

    const handleCreateSetlist =
      async () => {
        const name =
          newSetlistName.trim();

        if (!name || busy) {
          return;
        }

        setBusy(true);

        try {
          await createSetlist(name);

          setNewSetlistName("");
          setAddNewSetlist(false);

          await loadData();
        } catch (error) {
          console.error(
            "Failed to create setlist:",
            error
          );

          Alert.alert(
            "Error",
            "Failed to create setlist."
          );
        } finally {
          setBusy(false);
        }
      };

    const handleAddFullScore =
      async (
        setlistId: number
      ) => {
        if (busy) {
          return;
        }

        setBusy(true);

        try {
          await addSetlistEntry(
            musicId,
            setlistId,
            null,
            null
          );

          await loadData();

          notifyChanged();
        } catch (error) {
          console.error(
            "Failed to add score to setlist:",
            error
          );

          Alert.alert(
            "Error",
            "Failed to add score to setlist."
          );
        } finally {
          setBusy(false);
        }
      };

    const handleSaveExcerpt =
      async () => {
        if (!excerptEditor || busy) {
          return;
        }

        const startPageText =
          excerptEditor.startPage.trim();

        const endPageText =
          excerptEditor.endPage.trim();

        const startPage =
          Number(startPageText);

        if (
          startPageText === "" ||
          !Number.isInteger(startPage) ||
          startPage < 1
        ) {
          Alert.alert(
            "Invalid start page",
            "Start page must be a positive whole number."
          );

          return;
        }

        // Blank end page means a single-page
        // excerpt.
        let endPage = startPage;

        if (endPageText !== "") {
          const parsedEndPage =
            Number(endPageText);

          if (
            !Number.isInteger(
              parsedEndPage
            ) ||
            parsedEndPage < 1
          ) {
            Alert.alert(
              "Invalid end page",
              "End page must be a positive whole number."
            );

            return;
          }

          endPage = parsedEndPage;
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
          const entryTitle =
            excerptEditor.entryTitle.trim() ||
            null;

          if (
            excerptEditor.entryId == null
          ) {
            await addSetlistEntry(
              musicId,
              excerptEditor.setlistId,
              entryTitle,
              startPage,
              endPage
            );
          } else {
            await updateSetlistEntry(
              excerptEditor.entryId,
              {
                entryTitle,
                startPage,
                endPage,
              }
            );
          }

          setExcerptEditor(null);

          await loadData();
          notifyChanged();
        } catch (error) {
          console.error(
            "Failed to save excerpt:",
            error
          );

          Alert.alert(
            "Error",
            "Failed to save excerpt."
          );
        } finally {
          setBusy(false);
        }
      };

    const handleRemoveEntry = (
      entry: SetlistEntry
    ) => {
      Alert.alert(
        "Remove occurrence?",
        `Remove "${getEntryLabel(
          entry
        )}" from this setlist?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Remove",
            style: "destructive",

            onPress: async () => {
              if (busy) {
                return;
              }

              setBusy(true);

              try {
                await removeSetlistEntry(
                  entry.id
                );

                await loadData();

                notifyChanged();
              } catch (error) {
                console.error(
                  "Failed to remove setlist entry:",
                  error
                );

                Alert.alert(
                  "Error",
                  "Failed to remove this occurrence."
                );
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    };

    const handleEditEntry = (
      entry: SetlistEntry
    ) => {
      const isSinglePage =
        entry.start_page != null &&
        entry.end_page != null &&
        entry.start_page ===
          entry.end_page;

      setExcerptEditor({
        setlistId:
          entry.setlist_id,

        entryId:
          entry.id,

        entryTitle:
          entry.entry_title ?? "",

        startPage:
          entry.start_page?.toString() ??
          "",

        endPage:
          isSinglePage
            ? ""
            : entry.end_page?.toString() ??
              "",
      });
    };

    const renderEntry = (
      entry: SetlistEntry
    ) => {
      const isExcerpt =
        entry.start_page != null ||
        entry.end_page != null;

      return (
        <View
          key={entry.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            marginLeft: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            borderRadius: 10,
          }}
        >
          <Ionicons
            name={
              isExcerpt
                ? "copy-outline"
                : "document-outline"
            }
            size={20}
            color={colors.accent}
          />

          <View
            style={{
              flex: 1,
              marginLeft: 10,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              {entry.entry_title?.trim() ||
                getEntryLabel(entry)}
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: colors.secondaryText,
                marginTop: 2,
              }}
            >
              {entry.entry_title?.trim()
                ? getEntryLabel(entry)
                : isExcerpt
                  ? "Excerpt"
                  : "Complete document"}
            </Text>
          </View>

          {isExcerpt && (
            <TouchableOpacity
              onPress={() =>
                handleEditEntry(entry)
              }
              disabled={busy}
              style={{ padding: 6 }}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color={colors.secondaryText}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() =>
              handleRemoveEntry(
                entry
              )
            }
            disabled={busy}
            style={{
              padding: 6,
            }}
          >
            <Ionicons
              name="trash-outline"
              size={19}
              color={colors.danger}
            />
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              colors.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: "72%",
              maxWidth: 640,
              maxHeight: "82%",
              backgroundColor: colors.elevated,
              borderRadius: 18,
              padding: 20,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  Manage Setlists
                </Text>

                <Text
                  style={{
                    marginTop: 3,
                    fontSize: 13,
                    color: colors.secondaryText,
                  }}
                >
                  Add this score as a full
                  document or page excerpt.
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                disabled={busy}
              >
                <Ionicons
                  name="close"
                  size={26}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholderTextColor={colors.tertiaryText}
              placeholder="Search setlists..."
              value={searchText}
              onChangeText={setSearchText}
              style={{ color: colors.text, backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                marginBottom: 12,
              }}
            />

            {loading ? (
              <Text
                style={{
                  color: colors.secondaryText,
                  paddingVertical: 16,
                }}
              >
                Loading setlists...
              </Text>
            ) : (
              <FlatList
                data={filteredSetlists}
                keyExtractor={(item) =>
                  item.id.toString()
                }
                style={{
                  maxHeight: 380,
                }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text
                    style={{
                      color: colors.secondaryText,
                      paddingVertical: 18,
                      textAlign: "center",
                    }}
                  >
                    No setlists found.
                  </Text>
                }
                renderItem={({
                  item,
                }) => {
                  const entries =
                    entriesBySetlist[
                      item.id
                    ] ?? [];

                  return (
                    <View
                      style={{
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor:
                          colors.separator,
                      }}
                    >
                      {/* Setlist heading */}
                      <TouchableOpacity
                        onPress={() =>
                          navigateToSetlist(
                            item.id
                          )
                        }
                        style={{
                          flexDirection:
                            "row",
                          alignItems:
                            "center",
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight:
                                "700",
                              color:
                                colors.text,
                            }}
                          >
                            {item.name}
                          </Text>

                          <Text
                            style={{
                              fontSize: 13,
                              color:
                                colors.secondaryText,
                              marginTop: 2,
                            }}
                          >
                            {entries.length ===
                            0
                              ? "Not currently used"
                              : `${
                                  entries.length
                                } ${
                                  entries.length ===
                                  1
                                    ? "occurrence"
                                    : "occurrences"
                                }`}
                            {" · "}
                            {item.item_count}{" "}
                            total{" "}
                            {item.item_count ===
                            1
                              ? "item"
                              : "items"}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.tertiaryText}
                        />
                      </TouchableOpacity>

                      {/* Existing occurrences */}
                      {entries.map(
                        renderEntry
                      )}

                      {/* Add occurrence */}
                      <View
                        style={{
                          flexDirection:
                            "row",
                          flexWrap: "wrap",
                          gap: 16,
                          marginTop: 10,
                          marginLeft: 12,
                        }}
                      >
                        <TouchableOpacity
                          disabled={busy}
                          onPress={() =>
                            void handleAddFullScore(
                              item.id
                            )
                          }
                          style={{
                            flexDirection:
                              "row",
                            alignItems:
                              "center",
                          }}
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={
                              colors.accent
                            }
                          />

                          <Text
                            style={{
                              color:
                                colors.accent,
                                fontWeight:
                                "600",
                              marginLeft: 3,
                            }}
                          >
                            Full score
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={busy}
                          onPress={() =>
                            setExcerptEditor({
                              setlistId: item.id,
                              entryId: null,
                              entryTitle: "",
                              startPage: "",
                              endPage: "",
                            })
                          }
                          style={{
                            flexDirection:
                              "row",
                            alignItems:
                              "center",
                          }}
                        >
                          <Ionicons
                            name="copy-outline"
                            size={17}
                            color={
                              colors.accent
                            }
                          />

                          <Text
                            style={{
                              color:
                                colors.accent,
                                fontWeight:
                                "600",
                              marginLeft: 5,
                            }}
                          >
                            Add excerpt
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {/* Excerpt editor */}
            {excerptEditor && (
              <View
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  {excerptEditor.entryId == null
                    ? "Add Excerpt"
                    : "Edit Excerpt"}
                </Text>

                <Text
                  style={{
                    fontSize: 13,
                    color: colors.secondaryText,
                    marginBottom: 12,
                  }}
                >
                  Give this occurrence an optional name and
                  choose the physical PDF page range.
                </Text>

                {/* Excerpt name */}
                <View
                  style={{
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.secondaryText,
                      marginBottom: 4,
                    }}
                  >
                    Name
                  </Text>

                  <TextInput
                    cursorColor={colors.accent}
                    selectionColor={colors.accent}
                    placeholderTextColor={colors.tertiaryText}
                    value={excerptEditor.entryTitle}
                    onChangeText={(value) =>
                      setExcerptEditor((previous) =>
                        previous
                          ? {
                              ...previous,
                              entryTitle: value,
                            }
                          : null
                      )
                    }
                    placeholder="e.g. Kyrie"
                    style={{ color: colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 9,
                      backgroundColor: colors.surface,
                      fontSize: 15,
                    }}
                  />
                </View>

                {/* Page range */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
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
                        color: colors.secondaryText,
                        marginBottom: 4,
                      }}
                    >
                      Start page
                    </Text>

                    <TextInput
                      cursorColor={colors.accent}
                      selectionColor={colors.accent}
                      placeholderTextColor={colors.tertiaryText}
                      keyboardType="number-pad"
                      value={excerptEditor.startPage}
                      onChangeText={(value) =>
                        setExcerptEditor((previous) =>
                          previous
                            ? {
                                ...previous,
                                startPage: value,
                              }
                            : null
                        )
                      }
                      placeholder="1"
                      style={{ color: colors.text,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                        backgroundColor: colors.surface,
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
                        color: colors.secondaryText,
                        marginBottom: 4,
                      }}
                    >
                      End page (optional)
                    </Text>

                    <TextInput
                      cursorColor={colors.accent}
                      selectionColor={colors.accent}
                      placeholderTextColor={colors.tertiaryText}
                      keyboardType="number-pad"
                      editable={!busy}
                      value={
                        excerptEditor.endPage
                      }
                      onChangeText={(value) =>
                        setExcerptEditor(
                          (previous) =>
                            previous
                              ? {
                                  ...previous,
                                  endPage: value,
                                }
                              : null
                        )
                      }
                      placeholder="Same as start"
                      style={{ color: colors.text,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                        backgroundColor: colors.surface,
                      }}
                    />

                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: colors.tertiaryText,
                      }}
                    >
                      Leave blank for a single-page
                      excerpt.
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 16,
                    marginTop: 14,
                  }}
                >
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() =>
                      setExcerptEditor(null)
                    }
                  >
                    <Text
                      style={{
                        color: colors.secondaryText,
                        fontSize: 15,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={busy}
                    onPress={() =>
                      void handleSaveExcerpt()
                    }
                  >
                    <Text
                      style={{
                        color: colors.accent,
                        fontWeight: "700",
                        fontSize: 15,
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {busy
                        ? "Saving..."
                        : excerptEditor.entryId == null
                          ? "Add"
                          : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* New setlist */}
            {addNewSetlist ? (
              <View
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                }}
              >
                <TextInput
                  cursorColor={colors.accent}
                  selectionColor={colors.accent}
                  placeholderTextColor={colors.tertiaryText}
                  placeholder="New setlist name..."
                  value={newSetlistName}
                  onChangeText={
                    setNewSetlistName
                  }
                  autoFocus
                  style={{ color: colors.text, backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 16,
                  }}
                />

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent:
                      "flex-end",
                    gap: 16,
                    marginTop: 14,
                  }}
                >
                  <TouchableOpacity
                    disabled={busy}
                    onPress={() => {
                      setAddNewSetlist(
                        false
                      );
                      setNewSetlistName(
                        ""
                      );
                    }}
                  >
                    <Text
                      style={{
                        color: colors.secondaryText,
                        fontWeight: "600",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={busy}
                    onPress={() =>
                      void handleCreateSetlist()
                    }
                  >
                    <Text
                      style={{
                        color:
                          colors.accent,
                          fontWeight: "700",
                      }}
                    >
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  setAddNewSetlist(true)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 14,
                  paddingVertical: 8,
                }}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={colors.accent}
                />

                <Text
                  style={{
                    marginLeft: 6,
                    color: colors.accent,
                    fontWeight: "700",
                  }}
                >
                  New Setlist
                </Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                justifyContent:
                  "flex-end",
                marginTop: 18,
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                disabled={busy}
              >
                <Text
                  style={{
                    color:
                      colors.accent,
                      fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

export default ManageSetlistsModal;