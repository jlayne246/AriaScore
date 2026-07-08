// screens/OpenSourceLicensesScreen.tsx
import React, { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";

import licenses from "../src/generated/licenses.json";

type LicenseEntry = {
  licenses?: string | string[];
  repository?: string;
  url?: string;
};

type LicensesJson = Record<string, LicenseEntry>;

type NormalizedEntry = {
  rawName: string;
  packageName: string;
  displayName: string;
  licence: string;
  category: string;
  link?: string;
};

const featuredPackages = [
  "react",
  "react-native",
  "expo",
  "expo-application",
  "expo-asset",
  "expo-constants",
  "expo-document-picker",
  "expo-file-system",
  "expo-font",
  "expo-linking",
  "expo-share-intent",
  "expo-sqlite",
  "expo-status-bar",
  "expo-system-ui",
  "@expo/vector-icons",
  "@react-navigation/native",
  "@react-navigation/native-stack",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-pager-view",
  "react-native-pdf-renderer",
  "react-native-draggable-flatlist",
  "react-native-popup-menu",
  "nativewind",
];

const nameOverrides: Record<string, string> = {
  react: "React",
  "react-native": "React Native",
  expo: "Expo",
  "expo-application": "Expo Application",
  "expo-asset": "Expo Asset",
  "expo-constants": "Expo Constants",
  "expo-document-picker": "Expo Document Picker",
  "expo-file-system": "Expo File System",
  "expo-font": "Expo Font",
  "expo-linking": "Expo Linking",
  "expo-share-intent": "Expo Share Intent",
  "expo-sqlite": "Expo SQLite",
  "expo-status-bar": "Expo Status Bar",
  "expo-system-ui": "Expo System UI",
  "@expo/vector-icons": "Expo Vector Icons",
  "@react-navigation/native": "React Navigation",
  "@react-navigation/native-stack": "React Navigation Native Stack",
  "react-native-gesture-handler": "React Native Gesture Handler",
  "react-native-reanimated": "React Native Reanimated",
  "react-native-safe-area-context": "React Native Safe Area Context",
  "react-native-screens": "React Native Screens",
  "react-native-pager-view": "React Native Pager View",
  "react-native-pdf-renderer": "React Native PDF Renderer",
  "react-native-draggable-flatlist": "React Native Draggable FlatList",
  "react-native-popup-menu": "React Native Popup Menu",
  nativewind: "NativeWind",
};

const categoryOrder = [
  "Core Framework",
  "Expo Modules",
  "Navigation",
  "Storage & Database",
  "PDF & Documents",
  "UI, Icons & Interaction",
  "Build, Tooling & Runtime",
  "Testing",
  "Other Dependencies",
];

function getCategory(packageName: string) {
  const name = packageName.toLowerCase();

  if (
    name === "react" ||
    name === "react-native" ||
    name === "nativewind"
  ) {
    return "Core Framework";
  }

  if (
    name === "expo" ||
    name.startsWith("expo-") ||
    name.startsWith("@expo/")
  ) {
    return "Expo Modules";
  }

  if (
    name.includes("navigation") ||
    name.includes("gesture-handler") ||
    name.includes("safe-area") ||
    name.includes("screens")
  ) {
    return "Navigation";
  }

  if (
    name.includes("sqlite") ||
    name.includes("storage") ||
    name.includes("async-storage")
  ) {
    return "Storage & Database";
  }

  if (
    name.includes("pdf") ||
    name.includes("document") ||
    name.includes("file-system") ||
    name.includes("picker") ||
    name.includes("share")
  ) {
    return "PDF & Documents";
  }

  if (
    name.includes("icon") ||
    name.includes("vector") ||
    name.includes("font") ||
    name.includes("image") ||
    name.includes("svg") ||
    name.includes("reanimated") ||
    name.includes("pager") ||
    name.includes("popup") ||
    name.includes("draggable")
  ) {
    return "UI, Icons & Interaction";
  }

  if (
    name.startsWith("@babel/") ||
    name.includes("metro") ||
    name.includes("typescript") ||
    name.includes("tslib") ||
    name.includes("cli") ||
    name.includes("config") ||
    name.includes("runtime") ||
    name.includes("source-map")
  ) {
    return "Build, Tooling & Runtime";
  }

  if (
    name.includes("jest") ||
    name.includes("istanbul") ||
    name.includes("testing")
  ) {
    return "Testing";
  }

  return "Other Dependencies";
}

function cleanPackageName(rawName: string) {
  const atVersionIndex = rawName.lastIndexOf("@");

  if (rawName.startsWith("@")) {
    return rawName.slice(0, atVersionIndex);
  }

  return rawName.split("@")[0];
}

function getDisplayName(packageName: string) {
  return nameOverrides[packageName] ?? packageName;
}

function getLicenceText(info: LicenseEntry) {
  if (Array.isArray(info.licenses)) return info.licenses.join(", ");
  return info.licenses ?? "Unknown licence";
}

export default function OpenSourceLicensesScreen() {
  const [search, setSearch] = useState("");
  const [showFullInventory, setShowFullInventory] = useState(false);

  const entries = useMemo<NormalizedEntry[]>(() => {
    return Object.entries(licenses as LicensesJson)
      .map(([rawName, info]) => {
        const packageName = cleanPackageName(rawName);

        return {
          rawName,
          packageName,
          displayName: getDisplayName(packageName),
          licence: getLicenceText(info),
          category: getCategory(packageName),
          link: info.repository ?? info.url,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, []);

  const featuredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        featuredPackages.includes(entry.packageName)
      ),
    [entries]
  );

  const otherEntries = useMemo(
    () =>
      entries.filter(
        (entry) => !featuredPackages.includes(entry.packageName)
      ),
    [entries]
  );

  const filteredOtherEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return otherEntries;

    return otherEntries.filter((entry) => {
      return (
        entry.displayName.toLowerCase().includes(query) ||
        entry.packageName.toLowerCase().includes(query) ||
        entry.licence.toLowerCase().includes(query) ||
        entry.category.toLowerCase().includes(query)
      );
    });
  }, [search, otherEntries]);

  const sections = useMemo(() => {
    const grouped = filteredOtherEntries.reduce<
        Record<string, NormalizedEntry[]>
    >((groups, entry) => {
        groups[entry.category] ??= [];
        groups[entry.category].push(entry);
        return groups;
    }, {});

    return categoryOrder
        .filter((category) => grouped[category]?.length)
        .map((category) => ({
        title: category,
        data: grouped[category],
        }));
    }, [filteredOtherEntries]);

  return (
    <SectionList
      style={{
        flex: 1,
        backgroundColor: "#f6f7f9",
      }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 48,
      }}
      sections={showFullInventory ? sections : []}
      keyExtractor={(item) => item.rawName}
      ListHeaderComponent={
        <>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 24,
              padding: 28,
              marginBottom: 20,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                color: "#111",
              }}
            >
              Open Source Licences
            </Text>

            <Text
              style={{
                fontSize: 16,
                lineHeight: 24,
                color: "#555",
                marginTop: 12,
              }}
            >
              AriaScore uses open-source software. Each package remains the
              property of its respective authors and is used under its own
              licence.
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
            <Text
              style={{
                fontSize: 21,
                fontWeight: "700",
                color: "#111",
              }}
            >
              Primary Technologies
            </Text>

            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#555",
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              These are the main open-source projects AriaScore is built on.
            </Text>

            {featuredEntries.map((entry) => (
              <LicenceRow key={entry.rawName} entry={entry} />
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
            <Text
              style={{
                fontSize: 21,
                fontWeight: "700",
                color: "#111",
              }}
            >
              Full Licence Inventory
            </Text>

            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#555",
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              This includes AriaScore&apos;s transitive dependencies. It is
              provided for transparency and licence compliance.
            </Text>

            <Pressable
              onPress={() => setShowFullInventory((value) => !value)}
              style={{
                backgroundColor: "#1976d2",
                borderRadius: 14,
                paddingVertical: 13,
                paddingHorizontal: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {showFullInventory
                  ? "Hide Full Inventory"
                  : `Show Full Inventory (${otherEntries.length})`}
              </Text>
            </Pressable>
          </View>

          {showFullInventory && (
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search packages, categories, or licences..."
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                paddingHorizontal: 18,
                paddingVertical: 14,
                fontSize: 16,
                marginBottom: 20,
                elevation: 1,
              }}
            />
          )}
        </>
      }
      renderSectionHeader={({ section }) => (
        <Text
          style={{
            fontSize: 21,
            fontWeight: "800",
            color: "#111",
            marginBottom: 12,
            marginTop: 8,
          }}
        >
          {section.title} ({section.data.length})
        </Text>
      )}
      renderItem={({ item }) => <LicenceRow entry={item} />}
      ListFooterComponent={
        <Text
          style={{
            textAlign: "center",
            color: "#888",
            fontSize: 13,
            lineHeight: 20,
            marginTop: 8,
          }}
        >
          Licence information is generated from AriaScore&apos;s production
          dependencies.
        </Text>
      }
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={10}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function LicenceRow({ entry }: { entry: NormalizedEntry }) {
  return (
    <View
      style={{
        backgroundColor: "#f8f9fa",
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#111",
          marginBottom: 4,
        }}
      >
        {entry.displayName}
      </Text>

      <Text
        style={{
          fontSize: 13,
          color: "#777",
          marginBottom: 6,
        }}
      >
        {entry.packageName}
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: "#555",
        }}
      >
        {entry.licence}
      </Text>

      {entry.link && (
        <Pressable
          onPress={() => Linking.openURL(entry.link!)}
          style={{ marginTop: 10 }}
        >
          <Text
            style={{
              fontSize: 14,
              color: "#1976d2",
              fontWeight: "700",
            }}
          >
            View project
          </Text>
        </Pressable>
      )}
    </View>
  );
}