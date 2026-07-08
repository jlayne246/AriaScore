// screens/BackupsScreen.tsx
import React, { useLayoutEffect } from "react";
import { ScrollView, Text, View, Pressable, TouchableOpacity } from "react-native";
import { ACCENT_COLOR } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function BackupsScreen() {

    const navigation =
        useNavigation();
        
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
                        Backups and Export
                    </Text>
                    </View>
                </View>
            </View>
            ),
        });
    }, [navigation]);
    
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          padding: 28,
          marginBottom: 20,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: "600", color: "#111" }}>
          Backups
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "#555",
            marginTop: 12,
          }}
        >
          Backup and restore features are planned for a future release.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 22,
          marginBottom: 20,
          elevation: 1,
        }}
      >
        <Text style={{ fontSize: 21, fontWeight: "700", color: "#111" }}>
          Planned Backup Options
        </Text>

        {[
          "Export a full JSON backup of your library",
          "Restore library metadata from a backup file",
          "Optional cloud backup support",
          "Backup setlists, metadata, bookmarks, and preferences",
          "Keep PDF files local unless explicitly included",
        ].map((item) => (
          <Text
            key={item}
            style={{
              fontSize: 16,
              lineHeight: 24,
              color: "#555",
              marginTop: 10,
            }}
          >
            • {item}
          </Text>
        ))}
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 22,
          marginBottom: 20,
          elevation: 1,
        }}
      >
        <Text style={{ fontSize: 21, fontWeight: "700", color: "#111" }}>
          Current Status
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "#555",
            marginTop: 10,
          }}
        >
          Your library is currently stored locally on this device. Backup and
          restore tools are not yet enabled.
        </Text>
      </View>

      <Pressable
        disabled
        style={{
          backgroundColor: "#c7cbd1",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
          Backup Not Available Yet
        </Text>
      </Pressable>
    </ScrollView>
  );
}