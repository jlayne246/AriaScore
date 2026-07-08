import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View, Text } from "react-native";

import { ReaderSettings } from "../utils/settings/types";
import { getResolvedReaderSettings } from "../utils/settings/resolver";
import { saveGlobalReaderSetting } from "../utils/settings/repository";

import SettingsSection from "../components/settings/SettingsSection";
import SettingsToggleRow from "../components/settings/SettingsToggleRow";
import SettingsSegmentedRow from "../components/settings/SettingsSegmentedRow";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT_COLOR } from "../types";

const SettingsScreen = () => {
  const [settings, setSettings] = useState<ReaderSettings>();

  const navigation =
      useNavigation();

  const updateGlobalSetting = async <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev!,
      [key]: value,
    }));

    try {
      await saveGlobalReaderSetting(key, value);
    } catch (error) {
      console.error("Failed to save setting:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setSettings(await getResolvedReaderSettings());
    };

    load();
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
                      Settings
                  </Text>
                </View>
            </View>
        </View>
        ),
    });
    }, [navigation]);

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
      <SettingsSection title="Reading">
        <SettingsToggleRow
          title="Keep Screen Awake"
          subtitle="Prevent the tablet from sleeping while reading."
          value={settings.keepScreenAwake}
          onValueChange={value =>
            updateGlobalSetting("keepScreenAwake", value)
          }
          icon="moon-outline"
        />

        <SettingsToggleRow
          title="Resume Last Page"
          subtitle="Open each score where you last left off."
          value={settings.resumeLastPage}
          onValueChange={value =>
            updateGlobalSetting("resumeLastPage", value)
          }
          icon="bookmark-outline"
        />

        <SettingsToggleRow
          title="Auto-hide Controls"
          subtitle="Hide reader controls after a few seconds."
          value={settings.autoHideControls}
          onValueChange={value =>
            updateGlobalSetting("autoHideControls", value)
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
            updateGlobalSetting("tapZones", value)
          }
          icon="hand-left-outline"
        />

        <SettingsToggleRow
          title="Swipe Navigation"
          subtitle="Swipe between pages when supported."
          value={settings.swipeNavigation}
          onValueChange={value =>
            updateGlobalSetting("swipeNavigation", value)
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
                updateGlobalSetting("pageAnimation", value)
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
                updateGlobalSetting("viewMode", value)
            }
            icon="albums-outline"
        />
        <SettingsToggleRow
          title="Cover Offset"
          subtitle="Treat the first page as a cover in two-page view."
          value={settings.coverOffset}
          onValueChange={value =>
            updateGlobalSetting("coverOffset", value)
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
                updateGlobalSetting("pageRenderQuality", value)
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
            updateGlobalSetting("performanceMode", value)
          }
          icon="flash-outline"
        />

        <SettingsToggleRow
          title="Facial Gestures"
          subtitle="Experimental page control using facial gestures."
          value={settings.facialGestures}
          onValueChange={value =>
            updateGlobalSetting("facialGestures", value)
          }
          icon="happy-outline"
        />
      </SettingsSection>
    </ScrollView>
  );
};

export default SettingsScreen;