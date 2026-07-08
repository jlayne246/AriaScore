import { Modal, View, TextInput, TouchableOpacity, Text, FlatList } from 'react-native';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MusicItemWithAllData } from '../types';

interface AddScoreToSetlistModalProps {
  visible: boolean;
  scores: MusicItemWithAllData[];
  existingMusicIds: number[];
  onClose: () => void;
  onAdd: (selectedIds: number[]) => void;
}

const AddScoreToSetlistModal = ({
  visible,
  scores,
  existingMusicIds,
  onClose,
  onAdd,
}: AddScoreToSetlistModalProps) => {
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const availableScores = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return scores
      .filter(score => score.id && !existingMusicIds.includes(score.id))
      .filter(score => {
        if (!query) return true;

        const title = (score.metadata?.title ?? score.title ?? '').toLowerCase();
        const creator = (
          score.metadata?.composer ??
          score.metadata?.editor ??
          score.metadata?.publisher ??
          ''
        ).toLowerCase();

        return title.includes(query) || creator.includes(query);
      });
  }, [scores, existingMusicIds, searchText]);

  const toggleScore = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(existingId => existingId !== id)
        : [...prev, id]
    );
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    setSelectedIds([]);
    setSearchText('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            maxHeight: '80%',
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '400', marginBottom: 14 }}>
            Add Scores
          </Text>

          <TextInput
            placeholder="Search scores..."
            value={searchText}
            onChangeText={setSearchText}
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
            }}
          />

          <FlatList
            data={availableScores}
            keyExtractor={item => item.id!.toString()}
            renderItem={({ item }) => {
              const id = item.id!;
              const selected = selectedIds.includes(id);

              return (
                <TouchableOpacity
                  onPress={() => toggleScore(id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                  }}
                >
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color="#2563EB"
                  />

                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>
                      {item.metadata?.title ?? item.title}
                    </Text>

                    <Text style={{ color: '#6B7280' }}>
                      {item.metadata?.composer?.trim() ||
                        item.metadata?.editor?.trim() ||
                        item.metadata?.publisher?.trim() ||
                        'Unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: '#6B7280', textAlign: 'center', padding: 20 }}>
                No scores available to add.
              </Text>
            }
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 12,
            }}
          >
            <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
              <Text style={{ fontSize: 16, color: '#6B7280', paddingHorizontal: 16,
                paddingVertical: 10, }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedIds.length === 0}
              style={{
                backgroundColor: selectedIds.length === 0 ? '#9CA3AF' : '#2563EB',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                Add ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddScoreToSetlistModal;