
import React, {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
  renderers,
} from "react-native-popup-menu";

import {
  getSetlistSummaries,
  getSetlistEntries,
  getMusicWithAllData,
  createSetlist,
  addSetlistEntry,
} from "../../utils/database";

import type {
  ReaderContext,
  SetlistSummary,
  SetlistEntryWithMusic,
} from "../../types";

const { Popover } = renderers;

export interface SetlistSelection {
  setlist: SetlistSummary;
  entries: SetlistEntryWithMusic[];
  index: number;
}

interface ReaderSetlistMenuProps {
  context?: ReaderContext;

  currentMusicId: number;
  currentScoreTitle: string;

  accentColor: string;
  disabled?: boolean;

  onOpen?: () => void;
  onClose?: () => void;

  onManageSetlists?: () => void;

  currentPage: number;
  totalPages: number;

  onSelectEntry: (
    selection: SetlistSelection
  ) => void | Promise<void>;

  onSetlistChanged?: (
  setlistId: number
) => void | Promise<void>;
}

const ReaderSetlistMenu = ({
  context,
  currentMusicId,
  currentScoreTitle,
  accentColor,
  disabled = false,
  onOpen,
  onClose,
  onSelectEntry,
  onManageSetlists,
  currentPage,
  totalPages,
  onSetlistChanged,
}: ReaderSetlistMenuProps) => {
  const { width, height } =
    useWindowDimensions();

  const [setlists, setSetlists] =
    useState<SetlistSummary[]>([]);

  const [selectedSetlist, setSelectedSetlist] =
    useState<SetlistSummary | null>(null);

  const [entries, setEntries] =
    useState<SetlistEntryWithMusic[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState("");

  const [creating, setCreating] =
    useState(false);

    const [saving, setSaving] =
    useState(false);

    const [newSetlistName, setNewSetlistName] =
    useState("");

    const [
    newSetlistDescription,
    setNewSetlistDescription,
    ] = useState("");

    const [addCurrentScore, setAddCurrentScore] =
    useState(true);

    const [creationError, setCreationError] =
    useState<string | null>(null);

  const [entryMode, setEntryMode] =
    useState<"full" | "excerpt">("full");

  const [entryTitle, setEntryTitle] =
    useState("");

  const [startPageInput, setStartPageInput] =
    useState(String(currentPage));

  const [endPageInput, setEndPageInput] =
    useState(String(currentPage));

    const savingRef = useRef(false);

  const requestRef = useRef(0);

  const activeEntryId =
    context?.entries?.[
      context.currentIndex - 1
    ]?.id;

  const loadEntries = async (
    setlist: SetlistSummary
  ) => {
    const request = ++requestRef.current;

    setSelectedSetlist(setlist);
    setEntries([]);
    setQuery("");
    setLoading(true);
    setError(null);

    try {
      const [setlistEntries, allMusic] =
        await Promise.all([
          getSetlistEntries(setlist.id),
          getMusicWithAllData(),
        ]);

      const musicById = new Map(
        allMusic.map((music) => [
          music.id,
          music,
        ])
      );

      const results = setlistEntries
        .map((entry) => {
          const music = musicById.get(
            entry.music_id
          );

          if (!music?.uri) {
            return null;
          }

          return {
            ...entry,
            music,
          };
        })
        .filter(
          (
            entry
          ): entry is SetlistEntryWithMusic =>
            entry !== null
        )
        .sort(
          (a, b) => a.position - b.position
        );

      if (request === requestRef.current) {
        setEntries(results);
      }
    } catch (error) {
      console.error(
        "Failed to load setlist entries",
        error
      );

      if (request === requestRef.current) {
        setError(
          "Unable to load setlist contents."
        );
      }
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
      }
    }
  };

  const loadSetlists = async (
    openCurrent = false
  ) => {
    const request = ++requestRef.current;

    setSelectedSetlist(null);
    setEntries([]);
    setQuery("");
    setLoading(true);
    setError(null);

    try {
      const results =
        await getSetlistSummaries();

      if (request !== requestRef.current) {
        return;
      }

      setSetlists(results);

      if (openCurrent && context?.setlistId) {
        const currentSetlist =
          results.find(
            (setlist) =>
              setlist.id === context.setlistId
          );

        if (currentSetlist) {
          await loadEntries(currentSetlist);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load setlists",
        error
      );

      if (request === requestRef.current) {
        setError("Unable to load setlists.");
      }
    } finally {
      if (request === requestRef.current) {
        setLoading(false);
      }
    }
  };


const resetCreationForm = () => {
  setCreating(false);
  setNewSetlistName("");
  setNewSetlistDescription("");
  setAddCurrentScore(true);
  setEntryMode("full");
  setEntryTitle("");
  setStartPageInput(String(currentPage));
  setEndPageInput(String(currentPage));
  setCreationError(null);
};

const handleStartCreation = () => {
  resetCreationForm();
  setCreating(true);
};

const handleAddToExisting = () => {
  if (!selectedSetlist) return;
  resetCreationForm();
  setCreating(true);
};

const handleCancelCreation = () => {
  if (savingRef.current) return;
  resetCreationForm();
};

const handleCreateSetlist = async () => {
  if (savingRef.current || !canCreateSetlist) return;

  const target = selectedSetlist;
  const name = newSetlistName.trim();
  const includeScore = Boolean(target) || addCurrentScore;

  if (!target && setlists.some(
    item => item.name.trim().toLowerCase() === name.toLowerCase()
  )) {
    setCreationError("A setlist with this name already exists.");
    return;
  }

  savingRef.current = true;
  setSaving(true);
  setCreationError(null);
  let createdId: number | null = null;
  let entryAdded = false;

  try {
    const setlistId = target
      ? target.id
      : (createdId = await createSetlist(name, newSetlistDescription.trim()));

    
    if (includeScore) {
      await addSetlistEntry(
        currentMusicId,
        setlistId,
        entryTitle.trim() || null,
        entryMode === "excerpt" ? startPage : null,
        entryMode === "excerpt" ? endPage : null
      );

      entryAdded = true;

      // Synchronise the active reader context.
      try {
        await onSetlistChanged?.(setlistId);
      } catch (error) {
        console.error(
          "Entry saved, but reader context refresh failed:",
          error
        );
      }
    }


    Keyboard.dismiss();
    resetCreationForm();

    if (target) {
      try {
        const summaries = await getSetlistSummaries();
        setSetlists(summaries);
        await loadEntries(summaries.find(item => item.id === target.id) ?? target);
      } catch (error) {
        console.error("Failed to refresh setlists:", error);
        setError("Entry added, but unable to refresh setlist.");
      }
    } else {
      await loadSetlists(false);
    }
  } catch (error) {
    console.error("Failed to save setlist:", error);
    if (createdId !== null || entryAdded) {
      resetCreationForm();
      await loadSetlists(false);
      Alert.alert("Setlist saved", "The setlist was created, but the requested entry could not be saved or refreshed.");
    } else {
      setCreationError("Unable to save. Please try again.");
    }
  } finally {
    savingRef.current = false;
    setSaving(false);
  }
};

  const handleOpen = () => {
    resetCreationForm();

    onOpen?.();

    void loadSetlists(true);
    };

  const handleClose = () => {
    requestRef.current += 1;
    onClose?.();
  };

  const handleBack = () => {
    requestRef.current += 1;

    setSelectedSetlist(null);
    setEntries([]);
    setQuery("");
    setError(null);
    setLoading(false);
  };

  const filteredSetlists = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    return setlists
      .filter((setlist) => {
        return (
          setlist.name
            .toLowerCase()
            .includes(search) ||
          (setlist.description ?? "")
            .toLowerCase()
            .includes(search)
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [setlists, query]);

  const menuWidth = Math.min(
    380,
    width - 24
  );

  const listHeight = Math.min(
    440,
    height * 0.45
  );

  const startPage = Number(startPageInput);
const endPage = Number(endPageInput);

const validExcerpt =
  /^\d+$/.test(startPageInput) &&
  /^\d+$/.test(endPageInput) &&
  Number.isSafeInteger(startPage) &&
  Number.isSafeInteger(endPage) &&
  startPage >= 1 &&
  endPage <= totalPages &&
  startPage <= endPage;

const excerptPageCount = validExcerpt
  ? endPage - startPage + 1
  : 0;

const canCreateSetlist =
  !saving &&
  (Boolean(selectedSetlist) || Boolean(newSetlistName.trim())) &&
  (
    (!selectedSetlist && !addCurrentScore) ||
    (currentMusicId > 0 && totalPages > 0 && (entryMode === "full" ||
    validExcerpt))
  );

    const creationForm = (
    <ScrollView
      style={{ maxHeight: height * 0.65 }}
      contentContainerStyle={styles.creationForm}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.creationHeader}>
        <TouchableOpacity style={styles.backButton} disabled={saving}
          onPress={handleCancelCreation} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={accentColor} />
        </TouchableOpacity>
        <View style={styles.details}>
          <Text style={styles.heading}>{selectedSetlist ? "Add current score" : "New Setlist"}</Text>
          {selectedSetlist && <Text style={styles.rowSubtitle}>{selectedSetlist.name}</Text>}
        </View>
      </View>

      {!selectedSetlist && (
        <>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.formInput} placeholder="Setlist name"
            value={newSetlistName} editable={!saving}
            onChangeText={value => { setNewSetlistName(value); setCreationError(null); }} />
          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput style={[styles.formInput, styles.descriptionInput]}
            placeholder="Setlist description" multiline editable={!saving}
            value={newSetlistDescription} onChangeText={setNewSetlistDescription} />
          <TouchableOpacity style={styles.checkboxRow} disabled={saving}
            accessibilityRole="checkbox" accessibilityState={{ checked: addCurrentScore }}
            onPress={() => setAddCurrentScore(previous => !previous)}>
            <Ionicons name={addCurrentScore ? "checkbox" : "square-outline"}
              size={24} color={addCurrentScore ? accentColor : "#94A3B8"} />
            <Text style={styles.checkboxLabel}>Add current score</Text>
          </TouchableOpacity>
        </>
      )}

      {(selectedSetlist || addCurrentScore) && (
        <View style={styles.entryConfiguration}>
          <Text style={styles.rowTitle}>{currentScoreTitle}</Text>
          <Text style={styles.rowSubtitle}>{totalPages} pages · Current page {currentPage}</Text>
          <View style={styles.modeSelector}>
            {(["full", "excerpt"] as const).map(mode => (
              <TouchableOpacity key={mode} disabled={saving}
                onPress={() => { setEntryMode(mode); setCreationError(null); }}
                accessibilityRole="radio" accessibilityState={{ checked: entryMode === mode }}
                style={[styles.modeButton, entryMode === mode && { backgroundColor: "#FFFFFF" }]}>
                <Text style={[styles.modeLabel, entryMode === mode && { color: accentColor, fontWeight: "600" }]}>
                  {mode === "full" ? "Full score" : "Excerpt"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Entry title (optional)</Text>
          <TextInput style={styles.formInput} value={entryTitle}
            onChangeText={setEntryTitle} placeholder="Custom entry title" editable={!saving} />
          {entryMode === "excerpt" && (
            <>
              <View style={styles.pageRangeRow}>
                {([
                  ["Start page", startPageInput, setStartPageInput],
                  ["End page", endPageInput, setEndPageInput],
                ] as const).map(([label, value, setter]) => (
                  <View key={label} style={styles.pageField}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <TextInput style={styles.formInput} value={value}
                      onChangeText={text => setter(text.replace(/[^0-9]/g, ""))}
                      keyboardType="number-pad" selectTextOnFocus editable={!saving} />
                    <TouchableOpacity disabled={saving} onPress={() => setter(String(currentPage))}>
                      <Text style={{ color: accentColor, fontSize: 12 }}>Use current page</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Text style={[styles.rowSubtitle, !validExcerpt && { color: "#DC2626" }]}>
                {validExcerpt
                  ? `Pages ${startPage}–${endPage} · ${excerptPageCount} ${excerptPageCount === 1 ? "page" : "pages"}`
                  : `Enter a valid range between 1 and ${totalPages}.`}
              </Text>
            </>
          )}
        </View>
      )}

      {creationError && <Text style={styles.creationError}>{creationError}</Text>}
      <View style={styles.formActions}>
        <TouchableOpacity disabled={saving} onPress={handleCancelCreation} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!canCreateSetlist} onPress={handleCreateSetlist}
          style={[styles.createButton, { backgroundColor: accentColor, opacity: canCreateSetlist ? 1 : 0.45 }]}>
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> :
            <Text style={styles.createButtonText}>{selectedSetlist ? "Add Entry" : "Create Setlist"}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Menu
      renderer={Popover}
      rendererProps={{
        placement: "bottom",
        anchorStyle: {
          backgroundColor: "#FFFFFF",
        },
      }}
      onOpen={handleOpen}
      onClose={handleClose}
      onBackdropPress={() => {
        return !savingRef.current;
    }}
      onSelect={(
        selection: SetlistSelection | "manage-setlists"
      ) => {
        if (selection === "manage-setlists") { onManageSetlists?.(); return; }
        void onSelectEntry(selection);
      }}
    >
      <MenuTrigger
        disabled={disabled}
        customStyles={{
          triggerWrapper: {
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.35 : 1,
          },
        }}
      >
        <Ionicons
          name="list-outline"
          size={24}
          color={accentColor}
          accessibilityLabel="Setlists"
        />
      </MenuTrigger>

      <MenuOptions
        customStyles={{
            optionsContainer: {
            width: menuWidth,
            borderRadius: 14,
            backgroundColor: "#FFFFFF",
            elevation: 10,
            },
        }}
        >
        <View style={styles.container}>

            {creating ? (
            creationForm
            ) : (
                <>
                {/* Header */}
                <View style={styles.header}>
                    {selectedSetlist ? (
                    <>
                        <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        accessibilityLabel="All setlists"
                        >
                        <Ionicons
                            name="chevron-back"
                            size={22}
                            color={accentColor}
                        />
                        </TouchableOpacity>

                        <View style={styles.headerTitle}>
                        <Text
                            style={styles.heading}
                            numberOfLines={2}
                        >
                            {selectedSetlist.name}
                        </Text>

                        <Text style={styles.count}>
                            {entries.length}{" "}
                            {entries.length === 1
                            ? "score"
                            : "scores"}
                        </Text>
                        </View>
                    </>
                    ) : (
                    <>
                        <Text style={styles.heading}>
                            Setlists
                        </Text>

                        <View style={styles.headerActions}>
                            <Text style={styles.count}>
                            {setlists.length}{" "}
                            {setlists.length === 1
                                ? "setlist"
                                : "setlists"}
                            </Text>

                            <TouchableOpacity
                            onPress={handleStartCreation}
                            style={styles.addButton}
                            accessibilityRole="button"
                            accessibilityLabel="Create setlist"
                            >
                            <Ionicons
                                name="add"
                                size={25}
                                color={accentColor}
                            />
                            </TouchableOpacity>
                        </View>
                        </>
                    )}
                </View>

                {/* Search */}
                {!selectedSetlist && (
                    <View style={styles.searchContainer}>
                    <Ionicons
                        name="search-outline"
                        size={18}
                        color="#888"
                    />

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search setlists..."
                        placeholderTextColor="#999"
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                    />

                    {query.length > 0 && (
                        <TouchableOpacity
                        onPress={() => setQuery("")}
                        >
                        <Ionicons
                            name="close-circle"
                            size={18}
                            color="#888"
                        />
                        </TouchableOpacity>
                    )}
                    </View>
                )}

                {/* Loading and errors */}
                {loading ? (
                    <View style={styles.emptyContainer}>
                    <ActivityIndicator
                        color={accentColor}
                    />

                    <Text style={styles.emptyText}>
                        Loading...
                    </Text>
                    </View>
                ) : error ? (
                    <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {error}
                    </Text>

                    <TouchableOpacity
                        onPress={() => {
                        if (selectedSetlist) {
                            void loadEntries(
                            selectedSetlist
                            );
                        } else {
                            void loadSetlists();
                        }
                        }}
                    >
                        <Text
                        style={{ color: accentColor }}
                        >
                        Retry
                        </Text>
                    </TouchableOpacity>
                    </View>
                ) : !selectedSetlist ? (
                    /* Setlist browser */
                    <FlatList
                    style={{
                        maxHeight: listHeight,
                    }}
                    data={filteredSetlists}
                    keyExtractor={(item) =>
                        String(item.id)
                    }
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                        No setlists found.
                        </Text>
                    }
                    renderItem={({ item }) => {
                        const isCurrent =
                        item.id === context?.setlistId;

                        return (
                        <TouchableOpacity
                            onPress={() =>
                            loadEntries(item)
                            }
                            style={[
                            styles.row,
                            isCurrent && {
                                backgroundColor:
                                `${accentColor}0D`,
                            },
                            ]}
                        >
                            <View style={styles.rowIcon}>
                            <Ionicons
                                name="list-outline"
                                size={24}
                                color={accentColor}
                            />
                            </View>

                            <View style={styles.details}>
                            <Text
                                style={styles.rowTitle}
                                numberOfLines={2}
                            >
                                {item.name}
                            </Text>

                            <Text
                                style={styles.rowSubtitle}
                            >
                                {item.item_count}{" "}
                                {item.item_count === 1
                                ? "score"
                                : "scores"}
                            </Text>
                            </View>

                            <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#AAA"
                            />
                        </TouchableOpacity>
                        );
                    }}
                    />
                ) : (
                    /* Ordered scores */
                    <FlatList
                    style={{
                        maxHeight: listHeight,
                    }}
                    data={entries}
                    keyExtractor={(item) =>
                        String(item.id)
                    }
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                        This setlist is empty.
                        </Text>
                    }
                    renderItem={({ item, index }) => {
                        const isCurrent =
                        context?.setlistId ===
                            selectedSetlist.id &&
                        item.id === activeEntryId;

                        const sourceTitle =
                        item.music.metadata?.title ||
                        item.music.title;

                        const title =
                        item.entry_title?.trim() ||
                        sourceTitle;

                        const hasPageRange =
                        item.start_page !== null ||
                        item.end_page !== null;

                        const pageLabel = hasPageRange
                        ? `Pages ${
                            item.start_page ?? 1
                            }–${
                            item.end_page ??
                            (
                                item.music.metadata
                                ?.page_count || "end"
                            )
                            }`
                        : "Full score";

                        return (
                        <MenuOption
                            value={{
                            setlist: selectedSetlist,
                            entries,
                            index,
                            }}
                            customStyles={{
                            optionWrapper: [
                                styles.row,
                                isCurrent && {
                                backgroundColor:
                                    `${accentColor}0D`,
                                },
                            ],
                            }}
                        >
                            <Text
                            style={[
                                styles.entryNumber,
                                isCurrent && {
                                color: accentColor,
                                },
                            ]}
                            >
                            {index + 1}
                            </Text>

                            <View style={styles.details}>
                            <Text
                                style={[
                                styles.rowTitle,
                                isCurrent && {
                                    color: accentColor,
                                },
                                ]}
                                numberOfLines={2}
                            >
                                {title}
                            </Text>

                            <Text
                                style={styles.rowSubtitle}
                                numberOfLines={2}
                            >
                                {title !== sourceTitle
                                ? `${sourceTitle} · `
                                : ""}
                                {pageLabel}
                            </Text>
                            </View>

                            <Ionicons
                            name={
                                isCurrent
                                ? "checkmark"
                                : "chevron-forward"
                            }
                            size={18}
                            color={
                                isCurrent
                                ? accentColor
                                : "#AAA"
                            }
                            />
                        </MenuOption>
                        );
                    }}
                    />
                )}
                {!loading && !error && selectedSetlist && (
                  <TouchableOpacity style={styles.row} onPress={handleAddToExisting}
                    accessibilityLabel="Add current score to this setlist">
                    <Ionicons name="add-circle-outline" size={24} color={accentColor} />
                    <View style={styles.details}>
                      <Text style={[styles.rowTitle, { color: accentColor }]}>Add current score</Text>
                      <Text style={styles.rowSubtitle}>Full score or excerpt</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {!loading && !error && !selectedSetlist && onManageSetlists && (
                  <MenuOption value="manage-setlists">
                    <View style={styles.row}>
                      <Ionicons name="list-outline" size={22} color={accentColor} />
                      <Text style={[styles.rowTitle, { color: accentColor, flex: 1 }]}>Manage current score's setlists</Text>
                    </View>
                  </MenuOption>
                )}
                </>
            )}
        </View>
     </MenuOptions>
    </Menu>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },

  headerTitle: {
    flex: 1,
    minWidth: 0,
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },

  count: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  backButton: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    minHeight: 40,
    fontSize: 14,
    color: "#222",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },

  rowIcon: {
    width: 36,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  rowSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },

  entryNumber: {
    width: 26,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#888",
    fontVariant: ["tabular-nums"],
  },

  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },

  emptyText: {
    paddingVertical: 8,
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    },

    addButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    },


creationForm: {
  gap: 10,
},
entryConfiguration: { gap: 10 },
modeSelector: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 8, backgroundColor: "#F1F5F9" },
modeButton: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 6 },
modeLabel: { fontSize: 13, color: "#64748B" },
pageRangeRow: { flexDirection: "row", gap: 12 },
pageField: { flex: 1, minWidth: 0, gap: 6 },

creationHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 4,
},

fieldLabel: {
  fontSize: 13,
  fontWeight: "600",
  color: "#475569",
},

formInput: {
  minHeight: 42,
  backgroundColor: "#F3F4F6",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: "#222",
},

descriptionInput: {
  minHeight: 76,
  textAlignVertical: "top",
},

checkboxRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: "#E5E7EB",
},

checkboxLabel: {
  fontSize: 14,
  fontWeight: "500",
  color: "#222",
},

creationError: {
  color: "#DC2626",
  fontSize: 12,
},

formActions: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 6,
},

cancelButton: {
  paddingHorizontal: 12,
  paddingVertical: 10,
},

cancelButtonText: {
  fontSize: 14,
  color: "#64748B",
  fontWeight: "500",
},

createButton: {
  minHeight: 40,
  minWidth: 120,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
},

createButtonText: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "600",
},

});

export default ReaderSetlistMenu;
