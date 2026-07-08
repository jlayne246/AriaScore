import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

// Imports the navigation capabilitiies
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useShareIntent } from "expo-share-intent";

// Imports the different screens
import LibraryScreen from './screens/LibraryScreen';
import ReaderScreen from './screens/ReaderScreen';
import DashboardScreen from './screens/DashboardScreen';
import SetlistsScreen from './screens/SetlistsScreen';
import SetlistDetailScreen from './screens/SetlistDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import SetlistSettingsScreen from './screens/setlists/SetlistSettingsScreen';
import MusicSettingsScreen from './screens/music/MusicSettingsScreen';
import AboutScreen from './screens/AboutScreen';
import BackupsScreen from './screens/BackupsScreen';
import OpenSourceLicensesScreen from './screens/LicensesScreen';

import DevToolsButton from "./components/DevToolsButton";
import TestComponent from "./components/TestTailwind";

import { MenuProvider } from 'react-native-popup-menu';

import { RootStackParamList } from './types';
import { useEffect, useState } from 'react';
import { initDB } from './utils/database';
import { importPdfFromUri } from './utils/fileUtils';
import { importPdfNative } from "./native/AriaScorePdfImport";

import { NativeModules } from "react-native";

console.log(NativeModules);
console.log(NativeModules.AriaScorePdfImportModule);

const Stack = createNativeStackNavigator<RootStackParamList>();

import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

export default function App() {
    // The __DEV__ constant is true when in development mode
    const showDevTools = __DEV__;

    const [dbReady, setDbReady] = useState(false);
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    console.log("Share intent state:", {
        hasShareIntent,
        shareIntent,
    });

    useEffect(() => {
      const start = async () => {
        try {
          await initDB();
          setDbReady(true);
        } catch (error) {
          console.error("Database startup failed:", error);
        }
      };

      start();
    }, []);

    useEffect(() => {
      const handleSharedPdf = async () => {
        if (!dbReady || !hasShareIntent) return;

        const file = shareIntent?.files?.[0];

        if (!file || file.mimeType !== "application/pdf") return;

        console.log("Share file object:", JSON.stringify(file, null, 2));

        const originalFilename =
          file.fileName ||
          // file.filename ||
          // file.name ||
          file.path?.split("/").pop() ||
          "Imported PDF.pdf";

        const imported = await importPdfFromUri(
          file.path,
          originalFilename
        );

        console.log("Incoming URL:", imported.originalFilename, imported.uri);

        resetShareIntent();

        console.log("Navigating with:", {
          uri: imported.uri,
          originalFilename: imported.originalFilename,
        });

        if (navigationRef.isReady()) {
          navigationRef.navigate("Library", {
            pendingImport: {
              uri: imported.uri,
              originalFilename: imported.originalFilename,
            },
          });
          // Later: navigate to metadata import screen
        }
      };

      handleSharedPdf();
    }, [dbReady, hasShareIntent, shareIntent]);

    const getTitleFromIncomingUri = (url: string) => {
      const lastPart = decodeURIComponent(url.split("/").pop() ?? "");

      if (!lastPart || lastPart.startsWith("msf:")) {
        return "Imported PDF";
      }

      return lastPart.replace(/\.pdf$/i, "");
    };

    useEffect(() => {
      if (!dbReady) return;

      const handleUrl = async (url: string) => {
        console.log("Incoming URL:", url);

        const originalFilename = getTitleFromIncomingUri(url) + ".pdf";

        // const imported = await importPdfFromUri(
        //   url,
        //   originalFilename
        // );

        const imported = await importPdfNative(url);

        console.log("Open-with imported:", imported);

        if (navigationRef.isReady()) {
          navigationRef.navigate("Library", {
            pendingImport: {
              uri: imported.uri,
              originalFilename: imported.originalFilename,
            },
          });
        }
      };

      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });

      const subscription = Linking.addEventListener("url", ({ url }) => {
        handleUrl(url);
      });

      return () => subscription.remove();
    }, [dbReady]);

    if (!dbReady) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }}>
          <ActivityIndicator />
        </View>
      );
    }

    console.log(showDevTools)

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: 'black', width: '100%' }}>

          {/* <View className="flex-1 bg-black"> */}
            <MenuProvider>
              <NavigationContainer ref={navigationRef}>
                <Stack.Navigator initialRouteName="Dashboard">
                  <Stack.Screen name="Dashboard" component={DashboardScreen} />
                  <Stack.Screen name="Library" component={LibraryScreen} />
                  <Stack.Screen
                    name="Reader"
                    component={ReaderScreen}
                    initialParams={{ uri: '' }}
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen name="Setlists" component={SetlistsScreen} />
                  <Stack.Screen name="SetlistDetail" component={SetlistDetailScreen} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                  <Stack.Screen name="About" component={AboutScreen} />
                  <Stack.Screen name="Backups" component={BackupsScreen} />
                  <Stack.Screen
                    name="SetlistSettings"
                    component={SetlistSettingsScreen}
                  />
                  <Stack.Screen
                    name="MusicSettings"
                    component={MusicSettingsScreen}
                  />
                  <Stack.Screen
                    name="OpenSourceLicenses"
                    component={OpenSourceLicensesScreen}
                    options={{ title: "Open Source Licences" }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
            </MenuProvider>

            {__DEV__ && <DevToolsButton />}
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );  
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });



