
import React from "react";

import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
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

import type { ReaderContext } from "../../types";

const { Popover } = renderers;

interface ScoreInformation {
  title?: string;
  document_type?: string;
  composer?: string;
  arranger?: string;
  editor?: string;
  publisher?: string;
  notes?: string;
  labels?: string[];
}

interface ReaderScoreInfoProps {
  score: ScoreInformation;

  context?: ReaderContext;

  totalPages: number;
  thumbnailUri?: string;

  accentColor: string;
  disabled?: boolean;

  onOpen?: () => void;
  onClose?: () => void;

  onEditMetadata: () => void;
}

const InfoSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>
      {title.toUpperCase()}
    </Text>

    {children}
  </View>
);

const MetadataRow = ({
  label,
  value,
}: {
  label: string;
  value?: string;
}) => {
  if (!value?.trim()) {
    return null;
  }

  return (
    <View style={styles.metadataRow}>
      <Text style={styles.metadataLabel}>
        {label}
      </Text>

      <Text style={styles.metadataValue}>
        {value}
      </Text>
    </View>
  );
};

const ReaderScoreInfo = ({
  score,
  context,
  totalPages,
  thumbnailUri,
  accentColor,
  disabled = false,

  onOpen,
  onClose,
  onEditMetadata,
}: ReaderScoreInfoProps) => {
  const { width, height } =
    useWindowDimensions();

  const compact = width < 600;

  const menuWidth = Math.min(
    380,
    width - 24
  );

  const title =
    score.title?.trim() || "Untitled";

  const activeEntry =
    context?.entries?.[
      context.currentIndex - 1
    ];

  const entryTitle =
    activeEntry?.entry_title?.trim();

  const hasExcerpt =
    activeEntry != null &&
    (
      activeEntry.start_page != null ||
      activeEntry.end_page != null
    );

  const setlistLabel = context
    ? `${context.setlistName} · Score ${context.currentIndex} of ${context.totalItems}`
    : undefined;

  const attribution =
    score.document_type === "Single Work"
      ? [
          score.composer,
          score.arranger &&
            `(Arr. ${score.arranger})`,
        ]
          .filter(Boolean)
          .join(" ")
      : score.editor || score.composer;

  const hasMetadata = [
    score.composer,
    score.arranger,
    score.editor,
    score.publisher,
  ].some((value) => Boolean(value?.trim()));

  const handleSelect = (
    action: "edit-metadata"
  ) => {
    if (action === "edit-metadata") {
      onEditMetadata();
    }
  };

  return (
    <View style={styles.wrapper}>
      <Menu
        style={styles.menu}
        renderer={Popover}
        rendererProps={{
          placement: "bottom",
          anchorStyle: {
            backgroundColor: "#FFFFFF",
          },
        }}
        onOpen={onOpen}
        onClose={onClose}
        onSelect={handleSelect}
      >

        {/* SCORE TITLE TRIGGER */}

        <MenuTrigger
          disabled={disabled}
          customStyles={{
            triggerWrapper: [
              styles.scoreTitle,
              disabled && {
                opacity: 0.65,
              },
            ],
          }}
        >
          <Text
            style={styles.toolbarTitle}
            numberOfLines={1}
          >
            {title}
          </Text>

          {!compact && setlistLabel && (
            <Text
              style={styles.toolbarSubtitle}
              numberOfLines={1}
            >
              {setlistLabel}
            </Text>
          )}
        </MenuTrigger>

        {/* SCORE INFORMATION POPOVER */}

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

            {/* HEADER */}

            <View style={styles.header}>
              <Text style={styles.heading}>
                Score Information
              </Text>

              <Ionicons
                name="information-circle-outline"
                size={23}
                color={accentColor}
              />
            </View>

            <ScrollView
              style={{
                maxHeight: Math.min(
                  620,
                  height * 0.65
                ),
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* SCORE SUMMARY */}

              <View style={styles.scoreSummary}>
                <View style={styles.thumbnail}>
                  {thumbnailUri ? (
                    <Image
                      source={{
                        uri: thumbnailUri,
                      }}
                      style={styles.thumbnailImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons
                      name="document-text-outline"
                      size={36}
                      color="#CBD5E1"
                    />
                  )}
                </View>

                <View style={styles.summaryDetails}>
                  <Text style={styles.scoreName}>
                    {title}
                  </Text>

                  {Boolean(attribution) && (
                    <Text style={styles.attribution}>
                      {attribution}
                    </Text>
                  )}

                  <Text style={styles.pageCount}>
                    {totalPages}{" "}
                    {totalPages === 1
                      ? "page"
                      : "pages"}
                  </Text>

                  {score.document_type && (
                    <View
                      style={[
                        styles.documentType,
                        {
                          backgroundColor:
                            `${accentColor}12`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.documentTypeText,
                          {
                            color: accentColor,
                          },
                        ]}
                      >
                        {score.document_type}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* BIBLIOGRAPHIC METADATA */}

              <InfoSection title="Metadata">
                {hasMetadata ? (
                  <>
                    <MetadataRow
                      label="Composer"
                      value={score.composer}
                    />

                    <MetadataRow
                      label="Arranger"
                      value={score.arranger}
                    />

                    <MetadataRow
                      label="Editor"
                      value={score.editor}
                    />

                    <MetadataRow
                      label="Publisher"
                      value={score.publisher}
                    />
                  </>
                ) : (
                  <Text style={styles.emptyText}>
                    No additional metadata.
                  </Text>
                )}
              </InfoSection>

              {/* CURRENT SETLIST */}

              {context && (
                <InfoSection title="Current Setlist">
                  <View style={styles.setlistRow}>
                    <Ionicons
                      name="list-outline"
                      size={24}
                      color={accentColor}
                    />

                    <View style={styles.details}>
                      <Text style={styles.setlistName}>
                        {context.setlistName}
                      </Text>

                      {entryTitle && (
                        <Text style={styles.entryTitle}>
                          {entryTitle}
                        </Text>
                      )}

                      <Text style={styles.subtitle}>
                        Score {context.currentIndex}{" "}
                        of {context.totalItems}
                      </Text>

                      <Text style={styles.subtitle}>
                        {hasExcerpt
                          ? `Pages ${
                              activeEntry?.start_page ?? 1
                            }–${
                              activeEntry?.end_page ??
                              totalPages
                            }`
                          : "Full score"}
                      </Text>
                    </View>
                  </View>
                </InfoSection>
              )}

              {/* LABELS */}

              <InfoSection title="Labels">
                {score.labels?.length ? (
                  <View style={styles.labels}>
                    {score.labels.map(
                      (label, index) => (
                        <View
                          key={`${label}-${index}`}
                          style={styles.labelChip}
                        >
                          <Text
                            style={styles.labelText}
                          >
                            {label}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>
                    No labels assigned.
                  </Text>
                )}
              </InfoSection>

              {/* NOTES */}

              <InfoSection title="Notes">
                <Text style={styles.notes}>
                  {score.notes?.trim() ||
                    "No notes yet."}
                </Text>
              </InfoSection>
            </ScrollView>

            {/* ACTIONS */}

            <View style={styles.actions}>
              <MenuOption
                value="edit-metadata"
                customStyles={{
                  optionWrapper: {
                    padding: 0,
                  },
                }}
              >
                <View style={styles.actionRow}>
                  <Ionicons
                    name="create-outline"
                    size={23}
                    color={accentColor}
                  />

                  <Text
                    style={[
                      styles.actionLabel,
                      {
                        color: accentColor,
                      },
                    ]}
                  >
                    Edit Metadata
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#94A3B8"
                  />
                </View>
              </MenuOption>
            </View>
          </View>
        </MenuOptions>
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 0,
  },

  menu: {
    width: "100%",
    minWidth: 0,
  },

  scoreTitle: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,

    paddingHorizontal: 8,
    paddingVertical: 6,

    alignItems: "center",
    justifyContent: "center",
  },

  toolbarTitle: {
    maxWidth: "100%",
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },

  toolbarSubtitle: {
    maxWidth: "100%",
    fontSize: 12,
    color: "#666",
  },

  container: {
    padding: 14,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
  },

  scoreSummary: {
    flexDirection: "row",
    alignItems: "flex-start",

    paddingVertical: 16,
    gap: 14,
  },

  thumbnail: {
    width: 85,
    height: 118,

    backgroundColor: "#F8FAFC",

    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,

    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
  },

  thumbnailImage: {
    width: "100%",
    height: "100%",
  },

  summaryDetails: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  scoreName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  attribution: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },

  pageCount: {
    fontSize: 13,
    color: "#64748B",
  },

  documentType: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 3,
  },

  documentTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  section: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: "#64748B",
  },

  metadataRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  metadataLabel: {
    width: 82,
    fontSize: 13,
    color: "#64748B",
  },

  metadataValue: {
    flex: 1,
    fontSize: 13,
    color: "#222",
    fontWeight: "500",
    textAlign: "right",
  },

  setlistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  details: {
    flex: 1,
    minWidth: 0,
  },

  setlistName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },

  entryTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
    marginTop: 3,
  },

  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  labelChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },

  labelText: {
    fontSize: 12,
    color: "#475569",
  },

  notes: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },

  emptyText: {
    fontSize: 13,
    color: "#888",
  },

  actions: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",

    minHeight: 44,
    paddingHorizontal: 4,
    gap: 10,
  },

  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ReaderScoreInfo;
