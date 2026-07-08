import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  RootStackParamList,
  MusicItemWithAllData,
  MetadataFormData,
  ACCENT_COLOR,
} from '../types';

import { UploadLocalPDF } from '../utils/fileUtils';
import {
  initDB,
  insertMusic,
  getMusicWithAllData,
  deleteMusic,
  saveCompleteMetadata,
  metadataExists,
  musicExistsByUri,
} from '../utils/database';

import MusicItemCard from '../components/MusicItemCard';
import MetadataForm from '../components/MetadataForm';
import DeleteModal from '../components/DeleteModal';

type FilterOption = 'title' | 'composer' | 'setlist' | 'any';

const filterButtons = ['Any', 'Title', 'Creator', 'Setlist'];

const filterMap: Record<number, FilterOption> = {
  0: 'any',
  1: 'title',
  2: 'composer',
  3: 'setlist',
};

// type LibraryScreenProps = {
//     pendingImport?: {
//         uri: string;
//         originalFilename: string;
//     }
// };


const LibraryScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Library'>>();

  const [musicList, setMusicList] = useState<MusicItemWithAllData[]>([]);
  const [selectedMusicId, setSelectedMusicId] = useState<number | undefined>();
  const [deletedMusicId, setDeletedMusicId] = useState<number | undefined>();

  const [pendingPdfUri, setPendingPdfUri] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string>("Imported PDF.pdf");
  const [prefilledTitle, setPrefilledTitle] = useState<string | undefined>();

  const [infoboxMode, setInfoboxMode] = useState<'new' | 'edit'>('new');
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('any');

  const [showAZ, setShowAZ] = useState(false);
  const [indicatorLetter, setIndicatorLetter] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sectionListRef = useRef<SectionList<MusicItemWithAllData>>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const route = useRoute<RouteProp<RootStackParamList, "Library">>();

    useEffect(() => {
        const pendingImport = route.params?.pendingImport;

        if (!pendingImport) return;

        const filename =
            pendingImport.originalFilename ?? "Imported PDF.pdf";

        const title = filename.replace(/\.pdf$/i, "");

        setPendingPdfUri(pendingImport.uri);
        setOriginalFilename(filename);
        setPrefilledTitle(title);
        setSelectedMusicId(undefined);
        setInfoboxMode("new");
        setShowMetadataForm(true);

        navigation.setParams({ pendingImport: undefined });
    }, [route.params?.pendingImport]);

    useFocusEffect(
        useCallback(() => {
            loadMusic();
        }, [])
    );

    useEffect(() => {
        // initDB();
        loadMusic();
    }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
        header: () => (
        <View
            style={{
            height: 92,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
            justifyContent: 'flex-end',
            paddingHorizontal: 20,
            paddingBottom: 12,
            }}
        >
            <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
            >
              <View
                    style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flex: 1,
                    }}
                >
                  <TouchableOpacity
                      onPress={() => navigation.goBack()}
                      style={{ marginRight: 12 }}
                      >
                      <Ionicons
                          name="chevron-back"
                          size={28}
                          color={ACCENT_COLOR}
                      />
                      </TouchableOpacity>
                  <Text
                      style={{
                      fontSize: 24,
                      // fontWeight: '700',
                      fontWeight: '300',
                      color: '#111827',
                      }}
                  >
                      Library
                  </Text>
                </View>

            <TouchableOpacity
                onPress={handleImport}
                style={{
                    // width: 42,
                    // height: 42,
                    // borderRadius: 7,
                    // backgroundColor: '#2563EB',
                    // alignItems: 'center',
                    // justifyContent: 'center',
                }}
            >
                <Ionicons name="add" size={28} color="#2563EB" />
            </TouchableOpacity>
            </View>
        </View>
        ),
    });
    }, [navigation]);


  const loadMusic = async () => {
    try {
      const results = await getMusicWithAllData();
      console.log(`Music loaded: ${results.length}`)
      setMusicList(results);
    } catch (error) {
      console.error('Failed to load music:', error);
    }
  };

  const refreshMusicList = async () => {
    setRefreshing(true);
    await loadMusic();
    setRefreshing(false);
  };

  const handleImport = async () => {
    const uri = await UploadLocalPDF();

    if (!uri) return;

    const rawTitle = uri.originalFilename.split('/').pop() || 'Untitled';
    const title = rawTitle.replace('.pdf', '');

    console.log("URI: ", uri);
    console.log("title: ", title);

    setPendingPdfUri(uri.uri);
    setOriginalFilename(uri.originalFilename);
    setPrefilledTitle(title);
    setSelectedMusicId(undefined);
    setInfoboxMode('new');
    setShowMetadataForm(true);
  };

  const handleEditMetadata = (
    musicId: number,
    _musicTitle: string,
    musicUri: string
  ) => {
    setSelectedMusicId(musicId);
    setPendingPdfUri(musicUri);
    setPrefilledTitle(undefined);
    setInfoboxMode('edit');
    setShowMetadataForm(true);
  };

  const handleMetadataSave = async (formData?: MetadataFormData) => {
    setShowMetadataForm(false);

    if (infoboxMode === 'edit' && selectedMusicId) {
      setSelectedMusicId(undefined);
      setPrefilledTitle(undefined);
      setPendingPdfUri(null);
      await loadMusic();
      return;
    }

    if (formData && pendingPdfUri) {
      try {
        const now = new Date().toISOString();

        const duplicate = await metadataExists(
          formData.title,
          formData.composer || ''
        );

        if (duplicate) {
          Alert.alert(
            'Duplicate music',
            'A piece with this title and creator already exists.'
          );
          setPendingPdfUri(null);
          return;
        }

        const duplicateUri = await musicExistsByUri(pendingPdfUri);

        if (duplicateUri) {
          Alert.alert(
            'Duplicate PDF',
            'This PDF has already been imported into your library.'
          );
          setPendingPdfUri(null);
          return;
        }

        const cleanSetlists = (formData.setlists ?? []).filter(
          (setlist) => setlist !== 'Ungrouped'
        );

        console.log("Saving original filename:", originalFilename);

        const insertedId = await insertMusic(
          formData.title,
          pendingPdfUri,
          originalFilename,
          cleanSetlists,
          now
        );

        await saveCompleteMetadata(
          insertedId,
          {
            title: formData.title,
            document_type: formData.document_type || 'Single Work',
            composer: formData.composer || '',
            arranger: formData.arranger || '',
            editor: formData.editor || '',
            publisher: formData.publisher || '',
            genre: formData.genre || '',
            key_signature: formData.key_signature || '',
            time_signature: formData.time_signature || '',
            page_count: formData.page_count || 0,
            created_at: now,
            updated_at: now,
          },
          formData.labels || []
        );

        await loadMusic();

        navigation.navigate('Reader', {
          uri: pendingPdfUri,
          musicId: insertedId,
        } as any);
      } catch (error) {
        console.error('Error saving music and metadata:', error);
      }
    }

    setSelectedMusicId(undefined);
    setPrefilledTitle(undefined);
    setPendingPdfUri(null);
  };

  const handleMetadataCancel = () => {
    setShowMetadataForm(false);
    setSelectedMusicId(undefined);
    setPrefilledTitle(undefined);
    setPendingPdfUri(null);
  };

  const handleDelete = (id: number) => {
    setDeletedMusicId(id);
    setShowDeleteForm(true);
  };

  const openPDF = (item: MusicItemWithAllData) => {
    if (!item.uri || !item.id) return;

    navigation.navigate('Reader', {
      uri: item.uri,
      musicId: item.id,
    });
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredMusic = musicList.filter((item) => {
    if (!query) return true;

    const metadata = item.metadata;

    const title = (metadata?.title ?? item.title ?? '').toLowerCase();
    const composer = (metadata?.composer ?? '').toLowerCase();
    const editor = (metadata?.editor ?? '').toLowerCase();
    const publisher = (metadata?.publisher ?? '').toLowerCase();
    const genre = (metadata?.genre ?? '').toLowerCase();
    const documentType = (metadata?.document_type ?? '').toLowerCase();

    const setlists = item.setlists ?? [];
    const labels = metadata?.labels ?? [];

    const setlistMatch = setlists.some((setlist) =>
      setlist.toLowerCase().includes(query)
    );

    const labelMatch = labels.some((label) =>
      label.toLowerCase().includes(query)
    );

    if (filterBy === 'title') return title.includes(query);

    if (filterBy === 'composer') {
      return (
        composer.includes(query) ||
        editor.includes(query) ||
        publisher.includes(query)
      );
    }

    if (filterBy === 'setlist') return setlistMatch;

    return (
      title.includes(query) ||
      composer.includes(query) ||
      editor.includes(query) ||
      publisher.includes(query) ||
      genre.includes(query) ||
      documentType.includes(query) ||
      setlistMatch ||
      labelMatch
    );
  });

  const groupMusicByLetter = (items: MusicItemWithAllData[]) => {
    const grouped: Record<string, MusicItemWithAllData[]> = {};

    items.forEach((item) => {
      const title = item.metadata?.title ?? item.title ?? '';
      const letter = title[0]?.toUpperCase() || '#';

      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    });

    return Object.keys(grouped)
      .sort()
      .map((letter) => ({
        title: letter,
        data: grouped[letter],
      }));
  };

  const sections = groupMusicByLetter(filteredMusic);

  const flashLetter = (letter: string) => {
    setIndicatorLetter(letter);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }, 700);
    });
  };

  const scrollToLetter = (letter: string) => {
    const index = sections.findIndex((section) => section.title === letter);

    if (index === -1) return;

    sectionListRef.current?.scrollToLocation({
      sectionIndex: index,
      itemIndex: 0,
      animated: true,
    });

    flashLetter(letter);
    setTimeout(() => setShowAZ(false), 1000);
  };

  const renderMusicItem = ({ item }: { item: MusicItemWithAllData }) => (
    <MusicItemCard
      item={item}
      onOpen={() => openPDF(item)}
      onEditMetadata={() =>
        item.id &&
        handleEditMetadata(
          item.id,
          item.metadata?.title ?? item.title ?? 'Untitled',
          item.uri
        )
      }
      onDelete={() => item.id && handleDelete(item.id)}
      onShare={() => console.log(`Share ${item.id}`)}
    />
  );

  const filterLabel =
    filterBy === 'any'
      ? 'Any'
      : filterBy === 'composer'
      ? 'Creator'
      : filterBy.charAt(0).toUpperCase() + filterBy.slice(1);

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          backgroundColor: 'white',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F3F4F6',
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 46,
            }}
          >
            <Ionicons name="search" size={20} color="#6B7280" />

            <TextInput
              placeholder="Search library..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#888"
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: '#111827',
              }}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <Menu>
            <MenuTrigger>
              <View
                style={{
                  height: 46,
                  width: 118,
                  borderRadius: 14,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Ionicons name="filter" size={18} color="#2563EB" />

                <Text style={{ color: '#2563EB', fontWeight: '600' }}>
                  {filterLabel}
                </Text>
              </View>
            </MenuTrigger>

            <MenuOptions>
              {filterButtons.map((button, index) => {
                const value = filterMap[index];
                const selected = filterBy === value;

                return (
                  <MenuOption
                    key={button}
                    onSelect={() => setFilterBy(value)}
                  >
                    <Text
                      style={{
                        padding: 10,
                        fontSize: 15,
                        color: selected ? '#2563EB' : '#111827',
                        fontWeight: selected ? '700' : '400',
                      }}
                    >
                      {button}
                    </Text>
                  </MenuOption>
                );
              })}
            </MenuOptions>
          </Menu>
        </View>

        {query.length > 0 && (
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: '#6B7280',
            }}
          >
            {sections.length > 0
              ? `Showing results for "${searchQuery}"`
              : `No results found for "${searchQuery}"`}
          </Text>
        )}
      </View>

      {musicList.length > 0 ? (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
          renderItem={renderMusicItem}
          renderSectionHeader={({ section: { title } }) => (
            <View
                style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 4,
                backgroundColor: 'white',
                }}
            >
                <Text
                style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#9CA3AF',
                    letterSpacing: 0.5,
                }}
                >
                {title}
                </Text>
            </View>
            )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshMusicList} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 110,
          }}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-sm text-gray-600">
            No music in library. Press + to add music.
          </Text>
        </View>
      )}

      <TouchableOpacity
        className="absolute right-4 bottom-24 bg-gray-800 px-3 py-2 rounded-full"
        onPress={() => setShowAZ(true)}
      >
        <Text className="text-white text-sm font-medium">A–Z</Text>
      </TouchableOpacity>

      {showAZ && (
        <View className="absolute right-1 top-20 bottom-20 justify-center items-center bg-white/90 rounded-md px-1">
          {alphabet.map((letter) => (
            <TouchableOpacity key={letter} onPress={() => scrollToLetter(letter)}>
              <Text className="text-xs text-gray-600 py-0.5 px-1">
                {letter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {indicatorLetter !== '' && (
        <Animated.View
          style={{
            opacity: fadeAnim,
            position: 'absolute',
            alignSelf: 'center',
            top: '45%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: 20,
            borderRadius: 12,
          }}
        >
          <Text className="text-white text-3xl font-bold">
            {indicatorLetter}
          </Text>
        </Animated.View>
      )}

      <MetadataForm
        visible={showMetadataForm}
        musicId={selectedMusicId}
        pdfUri={pendingPdfUri ?? undefined}
        initialTitle={prefilledTitle}
        onSave={handleMetadataSave}
        onCancel={handleMetadataCancel}
        mode={infoboxMode}
      />

      {showDeleteForm && (
        <DeleteModal
          itemId={deletedMusicId!}
          onCancel={() => setShowDeleteForm(false)}
          onDelete={async () => {
            if (deletedMusicId) await deleteMusic(deletedMusicId);
            setShowDeleteForm(false);
            setDeletedMusicId(undefined);
            await refreshMusicList();
          }}
        />
      )}

      {/* <TouchableOpacity
        className="absolute bottom-6 right-6 bg-blue-500 rounded w-14 h-14 justify-center items-center shadow-md shadow-black/20 elevation-5"
        onPress={handleImport}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity> */}
    </View>
  );
};

export default LibraryScreen;
