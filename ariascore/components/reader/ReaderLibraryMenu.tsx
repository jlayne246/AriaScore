
import React, {
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
  renderers,
} from "react-native-popup-menu";

const { Popover } = renderers;

import {
  getMusicWithAllData,
} from "../../utils/database";

import type {
  MusicItemWithAllData,
} from "../../types";

import { useAppTheme } from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReaderLibraryMenuProps {
  currentMusicId: number;
  disabled?: boolean;

  onOpen?: () => void;
  onClose?: () => void;

  onSelectScore: (
    item: MusicItemWithAllData
  ) => void | Promise<void>;
}

type LibraryFilter = "all" | "recent";

const getTitle = (item: MusicItemWithAllData) =>
  item.metadata?.title ||
  item.title ||
  "Untitled";

const ReaderLibraryMenu = ({
  currentMusicId,
  disabled = false,
  onOpen,
  onClose,
  onSelectScore,
}: ReaderLibraryMenuProps) => {
  const { width, height } = useWindowDimensions();

  const { colors } = useAppTheme();

  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [scores, setScores] =
    useState<MusicItemWithAllData[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState("");

  const [filter, setFilter] =
    useState<LibraryFilter>("all");

  const insets = useSafeAreaInsets();

  const loadLibrary = async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await getMusicWithAllData();
      setScores(items);
    } catch (error) {
      console.error(
        "Failed to load reader library",
        error
      );

      setError("Unable to load library.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setQuery("");
    onOpen?.();
    void loadLibrary();
  };

  const filteredScores = useMemo(() => {
    const search = query.trim().toLowerCase();

    const results = scores.filter((item) => {
      if (!item.id || !item.uri) {
        return false;
      }

      if (
        filter === "recent" &&
        !item.last_opened_at
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const metadata = item.metadata;

      const searchableFields = [
        getTitle(item),
        metadata?.composer,
        metadata?.arranger,
        metadata?.editor,
        metadata?.publisher,
        metadata?.document_type,
        metadata?.genre,
        ...(metadata?.labels ?? []),
      ];

      return searchableFields.some(
        (value) =>
          value?.toLowerCase().includes(search)
      );
    });

    return results.sort((a, b) => {
      if (filter === "recent") {
        return (
          (b.last_opened_at ?? "").localeCompare(
            a.last_opened_at ?? ""
          )
        );
      }

      return getTitle(a).localeCompare(
        getTitle(b)
      );
    });
  }, [scores, query, filter]);

  const menuWidth = Math.min(
    380,
    width - 24
  );

  const listHeight = Math.min(
    440,
    height * 0.45
  );

  return (
    <Menu
        renderer={Popover}
        rendererProps={{
            placement: "bottom",
            anchorStyle: {
            backgroundColor: colors.elevated,
            },
        }}
        onOpen={handleOpen}
        onClose={onClose}
        onSelect={(item: MusicItemWithAllData) => {
            if (item.id === currentMusicId) {
            return;
            }

            void onSelectScore(item);
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
          name="library-outline"
          size={24}
          color={colors.accent}
          accessibilityLabel="Library"
        />
      </MenuTrigger>

      <MenuOptions
        customStyles={{
          optionsContainer: {
            width: menuWidth,
            borderRadius: 14,
            backgroundColor: colors.elevated,
            elevation: 10,
          },
        }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.heading}>
              Library
            </Text>

            <Text style={styles.count}>
                {scores.length} {scores.length === 1 ? "score" : "scores"}
            </Text>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.secondaryText}
            />

            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              style={styles.searchInput}
              placeholder="Search library..."
              placeholderTextColor={colors.tertiaryText}
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
                  color={colors.secondaryText}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter tabs */}
          <View style={styles.tabs}>
            {(["all", "recent"] as const).map(
              (tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setFilter(tab)}
                  style={[
                    styles.tab,
                    filter === tab &&
                      styles.activeTab,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      filter === tab && {
                        color: colors.accent,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {tab === "all"
                      ? "All Scores"
                      : "Recent"}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Score list */}
          {loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator
                color={colors.accent}
              />

              <Text style={styles.emptyText}>
                Loading library...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {error}
              </Text>

              <TouchableOpacity
                onPress={loadLibrary}
              >
                <Text
                  style={{
                    color: colors.accent,
                    fontWeight: "600",
                  }}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              style={{
                maxHeight: listHeight,
              }}
              data={filteredScores}
              keyExtractor={(item) =>
                String(item.id)
              }
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View
                  style={styles.emptyContainer}
                >
                  <Text
                    style={styles.emptyText}
                  >
                    No scores found.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isCurrent =
                  item.id === currentMusicId;

                const attribution =
                  item.metadata?.composer ||
                  item.metadata?.arranger ||
                  item.metadata?.editor ||
                  item.metadata?.document_type ||
                  "";

                return (
                  <MenuOption
                    value={item}
                    customStyles={{
                      optionWrapper: [
                        styles.scoreRow,
                        isCurrent && {
                          backgroundColor:
                            colors.selectedBackground,
                        },
                      ],
                    }}
                  >
                    <View
                      style={styles.scoreIcon}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={22}
                        color={
                          isCurrent
                            ? colors.accent
                            : colors.tertiaryText
                        }
                      />
                    </View>

                    <View
                      style={styles.scoreDetails}
                    >
                      <Text
                        style={[
                          styles.scoreTitle,
                          isCurrent && {
                            color: colors.accent,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {getTitle(item)}
                      </Text>

                      {!!attribution && (
                        <Text
                          style={
                            styles.scoreSubtitle
                          }
                          numberOfLines={1}
                        >
                          {attribution}
                        </Text>
                      )}
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
                          ? colors.accent
                          : colors.tertiaryText
                      }
                    />
                  </MenuOption>
                );
              }}
            />
          )}
        </View>
      </MenuOptions>
    </Menu>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    padding: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },

  count: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 10,
  },

  searchInput: {
    flex: 1,
    minHeight: 40,
    fontSize: 14,
    color: colors.text,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },

  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },

  activeTab: {
    backgroundColor: colors.elevated,
    elevation: 1,
  },

  tabText: {
    fontSize: 13,
    color: colors.secondaryText,
  },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },

  scoreIcon: {
    width: 36,
    height: 44,
    borderRadius: 5,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },

  scoreDetails: {
    flex: 1,
    minWidth: 0,
  },

  scoreTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  scoreSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 3,
  },

  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },

  emptyText: {
    fontSize: 13,
    color: colors.secondaryText,
  },
});

export default ReaderLibraryMenu;
