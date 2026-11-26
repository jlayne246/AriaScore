
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

import type { Bookmark } from "../../types";

const { Popover } = renderers;

interface ReaderBookmarksMenuProps {
  accentColor: string;
  currentPage: number;
  minimumPage: number;
  maximumPage: number;

  bookmarks: Bookmark[];
  disabled?: boolean;

  onOpen?: () => void;
  onClose?: () => void;

  onSelectBookmark: (
    bookmark: Bookmark
  ) => void;

  onAddBookmark: (
    page: number,
    label: string
  ) => Promise<void>;

  onRenameBookmark: (
    bookmarkId: number,
    label: string
  ) => Promise<void>;

  onDeleteBookmark: (
    bookmarkId: number
  ) => Promise<void>;
}

type FormState =
  | { mode: "create"; page: number }
  | { mode: "edit"; bookmark: Bookmark }
  | null;

const ReaderBookmarksMenu = ({
  accentColor,
  currentPage,
  minimumPage,
  maximumPage,
  bookmarks,
  disabled = false,

  onOpen,
  onClose,

  onSelectBookmark,
  onAddBookmark,
  onRenameBookmark,
  onDeleteBookmark,
}: ReaderBookmarksMenuProps) => {
  const { width, height } =
    useWindowDimensions();

  const [query, setQuery] =
    useState("");

  const [form, setForm] =
    useState<FormState>(null);

  const [label, setLabel] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] =
    useState(false);

  const savingRef = useRef(false);

  const visibleBookmarks = useMemo(() => {
    return bookmarks
      .filter(
        (bookmark) =>
          bookmark.page_number >= minimumPage &&
          bookmark.page_number <= maximumPage
      )
      .sort(
        (a, b) =>
          a.page_number - b.page_number
      );
  }, [
    bookmarks,
    minimumPage,
    maximumPage,
  ]);

  const filteredBookmarks = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    return visibleBookmarks.filter(
      (bookmark) =>
        (bookmark.label ?? "")
          .toLowerCase()
          .includes(search) ||
        String(bookmark.page_number)
          .includes(search)
    );
  }, [visibleBookmarks, query]);

  const hasCurrentBookmark =
    visibleBookmarks.some(
      (bookmark) =>
        bookmark.page_number === currentPage
    );

  const resetForm = () => {
    setForm(null);
    setLabel("");
    setError(null);
    setConfirmDelete(false);
  };

  const handleOpen = () => {
    resetForm();
    setQuery("");
    onOpen?.();
  };

  const handleClose = () => {
    resetForm();
    setQuery("");
    onClose?.();
  };

  const handleCreate = () => {
    resetForm();

    setForm({
      mode: "create",
      page: currentPage,
    });
  };

  const handleEdit = (
    bookmark: Bookmark
  ) => {
    resetForm();

    setForm({
      mode: "edit",
      bookmark,
    });

    setLabel(bookmark.label ?? "");
  };

  const handleCancel = () => {
    if (savingRef.current) return;

    resetForm();
  };

  const handleSave = async () => {
    if (!form || savingRef.current) {
      return;
    }

    savingRef.current = true;

    setSaving(true);
    setError(null);

    try {
      if (form.mode === "create") {
        await onAddBookmark(
          form.page,
          label.trim()
        );
      } else {
        await onRenameBookmark(
          form.bookmark.id,
          label.trim()
        );
      }

      resetForm();
    } catch (error) {
      console.error(
        "Failed to save bookmark:",
        error
      );

      setError(
        "Unable to save bookmark. Please try again."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !form ||
      form.mode !== "edit" ||
      savingRef.current
    ) {
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    savingRef.current = true;

    setSaving(true);
    setError(null);

    try {
      await onDeleteBookmark(
        form.bookmark.id
      );

      resetForm();
    } catch (error) {
      console.error(
        "Failed to delete bookmark:",
        error
      );

      setError(
        "Unable to delete bookmark."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const formPage =
    form?.mode === "create"
      ? form.page
      : form?.mode === "edit"
        ? form.bookmark.page_number
        : currentPage;

  const menuWidth = Math.min(
    340,
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
          backgroundColor: "#FFFFFF",
        },
      }}
      onOpen={handleOpen}
      onClose={handleClose}
      onSelect={onSelectBookmark}
      onBackdropPress={() =>
        !savingRef.current
      }
    >
      {/* TOOLBAR BUTTON */}

      <MenuTrigger
        disabled={disabled}
        customStyles={{
          triggerWrapper: [
            styles.trigger,
            disabled && {
              opacity: 0.35,
            },
          ],
        }}
      >
        <Ionicons
          name={
            hasCurrentBookmark
              ? "bookmarks"
              : "bookmarks-outline"
          }
          size={24}
          color={accentColor}
          accessibilityLabel="Bookmarks"
        />
      </MenuTrigger>

      {/* POPOVER */}

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

          {form ? (
            <>
              {/* CREATION / EDIT FORM */}

              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleCancel}
                  disabled={saving}
                  accessibilityLabel="Back to bookmarks"
                >
                  <Ionicons
                    name="chevron-back"
                    size={23}
                    color={accentColor}
                  />
                </TouchableOpacity>

                <View style={styles.details}>
                  <Text style={styles.heading}>
                    {form.mode === "create"
                      ? "New Bookmark"
                      : "Edit Bookmark"}
                  </Text>

                  <Text style={styles.subtitle}>
                    Page {formPage}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>
                Bookmark label (optional)
              </Text>

              <TextInput
                style={styles.formInput}
                placeholder="Enter bookmark label"
                placeholderTextColor="#999"
                value={label}
                onChangeText={(value) => {
                  setLabel(value);
                  setError(null);
                  setConfirmDelete(false);
                }}
                editable={!saving}
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {error && (
                <Text style={styles.error}>
                  {error}
                </Text>
              )}

              {confirmDelete && (
                <Text style={styles.error}>
                  Delete this bookmark?
                </Text>
              )}

              <View style={styles.formActions}>

                {form.mode === "edit" && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={saving}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <Text style={styles.deleteLabel}>
                      {confirmDelete
                        ? "Confirm"
                        : "Delete"}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ flex: 1 }} />

                <TouchableOpacity
                  onPress={handleCancel}
                  disabled={saving}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelLabel}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor:
                        accentColor,
                      opacity: saving ? 0.6 : 1,
                    },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text style={styles.saveLabel}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* BOOKMARK BROWSER */}

              <View style={styles.header}>
                <Text style={styles.heading}>
                  Bookmarks
                </Text>

                <View style={styles.headerActions}>
                  <Text style={styles.count}>
                    {visibleBookmarks.length}{" "}
                    {visibleBookmarks.length === 1
                      ? "bookmark"
                      : "bookmarks"}
                  </Text>

                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleCreate}
                    accessibilityRole="button"
                    accessibilityLabel="Create bookmark"
                  >
                    <Ionicons
                      name="add"
                      size={25}
                      color={accentColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* SEARCH */}

              <View style={styles.searchContainer}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color="#888"
                />

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bookmarks..."
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

              {/* BOOKMARK LIST */}

              <FlatList
                style={{
                  maxHeight: listHeight,
                }}
                data={filteredBookmarks}
                keyExtractor={(item) =>
                  String(item.id)
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="bookmark-outline"
                      size={32}
                      color="#CBD5E1"
                    />

                    <Text style={styles.emptyText}>
                      {query.trim()
                        ? "No matching bookmarks."
                        : "No bookmarks in this page range."}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isCurrent =
                    item.page_number === currentPage;

                  return (
                    <View
                      style={[
                        styles.bookmarkRow,
                        isCurrent && {
                          backgroundColor:
                            `${accentColor}0D`,
                        },
                      ]}
                    >
                      <MenuOption
                        value={item}
                        customStyles={{
                          optionWrapper: {
                            padding: 0,
                            flex: 1,
                          },
                        }}
                      >
                        <View style={styles.bookmarkContent}>
                          <Ionicons
                            name="bookmark"
                            size={23}
                            color="#D97706"
                          />

                          <View style={styles.details}>
                            <Text
                              style={[
                                styles.bookmarkTitle,
                                isCurrent && {
                                  color: accentColor,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {item.label ||
                                `Page ${item.page_number}`}
                            </Text>

                            <Text style={styles.subtitle}>
                              Page {item.page_number}
                              {isCurrent
                                ? " · Current page"
                                : ""}
                            </Text>
                          </View>
                        </View>
                      </MenuOption>

                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                          handleEdit(item)
                        }
                        accessibilityLabel={`Edit bookmark on page ${item.page_number}`}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={21}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />

              {/* ADD CURRENT PAGE */}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.footerButton}
                onPress={handleCreate}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={21}
                  color={accentColor}
                />

                <Text
                  style={[
                    styles.footerLabel,
                    { color: accentColor },
                  ]}
                >
                  Bookmark page {currentPage}
                </Text>

                <Ionicons
                  name="add"
                  size={20}
                  color={accentColor}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </MenuOptions>
    </Menu>
  );
};

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    padding: 12,
    gap: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  count: {
    fontSize: 12,
    color: "#888",
  },

  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  backButton: {
    width: 30,
    height: 36,
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
  },

  searchInput: {
    flex: 1,
    minHeight: 40,
    fontSize: 14,
    color: "#222",
  },

  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 6,
  },

  bookmarkContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  bookmarkTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  subtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },

  editButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },

  emptyText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },

  footerLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },

  formInput: {
    minHeight: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
  },

  formActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
  },

  deleteLabel: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "500",
  },

  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  cancelLabel: {
    fontSize: 14,
    color: "#64748B",
  },

  saveButton: {
    minWidth: 70,
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  saveLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  error: {
    fontSize: 12,
    color: "#DC2626",
  },
});

export default ReaderBookmarksMenu;
