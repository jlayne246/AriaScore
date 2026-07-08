import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { RefreshControl, View, ScrollView, Text, FlatList, SectionList, Animated, Button, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MusicItem, MusicItemWithAllData, MetadataFormData, MusicMetadata, ACCENT_COLOR } from '../types';

import {MaterialIcons, Ionicons} from '@expo/vector-icons';
import * as SolarIconSet from "solar-icon-set";

import MusicItemCard from '../components/MusicItemCard';
import MetadataForm from '../components/MetadataForm';

import { UploadLocalPDF } from '../utils/fileUtils';
import { initDB, insertMusic, getMusicWithAllData, getMusicByMultipleSetlists, deleteMusic, saveCompleteMetadata, metadataExists, musicExistsByUri, getRecentlyOpenedMusic } from "../utils/database";

import * as troubleshooting from "../utils/troubleshooting";
import DeleteModal from '../components/DeleteModal';
import AriaScorePdfRenderer from '../native/AriaScorePdfRenderer';
import { Pressable } from 'react-native-gesture-handler';

const DashboardScreen = ({}) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [selectedMusicId, setSelectedMusicId] = useState<number | undefined>();
    const [pendingPdfUri, setPendingPdfUri] = useState<string | null>(null);
    const [pendingOriginalFilename, setPendingOriginalFilename] =
        useState<string>("Imported PDF.pdf");
    const [prefilledTitle, setPrefilledTitle] = useState<string | undefined>();
    const [infoboxMode, setInfoboxMode] = useState<string>("new");
    const [showMetadataForm, setShowMetadataForm] = useState(false);
    const [showDeleteForm, setShowDeleteForm] = useState(false);
    const [deletedMusicId, setDeletedMusicId] = useState<number>();
    const [menuOpen, setMenuOpen] = useState(false);

    const styles = StyleSheet.create({
      menuItem: {
        padding: 12,
        fontSize: 16,
        color: '#111827',
      },
      menuOption: {
        paddingHorizontal: 4,
      },
    });

    useLayoutEffect(() => {
        navigation.setOptions({
            header: () => (
                <View
                    style={{
                        height: 100,
                        backgroundColor: 'white',
                        justifyContent: 'flex-end',
                        padding: 12,
                    }}
                >
                    <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                    >
                        <Text
                            style={{
                                color: 'black',
                                fontWeight: '300',
                                fontSize: 24,
                                padding: 12,
                                marginLeft: 20,
                                marginTop: 12,
                            }}
                        >
                            AriaScore
                        </Text>
                        {/* <Menu>
                          <MenuTrigger>
                            <Ionicons
                              name="ellipsis-vertical"
                              size={24}
                              color="#111827"
                            />
                          </MenuTrigger>
                        
                          <MenuOptions>
                            <MenuOption style={styles.menuOption} onSelect={() => navigation.navigate('Settings')}>
                              <Text style={styles.menuItem}>Settings</Text>
                            </MenuOption>
                        
                            <MenuOption style={styles.menuOption} onSelect={() => Alert.alert('Coming Soon')}>
                              <Text style={styles.menuItem}>Account & Sync</Text>
                            </MenuOption>
                        
                            <MenuOption style={styles.menuOption} onSelect={() => Alert.alert('Coming Soon')}>
                              <Text style={styles.menuItem}>Backups</Text>
                            </MenuOption>
                    
                            <MenuOption style={styles.menuOption} onSelect={() => Alert.alert('Coming Soon')}>
                              <Text style={styles.menuItem}>About AriaScore</Text>
                            </MenuOption>
                          </MenuOptions>
                        </Menu> */}

                        <Pressable onPress={() => setMenuOpen(true)}>
                            <Ionicons name="menu-outline" style={{fontSize: 28, color: ACCENT_COLOR, marginRight: 20, marginTop: 12}}></Ionicons>
                        </Pressable>
                    </View>
                </View>
            ),
            });

    }, [navigation]);

    const [recentMusicItems, setRecentMusicItems] = useState<MusicItemWithAllData[]>([]);

    const loadRecentItems = async () => {
        try {
            const recent = await getRecentlyOpenedMusic(10);
            setRecentMusicItems(recent);
        } catch (error) {
            console.error("Failed to load recent items:", error);
        }
    };

    useEffect(() => {
        loadRecentItems();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadRecentItems();
        }, [])
    );

    const handleImport = async () => {
            const uri = await UploadLocalPDF();
        
            if (uri) {
            const raw_title = uri.originalFilename.split('/').pop() || 'Untitled';
            const title = raw_title.replace('.pdf', '');
        
            setPendingPdfUri(uri.uri);              // store the file path
            setPendingOriginalFilename(uri.originalFilename);
            setPrefilledTitle(title);          // prefill title for metadata form
            setInfoboxMode("new"); 
            setShowMetadataForm(true);         // show metadata form
            }
        };

    const handleDelete = async (id: number) => {
        console.log("Handling Delete")
        setShowDeleteForm(true);
        setDeletedMusicId(id);
    }

    const [openingId, setOpeningId] = useState<number | null>(null);

    const openPDF = (item: MusicItemWithAllData) => {
        if (!item.uri || openingId === item.id) return;

        setOpeningId(item.id ?? null);

        navigation.navigate("Reader", {
            uri: item.uri,
            musicId: item.id!,
        });

        setTimeout(() => setOpeningId(null), 1000);
    };

    const handleMetadataSave = async (formData?: MetadataFormData) => {
        setShowMetadataForm(false);

        // EDIT MODE: MetadataForm already saved to SQLite.
        if (infoboxMode === "edit" && selectedMusicId) {
            setSelectedMusicId(undefined);
            setPrefilledTitle(undefined);
            setPendingPdfUri(null);
            await loadRecentItems();
            return;
        }

        // ADD MODE
        if (formData && pendingPdfUri) {
            try {
            const now = new Date().toISOString();

            const duplicate = await metadataExists(
                formData.title,
                formData.composer || ""
            );

            if (duplicate) {
                Alert.alert(
                "Duplicate music",
                "A piece with this title and composer already exists."
                );
                setPendingPdfUri(null);
                return;
            }

            const duplicateUri = await musicExistsByUri(pendingPdfUri);

            if (duplicateUri) {
                Alert.alert(
                "Duplicate PDF",
                "This PDF has already been imported into your library."
                );
                setPendingPdfUri(null);
                return;
            }

            const cleanSetlists = (formData.setlists ?? []).filter(
                g => g !== "Ungrouped"
            );

            const insertedId = await insertMusic(
                formData.title,
                pendingPdfUri,
                pendingOriginalFilename,
                cleanSetlists,
                now
            );

            const pageCount = await AriaScorePdfRenderer.getPageCount(pendingPdfUri);

            console.log("Page Count Dash: ", pageCount)

            const metadataToSave = {
                title: formData.title,
                document_type: formData.document_type,
                composer: formData.composer || "",
                arranger: formData.arranger || "",
                editor: formData.editor || "",
                publisher: formData.publisher || "",
                genre: formData.genre || "",
                key_signature: formData.key_signature || "",
                time_signature: formData.time_signature || "",
                page_count: formData.page_count || 0,
                created_at: now,
                updated_at: now,
            };

            await saveCompleteMetadata(
                insertedId,
                metadataToSave,
                formData.labels || []
            );

            navigation.navigate("Reader", {
                uri: pendingPdfUri,
                musicId: insertedId,
            } as any);
            } catch (err) {
            console.error("Error saving music and metadata:", err);
            }
        }

        setSelectedMusicId(undefined);
        setPrefilledTitle(undefined);
        setPendingPdfUri(null);
        };

    // Handle opening metadata form
    const handleEditMetadata = (musicId: number, musicTitle: string, musicUri: string) => {
        setSelectedMusicId(musicId);
        setPendingPdfUri(musicUri);
        setInfoboxMode("edit");
        setPrefilledTitle(undefined); // Clear prefilled title for existing items
        setShowMetadataForm(true);
    };
          
    
    // Handle metadata form cancel
    const handleMetadataCancel = () => {
        setShowMetadataForm(false);
        setSelectedMusicId(undefined);
        setPrefilledTitle(undefined); // Clear prefilled title
        setPendingPdfUri(null); // Clear pending PDF URI
    };

    type MenuRoute = "Settings" | "Backups" | "About";

    const menuItems: { label: string; screen: MenuRoute }[] = [
    { label: "Settings", screen: "Settings" },
    { label: "Backups and Export", screen: "Backups" },
    { label: "About", screen: "About" },
    ];

    return (
        <View className="flex-1 bg-white">
            {menuOpen && (
                <>
                    <Pressable
                    onPress={() => setMenuOpen(false)}
                    style={{
                        ...StyleSheet.absoluteFillObject,
                        zIndex: 99,
                    }}
                    />

                    <View
                    style={{
                        position: "absolute",
                        top: -10,
                        right: 16,
                        width: 180,
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        paddingVertical: 8,
                        zIndex: 100,
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 3 },
                    }}
                    >
                    {menuItems.map((item) => (
                        <Pressable
                        key={item.screen}
                        onPress={() => {
                            setMenuOpen(false);
                            navigation.navigate(item.screen);
                        }}
                        style={{
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                        }}
                        >
                        <Text style={{ fontSize: 16 }}>{item.label}</Text>
                        </Pressable>
                    ))}
                    </View>
                </>
                )}

            {/* Quick Options Menu */}
            <View className="flex-row justify-between pt-10 pb-10 mt-4 mb-4 bg-white shadow-md w-[75%] self-center rounded-lg">
                {/* Library */}
                <View className="flex-1 justify-center items-center">
                    <TouchableOpacity className="p-2 m-1 rounded justify-center items-center w-full" onPress={() => navigation.navigate('Library', {})}>
                        <MaterialIcons name="library-music" size={48} color="dodgerblue" />
                        <Text className="text-[16px] text-dodger p-1">Library</Text>
                    </TouchableOpacity>
                </View>

                <View className="w-px h-full bg-dodger" />

                {/* Sets */}
                <View className="flex-1 justify-center items-center">
                    <TouchableOpacity className="p-2 m-1 rounded justify-center items-center w-full" onPress={() => navigation.navigate('Setlists')}>
                        <Ionicons name="folder-open" size={48} color="dodgerblue" />
                        <Text className="text-[16px] text-dodger p-1">Sets</Text>
                    </TouchableOpacity>
                </View>

                <View className="w-px h-full bg-dodger" />

                {/* Add Score */}
                <View className="flex-1 justify-center items-center">
                    <TouchableOpacity className="p-2 m-1 rounded justify-center items-center w-full" onPress={handleImport}>
                        <MaterialIcons name="add" size={48} color="dodgerblue" />
                        <Text className="text-[16px] text-dodger p-1">Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View className='flex-1 ml-14'>
                <Text className="text-dodger text-xl mt-4">Recent Items</Text>

                {recentMusicItems && (recentMusicItems.length > 0) ? (
                    <FlatList
                        data={recentMusicItems}
                        renderItem={({ item }) => (
                            // <TouchableOpacity onPress={() => openPDF(item)}>
                                <MusicItemCard
                                    item={item}
                                    onOpen={() => openPDF(item)}
                                    onEditMetadata={() =>
                                        handleEditMetadata(item?.id!, item?.title, item?.uri)
                                    }
                                    onDelete={() => handleDelete(item?.id!)}
                                    onShare={() => console.log(`Share ${item?.id}`)}
                                />
                            // </TouchableOpacity>
                    )}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    contentContainerStyle={{ padding: 10 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={false}
                            onRefresh={() => console.log('Refreshing...')}
                        />
                    } />
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-gray-500 text-lg">No recent items.</Text>
                    </View>
                )}
            </View>

            {/* Placeholder for future content */}
            <MetadataForm
                visible={showMetadataForm}
                musicId={selectedMusicId}
                pdfUri={pendingPdfUri || undefined} // Pass the pending PDF URI to the form
                initialTitle={prefilledTitle} // New prop
                onSave={handleMetadataSave}
                onCancel={handleMetadataCancel}
                mode={infoboxMode}
            />

            {/* Delete Modal */}
            {showDeleteForm && (
                <DeleteModal
                    itemId={deletedMusicId!}
                    onCancel={() => setShowDeleteForm(false)}
                    onDelete={() => {
                        if (deletedMusicId) 
                            deleteMusic(deletedMusicId);
                        setShowDeleteForm(false); 
                        loadRecentItems();
                    }}
                />
            )}
        </View>
    )
}

export default DashboardScreen;
