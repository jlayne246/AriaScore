import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { MusicMetadata, Label, MusicMetadataWithLabels, MetadataFormData, DOCUMENT_TYPES, GENRE_OPTIONS } from '../types';
import {
  saveCompleteMetadata,
  getMusicWithMetadata,
  getAllLabels,
  createOrGetLabel,
  getAllSetlists,
  setMusicSetlists,
  getSetlistNamesForMusic,
  addMusicToSetlist,
  metadataExists
} from '../utils/database';
import ManageSetlistsModal from '../components/ManageSetlistsModal'
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';

interface MetadataFormProps {
  musicId?: number;
  pdfUri?: string;
  initialTitle?: string;
  initialData?: MusicMetadataWithLabels;
  onSave: (formData?: MetadataFormData) => void;
  onCancel: () => void;
  visible: boolean;
  mode: string;
}

const MetadataForm: React.FC<MetadataFormProps> = ({
  musicId,
  pdfUri,
  initialTitle,
  initialData,
  onSave,
  onCancel,
  visible,
  mode
}) => {
  // Form state
  const [formData, setFormData] = useState<Omit<MusicMetadata, 'id'>>({
    title: '',
    document_type: "Single Work",
    composer: '',
    arranger: '',
    editor: '',
    publisher: '',
    genre: '',
    key_signature: '',
    time_signature: '',
    page_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [coverThumbnail, setCoverThumbnail] = useState<string | null>(null);

  // Labels state
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [newLabelText, setNewLabelText] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [genreModalVisible, setGenreModalVisible] = useState(false);
  const [manageSetlistsVisible, setManageSetlistsVisible] = useState(false);
  const [showNewSetlistForm, setShowNewSetlistForm] = useState(false);

  // Setlists state
  const [selectedSetlists, setselectedSetlists] = useState<string[]>([]);
  const [availableSetlists, setavailableSetlists] = useState<string[]>([]);
  const [newSetlistText, setNewSetlistText] = useState('');
  const [showSetlistModal, setShowSetlistModal] = useState(false);

  const [showAllOptions, setShowAllOptions] = useState(false);
  const [showAllKeyOptions, setShowAllKeyOptions] = useState(false);
  const [showAllTimeOptions, setShowAllTimeOptions] = useState(false);

  // Common key signatures
  const keySignatures = [
    // Major
    "C major",
    "G major",
    "D major",
    "A major",
    "E major",
    "B major",
    "F# major",
    "C# major",
    "F major",
    "Bb major",
    "Eb major",
    "Ab major",
    "Db major",
    "Gb major",
    "Cb major",

    // Minor
    "A minor",
    "E minor",
    "B minor",
    "F# minor",
    "C# minor",
    "G# minor",
    "D# minor",
    "A# minor",
    "D minor",
    "G minor",
    "C minor",
    "F minor",
    "Bb minor",
    "Eb minor",
    "Ab minor",
  ];

  const timeSignatures = [
    // Cut time
    "2/2",
    "3/2",
    "4/2",
    "5/2",
    "6/2",

    // Simple
    "2/4",
    "3/4",
    "4/4",
    "5/4",
    "6/4",

    // Compound
    "3/8",
    "6/8",
    "9/8",
    "12/8",

    // Common asymmetrical
    "5/8",
    "7/8",
    "7/4",
    "8/8",
    "10/8",
    "11/8",
    "13/8",

    // Less common
    "15/8",
    "5/16",
    "7/16",
    "9/16",
    "12/16",
  ];

  const isCustomValue = (value: string, options: string[]) =>
  value.trim() !== "" && !options.includes(value.trim());

  console.log(mode);

  // Load initial data and available labels
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, musicId]);

  useEffect(() => {
    if (!visible) return;

    const loadDocumentData = async () => {
      if (!pdfUri) return;

      try {
        const pageCount = await AriaScorePdfRenderer.getPageCount(pdfUri);
        console.log(`URI: ${pdfUri} | Page Count: ${pageCount}`)

        setFormData(prev => {
          const next = {
            ...prev,
            page_count: pageCount,
          };

          console.log("Previous page count:", prev.page_count);
          console.log("Next page count:", next.page_count);

          return next;
        });

        // console.log(`FormData Page Count: ${formData.page_count}`)

        const result = await AriaScorePdfRenderer.renderPage({
          pdfPath: pdfUri,
          page: 1,
          width: 400,
          height: 600,
        });

        setCoverThumbnail(result.uri);
      } catch (error) {
        console.error("Failed to load PDF metadata:", error);
      }
    };

    loadDocumentData();
  }, [visible, pdfUri]);

  // Handle initialTitle changes (for new items)
  useEffect(() => {
    if (visible && initialTitle && mode !== 'edit' && mode !== 'view') {
      setFormData(prev => ({
        ...prev,
        title: initialTitle
      }));
    }
  }, [visible, initialTitle, mode]);

  const loadData = async () => {
    try {
      // Load available labels and setlists
      const labels = await getAllLabels();
      setAvailableLabels(labels);

      // Load available setlists from database
      const setlists = await getAllSetlists();
      setavailableSetlists(setlists);

      console.log(musicId, setlists);

      // For edit/view modes, load existing metadata
      if ((mode === 'edit' || mode === 'view') && musicId) {
        console.log("Initial: ", initialData)
        if (!initialData) {
          const metadata = await getMusicWithMetadata(musicId);
          if (metadata) {
            const { labels, ...metadataOnly } = metadata;
            const itemsetlists = await getSetlistNamesForMusic(musicId); // Separate function
            console.log("IN METADATA: ", labels, metadataOnly, itemsetlists);
            setFormData(prev => ({
              ...metadataOnly,
              page_count: prev.page_count || metadataOnly.page_count || 0,
            }));
            setSelectedLabels(labels);
            setselectedSetlists(itemsetlists || []);
          }
        } else {
          const { labels, ...metadataOnly } = initialData;
          const itemsetlists = await getSetlistNamesForMusic(musicId); // Separate function
          console.log("Initial Data: ", labels, metadataOnly, itemsetlists);
          setFormData(prev => ({
            ...metadataOnly,
            page_count: prev.page_count || metadataOnly.page_count || 0,
          }));
          setSelectedLabels(labels);
          setselectedSetlists(itemsetlists || []);

          console.log("Data - ", labels, metadataOnly, itemsetlists)
        }
      }
      // For new items, just set the title if provided
      else if (initialTitle) {
        // setFormData(prev => ({
        //   ...prev,
        //   title: initialTitle
        // }));
        // setFormData(prev => {
        //   console.log('prev:', prev); // This will log the previous state
        //   return {
        //     ...prev,
        //     title: initialTitle
        //   };
        // });
        setFormData(prev => ({
          ...prev,
          title: initialTitle,
          document_type: "Single Work",
          composer: '',
          arranger: '',
          editor: '',
          publisher: '',
          genre: '',
          key_signature: '',
          time_signature: '',
          page_count: prev.page_count || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        console.log(formData)
        // Set default group for new items
        setselectedSetlists([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load form data');
    }
  };

  const handleSave = async () => {
    const title = formData.title.trim();

    if (!title) {
      Alert.alert("Error", "Title is required");
      return;
    }

    const resolvedPageCount =
      pdfUri
        ? await AriaScorePdfRenderer.getPageCount(pdfUri)
        : Number(formData.page_count) || 0;

    const cleanedFormData = {
      ...formData,
      title,
      composer: formData.composer?.trim() || "",
      document_type: formData.document_type.trim() || "",
      arranger: formData.arranger?.trim() || "",
      editor: formData.editor?.trim() || "",
      publisher: formData.publisher?.trim() || "",
      genre: formData.genre?.trim() || "",
      key_signature: formData.key_signature?.trim() || "",
      time_signature: formData.time_signature?.trim() || "",
      page_count: resolvedPageCount,
      updated_at: new Date().toISOString(),
    };

    // ADD MODE: do not save here; let parent create music first.
    if (mode === "add" || !musicId) {
      onSave({
        title: cleanedFormData.title,
        document_type: cleanedFormData.document_type,
        composer: cleanedFormData.composer,
        arranger: cleanedFormData.arranger,
        editor: cleanedFormData.editor,
        publisher: cleanedFormData.publisher,
        genre: cleanedFormData.genre,
        key_signature: cleanedFormData.key_signature,
        time_signature: cleanedFormData.time_signature,
        page_count: cleanedFormData.page_count,
        setlists: selectedSetlists,
        labels: selectedLabels,
      });

      return;
    }

    // EDIT MODE: music already exists, so save directly.
    setIsLoading(true);

    try {
      const duplicate = await metadataExists(
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

      await saveCompleteMetadata(musicId, cleanedFormData, selectedLabels);
      await setMusicSetlists(musicId, selectedSetlists);

      Alert.alert("Success", "Metadata saved successfully");

      onSave({
        title: cleanedFormData.title,
        document_type: cleanedFormData.document_type,
        composer: cleanedFormData.composer,
        arranger: cleanedFormData.arranger,
        editor: cleanedFormData.editor,
        publisher: cleanedFormData.publisher,
        genre: cleanedFormData.genre,
        key_signature: cleanedFormData.key_signature,
        time_signature: cleanedFormData.time_signature,
        page_count: cleanedFormData.page_count,
        setlists: selectedSetlists,
        labels: selectedLabels,
      });
    } catch (error) {
      console.error("Failed to save metadata:", error);
      Alert.alert("Error", "Failed to save metadata");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLabel = async () => {
    if (!newLabelText.trim()) return;

    try {
      await createOrGetLabel(newLabelText.trim());

      // Add to selected labels if not already selected
      if (!selectedLabels.includes(newLabelText.trim())) {
        setSelectedLabels(prev => [...prev, newLabelText.trim()]);
      }

      // Refresh available labels
      const labels = await getAllLabels();
      setAvailableLabels(labels);

      setNewLabelText('');
      setShowLabelModal(false);
    } catch (error) {
      console.error('Failed to add label:', error);
      Alert.alert('Error', 'Failed to add label');
    }
  };

  const toggleLabel = (labelName: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelName)
        ? prev.filter(l => l !== labelName)
        : [...prev, labelName]
    );
  };

  const handleAddSetlist = () => {
    const setlistName = newSetlistText.trim();

    if (!setlistName) return;

    if (!availableSetlists.includes(setlistName)) {
      setavailableSetlists(prev => [...prev, setlistName]);
    }

    if (!selectedSetlists.includes(setlistName)) {
      setselectedSetlists(prev => [...prev, setlistName]);
    }

    setNewSetlistText('');
    setShowNewSetlistForm(false);
  };

  const toggleSetlist = (groupName: string) => {
    setselectedSetlists(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  // const renderRatingSelector = () => (
  //   <View className="my-3">
  //     <Text className="text-base font-semibold text-gray-800 mb-2">Rating (1-5 stars)</Text>
  //     <View className="flex-row flex-wrap gap-2">
  //       {ratings.map(rating => (
  //         <TouchableOpacity
  //           key={rating}
  //           className={`bg-white border border-gray-300 rounded-lg py-2 px-3 ${formData.rating === rating ? 'bg-blue-500 border-blue-500' : ''
  //             }`}
  //           onPress={() => setFormData(prev => ({ ...prev, rating }))}
  //         >
  //           <Text className={`text-base ${formData.rating === rating ? 'text-white' : 'text-gray-800'
  //             }`}>
  //             {'★'.repeat(rating)}
  //           </Text>
  //         </TouchableOpacity>
  //       ))}
  //     </View>
  //   </View>
  // );

  // const renderDifficultySelector = () => (
  //   <View className="my-3">
  //     <Text className="text-base font-semibold text-gray-800 mb-2">Difficulty (1-10)</Text>
  //     <View className="flex-row flex-wrap gap-2">
  //       {difficulties.map(difficulty => (
  //         <TouchableOpacity
  //           key={difficulty}
  //           className={`bg-white border border-gray-300 rounded-lg py-2 px-3 min-w-9 items-center ${formData.difficulty === difficulty ? 'bg-orange-500 border-orange-500' : ''
  //             }`}
  //           onPress={() => setFormData(prev => ({ ...prev, difficulty }))}
  //         >
  //           <Text className={`text-base font-semibold ${formData.difficulty === difficulty ? 'text-white' : 'text-gray-800'
  //             }`}>
  //             {difficulty}
  //           </Text>
  //         </TouchableOpacity>
  //       ))}
  //     </View>
  //   </View>
  // );

  const renderQuickSelectButtons = (
    options: string[],
    field: keyof typeof formData,
    showAllOptions: boolean,
    setShowAllOptions: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const currentValue = String(formData[field] ?? "");
    const visibleOptions = showAllOptions ? options : options.slice(0, 5);
    const hiddenCount = options.length - visibleOptions.length;
    const isCustom = isCustomValue(currentValue, options);

    return (
      <View className="flex-row flex-wrap mt-2">
        {visibleOptions.map(option => (
          <TouchableOpacity
            key={option}
            className={`bg-white border border-gray-300 rounded-md py-1.5 px-2.5 mr-2 mb-2 ${
              currentValue === option ? 'bg-green-500 border-green-500' : ''
            }`}
            onPress={() => setFormData(prev => ({ ...prev, [field]: option }))}
          >
            <Text
              className={currentValue === option ? "text-white" : "text-gray-800"}
              style={{ fontSize: 14, includeFontPadding: true }}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}

        {!showAllOptions && hiddenCount > 0 && (
          <TouchableOpacity
            className="bg-gray-200 border border-gray-300 rounded-md py-1.5 px-2.5 mr-2 mb-2"
            onPress={() => setShowAllOptions(true)}
          >
            <Text className="text-sm text-gray-800">More...</Text>
          </TouchableOpacity>
        )}

        {showAllOptions && isCustom && (
          <TouchableOpacity
            className={`border rounded-md py-1.5 px-2.5 mr-2 mb-2 ${
              isCustom ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"
            }`}
          >
            <Text className={`text-sm ${isCustom ? "text-white" : "text-gray-800"}`}>
              {isCustom ? `Custom: ${currentValue}` : "Custom"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '82%',
            maxWidth: 900,
            height: '88%',
            backgroundColor: '#F9FAFB',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-200">
            <TouchableOpacity onPress={onCancel} className="py-2 px-3">
              <Text className="text-blue-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">
              {mode === 'edit' ? 'Edit Metadata' : mode === 'view' ? 'View Metadata' : 'Add Metadata'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              className={`py-2 px-4 rounded-lg ${isLoading ? 'bg-gray-400' : 'bg-blue-500'
                }`}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-semibold">
                {isLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 24,
            }}
          >
            {/* Title */}
            <Text className="text-sm text-gray-800 font-semibold mt-3 mb-1">GENERAL</Text>
            <View className="h-px bg-gray-200 my-2" />

            <View className="flex-row items-start my-3">
              {coverThumbnail && (
                <Image
                  source={{ uri: coverThumbnail }}
                  style={{
                    width: 220,
                    height: 270,
                    resizeMode: 'contain',
                    marginRight: 12,
                    borderWidth: 1,
                    borderColor: '#ddd',
                  }}
                />
              )}

              <View style={{ flex: 1 }}>
                <View className="mb-3">
                  <Text className="text-base font-medium text-gray-800 mb-2">
                    Title
                  </Text>

                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                    value={formData.title}
                    onChangeText={(text) =>
                      setFormData(prev => ({ ...prev, title: text }))
                    }
                    placeholder="Enter title"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {formData.document_type === "Single Work" ? (
                  <>
                    <View className="mb-3">
                      <Text className="text-base font-medium text-gray-800 mb-2">
                        Composer
                      </Text>

                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={formData.composer}
                        onChangeText={(text) =>
                          setFormData(prev => ({ ...prev, composer: text }))
                        }
                        placeholder="Enter composer name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View>
                      <Text className="text-base font-medium text-gray-800 mb-2">
                        Arranger
                      </Text>

                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={formData.arranger}
                        onChangeText={(text) =>
                          setFormData(prev => ({ ...prev, arranger: text }))
                        }
                        placeholder="Enter arranger name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View className="mb-3">
                      <Text className="text-base font-medium text-gray-800 mb-2">
                        Editor
                      </Text>

                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={formData.editor}
                        onChangeText={(text) =>
                          setFormData(prev => ({ ...prev, editor: text }))
                        }
                        placeholder="Enter editor name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View>
                      <Text className="text-base font-medium text-gray-800 mb-2">
                        Publisher
                      </Text>

                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                        value={formData.publisher}
                        onChangeText={(text) =>
                          setFormData(prev => ({ ...prev, publisher: text }))
                        }
                        placeholder="Enter publisher name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </>
                )}
              </View>
            </View>

            <Text className="text-sm text-gray-800 font-semibold mt-3 mb-1">MUSIC</Text>
            <View className="h-px bg-gray-200 my-2" />
            {/* Genre */}
            <View className="my-3">
              <Text className="text-base font-medium text-gray-800 mb-2">Genre</Text>

              <TouchableOpacity
                onPress={() => setGenreModalVisible(true)}
                style={{
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: formData.genre ? "#111827" : "#9CA3AF" }}>
                  {formData.genre || "Select genre"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Document Type */}
            <View className="my-3">
              <Text className="text-base font-medium text-gray-800 mb-2">
                Document Type
              </Text>

              <View className="flex-row flex-wrap mt-2">
                {DOCUMENT_TYPES.map(type => {
                  const selected = formData.document_type === type;

                  return (
                    <TouchableOpacity
                      key={type}
                      className={`border rounded-full py-2 px-3 mr-2 mb-2 ${
                        selected
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                      onPress={() =>
                        setFormData(prev => ({
                          ...prev,
                          document_type: type,
                        }))
                      }
                    >
                      <Text
                        className={`text-sm ${
                          selected ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {formData.document_type === "Single Work" && (
              <>
                {/* Key Signature */}
                <View className="my-3">
                  <Text className="text-base font-medium text-gray-800 mb-2">Key Signature</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                    value={formData.key_signature}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, key_signature: text }))}
                    placeholder="Select or enter key signature"
                    placeholderTextColor="#9CA3AF"
                  />
                  {renderQuickSelectButtons(
                    keySignatures,
                    'key_signature',
                    showAllKeyOptions,
                    setShowAllKeyOptions
                  )}
                  {isCustomValue(formData.key_signature, keySignatures) && (
                    <Text className="text-xs text-blue-600 mt-1">
                      Custom key signature will be saved for this score.
                    </Text>
                  )}
                </View>

                {/* Time Signature */}
                <View className="my-3">
                  <Text className="text-base font-medium text-gray-800 mb-2">Time Signature</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-800"
                    value={formData.time_signature}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, time_signature: text }))}
                    placeholder="Select or enter time signature"
                    placeholderTextColor="#9CA3AF"
                  />
                  {renderQuickSelectButtons(
                    timeSignatures,
                    'time_signature',
                    showAllTimeOptions,
                    setShowAllTimeOptions
                  )}

                  {isCustomValue(formData.time_signature, timeSignatures) && (
                    <Text className="text-xs text-blue-600 mt-1">
                      Custom time signature will be saved for this score.
                    </Text>
                  )}
                </View>
              </>
            )}

            

            <Text className="text-sm text-gray-800 font-semibold mt-3 mb-1">DOCUMENT</Text>
            <View className="h-px bg-gray-200 my-2" />
            {/* Page Count */}
            <View className="my-3">
              <Text className="text-base font-medium text-gray-800 mb-2">Page Count</Text>
              <View className="bg-white border border-gray-300 rounded-lg px-4 py-3">
                <Text className="text-base text-gray-800">
                  {formData.page_count || 0} pages
                </Text>
              </View>
            </View>

            {/* Rating */}
            {/* {renderRatingSelector()} */}

            {/* Difficulty */}
            {/* {renderDifficultySelector()} */}

            <Text className="text-sm text-gray-800 font-semibold mt-3 mb-1">ORGANISATION</Text>
            <View className="h-px bg-gray-200 my-2" />

            {/* setlists */}
            <View className="my-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-base font-medium text-gray-800">
                  Setlists
                </Text>

                {!showNewSetlistForm && (
                  <TouchableOpacity
                    onPress={() => setShowNewSetlistForm(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: "white",
                    }}
                  >
                    <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 16 }}>
                      + New Setlist
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {showNewSetlistForm && (
                <View
                  style={{
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <TextInput
                    value={newSetlistText}
                    onChangeText={setNewSetlistText}
                    placeholder="Add new setlist name here"
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                    style={{
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 16,
                      color: "#111827",
                      marginBottom: 10,
                    }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setShowNewSetlistForm(false);
                        setNewSetlistText("");
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleAddSetlist}
                      style={{
                        backgroundColor: "#2563EB",
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "700" }}>
                        Create
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View className="flex-row flex-wrap gap-2">
                {availableSetlists.map(group => (
                  <TouchableOpacity
                    key={group}
                    className={`border rounded-full py-1.5 px-3 ${
                      selectedSetlists.includes(group)
                        ? "bg-blue-500 border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => toggleSetlist(group)}
                  >
                    <Text
                      className={`text-sm ${
                        selectedSetlists.includes(group)
                          ? "text-white"
                          : "text-gray-800"
                      }`}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedSetlists.length === 0 && (
                <Text className="text-sm text-gray-500 mt-2 italic">
                  No setlists selected.
                </Text>
              )}
            </View>

            {/* Labels */}
            <View className="my-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-base font-medium text-gray-800">Labels</Text>

                <TouchableOpacity
                  onPress={() => setShowLabelModal(true)}
                  className="bg-green-500 px-4 py-2 rounded-md"
                  style={{ minHeight: 36, justifyContent: 'center' }}
                >
                  <Text className="text-white text-sm font-medium leading-none self-center" style={{ lineHeight: 18 }}>
                    + Add Label
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {availableLabels.map(label => (
                  <TouchableOpacity
                    key={label.id}
                    className={`bg-white border border-gray-300 rounded-full py-1.5 px-3 ${selectedLabels.includes(label.name) ? 'bg-purple-500 border-purple-500' : ''
                      }`}
                    onPress={() => toggleLabel(label.name)}
                  >
                    <Text className={`text-sm ${selectedLabels.includes(label.name) ? 'text-white' : 'text-gray-800'
                      }`}>
                      {label.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Add Setlist Modal */}
          {/* {musicId && (
            <ManageSetlistsModal
              visible={manageSetlistsVisible}
              musicId={musicId}
              onClose={() => setManageSetlistsVisible(false)}
              onSaved={async () => {
                setManageSetlistsVisible(false);

                const updatedSetlists = await getSetlistNamesForMusic(musicId);
                setselectedSetlists(updatedSetlists);
              }}
            />
          )} */}
          

          {/* Add Label Modal */}
          <Modal visible={showLabelModal} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-white rounded-xl p-6 mx-5 w-full max-w-sm">
                <Text className="text-lg font-semibold text-gray-800 mb-4 text-center">Add New Label</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base mb-5"
                  value={newLabelText}
                  onChangeText={setNewLabelText}
                  placeholder="Enter label name"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      setShowLabelModal(false);
                      setNewLabelText('');
                    }}
                    className="flex-1 py-3 rounded-lg border border-gray-300 items-center"
                  >
                    <Text className="text-base text-gray-800">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddLabel}
                    className="flex-1 bg-green-500 py-3 rounded-lg items-center"
                  >
                    <Text className="text-base text-white font-semibold">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>

      <Modal visible={genreModalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
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
            <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
              Select Genre
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {GENRE_OPTIONS.map((genre) => {
                const selected = formData.genre === genre;

                return (
                  <TouchableOpacity
                    key={genre}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, genre }));
                      setGenreModalVisible(false);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: selected ? "#2563EB" : "#F3F4F6",
                    }}
                  >
                    <Text style={{ color: selected ? "white" : "#374151", fontWeight: "600" }}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setGenreModalVisible(false)}
              style={{ marginTop: 20, alignSelf: "flex-end" }}
            >
              <Text style={{ color: "#2563EB", fontSize: 16, fontWeight: "700" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default MetadataForm;