import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Text, SafeAreaView } from 'react-native';

import { useFocusEffect } from "@react-navigation/native";
import BufferedPDFViewer from '../components/BufferedPDFViewer';

import { RootStackParamList } from '../types';
import { getMusicWithAllData, getMusicWithMetadata, markMusicAsOpened } from '../utils/database';
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';
import { getResolvedReaderSettings } from '../utils/settings/resolver';
import { ReaderSettings } from '../utils/settings/types';

import type {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

type ReaderScreenProps =
  NativeStackScreenProps<
    RootStackParamList,
    "Reader"
  >;

const ReaderScreen = ({
  route,
  navigation,
}: ReaderScreenProps) => {
  const {
    uri,
    musicId,
    context,
    startPage,
    origin,
  } = route.params;
    // const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    // const { uri, musicId, context, startPage } = route.params as { uri: string; musicId?: number, context: ReaderContext, startPage?: number };

    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [music, setMusic] = useState<any>(null);
    const [settings, setSettings] = useState<ReaderSettings>()

      useEffect(() => {
          return () => {
              if (toastTimeoutRef.current) {
                  clearTimeout(toastTimeoutRef.current);
              }
          };
      }, []);
    
    const loadReaderData = useCallback(async () => {
        if (!musicId) return;

        try {
            const [resolved, items] = await Promise.all([
                getResolvedReaderSettings(
                    musicId,
                    context?.setlistId
                ),
                getMusicWithMetadata(musicId),
            ]);

            const item = Array.isArray(items)
                ? items[0]
                : items;

            setSettings(resolved);

            if (item) {
                setMusic(item);
            }
        } catch (error) {
            console.error("Failed to load reader data:", error);
        }
    }, [musicId, context?.setlistId]);

    useFocusEffect(
        useCallback(() => {
            void loadReaderData();
        }, [loadReaderData])
    );

    const loadMetadata = async () => {
        if (!musicId) return;

        const items = await getMusicWithMetadata(musicId);
        const item = Array.isArray(items) ? items[0] : items;

        if (!item) return;

        setMusic(item);
    };

    // useEffect(() => {
    //     loadMetadata();
    // }, [musicId]);

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        setToastVisible(true);

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => {
            setToastVisible(false);
            toastTimeoutRef.current = null;
        }, 3000); // 3 seconds
    }, []);

    const openSetlistScore = useCallback(
        async (
            targetArrayIndex: number,
            openAt: "first" | "last" = "first"
        ) => {
            if (!context?.entries?.length) {
            return;
            }

            if (targetArrayIndex < 0) {
            showToast("Start of setlist");
            return;
            }

            if (
            targetArrayIndex >=
            context.entries.length
            ) {
            showToast("End of setlist");
            return;
            }

            const targetEntry =
            context.entries[targetArrayIndex];

            const targetMusicId =
            targetEntry.music_id;

            const allMusic =
            await getMusicWithAllData();

            const fullItem = allMusic.find(
            item => item.id === targetMusicId
            );

            if (!fullItem?.uri) {
            return;
            }

            const targetPage =
            openAt === "last"
                ? targetEntry.end_page ??
                await AriaScorePdfRenderer.getPageCount(
                    fullItem.uri
                )
                : targetEntry.start_page ?? 1;

            navigation.replace("Reader", {
            uri: fullItem.uri,
            musicId: targetMusicId,
            startPage: targetPage,
            origin: "setlist",
            context: {
                ...context,
                currentIndex:
                targetArrayIndex + 1,
            },
            });
        },
        [
            context,
            navigation,
            showToast,
        ]
        );

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        if (musicId) {
            markMusicAsOpened(musicId);
        }
    }, [musicId]);

    if (!uri) {
        return <Text>No PDF selected.</Text>;
    }

    if (!musicId) {
        return <Text>No PDF selected.</Text>;
    }

    if (!settings || !music) {
        return (
            <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text>Opening score...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <BufferedPDFViewer 
                uri={uri} 
                musicId={musicId}
                score={{
                    title: music?.title ?? "Untitled",
                    document_type:
                        music?.document_type ?? "Single Work",
                    composer: music?.composer ?? "",
                    arranger: music?.arranger ?? "",
                    editor: music?.editor ?? "",
                    publisher: music?.publisher ?? "",
                    notes: music?.notes ?? "",
                    labels: music?.labels ?? [],
                }}
                // onMetadataUpdated={async () => {
                //     await loadMetadata();
                // }}
                onPreviousScore={() => {
                    if (!context) return;
                    return openSetlistScore(
                        context.currentIndex - 2,
                        "first"
                    );
                }}

                onNextScore={() => {
                    if (!context) return;
                    return openSetlistScore(
                        context.currentIndex,
                        "first"
                    );
                }}

                onPreviousScoreFromPageTurn={() => {
                    if (!context) return;
                    return openSetlistScore(
                        context.currentIndex - 2,
                        "last"
                    );
                }}

                onNextScoreFromPageTurn={() => {
                    if (!context) return;
                    return openSetlistScore(
                        context.currentIndex,
                        "first"
                    );
                }}
                context={context}
                initialPage={startPage}
                settings={settings}
                toastVisible = {toastVisible}
                toastMessage = {toastMessage}
            />
        </SafeAreaView>
    );
};



export default ReaderScreen;
