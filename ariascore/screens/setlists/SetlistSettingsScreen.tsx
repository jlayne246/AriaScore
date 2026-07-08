import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View, Text } from "react-native";

import { ReaderSettings } from "../../utils/settings/types";
import { getResolvedReaderSettings } from "../../utils/settings/resolver";
import { clearSetlistReaderSettings, saveSetlistReaderSetting } from "../../utils/settings/repository";

import SettingsSection from "../../components/settings/SettingsSection";
import SettingsToggleRow from "../../components/settings/SettingsToggleRow";
import SettingsSegmentedRow from "../../components/settings/SettingsSegmentedRow";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT_COLOR, RootStackParamList } from "../../types";
import { getSetlistById } from "../../utils/database";

type Props = {
  route: RouteProp<
    RootStackParamList,
    "SetlistSettings"
  >;
};

const SetlistSettingsScreen = ({ route }: Props) => {
    const { setlistId } = route.params;

  const [settings, setSettings] = useState<ReaderSettings>();
  const [setlistName, setSetlistName] = useState("");

  const navigation =
      useNavigation();

  const updateSetlistSetting = async <K extends keyof ReaderSettings>(
        key: K,
        value: ReaderSettings[K]
    ) => {
        setSettings(prev => ({
            ...prev!,
            [key]: value,
        }));

        try {
            await saveSetlistReaderSetting(setlistId, key, value);
        } catch (error) {
            console.error("Failed to save setlist setting:", error);
        }
    };

  useEffect(() => {
    const load = async () => {
        setSettings(
            await getResolvedReaderSettings(undefined, setlistId)
        );

        const setlist = await getSetlistById(setlistId);

        if (setlist) {
            setSetlistName(setlist.name);
        }
    };

    load();
  }, [setlistId]);

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
                      Setlist Settings
                  </Text>
                </View>
            </View>
        </View>
        ),
    });
    }, [navigation]);

    const resetToGlobal = async () => {

        await clearSetlistReaderSettings(setlistId);

        const resolved =
            await getResolvedReaderSettings(
                undefined,
                setlistId
            );

        setSettings(resolved);

    };

  if (!settings) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 40,
      }}
    >
        <View style={{ marginBottom: 20 }}>
            <Text
                style={{
                    fontSize: 20,
                    fontWeight: "700",
                }}
            >
                {setlistName}
            </Text>

            <Text
                style={{
                    marginTop: 4,
                    color: "#6B7280",
                    fontSize: 15,
                }}
            >
                Overrides your global reader settings while
                reading from this setlist.
            </Text>
        </View>
      <SettingsSection title="Reading">
        <SettingsToggleRow
          title="Keep Screen Awake"
          subtitle="Prevent the tablet from sleeping while reading."
          value={settings.keepScreenAwake}
          onValueChange={value =>
            updateSetlistSetting("keepScreenAwake", value)
          }
          icon="moon-outline"
        />

        <SettingsToggleRow
          title="Resume Last Page"
          subtitle="Open each score where you last left off."
          value={settings.resumeLastPage}
          onValueChange={value =>
            updateSetlistSetting("resumeLastPage", value)
          }
          icon="bookmark-outline"
        />

        <SettingsToggleRow
          title="Auto-hide Controls"
          subtitle="Hide reader controls after a few seconds."
          value={settings.autoHideControls}
          onValueChange={value =>
            updateSetlistSetting("autoHideControls", value)
          }
          icon="eye-off-outline"
        />
      </SettingsSection>

      <SettingsSection title="Page Turning">
        <SettingsToggleRow
          title="Tap Zones"
          subtitle="Tap the left and right edges to turn pages."
          value={settings.tapZones}
          onValueChange={value =>
            updateSetlistSetting("tapZones", value)
          }
          icon="hand-left-outline"
        />

        <SettingsToggleRow
          title="Swipe Navigation"
          subtitle="Swipe between pages when supported."
          value={settings.swipeNavigation}
          onValueChange={value =>
            updateSetlistSetting("swipeNavigation", value)
          }
          icon="swap-horizontal-outline"
        />

        <SettingsSegmentedRow
            title="Page Animation"
            subtitle="Choose the page transition style."
            value={settings.pageAnimation}
            options={[
                { label: "Slide", value: "slide" },
                { label: "Fade", value: "fade" },
                { label: "None", value: "none" },
            ]}
            onValueChange={value =>
                updateSetlistSetting("pageAnimation", value)
            }
            icon="layers-outline"
        />
      </SettingsSection>

      <SettingsSection title="Display">
        <SettingsSegmentedRow
            title="Default View Mode"
            subtitle="Choose how scores open by default."
            value={settings.viewMode}
            options={[
                { label: "Single", value: "single" },
                { label: "Double", value: "double" },
            ]}
            onValueChange={value =>
                updateSetlistSetting("viewMode", value)
            }
            icon="albums-outline"
        />
        <SettingsToggleRow
          title="Cover Offset"
          subtitle="Treat the first page as a cover in two-page view."
          value={settings.coverOffset}
          onValueChange={value =>
            updateSetlistSetting("coverOffset", value)
          }
          icon="book-outline"
        />
        
        <SettingsSegmentedRow
            title="Page Render Quality"
            subtitle="Sharper pages use more memory and may take longer to render."
            value={settings.pageRenderQuality}
            options={[
                { label: "Standard", value: "standard" },
                { label: "High", value: "high" },
                { label: "Ultra", value: "ultra" },
            ]}
            onValueChange={value =>
                updateSetlistSetting("pageRenderQuality", value)
            }
            icon="scan-outline"
        />
      </SettingsSection>

      <SettingsSection title="Performance">
        <SettingsToggleRow
          title="Performance Mode"
          subtitle="Use reader behaviour optimized for playing."
          value={settings.performanceMode}
          onValueChange={value =>
            updateSetlistSetting("performanceMode", value)
          }
          icon="flash-outline"
        />

        <SettingsToggleRow
          title="Facial Gestures"
          subtitle="Experimental page control using facial gestures."
          value={settings.facialGestures}
          onValueChange={value =>
            updateSetlistSetting("facialGestures", value)
          }
          icon="happy-outline"
        />
      </SettingsSection>

      <View
            style={{
                marginTop: 32,
            }}
        >

            <TouchableOpacity
                onPress={resetToGlobal}
                style={{
                    alignSelf: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                }}
            >
                <Text
                    style={{
                        color: "#2563EB",
                        fontWeight: "600",
                    }}
                >
                    Reset to Global Defaults
                </Text>
            </TouchableOpacity>

        </View>
    </ScrollView>
  );
};

export default SetlistSettingsScreen;