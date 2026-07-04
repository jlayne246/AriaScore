import { Modal, View, TextInput, TouchableOpacity, Text, FlatList } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MusicItemWithAllData, SetlistSummary } from '../types';
import {createSetlist, getSetlistSummaries, getSetlistsForMusicByIds, setMusicSetlistsByIds} from '../utils/database'

interface ManageSetlistsModalProps {
  visible: boolean;
  musicId: number;
  onClose: () => void;
  onSaved: () => void;
}

const ManageSetlistsModal: React.FC<ManageSetlistsModalProps> = (
    {visible, musicId, onClose, onSaved}) => {
        
    const [setlists, setSetlists] = useState<SetlistSummary[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchText, setSearchText] = useState("");
    const [addNewSetlist, setAddNewSetlist] = useState(false);
    const [newSetlistName, setNewSetlistName] = useState("");

    useEffect(() => {
        if (!visible) return;

        const load = async () => {
            const all = await getSetlistSummaries();
            const selected = await getSetlistsForMusicByIds(musicId);

            setSetlists(all);
            setSelectedIds(selected);
        };

        load();
    }, [visible, musicId]);

    const toggleSetlist = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
            ? prev.filter(existingId => existingId !== id)
            : [...prev, id]
        );
    };

    const filteredSetlists = setlists.filter(setlist =>
        setlist.name.toLowerCase().includes(searchText.trim().toLowerCase())
    );


    const handleCreateSetlist = async () => {
        console.log("Creating setlist with name:", newSetlistName);
        const name = newSetlistName.trim();
        if (!name) return;

        const newId = await createSetlist(name);

        const all = await getSetlistSummaries();

        setSetlists(all);
        setSelectedIds(prev => [...prev, newId]);
        setNewSetlistName("");
    };

    const handleSave = async () => {
        await setMusicSetlistsByIds(musicId, selectedIds);

        onSaved();
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View
                style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.35)",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                }}
            >
                <View
                style={{
                    width: "72%",
                    maxWidth: 560,
                    maxHeight: "78%",
                    backgroundColor: "white",
                    borderRadius: 18,
                    padding: 20,
                }}
                >
                <View
                    style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                    }}
                >
                    <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827" }}>
                    Manage Setlists
                    </Text>

                    <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={26} color="#2563EB" />
                    </TouchableOpacity>
                </View>

                <TextInput
                    placeholder="Search setlists..."
                    value={searchText}
                    onChangeText={setSearchText}
                    style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 16,
                    marginBottom: 12,
                    }}
                />

                <FlatList
                    data={filteredSetlists}
                    keyExtractor={(item) => item.id.toString()}
                    style={{ maxHeight: 320 }}
                    renderItem={({ item }) => {
                    const selected = selectedIds.includes(item.id);

                    return (
                        <TouchableOpacity
                        onPress={() => toggleSetlist(item.id)}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: "#F3F4F6",
                        }}
                        >
                        <Ionicons
                            name={selected ? "checkbox" : "square-outline"}
                            size={24}
                            color="#2563EB"
                        />

                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
                            {item.name}
                            </Text>

                            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            {item.item_count} scores
                            </Text>
                        </View>
                        </TouchableOpacity>
                    );
                    }}
                />

                {addNewSetlist && (
                    <View style={{ marginTop: 16, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10 }}>
                    <TextInput
                        placeholder="New setlist name..."
                        value={newSetlistName}
                        onChangeText={setNewSetlistName}
                        style={{
                            borderWidth: 1,
                            borderColor: "#D1D5DB",
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 16,
                            marginTop: 14,
                        }}
                    />
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 16 }} >
                        <TouchableOpacity
                        onPress={setAddNewSetlist.bind(null, false)}
                        style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 14,
                        paddingVertical: 10,
                        }}
                    >
                        <Text style={{ marginLeft: 8, color: "#6B7280", fontWeight: "700" }}>
                        Cancel
                        </Text>
                    </TouchableOpacity>
                        <TouchableOpacity
                        onPress={handleCreateSetlist}
                        style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 14,
                        paddingVertical: 10,
                        }}
                    >
                        <Text style={{ marginLeft: 8, color: "#2563EB", fontWeight: "700" }}>
                        Add Setlist
                        </Text>
                    </TouchableOpacity>
                    </View>
                    </View>
                )}

                {!addNewSetlist && (
                    <TouchableOpacity
                        onPress={() => setAddNewSetlist(true)}
                        style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 14,
                        paddingVertical: 10,
                        }}
                    >
                        <Ionicons name="add" size={22} color="#2563EB" />
                        <Text style={{ marginLeft: 8, color: "#2563EB", fontWeight: "700" }}>
                        New Setlist
                        </Text>
                    </TouchableOpacity>
                )}

                <View
                    style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 16,
                    marginTop: 18,
                    }}
                >
                    <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSave}>
                    <Text style={{ color: "#2563EB", fontWeight: "700", fontSize: 16 }}>
                        Save
                    </Text>
                    </TouchableOpacity>
                </View>
                </View>
            </View>
            </Modal>
    )
}

export default ManageSetlistsModal;