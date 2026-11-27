import { useAppTheme } from "../utils/theme/useAppTheme";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  MusicItemWithAllData,
  RootStackParamList,
  SetlistEntry,
} from "../types";

import AriaScorePdfRenderer
  from "../native/AriaScorePdfRenderer";

type Props = {
  item: MusicItemWithAllData;

  onDelete:
    (id: number | undefined) => void;

  onShare?:
    (id: number | undefined) => void;

  onOpen?: () => void;

  deleteTitle?: string;
  deleteMessage?: string;

  displayTitle?: string;
  displaySubtitle?: string;
  displayPageCount?: number | null;
};


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
  const { colors } = useAppTheme();
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
          color={destructive ? colors.danger : colors.text}
          style={{ width: 28 }}
        />

        <Text
          style={{
            marginLeft: 10,
            fontSize: 16,
            color: destructive ? colors.danger : colors.text,
          }}
        >
          {label}
        </Text>
      </View>
    </MenuOption>
  );
}

type NavigationProp =
  NativeStackNavigationProp<
    RootStackParamList
  >;

const MusicItemCard: React.FC<Props> = ({
  item,
  onDelete,
  onShare,
  onOpen,
  deleteTitle,
  deleteMessage,
  displayTitle,
  displaySubtitle,
  displayPageCount,
}) => {
  const { colors } = useAppTheme();
  const navigation =
    useNavigation<NavigationProp>();

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

  const metadata = item.metadata;

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

  const sourceTitle =
    metadata?.title?.trim() ||
    item.title?.trim() ||
    "Untitled Score";

  const resolvedTitle =
    displayTitle?.trim() ||
    sourceTitle;

  const defaultSubtitle =
    creator.trim();

  const resolvedSubtitle =
    displaySubtitle !== undefined
      ? displaySubtitle
      : defaultSubtitle;

  const resolvedPageCount =
    displayPageCount !== undefined
      ? displayPageCount
      : metadata?.page_count;

  const detailParts = [
    metadata?.document_type,
    metadata?.genre,
    resolvedPageCount != null
      ? `${resolvedPageCount} pages`
      : null,
  ].filter(Boolean);
  // const title = item.metadata?.title ?? item.title ?? "Untitled";

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        backgroundColor: colors.background,
        borderRadius: 14,
        // padding: 12,
        marginBottom: 12,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
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
            backgroundColor: colors.surfaceSecondary,
            marginRight: 14,
          }}
        />
      ) : (
        <View
          style={{
            width: 70,
            height: 92,
            backgroundColor: colors.surfaceSecondary,
            marginRight: 14,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="document-outline" size={26} color={colors.tertiaryText} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
          {resolvedTitle}
        </Text>

        {!!resolvedSubtitle && (
          <Text style={{ fontSize: 14, color: colors.secondaryText, marginTop: 4 }}>
            {resolvedSubtitle}
          </Text>
        )}

        <Text style={{ fontSize: 13, color: colors.secondaryText, marginTop: 4 }}>
          {detailParts.join(" • ")}
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
                        backgroundColor: colors.genreBackground,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 6,
                        marginBottom: 4,
                        }}
                    >
                        <Text style={{ color: colors.genreText, fontSize: 12 }}>{item.metadata?.genre}</Text>
                    </View>
                </View>
                ) : null}

                {item.metadata?.labels?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                    {item.metadata.labels.slice(0, 3).map((label) => (
                    <View
                        key={label}
                        style={{
                        backgroundColor: colors.labelBackground,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        marginRight: 6,
                        marginBottom: 4,
                        }}
                    >
                        <Text style={{ color: colors.labelText, fontSize: 12 }}>{label}</Text>
                    </View>
                    ))}
                </View>
                ) : null}
        </View>
        
      </View>

      <Menu>
        <MenuTrigger style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.secondaryText} />
        </MenuTrigger>

        <MenuOptions
          customStyles={{
            optionsContainer: {
              width: 220,
              borderRadius: 14,
              paddingVertical: 6,
              backgroundColor: colors.elevated,
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
              if (item.id == null || !item.uri) {
                return;
              }

              navigation.navigate("Metadata", {
                mode: "edit",
                musicId: item.id,
                pdfUri: item.uri,
              });
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
                deleteTitle ?? `Delete "${resolvedTitle}"?`,
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