import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, Alert } from 'react-native';

import { useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PDFViewer from '../components/PDFViewer';
import BufferedPDFViewer from '../components/BufferedPDFViewer';

import { MusicMetadataWithLabels, ReaderContext, RootStackParamList } from '../types';
import { getMusicWithAllData, getMusicWithMetadata, markMusicAsOpened, saveSetlistProgress } from '../utils/database';
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';
import { getResolvedReaderSettings } from '../utils/settings/resolver';
import { ReaderSettings } from '../utils/settings/types';

type ReaderScreenProps = {
    route: RouteProp<RootStackParamList, 'Reader'>;
    navigation: any;
};

const ReaderScreen = ({ route }: ReaderScreenProps) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { uri, musicId, context, startPage } = route.params as { uri: string; musicId?: number, context: ReaderContext, startPage?: number };

    const [title, setTitle] = useState("Untitled");
    const [composer, setComposer] = useState("");
    const [setlistLabel, setSetlistLabel] = useState("");
    const [music, setMusic] = useState<any>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [settings, setSettings] = useState<ReaderSettings>()

    const loadSettings = useCallback(async () => {
        if (!musicId) return;

        try {
            const resolved = await getResolvedReaderSettings(
                musicId,
                context?.setlistId
            );

            setSettings(resolved);
        } catch (error) {
            console.error("Failed to load reader settings:", error);
        }
    }, [musicId, context?.setlistId]);

    useFocusEffect(
        useCallback(() => {
            void loadSettings();
        }, [loadSettings])
    );
    

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

    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
    };

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

    const openSetlistScore = async (
        nextIndex: number,
        openAt: "first" | "last" = "first"
    ) => {
        if (!context?.musicIds?.length) return;

        if (nextIndex < 0) {
            showToast("Start of setlist");
            return;
        }

        if (nextIndex >= context.musicIds.length) {
            showToast("End of setlist");
            return;
        }

        const nextMusicId = context.musicIds[nextIndex];

        const allMusic = await getMusicWithAllData();
        const fullItem = allMusic.find(item => item.id === nextMusicId);

        if (!fullItem?.uri) return;

        let startPage = 1;

        if (openAt === "last") {
            startPage = await AriaScorePdfRenderer.getPageCount(fullItem.uri);
        }

        navigation.replace("Reader", {
            uri: fullItem.uri,
            musicId: nextMusicId,
            startPage,
            context: {
            ...context,
            currentIndex: nextIndex + 1,
            },
        });
    };

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
                    title: music?.metadata?.title ?? music?.title ?? "Untitled",
                    document_type: music?.document_type ?? "Single Work",
                    composer: music?.composer ?? "",
                    arranger: music?.arranger ?? "",
                    editor: music?.editor ?? "",
                    publisher: music?.publisher ?? "",
                    notes: music?.notes ?? "",
                    labels: music?.labels ?? [],
                }}
                onMetadataUpdated={async () => {
                    await loadMetadata();
                }}
                onPreviousScore={() =>
                    openSetlistScore(context.currentIndex - 2, "first")
                }

                onNextScore={() =>
                    openSetlistScore(context.currentIndex, "first")
                }

                onPreviousScoreFromPageTurn={() =>
                    openSetlistScore(context.currentIndex - 2, "last")
                }

                onNextScoreFromPageTurn={() =>
                    openSetlistScore(context.currentIndex, "first")
                }
                context={context}
                initialPage={startPage}
                settings={settings}
            />

            {toastVisible && (
                <View
                    style={{
                    position: "absolute",
                    bottom: 30,
                    alignSelf: "center",
                    backgroundColor: "rgba(0,0,0,0.85)",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    }}
                >
                    <Text style={{ color: "white" }}>
                    {toastMessage}
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
};



export default ReaderScreen;
