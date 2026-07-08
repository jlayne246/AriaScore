import React, { useLayoutEffect } from "react";
import {
  ScrollView,
  Text,
  Image,
  View,
  Pressable,
  Linking,
  TouchableOpacity,
} from "react-native";
import * as Application from "expo-application";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ACCENT_COLOR } from "../types";

export default function AboutScreen() {
  const appVersion = Application.nativeApplicationVersion ?? "Development";
  const buildNumber = Application.nativeBuildVersion ?? "Debug";

  const features = [
    "PDF sheet music library",
    "Setlists and performance groups",
    "Recent scores",
    "Tablet-focused reader",
    "Local-first storage",
  ];

  const changes = [] as string[];

  const navigation = useNavigation<any>();

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
                      About
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
        }}
      >
        
        <Image
            source={require("../assets/icon.png")}
            style={{
                width: 88,
                height: 88,
                borderRadius: 20,
                marginBottom: 18,
                alignSelf: "center"
            }}
            />

            <Text style={{ fontSize: 36, fontWeight: "800", color: "#111", alignSelf: "center" }}>
            AriaScore
            </Text>
        <View style={{ marginBottom: 2 }}>
            <Text style={{ fontSize: 15, color: "#777", alignSelf: "center" }}>
                Version {appVersion} ({buildNumber})
            </Text>
        </View>

            <Text
            style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#1976d2",
                marginTop: 6,
                marginBottom: 12,
                alignSelf: "center"
            }}
            >
            Designed by musicians, for musicians.
            </Text>

        <Text
          style={{
            fontSize: 17,
            lineHeight: 25,
            color: "#555",
            alignSelf: "center"
          }}
        >
          A lightweight digital sheet music library and reader built for
          musicians, accompanists, and conductors.
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
            marginBottom: 16,
            color: "#111",
          }}
        >
          Features
        </Text>

        {features.map((feature) => (
          <Text
            key={feature}
            style={{
              fontSize: 16,
              color: "#333",
            //   marginBottom: 10,
              lineHeight: 23,
            }}
          >
            • {feature}
          </Text>
        ))}
      </View>

      {changes.length > 0 && (
            <View style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 22,
            marginBottom: 20,
            elevation: 1,
            }}>
            <Text style={{
                fontSize: 21,
                fontWeight: "700",
                marginBottom: 12,
                color: "#111",
            }}>What's New</Text>

            <Text style={{fontSize: 16,
                color: "#333",}}>Version {appVersion}</Text>

            {changes.map((feature) => (
            <Text
                key={feature}
                style={{
                fontSize: 16,
                color: "#333",
                //   marginBottom: 10,
                lineHeight: 23,
                }}
            >
                • {feature}
            </Text>
            ))}
        </View>
      )}

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
            marginBottom: 12,
            color: "#111",
          }}
        >
          Storage & Privacy
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "#555",
          }}
        >
          Your music library and metadata are stored locally on your device.
          Imported PDFs are not uploaded unless you explicitly enable a backup
          feature.
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
            marginBottom: 12,
            color: "#111",
          }}
        >
          Support
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "#555",
            marginBottom: 14,
          }}
        >
          Found a bug or have a feature request?
        </Text>

        <Pressable
          onPress={() =>
            Linking.openURL("https://github.com/jlayne246/airscore/issues")
          }
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1976d2",
            }}
          >
            Open GitHub Issues
          </Text>
        </Pressable>
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
            marginBottom: 12,
            color: "#111",
          }}
        >
          Open Source Licenses
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: "#555",
            marginBottom: 14,
          }}
        >
          AriaScore is built using a number of open-source software libraries. We are grateful to the developers and communities that make these projects possible.
        </Text>

        <Pressable
          onPress={() =>
            navigation.navigate("OpenSourceLicenses")
          }
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1976d2",
            }}
          >
            View Open Source Licenses
          </Text>
        </Pressable>
      </View>

      <Text
        style={{
          textAlign: "center",
          color: "#888",
          fontSize: 14,
          marginTop: 12,
        }}
      >
        Developed by Joshua Layne{"\n"}{"\n"}
        © 2026 AriaScore{"\n"}
        All rights reserved.
      </Text>
    </ScrollView>
  );
}