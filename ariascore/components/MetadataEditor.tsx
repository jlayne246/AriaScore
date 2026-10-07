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
import { MusicMetadata, Label, MusicMetadataWithLabels, DOCUMENT_TYPES, GENRE_OPTIONS, SetlistEntry } from '../types';
import {
  saveCompleteMetadata,
  getMusicWithMetadata,
  getAllLabels,
  createOrGetLabel,
  getAllSetlists,
  getSetlistNamesForMusic,
  addSetlistEntryByName,
  metadataExists,
  getSetlistEntriesForMusicInSetlist
} from '../utils/database';
import ManageSetlistsModal from './ManageSetlistsModal'
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';
import Ionicons from '@expo/vector-icons/build/Ionicons';

type MetadataEditorProps = {
  formData: Omit<MusicMetadata, "id">;
  setFormData: React.Dispatch<
    React.SetStateAction<Omit<MusicMetadata, "id">>
  >;

  coverThumbnail: string | null;

  selectedLabels: string[];
  availableLabels: Label[];

  onToggleLabel: (name: string) => void;

  onAddLabel: () => void;

  onSelectGenre: () => void;

  onManageSetlists: () => void;
  canManageSetlists: boolean;
};

const MetadataEditor = ({
  formData,
  setFormData,
  coverThumbnail,
  selectedLabels,
  availableLabels,
  onToggleLabel,
  onAddLabel,
  onSelectGenre,
  onManageSetlists,
  canManageSetlists
}: MetadataEditorProps) => {
  const [showAllKeyOptions, setShowAllKeyOptions] =
    useState(false);

  const [showAllTimeOptions, setShowAllTimeOptions] =
    useState(false);

  const [showNewSetlistForm, setShowNewSetlistForm] =
    useState(false);

  const [newSetlistText, setNewSetlistText] =
    useState("");

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

  const handleAddSetlist = () => {
    const name = newSetlistText.trim();

    if (!name) return;

    setNewSetlistText("");
    setShowNewSetlistForm(false);
  };

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
          onPress={onSelectGenre}
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
          <Text className="text-base font-medium text-gray-800 mb-2">
            Setlists
          </Text>

          <TouchableOpacity
            onPress={onManageSetlists}
            disabled={!canManageSetlists}
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#D1D5DB",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              opacity: canManageSetlists
                ? 1
                : 0.5,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                Manage Setlists
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 3,
                }}
              >
                {canManageSetlists
                  ? "Manage full-score and excerpt occurrences"
                  : "Save this score before adding it to setlists"}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

      {/* Labels */}
      <View className="my-3">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-base font-medium text-gray-800">Labels</Text>

          <TouchableOpacity
            onPress={onAddLabel}
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
              onPress={() => onToggleLabel(label.name)}
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
  );
};

export default MetadataEditor;