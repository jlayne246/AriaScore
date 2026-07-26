// screens/BackupsScreen.tsx

import React, {
  useCallback,
  useLayoutEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ACCENT_COLOR } from "../types";
import {
  BackupError,
} from "../src/services/backup";
import {
  createBackupService,
} from "../src/services/backup/createBackupService";

type BackupSummary = {
  createdAt: string;
  scoreCount: number;
  setlistCount: number;
  bookmarkCount: number;
};

export default function BackupsScreen() {
  const navigation = useNavigation();

  const [isExporting, setIsExporting] = useState(false);
  const [lastBackup, setLastBackup] =
    useState<BackupSummary | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <View
          style={{
            height: 92,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            justifyContent: "flex-end",
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginRight: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
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
                  fontWeight: "300",
                  color: "#111827",
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

  const handleExportBackup = useCallback(async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const backupService = await createBackupService();

      const result =
        await backupService.createAndShareBackup();

      if (result.manifest.fileIssues.length > 0) {
        Alert.alert(
          "Backup created with warnings",
          `${result.manifest.statistics.includedPdfCount} PDFs were included and ${result.manifest.statistics.omittedPdfCount} were omitted.`
        );
      }

      const summary: BackupSummary = {
        createdAt: result.manifest.createdAt,
        scoreCount:
          result.manifest.statistics.scoreCount,
        setlistCount:
          result.manifest.statistics.setlistCount,
        bookmarkCount:
          result.manifest.statistics.bookmarkCount,
      };

      setLastBackup(summary);

      Alert.alert(
        "Backup prepared",
        [
          "Your AriaScore backup was created successfully.",
          "",
          `${summary.scoreCount} scores`,
          `${summary.setlistCount} setlists`,
          `${summary.bookmarkCount} bookmarks`,
        ].join("\n")
      );
    } catch (error) {
      console.error("Backup export failed:", error);

      const message =
        error instanceof BackupError
          ? error.message
          : "An unexpected error occurred while creating the backup.";

      Alert.alert("Backup failed", message);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const formattedLastBackup = lastBackup
    ? new Date(lastBackup.createdAt).toLocaleString(
        "en-BB",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      )
    : "No backup created during this session";

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
      }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 48,
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          padding: 28,
          marginBottom: 20,
          elevation: 2,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: {
            width: 0,
            height: 4,
          },
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: `${ACCENT_COLOR}18`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Ionicons
            name="archive-outline"
            size={28}
            color={ACCENT_COLOR}
          />
        </View>

        <Text
          style={{
            fontSize: 30,
            fontWeight: "600",
            color: "#111",
          }}
        >
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
          Export a portable copy of your AriaScore library, including metadata, setlists, bookmarks and locally managed PDF files. The backup can be saved to
          Files, Google Drive, OneDrive, or another
          compatible application.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 22,
          marginBottom: 20,
          elevation: 1,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 3,
          },
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color={ACCENT_COLOR}
          />

          <Text
            style={{
              fontSize: 21,
              fontWeight: "700",
              color: "#111",
              marginLeft: 10,
            }}
          >
            Export Full Backup
          </Text>
        </View>

        {[
          "Scores and library metadata",
          "Setlists and their score order",
          "Bookmarks",
          "Portable backup format information",
          "Application and database schema versions",
        ].map((item) => (
          <View
            key={item}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginTop: 12,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={19}
              color={ACCENT_COLOR}
              style={{ marginTop: 2 }}
            />

            <Text
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 24,
                color: "#555",
                marginLeft: 10,
              }}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 22,
          marginBottom: 20,
          elevation: 1,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 3,
          },
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={24}
            color={ACCENT_COLOR}
          />

          <Text
            style={{
              fontSize: 21,
              fontWeight: "700",
              color: "#111",
              marginLeft: 10,
            }}
          >
            Current Backup Scope
          </Text>
        </View>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "#555",
            marginTop: 12,
          }}
        >
          This version exports your entire AriaScore library, including all scores, setlists, and bookmarks. Future versions may allow for selective backup of specific items.
        </Text>

        <View
          style={{
            backgroundColor: "#F3F4F6",
            borderRadius: 14,
            padding: 14,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#374151",
            }}
          >
            Last backup
          </Text>

          <Text
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: "#555",
              marginTop: 4,
            }}
          >
            {formattedLastBackup}
          </Text>

          {lastBackup && (
            <Text
              style={{
                fontSize: 14,
                lineHeight: 21,
                color: "#6B7280",
                marginTop: 8,
              }}
            >
              {lastBackup.scoreCount} scores ·{" "}
              {lastBackup.setlistCount} setlists ·{" "}
              {lastBackup.bookmarkCount} bookmarks
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleExportBackup}
        disabled={isExporting}
        accessibilityRole="button"
        accessibilityLabel="Export JSON backup"
        style={({ pressed }) => ({
          minHeight: 54,
          backgroundColor: isExporting
            ? "#9CA3AF"
            : ACCENT_COLOR,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed && !isExporting ? 0.85 : 1,
        })}
      >
        {isExporting ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <ActivityIndicator
              size="small"
              color="#ffffff"
            />

            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 10,
              }}
            >
              Preparing Backup…
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="share-outline"
              size={21}
              color="#ffffff"
            />

            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 9,
              }}
            >
              Export JSON Backup
            </Text>
          </View>
        )}
      </Pressable>

      <Text
        style={{
          fontSize: 13,
          lineHeight: 19,
          textAlign: "center",
          color: "#6B7280",
          marginTop: 14,
          paddingHorizontal: 12,
        }}
      >
        Restoration and cloud backup will be added
        separately.
      </Text>
    </ScrollView>
  );
}