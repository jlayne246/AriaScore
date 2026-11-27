
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { Image } from "expo-image";
import Slider from "@react-native-community/slider";
import type { Bookmark } from "../../types";
import { Ionicons } from "@expo/vector-icons";

import {useAppTheme} from "../../utils/theme/useAppTheme";
import { ThemeColors } from "../../utils/theme/types";

export interface ReaderPageSliderProps {
  currentPage: number;
  totalPages: number;

  minimumPage?: number;
  maximumPage?: number;


  thumbnails: Record<number, string>;
  bookmarks?: Bookmark[];

  onRequestThumbnail: (
    page: number
  ) => void | Promise<void>;

  onPageChange: (page: number) => void;

  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const PREVIEW_DELAY = 200;
const THUMBNAIL_DEBOUNCE = 100;
const PREVIEW_WIDTH = 120;

const ReaderPageSlider = ({
  currentPage,
  totalPages,

  minimumPage = 1,
  maximumPage = totalPages,


  bookmarks = [],

  thumbnails,
  onRequestThumbnail,
  onPageChange,

  onInteractionStart,
  onInteractionEnd,
}: ReaderPageSliderProps) => {
  const [scrubbing, setScrubbing] =
    useState(false);

  const [scrubPage, setScrubPage] =
    useState(currentPage);

  const [previewVisible, setPreviewVisible] =
    useState(false);

  const [trackWidth, setTrackWidth] =
    useState(0);

  const scrubbingRef = useRef(false);

  const {colors} = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors),
    [colors]
  );

  const holdTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const displayedPage = scrubbing
    ? scrubPage
    : currentPage;

  const clearHoldTimer = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, []);

  useEffect(() => {
    if (!scrubbing) {
      setScrubPage(currentPage);
    }
  }, [currentPage, scrubbing]);

  // Request a thumbnail once the preview is visible.
  // Debounce requests during rapid scrubbing.
  useEffect(() => {
    if (
      !previewVisible ||
      !scrubbing ||
      thumbnails[scrubPage]
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      void onRequestThumbnail(scrubPage);
    }, THUMBNAIL_DEBOUNCE);

    return () => clearTimeout(timeout);
  }, [
    previewVisible,
    scrubbing,
    scrubPage,
    thumbnails,
    onRequestThumbnail,
  ]);

  const handleSlidingStart = (value: number) => {
    clearHoldTimer();

    scrubbingRef.current = true;

    setScrubbing(true);
    setScrubPage(Math.round(value));
    setPreviewVisible(false);

    onInteractionStart?.();

    holdTimer.current = setTimeout(() => {
      if (scrubbingRef.current) {
        setPreviewVisible(true);
      }

      holdTimer.current = null;
    }, PREVIEW_DELAY);
  };

  const handleValueChange = (value: number) => {
    if (!scrubbingRef.current) {
      return;
    }

    setScrubPage(Math.round(value));
  };

  const handleSlidingComplete = (value: number) => {
    clearHoldTimer();

    scrubbingRef.current = false;

    const page = Math.max(
      minimumPage,
      Math.min(maximumPage, Math.round(value))
    );

    setScrubPage(page);
    setPreviewVisible(false);
    setScrubbing(false);

    onPageChange(page);
    onInteractionEnd?.();
  };

  const pageRange = maximumPage - minimumPage;

    const TRACK_INSET = 16;

    const getPagePosition = (page: number) => {
    const progress =
        pageRange > 0
        ? (page - minimumPage) / pageRange
        : 0;

    const clampedProgress = Math.max(
        0,
        Math.min(1, progress)
    );

    const usableWidth = Math.max(
        0,
        trackWidth - TRACK_INSET * 2
    );

    return TRACK_INSET +
        clampedProgress * usableWidth;
    };

    const thumbPosition =
    getPagePosition(displayedPage);

    const previewLeft = Math.max(
        0,
        Math.min(
            Math.max(0, trackWidth - PREVIEW_WIDTH),
            thumbPosition - PREVIEW_WIDTH / 2
        )
    );

  const visibleBookmarks = bookmarks.filter(
    (bookmark) =>
        bookmark.page_number >= minimumPage &&
        bookmark.page_number <= maximumPage
    );

    const bookmarkedPages = Array.from(
    new Set(
        visibleBookmarks.map(
        (bookmark) => bookmark.page_number
        )
    )
    );

    const activeBookmarks = visibleBookmarks.filter(
    (bookmark) =>
        bookmark.page_number === displayedPage
    );

  const thumbnailUri =
    thumbnails[displayedPage];

  return (
    <View
      style={styles.container}
    >
      <View
        style={styles.trackContainer}
        onLayout={(event) => {
          setTrackWidth(
            event.nativeEvent.layout.width
          );
        }}
      >
        {previewVisible && (
          <View
            pointerEvents="none"
            style={[
              styles.preview,
              {
                left: previewLeft,
                width: PREVIEW_WIDTH,
              },
            ]}
          >
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.thumbnail}
                contentFit="contain"
                recyclingKey={`${displayedPage}`}
                transition={0}
              />
            ) : (
              <View style={styles.thumbnailLoading}>
                <ActivityIndicator
                  color={colors.accent}
                />
              </View>
            )}

            <Text style={styles.previewLabel}>
              Page {displayedPage}
            </Text>

            {activeBookmarks.length > 0 && (
                <View style={styles.previewBookmarks}>
                    {activeBookmarks.slice(0, 2).map(
                    (bookmark, index) => (
                        <View
                        key={index}
                        style={styles.bookmarkLabelRow}
                        >
                        <Ionicons
                            name="bookmark"
                            size={12}
                            color={colors.bookmark}
                        />

                        <Text
                            style={styles.bookmarkLabel}
                            numberOfLines={2}
                        >
                            {bookmark.label || "Bookmark"}
                        </Text>
                        </View>
                    )
                    )}

                    {activeBookmarks.length > 2 && (
                    <Text style={styles.additionalBookmarks}>
                        +{activeBookmarks.length - 2} more
                    </Text>
                    )}
                </View>
                )}
          </View>
        )}

        <Slider
          style={styles.slider}
          minimumValue={minimumPage}
          maximumValue={Math.max(
            minimumPage + 1,
            maximumPage
          )}
          step={1}

          value={currentPage}

          disabled={pageRange <= 0}

          minimumTrackTintColor={colors.trackActive}
          maximumTrackTintColor={colors.trackInactive}
          thumbTintColor={pageRange > 0 ? colors.accent : colors.thumbInactive}

          onSlidingStart={handleSlidingStart}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}

          accessibilityLabel="Page navigation"
          accessibilityValue={{
            min: minimumPage,
            max: maximumPage,
            now: displayedPage,
          }}
        />

        {trackWidth > 0 && (
            <View
                pointerEvents="none"
                style={styles.bookmarkTrack}
            >
                {bookmarkedPages.map((page) => (
                <View
                    key={page}
                    style={[
                    styles.bookmarkMarker,
                    {
                        left: getPagePosition(page) - 2,
                    },
                    page === displayedPage &&
                        styles.activeBookmarkMarker,
                    ]}
                />
                ))}
            </View>
            )}
      </View>

      <View style={styles.labels}>
        <Text style={styles.endpoint}>
          {minimumPage}
        </Text>

        <Text style={styles.pageLabel}>
          {displayedPage} of {totalPages}
        </Text>

        <Text style={styles.endpoint}>
          {maximumPage}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    width: '100%'
  },

  trackContainer: {
    position: "relative",
    overflow: "visible",
  },

  bookmarkTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    },

    bookmarkMarker: {
    position: "absolute",
    top: 3,

    width: 4,
    height: 8,

    borderRadius: 2,
    backgroundColor: colors.bookmark,
    },

    activeBookmarkMarker: {
    backgroundColor: colors.bookmarkActive,
    height: 10,
    },

  slider: {
    width: "100%",
    height: 36,
  },

  labels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 12,
  },

  endpoint: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  pageLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.secondaryText,
    fontVariant: ["tabular-nums"],
  },

  preview: {
    position: "absolute",

    bottom: 46,
    zIndex: 10,

    backgroundColor: colors.elevated,

    padding: 8,

    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,

    elevation: 8,

    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  thumbnail: {
    width: "100%",
    height: 146,
  },

  thumbnailLoading: {
    height: 146,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.surface,
  },

  previewLabel: {
    marginTop: 6,

    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: colors.secondaryText,
  },

  previewBookmarks: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    gap: 4,
    },

    bookmarkLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    },

    bookmarkLabel: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "500",
    color: colors.bookmark,
    textAlign: "center",
    },

    additionalBookmarks: {
    fontSize: 10,
    color: colors.secondaryText,
    textAlign: "center",
    },
});

export default ReaderPageSlider;
