import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { MusicItemWithAllData } from '../types'; // Adjust the import path as necessary
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';

type Props = {
  item: MusicItemWithAllData;
  onEditMetadata: (id: number, title: string, uri: string) => void;
  onDelete: (id: number | undefined) => void;
  onShare?: (id: number | undefined) => void;
  onOpen?: () => void;
  deleteTitle?: string;
  deleteMessage?: string;
};

const ACCENT_COLOR = "#2563EB";

function MusicMenuItem({
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? "#DC2626" : "#374151"}
          style={{ width: 28 }}
        />

        <Text
          style={{
            marginLeft: 10,
            fontSize: 16,
            color: destructive ? "#DC2626" : "#111827",
          }}
        >
          {label}
        </Text>
      </View>
    </MenuOption>
  );
}

const MusicItemCard: React.FC<Props> = ({
  item,
  onEditMetadata,
  onDelete,
  onShare,
  onOpen,
  deleteTitle,
  deleteMessage,
}) => {
  const [thumbnailUri, setThumbnailUri] = useState("");

  useEffect(() => {
    const loadDocumentData = async () => {
      if (!item.uri) return;

      try {
        const result = await AriaScorePdfRenderer.renderPage({
          pdfPath: item.uri,
          page: 1,
          width: 220,
          height: 300,
        });

        setThumbnailUri(result.uri);
      } catch (error) {
        console.error("Failed to load PDF thumbnail:", error);
      }
    };

    loadDocumentData();
  }, [item.uri]);

  const title = item.metadata?.title ?? item.title ?? "Untitled";
  const documentType = item.metadata?.document_type ?? "Score";

  const creator =
    documentType === "Single Work"
        ? item.metadata?.composer
        ? item.metadata?.arranger
            ? `${item.metadata.composer} (Arr. ${item.metadata.arranger})`
            : item.metadata.composer
        : item.metadata?.arranger
            ? `Arr. ${item.metadata.arranger}`
            : "Unknown composer"
        : item.metadata?.editor ||
        item.metadata?.publisher ||
        documentType;

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 14,
        // padding: 12,
        marginBottom: 12,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingVertical: 12,
      }}
      onPress={onOpen}
      activeOpacity={0.75}
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{
            width: 82,
            height: 108,
            resizeMode: "contain",
            backgroundColor: "#f3f4f6",
            marginRight: 14,
          }}
        />
      ) : (
        <View
          style={{
            width: 70,
            height: 92,
            backgroundColor: "#f3f4f6",
            marginRight: 14,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="document-outline" size={26} color="#9ca3af" />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2937" }}>
          {title}
        </Text>

        <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
          {creator}
        </Text>

        <Text style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          {documentType} · {item.metadata?.genre || "Uncategorised"} ·{" "}
          {item.metadata?.page_count || 0} pages
        </Text>

        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
        }}>
            {item.metadata?.genre ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                    <View
                        key={item.metadata?.genre}
                        style={{
                        backgroundColor: "#eaffe8",
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 6,
                        marginBottom: 4,
                        }}
                    >
                        <Text style={{ color: "#0b590e", fontSize: 12 }}>{item.metadata?.genre}</Text>
                    </View>
                </View>
                ) : null}

                {item.metadata?.labels?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                    {item.metadata.labels.slice(0, 3).map((label) => (
                    <View
                        key={label}
                        style={{
                        backgroundColor: "#F3E8FF",
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 6,
                        marginBottom: 4,
                        }}
                    >
                        <Text style={{ color: "#7E22CE", fontSize: 12 }}>{label}</Text>
                    </View>
                    ))}
                </View>
                ) : null}
        </View>
        
      </View>

      <Menu>
        <MenuTrigger style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="ellipsis-vertical" size={22} color="#777" />
        </MenuTrigger>

        <MenuOptions
          customStyles={{
            optionsContainer: {
              width: 220,
              borderRadius: 14,
              paddingVertical: 6,
              backgroundColor: "white",
              elevation: 10,
            },
          }}
        >
          <MusicMenuItem
            icon="open-outline"
            label="Open"
            onPress={() => onOpen?.()}
          />

          <MusicMenuItem
            icon="create-outline"
            label="Edit Details"
            onPress={() => {
              if (!item.id) return;
              onEditMetadata(item.id, title, item.uri);
            }}
          />

          <MusicMenuItem
            icon="share-outline"
            label="Share"
            onPress={() => onShare?.(item.id)}
          />

          <MusicMenuItem
            icon="trash-outline"
            label="Delete"
            destructive
            onPress={() => {
              Alert.alert(
                deleteTitle ?? `Delete "${title}"?`,
                deleteMessage ??
                  "This will permanently remove this score from your library.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(item.id),
                  },
                ]
              );
            }}
          />
        </MenuOptions>
      </Menu>
    </TouchableOpacity>
  );
};

export default MusicItemCard;