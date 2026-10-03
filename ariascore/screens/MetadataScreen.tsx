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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

import {
  GENRE_OPTIONS,
  Label,
  MusicMetadata,
  RootStackParamList,
} from "../types";

import MetadataEditor from "../components/MetadataEditor";
import ManageSetlistsModal
  from "../components/ManageSetlistsModal";

import {
  createOrGetLabel,
  getAllLabels,
  getAllSetlists,
  getMusicWithMetadata,
  metadataExists,
  saveCompleteMetadata,
} from "../utils/database";

import AriaScorePdfRenderer
  from "../native/AriaScorePdfRenderer";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Metadata"
>;

export default function MetadataScreen({
  route,
  navigation,
}: Props) {
  const {
    mode,
    musicId,
    pdfUri,
    initialTitle,
  } = route.params;

  const [formData, setFormData] =
    useState<Omit<MusicMetadata, "id">>({
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    const [coverThumbnail, setCoverThumbnail] =
    useState<string | null>(null);

    const [selectedLabels, setSelectedLabels] =
    useState<string[]>([]);

    const [availableLabels, setAvailableLabels] =
    useState<Label[]>([]);

    const [isLoading, setIsLoading] =
    useState(false);

    const [genreModalVisible, setGenreModalVisible] =
    useState(false);

    const [
        manageSetlistsVisible,
        setManageSetlistsVisible,
    ] = useState(false);

    const [showLabelModal, setShowLabelModal] =
    useState(false);

    const [newLabelText, setNewLabelText] =
    useState("");

    const loadData = async () => {
        try {
            const labels = await getAllLabels();
            setAvailableLabels(labels);

            if (
                (mode === "edit" || mode === "view") &&
                musicId
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
            } else if (initialTitle) {
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
    };

    useEffect(() => {
        void loadData();
    }, [musicId, mode]);

    useEffect(() => {
        if (!pdfUri) return;

        const loadDocumentData = async () => {
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
        };

        void loadDocumentData();
    }, [pdfUri]);

    const handleSave = async () => {
        const title = formData.title.trim();

        if (!title) {
            Alert.alert(
            "Error",
            "Title is required"
            );
            return;
        }

        if (!musicId && mode !== "add") {
            return;
        }

        const resolvedPageCount =
            pdfUri
            ? await AriaScorePdfRenderer.getPageCount(
                pdfUri
                )
            : Number(formData.page_count) || 0;

        const cleanedFormData = {
            ...formData,
            title,
            composer:
            formData.composer?.trim() || "",
            document_type:
            formData.document_type.trim() || "",
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
            updated_at: new Date().toISOString(),
        };

        if (mode === "edit" && musicId) {
            setIsLoading(true);

            try {
                const duplicate =
                    await metadataExists(
                    cleanedFormData.title,
                    cleanedFormData.composer,
                    musicId
                    );

                if (duplicate) {
                    Alert.alert(
                    "Duplicate music",
                    "A piece with this title and composer already exists."
                    );
                    return;
                }

                await saveCompleteMetadata(
                    musicId,
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
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            title:
                mode === "edit"
                    ? "Edit Score Information"
                    : mode === "view"
                    ? "Score Information"
                    : "Add Score Information",

            headerRight: () =>
            mode === "view" ? null : (
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text
                        style={{
                            color: "#2563EB",
                            fontWeight: "700",
                        }}
                    >
                        {isLoading
                        ? "Saving..."
                        : "Save"}
                    </Text>
                </TouchableOpacity>
            ),
        });
    }, [
        navigation,
        mode,
        isLoading,
        handleSave,
    ]);

    const toggleLabel = (labelName: string) => {
        setSelectedLabels(prev =>
            prev.includes(labelName)
            ? prev.filter(name => name !== labelName)
            : [...prev, labelName]
        );
    };

    const handleAddLabel = async () => {
        const labelName = newLabelText.trim();

        if (!labelName) return;

        try {
            await createOrGetLabel(labelName);

            if (!selectedLabels.includes(labelName)) {
                setSelectedLabels(prev => [
                    ...prev,
                    labelName,
                ]);
            }

            const labels = await getAllLabels();
            setAvailableLabels(labels);

            setNewLabelText("");
            setShowLabelModal(false);
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
    };

    return (
        <SafeAreaView
            style={{
            flex: 1,
            backgroundColor: "#F9FAFB",
            }}
        >
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


            {/* Genre selector */}
            <Modal
                visible={genreModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setGenreModalVisible(false)
            }
            >
            <View
                style={{
                flex: 1,
                backgroundColor:
                    "rgba(0,0,0,0.35)",
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
                    style={{
                    fontSize: 22,
                    fontWeight: "700",
                    marginBottom: 16,
                    }}
                >
                    Select Genre
                </Text>

                <View
                    style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    }}
                >
                    {GENRE_OPTIONS.map(genre => {
                    const selected =
                        formData.genre === genre;

                    return (
                        <TouchableOpacity
                        key={genre}
                        onPress={() => {
                            setFormData(prev => ({
                            ...prev,
                            genre,
                            }));

                            setGenreModalVisible(
                            false
                            );
                        }}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: selected
                            ? "#2563EB"
                            : "#F3F4F6",
                        }}
                        >
                        <Text
                            style={{
                            color: selected
                                ? "white"
                                : "#374151",
                            fontWeight: "600",
                            }}
                        >
                            {genre}
                        </Text>
                        </TouchableOpacity>
                    );
                    })}
                </View>

                <TouchableOpacity
                    onPress={() =>
                    setGenreModalVisible(false)
                    }
                    style={{
                    marginTop: 20,
                    alignSelf: "flex-end",
                    }}
                >
                    <Text
                    style={{
                        color: "#2563EB",
                        fontSize: 16,
                        fontWeight: "700",
                    }}
                    >
                    Cancel
                    </Text>
                </TouchableOpacity>
                </View>
            </View>
            </Modal>

            {musicId != null && (
                <ManageSetlistsModal
                    visible={manageSetlistsVisible}
                    musicId={musicId}
                    onClose={() =>
                    setManageSetlistsVisible(false)
                    }
                    onSaved={() => {
                    // Nothing required yet unless this screen
                    // later displays occurrence summaries.
                    }}
                />
            )}
        </SafeAreaView>
    );
}