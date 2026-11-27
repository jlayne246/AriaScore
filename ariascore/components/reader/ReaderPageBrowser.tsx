
import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

const THUMB_WIDTH = 100;
const THUMB_HEIGHT = 140;
const ITEM_WIDTH = 120;
const ROW_HEIGHT = 184;
const COLUMN_GAP = 12;

interface ReaderPageBrowserProps {

  currentPage: number;
  totalPages: number;

  minimumPage: number;
  maximumPage: number;

  thumbnailImages: Record<number, string>;

  bookmarkedPages: ReadonlySet<number>;

  onClose: () => void;
  onSelectPage: (page: number) => void;

  onVisiblePagesChanged: (
    pages: number[]
  ) => void;
}

interface ThumbnailItemProps {
  pageNumber: number;
  uri?: string;

  isCurrentPage: boolean;
  isBookmarked: boolean;


  onPress: (page: number) => void;
}

const ThumbnailItem = React.memo(
  function ThumbnailItem({
    pageNumber,
    uri,
    isCurrentPage,
    isBookmarked,
    onPress,
  }: ThumbnailItemProps) {
    const {colors} = useAppTheme();
    const styles = useMemo(
      () => createStyles(colors),
      [colors]
    );

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onPress(pageNumber)}
        accessibilityRole="button"
        accessibilityLabel={
          `Page ${pageNumber}` +
          (isBookmarked ? ", bookmarked" : "")
        }
        accessibilityState={{
          selected: isCurrentPage,
        }}
        style={styles.thumbnailItem}
      >
        <View
          style={[
            styles.thumbnailFrame,
            uri && styles.thumbnailPaper,
            isCurrentPage && {
              borderColor: colors.accent,
              borderWidth: 3,
            },
          ]}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.thumbnailImage}
              resizeMode="contain"
            />
          ) : (
            <ActivityIndicator
              size="small"
              color={colors.accent}
            />
          )}

          {isBookmarked && (
            <View style={styles.bookmarkMarker}>
              <Ionicons
                name="bookmark"
                size={22}
                color={uri ? colors.bookmarkOnPaper : colors.bookmark}
              />
            </View>
          )}
        </View>

        <Text
          style={[
            styles.pageLabel,
            isCurrentPage && {
              color: colors.accent,
              fontWeight: "700",
            },
          ]}
        >
          {pageNumber}
        </Text>
      </TouchableOpacity>
    );
  }
);

const ReaderPageBrowser = ({

  currentPage,
  totalPages,

  minimumPage,
  maximumPage,

  thumbnailImages,
  bookmarkedPages,

  onClose,
  onSelectPage,
  onVisiblePagesChanged,
}: ReaderPageBrowserProps) => {
  const { width, height } =
    useWindowDimensions();

  const {colors} = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const [pageInput, setPageInput] =
    useState(String(currentPage));

  const listRef =
    useRef<FlatList<number>>(null);

  const viewportCallbackRef =
    useRef(onVisiblePagesChanged);

  viewportCallbackRef.current =
    onVisiblePagesChanged;

  const dialogWidth = Math.min(
    width - 32,
    width * (width < 600 ? 0.94 : 0.74),
    820
  );

  const dialogHeight = height * 0.82;

  const columns = Math.max(
    1,
    Math.min(
      5,
      Math.floor(
        (
          dialogWidth -
          36 +
          COLUMN_GAP
        ) /
        (ITEM_WIDTH + COLUMN_GAP)
      )
    )
  );

  const pages = useMemo(
    () =>
      Array.from(
        {
          length: Math.max(
            0,
            maximumPage - minimumPage + 1
          ),
        },
        (_, index) => minimumPage + index
      ),
    [minimumPage, maximumPage]
  );

  const targetPage = Number(pageInput);

  const validPage =
    /^\d+$/.test(pageInput) &&
    Number.isSafeInteger(targetPage) &&
    targetPage >= minimumPage &&
    targetPage <= maximumPage;

  const hasExcerpt =
    minimumPage > 1 ||
    maximumPage < totalPages;

  const initialRow = Math.max(
    0,
    Math.floor(
      (currentPage - minimumPage) /
        columns
    )
  );

  const handleSubmit = () => {
    if (!validPage) return;

    onSelectPage(targetPage);
  };

  const handleViewableItemsChanged =
    useRef(
      ({
        viewableItems,
      }: {
        viewableItems: Array<{
          item: number;
        }>;
      }) => {
        const visiblePages =
          viewableItems
            .map(({ item }) => item)
            .filter(
              (page): page is number =>
                typeof page === "number"
            );

        if (visiblePages.length > 0) {
          viewportCallbackRef.current(
            visiblePages
          );
        }
      }
    ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
  }).current;

  const renderItem = useCallback(
    ({ item: page }: { item: number }) => (
      <ThumbnailItem
        pageNumber={page}
        uri={thumbnailImages[page]}

        isCurrentPage={
          page === currentPage
        }

        isBookmarked={
          bookmarkedPages.has(page)
        }

        onPress={onSelectPage}
      />
    ),
    [
      thumbnailImages,
      currentPage,
      bookmarkedPages,
      onSelectPage,
    ]
  );

  const scrollToCurrentPage = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: initialRow * ROW_HEIGHT,
        animated: false,
      });
    });
  };

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.dialog,
          {
            width: dialogWidth,
            height: dialogHeight,
          },
        ]}
      >

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerDetails}>
            <Text style={styles.heading}>
              Browse Pages
            </Text>

            <Text style={styles.subtitle}>
              {hasExcerpt
                ? `Pages ${minimumPage}–${maximumPage}`
                : `${totalPages} pages`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close page browser"
          >
            <Ionicons
              name="close"
              size={28}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        {/* NUMERICAL PAGE INPUT */}

        <View style={styles.navigationRow}>
          <Text style={styles.currentPage}>
            Current: {currentPage}
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholderTextColor={colors.tertiaryText}
              style={[
                styles.pageInput,
                pageInput.length > 0 &&
                  !validPage &&
                  styles.invalidInput,
              ]}
              value={pageInput}
              onChangeText={(value) =>
                setPageInput(
                  value.replace(/[^0-9]/g, "")
                )
              }
              keyboardType="number-pad"
              selectTextOnFocus
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Page number"
            />

            <Text style={styles.totalPages}>
              / {totalPages}
            </Text>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!validPage}
              style={[
                styles.goButton,
                {
                  backgroundColor: colors.accent,
                  opacity: validPage ? 1 : 0.45,
                },
              ]}
            >
              <Text style={styles.goLabel}>
                Go
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {pageInput.length > 0 &&
          !validPage && (
            <Text style={styles.error}>
              Enter a page between{" "}
              {minimumPage} and{" "}
              {maximumPage}.
            </Text>
          )}

        <View style={styles.divider} />

        {/* THUMBNAIL GRID */}

        <FlatList
          key={`page-grid-${columns}`}
          ref={listRef}

          data={pages}
          numColumns={columns}

          keyExtractor={(page) =>
            String(page)
          }

          initialNumToRender={columns * 3}
          maxToRenderPerBatch={columns * 3}
          windowSize={5}

          removeClippedSubviews

          onLayout={scrollToCurrentPage}

          getItemLayout={(_, index) => ({
            length: ROW_HEIGHT,
            offset: ROW_HEIGHT * index,
            index,
          })}

          onViewableItemsChanged={
            handleViewableItemsChanged
          }

          viewabilityConfig={
            viewabilityConfig
          }

          renderItem={renderItem}

          contentContainerStyle={
            styles.gridContent
          }

          columnWrapperStyle={
            columns > 1
              ? styles.gridRow
              : undefined
          }

          keyboardShouldPersistTaps="handled"

          showsVerticalScrollIndicator
        />
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    position: "absolute",

    top: 0,
    bottom: 0,
    left: 0,
    right: 0,

    zIndex: 2200,

    backgroundColor:
      colors.readerOverlay,

    alignItems: "center",
    justifyContent: "center",
  },

  dialog: {
    backgroundColor: colors.elevated,
    borderRadius: 18,

    padding: 18,

    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 14,
    gap: 10,
  },

  headerDetails: {
    flex: 1,
    minWidth: 0,
  },

  heading: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 3,
  },

  closeButton: {
    width: 40,
    height: 40,

    alignItems: "center",
    justifyContent: "center",
  },

  navigationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",

    gap: 10,
    marginBottom: 12,
  },

  currentPage: {
    fontSize: 13,
    color: colors.secondaryText,
  },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  pageInput: {
    width: 74,
    height: 42,

    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,

    backgroundColor: colors.surface,

    paddingHorizontal: 10,

    fontSize: 17,
    fontWeight: "500",
    color: colors.text,

    fontVariant: ["tabular-nums"],
  },

  invalidInput: {
    borderColor: colors.danger,
  },

  totalPages: {
    fontSize: 14,
    color: colors.secondaryText,
  },

  goButton: {
    height: 42,

    paddingHorizontal: 16,
    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",
  },

  goLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onAccent,
  },

  divider: {
    height: 1,
    backgroundColor: colors.separator,
    marginBottom: 12,
  },

  gridContent: {
    alignItems: "center",
  },

  gridRow: {
    justifyContent: "center",
    gap: COLUMN_GAP,
  },

  thumbnailItem: {
    width: ITEM_WIDTH,
    height: ROW_HEIGHT,

    alignItems: "center",
  },

  thumbnailFrame: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,

    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,

    backgroundColor: colors.surface,

    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
  },

  thumbnailPaper: {
    backgroundColor: "#F8FAFC",
  },

  thumbnailImage: {
    width: "100%",
    height: "100%",
  },

  bookmarkMarker: {
    position: "absolute",
    top: -2,
    right: 4,
  },

  pageLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.secondaryText,
    marginTop: 8,
  },

  error: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
  },
});

export default ReaderPageBrowser;
