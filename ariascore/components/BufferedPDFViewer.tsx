import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { runOnJS } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  PixelRatio,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppState, AppStateStatus } from "react-native";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import PagerView from 'react-native-pager-view';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from "expo-keep-awake";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';
import {
  addBookmark,
  removeBookmark,
  isBookmarked,
  getBookmarksForScore,
} from '../utils/database';
import { Ionicons } from '@expo/vector-icons';
import {
  Bookmark,
  MetadataFormData,
  // qualityConfig,
  qualityScaleMap,
  ReaderContext,
  RootStackParamList,
  ScoreMetadata,
} from '../types';
import ManageSetlistsModal from './ManageSetlistsModal';
import MetadataForm from './MetadataForm';
import { saveSetlistProgress } from "../utils/database";
import { ReaderSettings } from '../utils/settings/types';
import * as ScreenOrientation from "expo-screen-orientation";
import {
  getTapZoneRatio,
  resolveTapAction,
} from "../utils/readerGestures";

interface BufferedPDFViewerProps {
  uri: string;
  musicId: number;

  score: ScoreMetadata;

  context?: ReaderContext;

  onMetadataUpdated?: (formData: MetadataFormData) => void;

  onPreviousScore?: () => void;
  onNextScore?: () => void;
  onPreviousScoreFromPageTurn?: () => void;
  onNextScoreFromPageTurn?: () => void;

  onPageChange?: () => void;

  initialPage?: number;

  settings: ReaderSettings;
}

const ACCENT_COLOR = '#2563EB';

const THUMB_COLUMNS = 4;
const THUMB_ITEM_WIDTH = 120;
const THUMB_ROW_HEIGHT = 180;

const TOP_CHROME_HEIGHT = 112;

const SWIPE_DISTANCE_THRESHOLD = 45;
const SWIPE_VELOCITY_THRESHOLD = 450;
const SWIPE_VERTICAL_TOLERANCE = 35;

type DisplayMode =
  | "single"
  | "double";

type PageImage = {
  uri: string;
  width: number;
  height: number;
  aspectRatio: number;
};

const getBuffer = (mode: DisplayMode) => {
  if (mode === "double") {
    return {
      behind: 4,
      ahead: 6,
    };
  }

  return {
    behind: 2,
    ahead: 4,
  };
};

function RenderedPage({
  image,
  pageNumber,
}: {
  image?: PageImage;
  pageNumber: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image ? (
        <View
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ExpoImage
            source={{ uri: image.uri }}
            contentFit="contain"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        </View>
      ) : (
        <View style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
          <ActivityIndicator />
          <Text style={{ color: ACCENT_COLOR }}>
            Rendering page {pageNumber}…
          </Text>
        </View>
      )}
    </View>
  );
}

  function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: '#666', fontSize: 15 }}>
        {label}
      </Text>

      <Text style={{ fontWeight: '600', fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
        marginTop: 12,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#777',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>

      {children}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
      }}
      onPress={onPress}
    >
      <Ionicons name={icon} size={19} color={ACCENT_COLOR} />
      <Text style={{ fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function OverflowMenuItem({
  icon,
  label,
  sublabel,
  onPress,
  accent = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <MenuOption onSelect={onPress}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: sublabel ? 10 : 12,
      }}>
        <Ionicons
          name={icon}
          size={20}
          color={accent ? ACCENT_COLOR : "#374151"}
          style={{ width: 28 }}
        />

        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{
            fontSize: 16,
            color: accent ? ACCENT_COLOR : "#111827",
            fontWeight: accent ? "700" : "400",
          }}>
            {label}
          </Text>

          {sublabel && (
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {sublabel}
            </Text>
          )}
        </View>
      </View>
    </MenuOption>
  );
}

function OverflowMenuDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: "#E5E7EB",
        marginVertical: 4,
        marginHorizontal: 14,
      }}
    />
  );
}

const BufferedPDFViewer = ({ uri, musicId, score, context, initialPage, settings, onMetadataUpdated, onNextScore, onPreviousScore, onNextScoreFromPageTurn, onPreviousScoreFromPageTurn }: BufferedPDFViewerProps) => {
  const pagerRef = useRef<PagerView>(null);
  const renderingPages = useRef<Set<number>>(new Set());

  const pageImagesRef = useRef<Record<number, PageImage>>({});
  const [pageImages, setPageImages] = useState<Record<number, PageImage>>({});
  const renderingThumbnails = useRef<Set<number>>(new Set());
  const thumbnailBatchCancelled = useRef(false);
  const thumbnailListRef = useRef<FlatList<number>>(null);
  const changingScoreRef = useRef(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [thumbnailImages, setThumbnailImages] =
    useState<Record<number, string>>({});
  const thumbnailImagesRef =
    useRef<Record<number, string>>({});
  const [jumpOverlayVisible, setJumpOverlayVisible] = useState(false);
  const [jumpPage, setJumpPage] = useState('');
  const [displayMode, setDisplayMode] =
    useState<DisplayMode>(settings.viewMode as DisplayMode);

  const [coverOffset, setCoverOffset] =
    useState(settings.coverOffset);
  const [chromeVisible, setChromeVisible] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const chromeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readerReady, setReaderReady] = useState(false);
  const [initialPagerIndex, setInitialPagerIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarksOverlayVisible, setBookmarksOverlayVisible] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] =
    useState('');

  const [labelOverlayVisible, setLabelOverlayVisible] =
    useState(false);
  const [scoreInfoVisible, setScoreInfoVisible] = useState(false);
  const [metadataFormVisible, setMetadataFormVisible] = useState(false);
  const [manageSetlistsVisible, setManageSetlistsVisible] = useState(false);

  const [displayOptionsVisible, setDisplayOptionsVisible] = useState(false);

  type OrientationLockMode = "auto" | "portrait" | "landscape";

  const [orientationLock, setOrientationLock] =
    useState<OrientationLockMode>("auto");

  const [performanceModeOverride, setPerformanceModeOverride] =
  useState<boolean | null>(null);

  const effectivePerformanceMode =
    performanceModeOverride ?? settings.performanceMode;

  const insets = useSafeAreaInsets();

  // const effectiveAutoHideControls =
  // effectivePerformanceMode ? true : settings.autoHideControls;

  // const effectiveTapZones =
  //   effectivePerformanceMode ? true : settings.tapZones;

  // const effectiveFacialGestures =
  //   effectivePerformanceMode ? settings.facialGestures : false;

  const effectiveSettings = useMemo(() => {
    if (!effectivePerformanceMode) {
      return settings;
    }

    return {
      ...settings,

      autoHideControls: true,
      tapZones: true,
      keepScreenAwake: true,
      resumeLastPage: settings.resumeLastPage,
      pageRenderQuality:
        effectivePerformanceMode
            ? "high"
            : settings.pageRenderQuality,

      // Leave these alone
      facialGestures: settings.facialGestures,
      swipeNavigation: settings.swipeNavigation,
      pageAnimation: settings.pageAnimation,

      // anything else you want Performance Mode to force
    };
  }, [settings, effectivePerformanceMode]);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const zoneRatio = getTapZoneRatio({
    isLandscape,
    isPerformanceMode: effectivePerformanceMode,
  });

  

  

  const edgeZoneWidth = width * zoneRatio;

  const qualityScale =
    qualityScaleMap[effectiveSettings.pageRenderQuality];

  const effectiveDisplayMode: DisplayMode =
    isLandscape ? displayMode : 'single';

  const performanceModeClosingRef = useRef(false);

  // const [coverOffset, setCoverOffset] = useState(false);

  const pageStep =
    effectiveDisplayMode === 'double' ? 2 : 1;

  type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<NavigationProp>();

  const pagerPageCount =
  effectiveDisplayMode === 'double'
    ? coverOffset
      ? 1 + Math.ceil((totalPages - 1) / 2)
      : Math.ceil(totalPages / 2)
    : totalPages;

  const thumbnailPages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  const canUseTapZones =
    !jumpOverlayVisible &&
    !bookmarksOverlayVisible &&
    !labelOverlayVisible &&
    !scoreInfoVisible &&
    effectiveSettings.tapZones &&
    !displayOptionsVisible &&
    totalPages > 0 &&
    currentPage >= 1 &&
    currentPage <= totalPages;

  const canUseReaderGestures =
    readerReady &&
    !jumpOverlayVisible &&
    !bookmarksOverlayVisible &&
    !labelOverlayVisible &&
    !scoreInfoVisible &&
    !metadataFormVisible &&
    !manageSetlistsVisible &&
    !displayOptionsVisible;

  const PAGE_ASPECT_RATIO = 1.414;

  const qualityConfig = {
    standard: { scale: 1.0, maxWidth: 2200, minWidth: 1600 },
    high: { scale: 1.25, maxWidth: 3000, minWidth: 2200 },
    ultra: { scale: 1.5, maxWidth: 3800, minWidth: 2800 },
  } as const;

  const getRenderSize = (
    widthDp: number,
    heightDp: number,
    quality: ReaderSettings["pageRenderQuality"]
  ) => {
    const config = qualityConfig[quality];

    const pixelRatio = PixelRatio.get();
    const longSidePx = Math.max(widthDp, heightDp) * PixelRatio.get();

    const renderHeight = Math.min(
      Math.max(Math.round(longSidePx * config.scale), config.minWidth),
      config.maxWidth
    );

    const renderWidth = Math.round(renderHeight / PAGE_ASPECT_RATIO);

    return {
      width: renderWidth,
      height: renderHeight,
    };
  };

  const renderSize = useMemo(
    () => getRenderSize(width, height, effectiveSettings.pageRenderQuality),
    [width, height, effectiveSettings.pageRenderQuality]
  );

  const initialThumbnailIndex =
  Math.floor((currentPage - 1) / THUMB_COLUMNS) * THUMB_COLUMNS;

  console.log("BufferedPDFViewer onNextScore exists:", !!onNextScore);
  console.log("BufferedPDFViewer context:", context);
  // const buffer = getBuffer(effectiveDisplayMode);


  const saveCurrentSetlistProgress = useCallback(async () => {
    if (!context?.setlistId || !musicId) return;

    await saveSetlistProgress(
      context.setlistId,
      musicId,
      currentPage
    );
  }, [context?.setlistId, musicId, currentPage]);

  const getPagerIndexForPage = useCallback(
    (page: number) => {
      if (effectiveDisplayMode === 'single') return page - 1;
      if (coverOffset) return page <= 1 ? 0 : Math.ceil((page - 1) / 2);
      return Math.floor((page - 1) / 2);
    },
    [effectiveDisplayMode, coverOffset]
  );

  const renderPage = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages) return;
      if (pageImagesRef.current[page]) return;
      if (renderingPages.current.has(page)) return;

      renderingPages.current.add(page);

      try {
        const start = performance.now();

        const result = await AriaScorePdfRenderer.renderPage({
          pdfPath: uri,
          page,
          width: renderSize.width,
          height: renderSize.height,
        });

        console.log({
          screenWidth: width,
          screenHeight: height,
          pixelRatio: PixelRatio.get(),
          renderSize,
          resultWidth: result.width,
          resultHeight: result.height,
        });

        console.log(
          `Rendered page ${page} in ${Math.round(performance.now() - start)}ms`
        );

        pageImagesRef.current = {
          ...pageImagesRef.current,
          [page]: {
            uri: result.uri,
            width: result.width,
            height: result.height,
            aspectRatio: result.aspectRatio,
          }
        };

        setPageImages(pageImagesRef.current);
      } catch (error) {
        console.error(`Failed to render page ${page}`, error);
      } finally {
        renderingPages.current.delete(page);
      }
    },
    [uri, totalPages, renderSize]
  );

  const renderThumbnail = useCallback(
    async (page: number) => {
      if (page < 1 || page > totalPages) return;
      if (thumbnailImagesRef.current[page]) return;
      if (renderingThumbnails.current.has(page)) return;

      renderingThumbnails.current.add(page);

      try {
        const result = await AriaScorePdfRenderer.renderPage({
          pdfPath: uri,
          page,
          width: 180,
          height: 252,
        });

        thumbnailImagesRef.current = {
          ...thumbnailImagesRef.current,
          [page]: result.uri,
        };

        setThumbnailImages(thumbnailImagesRef.current);
      } catch (error) {
        console.error(`Failed to render thumbnail ${page}`, error);
      } finally {
        renderingThumbnails.current.delete(page);
      }
    },
    [uri, totalPages]
  );

//   useEffect(() => {
//   if (!jumpOverlayVisible) return;

//   thumbnailBatchCancelled.current = false;

//   const renderProgressively = async () => {
//     const pages: number[] = [];

//     // Prioritize current area first.
//     const startNearCurrent = Math.max(1, currentPage - 6);
//     const endNearCurrent = Math.min(totalPages, currentPage + 12);

//     for (let p = startNearCurrent; p <= endNearCurrent; p++) {
//       pages.push(p);
//     }

//     // Then render the rest from the beginning.
//     for (let p = 1; p <= totalPages; p++) {
//       if (!pages.includes(p)) {
//         pages.push(p);
//       }
//     }

//     const batchSize = 6;

//     for (let i = 0; i < pages.length; i += batchSize) {
//       if (thumbnailBatchCancelled.current) return;

//       const batch = pages.slice(i, i + batchSize);

//       await Promise.all(batch.map((p) => renderThumbnail(p)));

//       // Let UI breathe between batches.
//       await new Promise((resolve) => setTimeout(resolve, 50));
//     }
//   };

//   renderProgressively();

//   return () => {
//     thumbnailBatchCancelled.current = true;
//   };
// }, [jumpOverlayVisible, totalPages, currentPage, renderThumbnail]);

// console.log("Context, ", context)

  const renderBufferAround = useCallback(
    (page: number) => {
      const buffer = getBuffer(effectiveDisplayMode);

      const pages: number[] = [page];

      for (
        let p = page + 1;
        p <= Math.min(totalPages, page + buffer.ahead);
        p++
      ) {
        pages.push(p);
      }

      for (
        let p = page - 1;
        p >= Math.max(1, page - buffer.behind);
        p--
      ) {
        pages.push(p);
      }

      pages.forEach(renderPage);
    },
    [renderPage, totalPages, getBuffer]
  );

  // const singleTap = Gesture.Tap()
  // const doubleTap = Gesture.Tap().numberOfTaps(2)
  // const pinch = Gesture.Pinch()
  // const longPress = Gesture.LongPress()

  // const gesture = Gesture.Simultaneous(
  //   singleTap,
  //   doubleTap,
  //   pinch,
  //   longPress
  // );

  const applyDisplayMode = useCallback(
    (nextMode: DisplayMode) => {
      setDisplayMode(nextMode);

      const nextIndex =
        nextMode === "double"
          ? coverOffset
            ? currentPage <= 1
              ? 0
              : Math.ceil((currentPage - 1) / 2)
            : Math.floor((currentPage - 1) / 2)
          : currentPage - 1;

      setInitialPagerIndex(nextIndex);

      requestAnimationFrame(() => {
        pagerRef.current?.setPageWithoutAnimation(nextIndex);
      });

      renderBufferAround(currentPage);
    },
    [currentPage, coverOffset, renderBufferAround]
  );

  const applyOrientationLock = useCallback(
    async (mode: OrientationLockMode) => {
      setOrientationLock(mode);

      if (mode === "portrait") {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } else if (mode === "landscape") {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } else {
        await ScreenOrientation.unlockAsync();
      }
    },
    []
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "background") {
          saveCurrentSetlistProgress();
        }
      }
    );

    return () => subscription.remove();
  }, [saveCurrentSetlistProgress]);

  useEffect(() => {
    return () => {
      saveCurrentSetlistProgress();
    };
  }, [saveCurrentSetlistProgress]);

  useEffect(() => {
    if (!effectiveSettings.keepScreenAwake) return;

    activateKeepAwakeAsync();

    return () => {
      deactivateKeepAwake();
    };
  }, [effectiveSettings.keepScreenAwake]);

  useEffect(() => {
    pageImagesRef.current = {};
    setPageImages({});
    renderingPages.current.clear();

    renderBufferAround(currentPage);
  }, [renderSize.width, renderSize.height]);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!musicId) return;

      const exists = await isBookmarked(musicId, currentPage);
      setBookmarked(exists);
    };

    checkBookmark();
  }, [musicId, currentPage]);

  const loadBookmarks = useCallback(async () => {
    if (!musicId) return;

    const results =
      await getBookmarksForScore(musicId);

    setBookmarks(results);
  }, [musicId]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // useEffect(() => {
  //   const loadDisplayMode = async () => {
  //     const saved = await AsyncStorage.getItem(
  //       "reader:displayMode"
  //     );

  //     if (
  //       saved === "single" ||
  //       saved === "double"
  //     ) {
  //       setDisplayMode(saved);
  //     }
  //   };

  //   loadDisplayMode();
  // }, []);

  useEffect(() => {
    setDisplayMode(effectiveSettings.viewMode);
  }, [effectiveSettings.viewMode]);

  useEffect(() => {
    setCoverOffset(effectiveSettings.coverOffset);
  }, [effectiveSettings.coverOffset]);

  // useEffect(() => {
  //   AsyncStorage.setItem(
  //     "reader:displayMode",
  //     displayMode
  //   );
  // }, [displayMode]);

  const showChromeTemporarily = useCallback(() => {
    setChromeVisible(true);

    // if (!settings.autoHideControls) {
    //   return;
    // }

    if (!effectiveSettings.autoHideControls) {
      return;
    }

    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current);
    }

    chromeHideTimer.current = setTimeout(() => {
      if (!overflowMenuOpen) {
        setChromeVisible(false);
      }

      chromeHideTimer.current = null;
    }, 5000);
  }, [overflowMenuOpen, effectiveSettings.autoHideControls]);

  useEffect(() => {
    let cancelled = false;

    const initialiseDocument = async () => {
      setReaderReady(false);

      pageImagesRef.current = {};
      setPageImages({});
      renderingPages.current.clear();

      const detectedTotal = await AriaScorePdfRenderer.getPageCount(uri);

      if (cancelled) return;

      setTotalPages(detectedTotal);

      let safePage = 1;

      if (initialPage) {
        safePage = Math.min(initialPage, detectedTotal);
      } else if (effectiveSettings.resumeLastPage) {
        const saved = await AsyncStorage.getItem(`pdf:lastPage:${uri}`);

        // const curr_saved = saved && displayMode == "double" ? Number(saved) / 2 : Number(saved);

        const savedPage = saved ? Number(saved) : 1;

        safePage =
          Number.isFinite(savedPage) && savedPage > 0
            ? Math.min(savedPage, detectedTotal)
            : 1;
      }

      const showInitialChrome = () => {
        setChromeVisible(true);

        // if (!settings.autoHideControls) return;

        if (!effectiveSettings.autoHideControls) {
          return;
        }

        if (chromeHideTimer.current) {
          clearTimeout(chromeHideTimer.current);
        }

        chromeHideTimer.current = setTimeout(() => {
          setChromeVisible(false);
          chromeHideTimer.current = null;
        }, 5000);
      };

      const initialIndex =
        displayMode === "double"
          ? Math.floor((safePage - 1) / 2)
          : safePage - 1;

      setCurrentPage(safePage);
      setInitialPagerIndex(initialIndex);
      setReaderReady(true);
      showInitialChrome();

      requestAnimationFrame(() => {
        pagerRef.current?.setPageWithoutAnimation(initialIndex);
      });
    };

    initialiseDocument();

    return () => {
      cancelled = true;
    };
  }, [uri, initialPage, effectiveSettings.resumeLastPage]);

  useEffect(() => {
    renderBufferAround(currentPage);
  }, [currentPage, renderBufferAround, effectiveSettings.resumeLastPage]);

  

  const goToPage = useCallback(
    (page: number, options?: { showChrome?: boolean }) => {
      const nextPage = Math.max(1, Math.min(page, totalPages));

      setCurrentPage(nextPage);

      pagerRef.current?.setPage(getPagerIndexForPage(nextPage));

      if (effectiveSettings.resumeLastPage) {
        AsyncStorage.setItem(`pdf:lastPage:${uri}`, nextPage.toString());
      }

      if (options?.showChrome !== false) {
        showChromeTemporarily();
      }

      renderPage(nextPage);
      renderBufferAround(nextPage);
    },
    [
      totalPages,
      uri,
      renderPage,
      renderBufferAround,
      getPagerIndexForPage,
      showChromeTemporarily,
    ]
  );

  const goToPreviousPage = useCallback(async () => {
    if (changingScoreRef.current) return;
    if (currentPage < 1 || currentPage > totalPages) return;

    const previousPage = currentPage - pageStep;

    if (previousPage < 1) {
      if (!context?.setlistId) return;

      changingScoreRef.current = true;

      try {
        await saveCurrentSetlistProgress();
        await onPreviousScoreFromPageTurn?.();
      } finally {
        changingScoreRef.current = false;
      }

      return;
    }

    goToPage(previousPage, { showChrome: false });
  }, [
    currentPage,
    totalPages,
    pageStep,
    context?.setlistId,
    saveCurrentSetlistProgress,
    onPreviousScoreFromPageTurn,
    goToPage,
  ]);

  const goToNextPage = useCallback(async () => {
    if (changingScoreRef.current) return;
    if (currentPage < 1 || currentPage > totalPages) return;

    const nextPage = currentPage + pageStep;

    if (nextPage > totalPages) {
      if (!context?.setlistId) return;

      changingScoreRef.current = true;

      try {
        await saveCurrentSetlistProgress();
        await onNextScoreFromPageTurn?.();
      } finally {
        changingScoreRef.current = false;
      }

      return;
    }

    goToPage(nextPage, { showChrome: false });
  }, [
    currentPage,
    totalPages,
    pageStep,
    context?.setlistId,
    saveCurrentSetlistProgress,
    onNextScoreFromPageTurn,
    goToPage,
  ]);


  

  // const toggleBookmark = useCallback(async () => {
  //   if (!musicId) return;

  //   if (bookmarked) {
  //     await removeBookmark(bookmarkId);
  //     setBookmarked(false);
  //   } else {
  //     await addBookmark(musicId, currentPage);
  //     setBookmarked(true);
  //   }

  //   await loadBookmarks();
  // }, [
  //   musicId,
  //   currentPage,
  //   bookmarked,
  //   loadBookmarks,
  // ]);

  const hideChrome = useCallback(() => {
    if (chromeHideTimer.current) {
      clearTimeout(chromeHideTimer.current);
      chromeHideTimer.current = null;
    }

    setChromeVisible(false);
  }, []);

  const toggleChrome = useCallback(() => {
    setChromeVisible((visible) => {
      if (chromeHideTimer.current) {
        clearTimeout(chromeHideTimer.current);
        chromeHideTimer.current = null;
      }

      if (visible) {
        return false;
      }

      // if (settings.autoHideControls) {
      //   chromeHideTimer.current = setTimeout(() => {
      //     setChromeVisible(false);
      //     chromeHideTimer.current = null;
      //   }, 3500);
      // }

      if (effectiveSettings.autoHideControls) {
        chromeHideTimer.current = setTimeout(() => {
          setChromeVisible(false);
          chromeHideTimer.current = null;
        }, 3500);
      }

      return true;
    });
  }, [effectiveSettings.autoHideControls]);

  const handleTap = useCallback((x: number) => {
  const zoneRatio = getTapZoneRatio({
    isLandscape,
    isPerformanceMode: effectivePerformanceMode,
  });

  const action = resolveTapAction(
      x,
      width,
      zoneRatio,
    );

    switch (action) {
      case "previous":
        goToPreviousPage();
        break;

      case "next":
        goToNextPage();
        break;

      case "toggleChrome":
        toggleChrome();
        break;
    }
  }, [
    width,
    isLandscape,
    effectivePerformanceMode,
    goToPreviousPage,
    goToNextPage,
    toggleChrome,
  ]);

  useEffect(() => {
    return () => {
      if (chromeHideTimer.current) {
        clearTimeout(chromeHideTimer.current);
      }
    };
  }, []);

  

  const centerTapGesture = Gesture.Tap()
  .maxDuration(220)
  .maxDistance(10)
  .onEnd((_event, success) => {
    if (success) {
      runOnJS(toggleChrome)();
    }
  });

  const swipeGesture = Gesture.Pan()
  .enabled(effectiveSettings.swipeNavigation)
  .activeOffsetX([-12, 12])
  .failOffsetY([-40, 40])
  .onEnd((event) => {
    const movedFarEnough =
      Math.abs(event.translationX) >=
      (isLandscape ? 35 : 45);

    const movedFastEnough =
      Math.abs(event.velocityX) >= 400;

    if (!movedFarEnough && !movedFastEnough) {
      return;
    }

    if (event.translationX < 0) {
      runOnJS(goToNextPage)();
    } else {
      runOnJS(goToPreviousPage)();
    }
  });

  const tapGesture = Gesture.Tap()
  .maxDuration(220)
  .maxDistance(10)
  .onEnd((event, success) => {
    if (!success) return;

    runOnJS(handleTap)(event.x);
  });

  const readerGesture = Gesture.Exclusive(
    swipeGesture,
    tapGesture,
  );

  // const singleTap = Gesture.Tap()
  // .numberOfTaps(1)
  // .maxDuration(220)
  // .maxDistance(10)
  // .onEnd(() => {
  //   runOnJS(showChromeTemporarily)();
  // });

  // const doubleTap = Gesture.Tap()
  //   .numberOfTaps(2)
  //   .maxDuration(300)
  //   .maxDistance(20)
  //   .onEnd(() => {
  //     runOnJS(console.log)('Double tap: future zoom');
  //   });

  // const longPress = Gesture.LongPress()
  //   .minDuration(450)
  //   .onEnd(() => {
  //     runOnJS(console.log)('Long press: future annotation/context menu');
  //   });

  // const pinch = Gesture.Pinch()
  //   .onBegin(() => {
  //     runOnJS(console.log)('Pinch begin: future zoom');
  //   });

  // const gesture = Gesture.Exclusive(
  //   doubleTap,
  //   Gesture.Simultaneous(
  //     pinch,
  //     longPress,
  //     singleTap
  //   )
  // );

  const renderVisibleThumbnailWindow = useCallback(
    (page: number) => {
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 6);

      for (let p = start; p <= end; p++) {
        renderThumbnail(p);
      }
    },
    [totalPages, renderThumbnail]
  );

  const handleThumbnailViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: number }> }) => {
      viewableItems.forEach(({ item }) => {
        renderVisibleThumbnailWindow(item);
      });
    },
    [renderVisibleThumbnailWindow]
  );

  // console.log("thumbnailPages:", thumbnailPages.length, "totalPages:", totalPages);

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {chromeVisible && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: TOP_CHROME_HEIGHT,
            zIndex: 1300,
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderBottomWidth: 1,
            borderBottomColor: '#ddd',
            paddingHorizontal: 16,
            paddingTop: 30,
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color={ACCENT_COLOR} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 12,
              }}
              activeOpacity={0.75}
              onPress={() => {
                setScoreInfoVisible(true);
                setChromeVisible(true);
              }}
            >
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 22,
                  color: ACCENT_COLOR,
                }}
                numberOfLines={1}
              >
                {score.title}
              </Text>

              <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
                {score.document_type === 'Single Work' ? `${score.composer} ${score.arranger && `(Arr. ${score.arranger})`}` : score.editor}
              </Text>

              {context?.setlistName && (
                <Text style={{ fontSize: 13, color: '#888' }} numberOfLines={1}>
                  {context.setlistName} · Score {context.currentIndex} of {context.totalItems}
                </Text>
              )}

              <Text style={{ fontSize: 13, color: '#888' }}>
                Page {currentPage} of {totalPages}
              </Text>
            </TouchableOpacity>

            <Menu
              onOpen={() => {
                setOverflowMenuOpen(true);

                if (chromeHideTimer.current) {
                  clearTimeout(chromeHideTimer.current);
                  chromeHideTimer.current = null;
                }
              }}
              onClose={() => {
                setOverflowMenuOpen(false);

                if (performanceModeClosingRef.current) {
                  performanceModeClosingRef.current = false;
                  return;
                }

                showChromeTemporarily();
              }}
            >
              <MenuTrigger>
                <Ionicons name="ellipsis-vertical" size={28} color={ACCENT_COLOR} />
              </MenuTrigger>

              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    width: 260,
                    borderRadius: 14,
                    paddingVertical: 6,
                    backgroundColor: "white",
                    elevation: 10,
                  },
                }}
              >
                <OverflowMenuItem
                  icon={
                    effectivePerformanceMode ?
                    "flash" : "flash-outline"
                  }
                  label={
                    effectivePerformanceMode
                      ? "Leave Performance Mode"
                      : "Performance Mode"
                  }
                  accent
                  onPress={() => {
                    const nextValue = !effectivePerformanceMode;

                    performanceModeClosingRef.current = nextValue;

                    setPerformanceModeOverride(nextValue);
                    setChromeVisible(false);
                  }}
                />

                <OverflowMenuDivider />

                <OverflowMenuItem
                  icon="information-circle-outline"
                  label="Score Information"
                  onPress={() => {
                    setScoreInfoVisible(true);
                    setChromeVisible(true);
                  }}
                />

                {/* <OverflowMenuItem
                  icon="bookmark-outline"
                  label="Bookmarks"
                  onPress={() => {
                    loadBookmarks();
                    setBookmarksOverlayVisible(true);
                  }}
                /> */}

                <OverflowMenuItem
                  icon="albums-outline"
                  label="Display"
                  onPress={() => {
                    setDisplayOptionsVisible(true);
                    setChromeVisible(true);
                  }}
                />

                <OverflowMenuItem
                  icon="bookmark-outline"
                  label="Add Bookmark"
                  sublabel={`Page ${currentPage}`}
                  onPress={() => {
                    setBookmarkLabel("");
                    setLabelOverlayVisible(true);
                    setChromeVisible(true);
                  }}
                />

                <OverflowMenuDivider />

                <OverflowMenuItem
                  icon="document-text-outline"
                  label="Score Settings"
                  onPress={() => {
                    navigation.navigate("MusicSettings", {
                      musicId,
                      setlistId: context?.setlistId,
                    });
                  }}
                />

                {context?.setlistId && (
                  <OverflowMenuItem
                    icon="list-outline"
                    label="Setlist Settings"
                    onPress={() => {
                      navigation.navigate("SetlistSettings", {
                        setlistId: context.setlistId,
                      });
                    }}
                  />
                )}

                <OverflowMenuItem
                  icon="settings-outline"
                  label="Global Settings"
                  onPress={() => {
                    navigation.navigate("Settings");
                  }}
                />

                <OverflowMenuDivider />

                <OverflowMenuItem
                  icon="star-outline"
                  label="Add to Favorites"
                  onPress={() => {
                    console.log("Add to favorites");
                  }}
                />

                <OverflowMenuItem
                  icon="share-outline"
                  label="Export Score"
                  onPress={() => {
                    console.log("Export score");
                  }}
                />
              </MenuOptions>
            </Menu>
          </View>
        </View>
      )}

      {/* <GestureDetector gesture={gesture}> */}
        {readerReady ? (
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={initialPagerIndex}
            offscreenPageLimit={5}
            scrollEnabled={false}
            onPageSelected={(event) => {
              const position = event.nativeEvent.position;

              const selectedPage =
                effectiveDisplayMode === 'double'
                  ? coverOffset
                    ? position === 0
                      ? 1
                      : position * 2
                    : position * 2 + 1
                  : position + 1;

              setCurrentPage(selectedPage);
              if (effectiveSettings.resumeLastPage) {
                AsyncStorage.setItem(`pdf:lastPage:${uri}`, selectedPage.toString());
              }

              renderBufferAround(selectedPage);
            }}
          >
            {Array.from(
              {
                length:
                  pagerPageCount,
              },
              (_, index) => {
                if (effectiveDisplayMode === 'single') {
                  const pageNumber = index + 1;

                  return (
                    <View key={`single-${pageNumber}`} style={{ flex: 1 }}>
                      <RenderedPage
                        image={pageImages[pageNumber]}
                        pageNumber={pageNumber}
                      />
                    </View>
                  );
                }

                if (coverOffset && index === 0) {
                  return (
                    <View
                      key="cover-spread"
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        backgroundColor: 'white',
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: 'white',
                        }}
                      />

                      <RenderedPage
                        image={pageImages[1]}
                        pageNumber={1}
                      />
                    </View>
                  );
                }

                const leftPage = coverOffset
                  ? index * 2
                  : index * 2 + 1;

                const rightPage = leftPage + 1;

                return (
                  <View
                    key={`spread-${index}`}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      backgroundColor: 'white',
                    }}
                  >
                    <RenderedPage
                      image={pageImages[leftPage]}
                      pageNumber={leftPage}
                    />

                    {rightPage <= totalPages ? (
                      <RenderedPage
                        image={pageImages[rightPage]}
                        pageNumber={rightPage}
                      />
                    ) : (
                      <View style={{ flex: 1, backgroundColor: 'white' }} />
                    )}
                  </View>
                );
              }
            )}
          </PagerView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={{ color: ACCENT_COLOR }}>
              Opening score…
            </Text>
          </View>
        )}
      {/* </GestureDetector> */}
      
      {chromeVisible && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            backgroundColor: "rgba(255,255,255,0.96)",
            borderTopWidth: 1,
            borderTopColor: "#ddd",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            minHeight: 84,
          }}
        >
          {context?.setlistId ? (
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              onPress={async () => {
                await saveCurrentSetlistProgress();
                onPreviousScore?.();
              }}
            >
              <Ionicons name="arrow-back" size={28} color={ACCENT_COLOR} />
              <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>
                Previous Score
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              onPress={() => goToPage(currentPage - pageStep)}
            >
              <Ionicons name="arrow-back" size={28} color={ACCENT_COLOR} />
              <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>
                Previous Page
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => {
              setJumpPage(currentPage.toString());
              setJumpOverlayVisible(true);
            }}
          >
            <Ionicons name="grid-outline" size={28} color={ACCENT_COLOR} />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Jump</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => console.log('Annotate')}
          >
            <Ionicons name="create-outline" size={28} color={ACCENT_COLOR} />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Annotate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={() => {
              loadBookmarks();
              setBookmarksOverlayVisible(true);
            }}
          >
            <Ionicons
              name="bookmarks-outline"
              size={28}
              color={ACCENT_COLOR}
            />
            <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Bookmarks</Text>
          </TouchableOpacity>

          {context?.setlistId ? (
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              // onPress={() => goToPage(currentPage + pageStep)}
              onPress={async () => {
                await saveCurrentSetlistProgress();
                onNextScore?.();
              }}
            >
              <Ionicons name="arrow-forward" size={28} color={ACCENT_COLOR} />
              <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>Next Score</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              onPress={() => goToPage(currentPage + pageStep)}
            >
              <Ionicons name="arrow-forward" size={28} color={ACCENT_COLOR} />
              <Text style={{ fontSize: 14, color: ACCENT_COLOR }}>
                Next Page
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {scoreInfoVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2200,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: 460,
              maxWidth: '90%',
              backgroundColor: 'white',
              borderRadius: 18,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: ACCENT_COLOR }}>
                Score Information
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setScoreInfoVisible(false);
                  showChromeTemporarily();
                }}
              >
                <Ionicons name="close" size={28} color={ACCENT_COLOR} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
              <View
                style={{
                  width: 90,
                  height: 120,
                  borderWidth: 1,
                  borderColor: '#ddd',
                  backgroundColor: '#f8f8f8',
                }}
              >
                {thumbnailImages[1] || pageImages[1] ? (
                  <Image
                    source={{ uri: thumbnailImages[1] ?? pageImages[1]?.uri }}
                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                  />
                ) : null}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>
                  {score.title ?? 'Untitled'}
                </Text>

                {score.document_type === "Single Work" ? (
                  <Text style={{ fontWeight: 'bold' }}>{score.composer} {score.arranger && `(Arr. ${score.arranger})`}</Text>
                ) : (
                  <Text style={{ fontWeight: 'bold' }}>{score.editor} </Text>
                )}

                <Text style={{ fontSize: 14, color: '#777', marginTop: 4 }}>
                  {totalPages} pages
                </Text>

                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 10,
                    backgroundColor: '#EEF2FF',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: ACCENT_COLOR, fontWeight: '600' }}>
                    {score.document_type}
                  </Text>
                </View>
              </View>
            </View>

            <InfoSection title="Current Setlist">
              {context?.setlistId ? (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                  }}
                  onPress={() => {
                    navigation.navigate('SetlistDetail', {
                      setlistId: context.setlistId,
                    });
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="list-outline" size={20} color={ACCENT_COLOR} />
                    <Text style={{ fontSize: 15 }}>
                      {context.setlistName}
                    </Text>
                  </View>

                  <Text style={{ color: '#666' }}>
                    {context.currentIndex + 1} of {context.totalItems} ›
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: '#666', paddingVertical: 10 }}>
                  Open this score from a setlist to see performance context.
                </Text>
              )}
            </InfoSection>

            <InfoSection title="Labels">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {score.labels && score.labels.length > 0 ? (
                    score.labels?.map((label) => (
                      <View
                        key={label}
                        style={{
                          backgroundColor: '#F3F4F6',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: '#555', fontSize: 13 }}>{label}</Text>
                      </View>
                  ))
                ) : (
                  <Text style={{ color: '#555', fontSize: 13 }}>No labels assigned.</Text>
                )}
              </View>
            </InfoSection>

            <InfoSection title="Notes">
              <Text style={{ color: '#555', lineHeight: 20 }}>
                No notes yet.
              </Text>
            </InfoSection>

            <InfoSection title="Actions">
              <ActionRow
                icon="create-outline"
                label="Edit Metadata"
                onPress={() => {
                  setScoreInfoVisible(false);
                  setMetadataFormVisible(true);
                }}
              />
              <ActionRow
                icon="folder-outline"
                label="Manage Setlists"
                onPress={() => {
                  setScoreInfoVisible(false);
                  setManageSetlistsVisible(true);
                }}
              />
              <ActionRow icon="star-outline" label="Add to Favorites" />
              <ActionRow icon="share-outline" label="Export Score" />
            </InfoSection>
          </View>
        </View>
      )}

      <MetadataForm
        visible={metadataFormVisible}
        musicId={musicId}
        pdfUri={uri}
        mode="edit"
        onCancel={() => {
          setMetadataFormVisible(false);
          showChromeTemporarily();
        }}
        onSave={(formData) => {
          setMetadataFormVisible(false);

          if (formData) {
            // update local reader state or call parent refresh
            onMetadataUpdated?.(formData);
          }

          showChromeTemporarily();
        }}
      />

      {jumpOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2200,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '74%',
              maxWidth: 820,
              height: '78%',
              backgroundColor: 'white',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <View 
              style={{ flexDirection: 'row', 
              justifyContent: 'space-between', 
              // alignSelf: 'flex-end', 
              alignItems: 'center', // marginTop: 12, 
              marginBottom: 16, }} 
            > 
              <Text style={{ fontSize: 22, fontWeight: '700', color: ACCENT_COLOR }}>
                Jump to Page
              </Text>
              
              <TouchableOpacity onPress={() => { 
                setJumpOverlayVisible(false) 
                showChromeTemporarily(); }}
              > 
                
                <Ionicons name="close" size={28} color={ACCENT_COLOR} /> 
                
              </TouchableOpacity> 
              
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                // justifyContent: 'space-between',
                alignSelf: 'flex-end', 
                marginBottom: 20,
              }}
            >

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: '#666' }}>Page</Text>

                <TextInput
                  value={jumpPage}
                  onChangeText={setJumpPage}
                  keyboardType="number-pad"
                  placeholder={`1-${totalPages}`}
                  placeholderTextColor="#999"
                  style={{
                    width: 70,
                    borderWidth: 1,
                    borderColor: '#ccc',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 18,
                    color: '#111',
                  }}
                />

                <Text style={{ color: '#666', fontSize: 16 }}>
                  / {totalPages}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    const page = Number(jumpPage);
                    if (!Number.isFinite(page)) return;

                    goToPage(page);
                    setJumpOverlayVisible(false);
                    showChromeTemporarily();
                  }}
                  style={{
                    backgroundColor: ACCENT_COLOR,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                    Go
                  </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  onPress={() => {
                    setJumpOverlayVisible(false);
                    showChromeTemporarily();
                  }}
                  style={{ paddingLeft: 8 }}
                >
                  <Ionicons name="close" size={28} color={ACCENT_COLOR} />
                </TouchableOpacity> */}
              </View>
            </View>

            <FlatList
              data={thumbnailPages}
              keyExtractor={(page) => page.toString()}
              numColumns={THUMB_COLUMNS}
              onLayout={() => {
                const rowIndex = Math.floor((currentPage - 1) / THUMB_COLUMNS);

                requestAnimationFrame(() => {
                  thumbnailListRef.current?.scrollToOffset({
                    offset: rowIndex * THUMB_ROW_HEIGHT,
                    animated: false,
                  });
                });
              }}
              ref={thumbnailListRef}
              onViewableItemsChanged={handleThumbnailViewableItemsChanged}
              viewabilityConfig={{
                itemVisiblePercentThreshold: 10,
              }}
              contentContainerStyle={{
                alignItems: 'center',
                paddingBottom: 20,
              }}
              columnWrapperStyle={{
                justifyContent: 'center',
                gap: 18,
              }}
              renderItem={({ item: pageNumber }) => {
                const pageUri =
                  thumbnailImages[pageNumber] ?? pageImages[pageNumber]?.uri;

                const bookmarkForPage = bookmarks.find(
                  (bookmark) => bookmark.page_number === pageNumber
                );

                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      goToPage(pageNumber);
                      setJumpOverlayVisible(false);
                      showChromeTemporarily();
                    }}
                    style={{
                      width: THUMB_ITEM_WIDTH,
                      alignItems: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <View
                      style={{
                        width: 100,
                        height: 140,
                        borderWidth: currentPage === pageNumber ? 3 : 1,
                        borderColor:
                          currentPage === pageNumber ? ACCENT_COLOR : '#ddd',
                        backgroundColor: '#f5f5f5',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {pageUri ? (
                        <Image
                          source={{ uri: pageUri }}
                          style={{
                            width: '100%',
                            height: '100%',
                            resizeMode: 'contain',
                          }}
                        />
                      ) : (
                        <>
                          <ActivityIndicator />
                          <Text style={{ color: '#999', marginTop: 4, fontSize: 11 }}>
                            Loading
                          </Text>
                        </>
                      )}

                      {bookmarkForPage && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'white',
                            borderRadius: 10,
                            padding: 2,
                          }}
                        >
                          <Ionicons name="bookmark" size={16} color={ACCENT_COLOR} />
                        </View>
                      )}
                    </View>

                    <Text style={{ marginTop: 4, fontSize: 12 }}>
                      {pageNumber}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
          
        </View>
      )}

      {displayOptionsVisible && (
        <View style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 2200,
          backgroundColor: "rgba(0,0,0,0.35)",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <View style={{
            width: 420,
            backgroundColor: "white",
            borderRadius: 16,
            padding: 20,
          }}>
            <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 16 }}>
              Display
            </Text>

            <ActionRow
              icon={displayMode === "single" ? "radio-button-on" : "radio-button-off"}
              label="Single page"
              onPress={() => applyDisplayMode("single")}
            />

            <ActionRow
              icon={displayMode === "double" ? "radio-button-on" : "radio-button-off"}
              label="Two pages"
              onPress={() => applyDisplayMode("double")}
            />

            <InfoSection title="Orientation">
              <ActionRow
                icon={orientationLock === "auto" ? "radio-button-on" : "radio-button-off"}
                label="Auto rotate"
                onPress={() => applyOrientationLock("auto")}
              />

              <ActionRow
                icon={orientationLock === "portrait" ? "radio-button-on" : "radio-button-off"}
                label="Portrait"
                onPress={() => applyOrientationLock("portrait")}
              />

              <ActionRow
                icon={orientationLock === "landscape" ? "radio-button-on" : "radio-button-off"}
                label="Landscape"
                onPress={() => applyOrientationLock("landscape")}
              />
            </InfoSection>

            <TouchableOpacity
              onPress={() => {
                setDisplayOptionsVisible(false);
                showChromeTemporarily();
              }}
              style={{
                marginTop: 18,
                alignSelf: "flex-end",
                backgroundColor: ACCENT_COLOR,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {bookmarksOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 420,
              maxHeight: '70%',
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
              Bookmarks
            </Text>

            <TouchableOpacity
              onPress={() => {
                setBookmarkLabel("");
                setLabelOverlayVisible(true);
              }}
              style={{
                padding: 12,
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, color: "#2563EB", fontWeight: "600" }}>
                Add bookmark on page {currentPage}
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 360 }}>
              {bookmarks.length === 0 ? (
                <Text style={{ color: '#666', textAlign: 'center', padding: 16 }}>
                  No bookmarks yet
                </Text>
              ) : (
                bookmarks.map((bookmark) => (
                  <TouchableOpacity
                    key={bookmark.id}
                    onPress={() => {
                      goToPage(bookmark.page_number);
                      setBookmarksOverlayVisible(false);
                      showChromeTemporarily();
                    }}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#eee',
                    }}
                  >
                    <View>
                      {bookmark.label ? (
                        <Text style={{ fontSize: 16, fontWeight: '600' }}>
                          {bookmark.label}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '600'  }}>
                          No label
                        </Text>
                      )}

                      <Text style={{ color: '#666', marginTop: 2  }}>
                        Page {bookmark.page_number}
                      </Text>
                    </View>

                    {/* <Ionicons name="bookmark" size={22} color="#2563EB" /> */}
                    <TouchableOpacity
                      onPress={async () => {
                        await removeBookmark(bookmark.id);
                        await loadBookmarks();
                      }}
                    >
                      <Ionicons name="trash-outline" size={22} color="#DC2626" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  
                ))
              )}
            </ScrollView>

            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <TouchableOpacity
                onPress={() => setBookmarksOverlayVisible(false)}
                style={{
                  padding: 10,
                  paddingHorizontal: 18,
                  backgroundColor: '#2563EB',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {labelOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 2100,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 400,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                marginBottom: 12,
              }}
            >
              Add Bookmark
            </Text>

            <Text
              style={{
                color: '#666',
                marginBottom: 16,
              }}
            >
              Page {currentPage}
            </Text>

            <TextInput
              value={bookmarkLabel}
              onChangeText={setBookmarkLabel}
              placeholder="Label (optional)"
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
              }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setLabelOverlayVisible(false)
                }
                style={{
                  padding: 10,
                  paddingHorizontal: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!musicId) return;

                  await addBookmark(musicId, currentPage, bookmarkLabel.trim());

                  await loadBookmarks();

                  setLabelOverlayVisible(false);
                  setBookmarksOverlayVisible(true);

                  showChromeTemporarily();
                }}
                style={{
                  backgroundColor: '#2563EB',
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '700',
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ManageSetlistsModal
        visible={manageSetlistsVisible}
        musicId={musicId}
        onClose={() => {
          setManageSetlistsVisible(false);
          showChromeTemporarily();
        }}
        onSaved={() => {
          onMetadataUpdated?.({} as any);
        }}
      />

      {canUseReaderGestures && (
        <GestureDetector gesture={readerGesture}>
          <View
            collapsable={false}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 900,
              // backgroundColor: 'rgba(255, 153, 0, 0.12)',
            }}
          />
        </GestureDetector>
      )}

      {canUseTapZones && (
        <>
          {/* left Pressable */}

           {/* <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: edgeZoneWidth,
              zIndex: 999,
              elevation: 999,
              backgroundColor: 'rgba(255, 0, 0, 0.12)',
            }}
            onPress={async () => {
              if (currentPage < 1 || currentPage > totalPages) return;

              const previousPage = currentPage - pageStep;

              if (previousPage < 1) {
                if (!context?.setlistId || changingScoreRef.current) {
                  return;
                }

                changingScoreRef.current = true;

                try {
                  await saveCurrentSetlistProgress();
                  await onPreviousScoreFromPageTurn?.();
                } finally {
                  changingScoreRef.current = false;
                }

                return;
              }

              goToPage(previousPage, {showChrome: false});
              // showChromeTemporarily();
            }}
          /> */}

          {/* right Pressable */}
          {/*
          <Pressable
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: edgeZoneWidth,
              zIndex: 999,
              elevation: 999,
              backgroundColor: 'rgba(255, 0, 0, 0.12)',
            }}
            onPress={async () => {
              console.log("Right tap zone pressed", {
                currentPage,
                pageStep,
                totalPages,
                hasNextScore: !!onNextScore,
              });

              if (currentPage < 1 || currentPage > totalPages) return;

              const nextPage = currentPage + pageStep;

              if (nextPage > totalPages) {
                if (!context?.setlistId || changingScoreRef.current) {
                  return;
                }

                changingScoreRef.current = true;

                try {
                  await saveCurrentSetlistProgress();
                  await onNextScoreFromPageTurn?.();
                } finally {
                  changingScoreRef.current = false;
                }
                return;
              }

              goToPage(nextPage, {showChrome: false});
              // showChromeTemporarily();
            }}
          /> */}
        </>
      )}
    </View>
  );
};

export default BufferedPDFViewer;
