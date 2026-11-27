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
import { useAppTheme } from "../utils/theme/useAppTheme";

import {
  RootStackParamList,
  MusicItemWithAllData,
} from '../types';

import { UploadLocalPDF } from '../utils/fileUtils';
import {
  getMusicWithAllData,
  deleteMusic,
} from '../utils/database';

import MusicItemCard from '../components/MusicItemCard';
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
  const [deletedMusicId, setDeletedMusicId] = useState<number | undefined>();

  const [showDeleteForm, setShowDeleteForm] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('any');

  const [showAZ, setShowAZ] = useState(false);
  const [indicatorLetter, setIndicatorLetter] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useAppTheme();
  const sectionListRef = useRef<SectionList<MusicItemWithAllData>>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');



  const route = useRoute<RouteProp<RootStackParamList, "Library">>();

    useEffect(() => {
      const pendingImport =
        route.params?.pendingImport;

      if (!pendingImport) return;

      const filename =
        pendingImport.originalFilename ??
        "Imported PDF.pdf";

      const title =
        filename.replace(/\.pdf$/i, "");

      navigation.navigate("Metadata", {
        mode: "add",
        pdfUri: pendingImport.uri,
        initialTitle: title,
        originalFilename: filename,
      });

      navigation.setParams({
        pendingImport: undefined,
      });
    }, [
      route.params?.pendingImport,
      navigation,
    ]);

  useLayoutEffect(() => {
    navigation.setOptions({
        header: () => (
        <View
            style={{
            height: 92,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.separator,
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
                          color={colors.accent}
                      />
                      </TouchableOpacity>
                  <Text
                      style={{
                      fontSize: 24,
                      // fontWeight: '700',
                      color: colors.text,
                      fontWeight: '400',
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
                <Ionicons name="add" size={28} color={colors.accent} />
            </TouchableOpacity>
            </View>
        </View>
        ),
    });
    }, [navigation, colors]);


  const loadMusic = useCallback(async () => {
    try {
      const results =
        await getMusicWithAllData();

      console.log(
        `Music loaded: ${results.length}`
      );

      setMusicList(results);
    } catch (error) {
      console.error(
        "Failed to load music:",
        error
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMusic();
    }, [loadMusic])
  );

  const refreshMusicList = async () => {
    setRefreshing(true);
    await loadMusic();
    setRefreshing(false);
  };

  const handleImport = async () => {
    const file = await UploadLocalPDF();

    if (!file) return;

    const rawTitle =
      file.originalFilename
        .split("/")
        .pop() || "Untitled";

    const title =
      rawTitle.replace(/\.pdf$/i, "");

    navigation.navigate("Metadata", {
      mode: "add",
      pdfUri: file.uri,
      initialTitle: title,
      originalFilename: file.originalFilename,
    });
  };

  const handleDelete = (id: number) => {
    setDeletedMusicId(id);
    setShowDeleteForm(true);
  };

  const openPDF = (
    item: MusicItemWithAllData
  ) => {
    if (!item.uri || !item.id) return;

    navigation.navigate("Reader", {
      uri: item.uri,
      musicId: item.id,
      origin: "library",
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
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.background,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.separator,
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
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 46,
            }}
          >
            <Ionicons name="search" size={20} color={colors.secondaryText} />

            <TextInput
              cursorColor={colors.accent}
              selectionColor={colors.accent}
              placeholder="Search library..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.tertiaryText}
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: colors.text,
              }}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.tertiaryText} />
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
                  backgroundColor: colors.selectedBackground,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <Ionicons name="filter" size={18} color={colors.accent} />

                <Text style={{ color: colors.accent, fontWeight: '600' }}>
                  {filterLabel}
                </Text>
              </View>
            </MenuTrigger>

            <MenuOptions customStyles={{ optionsContainer: { backgroundColor: colors.elevated } }}>
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
                        color: selected ? colors.accent : colors.text,
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
              color: colors.secondaryText,
            }}
          >
            {sections.length > 0
              ? `Showing results for "${searchQuery}"`
              : `No results found for "${searchQuery}"`}
          </Text>
        )}
      </View>

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item, index) =>
          item.id?.toString() ??
          index.toString()
        }
        renderItem={renderMusicItem}
        renderSectionHeader={({
          section: { title },
        }) => (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 4,
              backgroundColor: colors.background,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: colors.text,
                letterSpacing: 0.5,
              }}
            >
              {title}
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.elevated}
            refreshing={refreshing}
            onRefresh={refreshMusicList}
          />
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingTop: 80,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 14,
                color: colors.secondaryText,
              }}
            >
              No music in library. Press + to add music.
            </Text>
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 110,
        }}
      />

      <TouchableOpacity
        className="absolute right-4 bottom-24 px-3 py-2 rounded-full"
        style={{ backgroundColor: colors.text }}
        onPress={() => setShowAZ(true)}
      >
        <Text className="text-sm font-medium" style={{ color: colors.background }}>A–Z</Text>
      </TouchableOpacity>

      {showAZ && (
        <View className="absolute right-1 top-20 bottom-20 justify-center items-center rounded-md px-1" style={{ backgroundColor: colors.elevated }}>
          {alphabet.map((letter) => (
            <TouchableOpacity key={letter} onPress={() => scrollToLetter(letter)}>
              <Text className="text-xs py-0.5 px-1" style={{ color: colors.secondaryText }}>
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
            backgroundColor: colors.toastBackground,
            padding: 20,
            borderRadius: 12,
          }}
        >
          <Text className="text-3xl font-bold" style={{ color: colors.toastText }}>
            {indicatorLetter}
          </Text>
        </Animated.View>
      )}

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
        className="absolute bottom-6 right-6 rounded w-14 h-14 justify-center items-center shadow-md shadow-black/20 elevation-5" style={{ backgroundColor: colors.accent }}
        onPress={handleImport}
      >
        <Ionicons name="add" size={32} color={colors.onAccent} />
      </TouchableOpacity> */}
    </View>
  );
};

export default LibraryScreen;
