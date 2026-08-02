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
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { RootStackParamList, ACCENT_COLOR } from "../types";
import {
  BackupError,
  BackupRepository,
} from "../src/services/backup";
import {
  createBackupService,
} from "../src/services/backup/createBackupService";
import { exportBackupFile, shareBackupFile } from "../src/services/backup/backups.helpers";
import { getDatabase } from "../utils/database";
import { BackupImportService } from "../src/services/backup/backupImportService";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";

type BackupSummary = {
  createdAt: string;
  scoreCount: number;
  setlistCount: number;
  bookmarkCount: number;
};

export default function BackupsScreen() {
  type BackupsNavigationProp =
    NativeStackNavigationProp<RootStackParamList, "Backups">;

  const navigation =
    useNavigation<BackupsNavigationProp>();

  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const isBackupBusy = isExporting || isSharing || isImporting;
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
                onPress={() => {
                    if (!isBackupBusy) {
                        navigation.goBack();
                    }
                }}
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

  async function handleExportBackup(): Promise<void> {
    try {
      setIsExporting(true);

      const backupService = await createBackupService();

      const archive = await backupService.createBackup();

      setLastBackup({
          createdAt: archive.manifest.createdAt,
          scoreCount: archive.manifest.statistics.scoreCount,
          setlistCount: archive.manifest.statistics.setlistCount,
          bookmarkCount: archive.manifest.statistics.bookmarkCount,
      });

      const result = await exportBackupFile(archive.uri);

      switch (result.status) {
        case "saved":
          Alert.alert(
            "Backup saved",
            "Your AriaScore backup was saved successfully."
          );
          break;

        case "cancelled":
          // The user dismissed the folder picker.
          // Do not claim that the backup was saved.
          break;

        case "shared":
          /*
          * On iOS, the share sheet does not report whether the user
          * actually chose "Save to Files".
          */
          break;
      }
    } catch (error) {
      console.error("[Backup] Export failed:", error);

      Alert.alert(
        "Backup failed",
        error instanceof Error
          ? error.message
          : "The backup could not be exported."
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleShareBackup(): Promise<void> {
    try {
      setIsSharing(true);

      const backupService = await createBackupService();

      const archive = await backupService.createBackup();

      setLastBackup({
          createdAt: archive.manifest.createdAt,
          scoreCount: archive.manifest.statistics.scoreCount,
          setlistCount: archive.manifest.statistics.setlistCount,
          bookmarkCount: archive.manifest.statistics.bookmarkCount,
      });

      await shareBackupFile(archive.uri);
    } catch (error) {
      console.error("[Backup] Share failed:", error);

      Alert.alert(
        "Unable to share backup",
        error instanceof Error
          ? error.message
          : "The backup could not be shared."
      );
    } finally {
      setIsSharing(false);
    }
  }

  const handleImportBackup = (): void => {
  if (isBackupBusy) {
      return;
    }

    Alert.alert(
      "Restore backup?",
      [
        "Restoring a backup will replace the current AriaScore library.",
        "",
        "Scores, metadata, setlists, bookmarks, labels, and settings currently stored in the app will be removed.",
      ].join("\n"),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Choose Backup",
          style: "destructive",
          onPress: () => {
            void performImportBackup();
          },
        },
      ]
    );
  };

  const performImportBackup = async (): Promise<void> => {
    try {
      setIsImporting(true);

      const db = await getDatabase();
      const repository = new BackupRepository(db);
      const importService =
        new BackupImportService(repository);

      const result =
        await importService.pickAndRestoreBackup({
          mode: "replace",
        });

      /*
      * The user closed the document picker.
      */
      if (!result) {
        return;
      }

      const summary = [
        `${result.restoredScoreCount} score${
          result.restoredScoreCount === 1 ? "" : "s"
        } restored`,
        `${result.restoredSetlistCount} setlist${
          result.restoredSetlistCount === 1 ? "" : "s"
        } restored`,
        `${result.restoredBookmarkCount} bookmark${
          result.restoredBookmarkCount === 1 ? "" : "s"
        } restored`,
        `${result.restoredLabelCount} label${
          result.restoredLabelCount === 1 ? "" : "s"
        } restored`,
      ];

      if (result.omittedScoreCount > 0) {
        summary.push(
          "",
          `${result.omittedScoreCount} score${
            result.omittedScoreCount === 1 ? " was" : "s were"
          } omitted because the corresponding PDF could not be restored.`
        );
      }

      if (result.warnings.length > 0) {
        summary.push(
          "",
          `${result.warnings.length} warning${
            result.warnings.length === 1 ? "" : "s"
          } occurred during restoration.`
        );

        console.warn(
          "[Backup] Restore warnings:",
          result.warnings
        );
      }

      Alert.alert(
        result.warnings.length > 0 ||
          result.omittedScoreCount > 0
          ? "Backup restored with warnings"
          : "Backup restored",
        summary.join("\n")
      );

      /*
      * Refresh any screen state or cached library data here.
      *
      * Examples:
      * await reloadLibrary();
      * navigation.navigate("Library");
      */

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "Dashboard",
            },
          ],
        })
      );
    } catch (error) {
      console.error(
        "[Backup] Import failed:",
        error
      );

      const message =
        error instanceof BackupError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The backup could not be restored.";

      Alert.alert(
        "Restore failed",
        message
      );
    } finally {
      setIsImporting(false);
    }
  };

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

      {/* <View style={{ flexDirection: "row", gap: 12, marginBottom: 20, justifyContent: "center" }}> */}
        <Pressable
        onPress={handleExportBackup}
        disabled={isBackupBusy}
        accessibilityRole="button"
        accessibilityLabel="Save backup"
        accessibilityState={{ disabled: isBackupBusy, busy: isExporting }}
        style={({ pressed }) => ({
          minHeight: 54,
          backgroundColor: isBackupBusy ? "#9CA3AF" : ACCENT_COLOR,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed && !isBackupBusy ? 0.85 : 1,
          marginBottom: 12,
        })}
      >
        {isExporting ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color="#ffffff" />

            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 10,
              }}
            >
              Saving Backup…
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
              name="save-outline"
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
              Save Backup
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={handleShareBackup}
        disabled={isBackupBusy}
        accessibilityRole="button"
        accessibilityLabel="Share backup"
        accessibilityState={{ disabled: isBackupBusy, busy: isSharing }}
        style={({ pressed }) => ({
          minHeight: 54,
          backgroundColor: isBackupBusy ? "#9CA3AF" : ACCENT_COLOR,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed && !isBackupBusy ? 0.85 : 1,
          marginBottom: 12,
        })}
      >
        {isSharing ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color="#ffffff" />

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
              Share Backup
            </Text>
          </View>
        )}
      </Pressable>
      {/* </View> */}

      <Pressable
        onPress={handleImportBackup}
        disabled={isBackupBusy}
        accessibilityRole="button"
        accessibilityLabel="Restore backup"
        accessibilityHint="Replaces the current library with a selected AriaScore backup"
        accessibilityState={{
          disabled: isBackupBusy,
          busy: isImporting,
        }}
        style={({ pressed }) => ({
          minHeight: 54,
          backgroundColor: isBackupBusy
            ? "#9CA3AF"
            : "#D97706",
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: "center",
          justifyContent: "center",
          opacity:
            pressed && !isBackupBusy
              ? 0.85
              : 1,
        })}
      >
        {isImporting ? (
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
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 10,
              }}
            >
              Restoring Backup…
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
              name="download-outline"
              size={21}
              color="#ffffff"
            />

            <Text
              style={{
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "700",
                marginLeft: 9,
              }}
            >
              Restore Backup
            </Text>
          </View>
        )}
      </Pressable>

      <Text
        style={{
          marginTop: 10,
          paddingHorizontal: 12,
          color: "#6B7280",
          fontSize: 13,
          lineHeight: 19,
          textAlign: "center",
        }}
      >
        Restoring a backup replaces the current library and its settings.
      </Text>
    </ScrollView>
  );
}