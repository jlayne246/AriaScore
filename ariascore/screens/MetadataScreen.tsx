import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import {
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  ACCENT_COLOR,
  GENRE_OPTIONS,
  Label,
  MusicMetadata,
  RootStackParamList,
} from "../types";

import MetadataEditor from "../components/MetadataEditor";
import ManageSetlistsModal from "../components/ManageSetlistsModal";

import {
  createOrGetLabel,
  getAllLabels,
  getMusicWithMetadata,
  insertMusic,
  metadataExists,
  musicExistsByUri,
  saveCompleteMetadata,
} from "../utils/database";

import AriaScorePdfRenderer from "../native/AriaScorePdfRenderer";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Metadata"
>;

type GenrePickerModalProps = {
  visible: boolean;
  selectedGenre: string;
  onSelect: (genre: string) => void;
  onClose: () => void;
};

type AddLabelModalProps = {
  visible: boolean;
  value: string;
  onChangeText: (value: string) => void;
  onAdd: () => void;
  onClose: () => void;
};

const createInitialMetadata = (): Omit<MusicMetadata, "id"> => {
  const now = new Date().toISOString();

  return {
    title: "",
    document_type: "Single Work",
    composer: "",
    arranger: "",
    editor: "",
    publisher: "",
    genre: "",
    key_signature: "",
    time_signature: "",
    page_count: 0,
    created_at: now,
    updated_at: now,
  };
};

export default function MetadataScreen({
  route,
  navigation,
}: Props) {
  const {
    mode,
    musicId,
    pdfUri,
    initialTitle,
    originalFilename,
  } = route.params;

  const [formData, setFormData] =
    useState<Omit<MusicMetadata, "id">>(
      createInitialMetadata
    );

  const [coverThumbnail, setCoverThumbnail] =
    useState<string | null>(null);

  const [selectedLabels, setSelectedLabels] =
    useState<string[]>([]);

  const [availableLabels, setAvailableLabels] =
    useState<Label[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [
    genreModalVisible,
    setGenreModalVisible,
  ] = useState(false);

  const [
    manageSetlistsVisible,
    setManageSetlistsVisible,
  ] = useState(false);

  const [
    showLabelModal,
    setShowLabelModal,
  ] = useState(false);

  const [newLabelText, setNewLabelText] =
    useState("");

  const screenTitle =
    mode === "edit"
      ? "Edit Score Information"
      : mode === "view"
        ? "Score Information"
        : "Add Score Information";

  const loadData = useCallback(async () => {
    try {
      const labels = await getAllLabels();
      setAvailableLabels(labels);

      if (
        (mode === "edit" || mode === "view") &&
        musicId != null
      ) {
        const metadata =
          await getMusicWithMetadata(musicId);

        if (metadata) {
          const {
            labels: existingLabels,
            ...metadataOnly
          } = metadata;

          setFormData(prev => ({
            ...metadataOnly,
            page_count:
              prev.page_count ||
              metadataOnly.page_count ||
              0,
          }));

          setSelectedLabels(existingLabels);
        }

        return;
      }

      if (initialTitle) {
        setFormData(prev => ({
          ...prev,
          title: initialTitle,
        }));
      }
    } catch (error) {
      console.error(
        "Failed to load metadata:",
        error
      );

      Alert.alert(
        "Error",
        "Failed to load metadata."
      );
    }
  }, [initialTitle, mode, musicId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadDocumentData =
    useCallback(async () => {
      if (!pdfUri) return;

      try {
        const pageCount =
          await AriaScorePdfRenderer.getPageCount(
            pdfUri
          );

        setFormData(prev => ({
          ...prev,
          page_count: pageCount,
        }));

        const result =
          await AriaScorePdfRenderer.renderPage({
            pdfPath: pdfUri,
            page: 1,
            width: 400,
            height: 600,
          });

        setCoverThumbnail(result.uri);
      } catch (error) {
        console.error(
          "Failed to load PDF data:",
          error
        );
      }
    }, [pdfUri]);

  useEffect(() => {
    void loadDocumentData();
  }, [loadDocumentData]);

  const handleSave = useCallback(async () => {
    if (mode === "view") return;

    const title = formData.title.trim();

    if (!title) {
      Alert.alert(
        "Error",
        "Title is required"
      );
      return;
    }

    if (mode !== "add" && musicId == null) {
      Alert.alert(
        "Error",
        "This score could not be identified."
      );
      return;
    }

    if (mode === "add" && !pdfUri) {
      Alert.alert(
        "Error",
        "No PDF was provided for import."
      );
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date().toISOString();

      const resolvedPageCount =
        pdfUri
          ? await AriaScorePdfRenderer.getPageCount(
              pdfUri
            )
          : Number(formData.page_count) || 0;

      const cleanedFormData:
        Omit<MusicMetadata, "id"> = {
          ...formData,
          title,
          composer:
            formData.composer?.trim() || "",
          document_type:
            formData.document_type?.trim() ||
            "Single Work",
          arranger:
            formData.arranger?.trim() || "",
          editor:
            formData.editor?.trim() || "",
          publisher:
            formData.publisher?.trim() || "",
          genre:
            formData.genre?.trim() || "",
          key_signature:
            formData.key_signature?.trim() || "",
          time_signature:
            formData.time_signature?.trim() || "",
          page_count: resolvedPageCount,
          created_at:
            mode === "add"
              ? now
              : formData.created_at,
          updated_at: now,
        };

      const duplicate =
        await metadataExists(
          cleanedFormData.title,
          cleanedFormData.composer,
          mode === "edit"
            ? musicId
            : undefined
        );

      if (duplicate) {
        Alert.alert(
          "Duplicate music",
          "A piece with this title and composer already exists."
        );
        return;
      }

      if (mode === "add") {
        const sourceUri = pdfUri!;

        const duplicateUri =
          await musicExistsByUri(sourceUri);

        if (duplicateUri) {
          Alert.alert(
            "Duplicate PDF",
            "This PDF has already been imported into your library."
          );
          return;
        }

        const insertedId =
          await insertMusic(
            cleanedFormData.title,
            sourceUri,
            originalFilename?.trim() ||
              `${cleanedFormData.title}.pdf`,
            [],
            now
          );

        await saveCompleteMetadata(
          insertedId,
          cleanedFormData,
          selectedLabels
        );

        navigation.replace("Reader", {
          uri: sourceUri,
          musicId: insertedId,
          origin: "library",
        });

        return;
      }

      await saveCompleteMetadata(
        musicId!,
        cleanedFormData,
        selectedLabels
      );

      navigation.goBack();
    } catch (error) {
      console.error(
        "Failed to save metadata:",
        error
      );

      Alert.alert(
        "Error",
        "Failed to save metadata"
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    formData,
    mode,
    musicId,
    navigation,
    originalFilename,
    pdfUri,
    selectedLabels,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={ACCENT_COLOR}
              />
            </TouchableOpacity>

            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              {screenTitle}
            </Text>

            {mode === "view" ? (
              <View
                style={styles.headerActionSpacer}
              />
            ) : (
              <TouchableOpacity
                onPress={() => {
                  void handleSave();
                }}
                disabled={isLoading}
                style={styles.headerSaveButton}
              >
                <Text
                  style={[
                    styles.headerSaveText,
                    isLoading &&
                      styles.headerSaveTextDisabled,
                  ]}
                >
                  {isLoading
                    ? "Saving..."
                    : "Save"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ),
    });
  }, [
    handleSave,
    isLoading,
    mode,
    navigation,
    screenTitle,
  ]);

  const toggleLabel =
    useCallback((labelName: string) => {
      setSelectedLabels(prev =>
        prev.includes(labelName)
          ? prev.filter(
              name => name !== labelName
            )
          : [...prev, labelName]
      );
    }, []);

  const closeLabelModal = useCallback(() => {
    setShowLabelModal(false);
    setNewLabelText("");
  }, []);

  const handleAddLabel =
    useCallback(async () => {
      const labelName = newLabelText.trim();

      if (!labelName) return;

      try {
        await createOrGetLabel(labelName);

        setSelectedLabels(prev =>
          prev.includes(labelName)
            ? prev
            : [...prev, labelName]
        );

        const labels = await getAllLabels();
        setAvailableLabels(labels);

        closeLabelModal();
      } catch (error) {
        console.error(
          "Failed to add label:",
          error
        );

        Alert.alert(
          "Error",
          "Failed to add label"
        );
      }
    }, [closeLabelModal, newLabelText]);

  return (
    <SafeAreaView style={styles.container}>
      <MetadataEditor
        formData={formData}
        setFormData={setFormData}
        coverThumbnail={coverThumbnail}
        selectedLabels={selectedLabels}
        availableLabels={availableLabels}
        onToggleLabel={toggleLabel}
        onAddLabel={() =>
          setShowLabelModal(true)
        }
        onSelectGenre={() =>
          setGenreModalVisible(true)
        }
        onManageSetlists={() =>
          setManageSetlistsVisible(true)
        }
        canManageSetlists={
          mode !== "add" &&
          musicId != null
        }
      />

      <GenrePickerModal
        visible={genreModalVisible}
        selectedGenre={formData.genre}
        onSelect={genre => {
          setFormData(prev => ({
            ...prev,
            genre,
          }));
          setGenreModalVisible(false);
        }}
        onClose={() =>
          setGenreModalVisible(false)
        }
      />

      <AddLabelModal
        visible={showLabelModal}
        value={newLabelText}
        onChangeText={setNewLabelText}
        onAdd={() => {
          void handleAddLabel();
        }}
        onClose={closeLabelModal}
      />

      {musicId != null && (
        <ManageSetlistsModal
          visible={manageSetlistsVisible}
          musicId={musicId}
          onClose={() =>
            setManageSetlistsVisible(false)
          }
          onSaved={() => {
            // Nothing required yet. Setlist
            // occurrences are persisted immediately.
          }}
        />
      )}
    </SafeAreaView>
  );
}

function GenrePickerModal({
  visible,
  selectedGenre,
  onSelect,
  onClose,
}: GenrePickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.genreModalCard}>
          <Text style={styles.modalTitle}>
            Select Genre
          </Text>

          <View style={styles.genreList}>
            {GENRE_OPTIONS.map(genre => {
              const selected =
                selectedGenre === genre;

              return (
                <TouchableOpacity
                  key={genre}
                  onPress={() =>
                    onSelect(genre)
                  }
                  style={[
                    styles.genreChip,
                    selected &&
                      styles.genreChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.genreChipText,
                      selected &&
                        styles.genreChipTextSelected,
                    ]}
                  >
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.modalRightAction}
          >
            <Text style={styles.modalActionText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AddLabelModal({
  visible,
  value,
  onChangeText,
  onAdd,
  onClose,
}: AddLabelModalProps) {
  const canAdd = value.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.labelModalCard}>
          <Text style={styles.modalTitle}>
            Add New Label
          </Text>

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder="Enter label name"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canAdd) onAdd();
            }}
            style={styles.labelInput}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalActionButton}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAdd}
              disabled={!canAdd}
              style={styles.modalActionButton}
            >
              <Text
                style={[
                  styles.modalActionText,
                  !canAdd &&
                    styles.modalActionTextDisabled,
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  header: {
    height: 92,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  headerBackButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: '#464950',
    fontWeight: '400',
    fontSize: 24,
    marginLeft: 4,
  },
  headerSaveButton: {
    minWidth: 72,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerSaveText: {
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSaveTextDisabled: {
    opacity: 0.5,
  },
  headerActionSpacer: {
    width: 72,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  genreModalCard: {
    width: "70%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
  },
  labelModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  genreList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  genreChipSelected: {
    backgroundColor: ACCENT_COLOR,
  },
  genreChipText: {
    color: "#374151",
    fontWeight: "600",
  },
  genreChipTextSelected: {
    color: "white",
  },
  labelInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  modalRightAction: {
    marginTop: 20,
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  modalActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  modalActionText: {
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: "700",
  },
  modalActionTextDisabled: {
    opacity: 0.4,
  },
  cancelText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});
