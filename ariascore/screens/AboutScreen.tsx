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
import { useAppTheme } from "../utils/theme/useAppTheme";

export default function AboutScreen() {
  const { colors } = useAppTheme();
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
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.separator,
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
                          color={colors.accent}
                      />
                      </TouchableOpacity>
                  <Text
                      style={{
                      fontSize: 24,
                      // fontWeight: '700',
                      color: colors.text,
                      fontWeight: '400',
                      }}
                  >
                      About
                  </Text>
                </View>
            </View>
        </View>
        ),
    });
    }, [navigation, colors]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 48,
      }}
    >
      <View
        style={{
          backgroundColor: colors.surface,
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

            <Text style={{ fontSize: 36, fontWeight: "800", color: colors.text, alignSelf: "center" }}>
            AriaScore
            </Text>
        <View style={{ marginBottom: 2 }}>
            <Text style={{ fontSize: 15, color: colors.secondaryText, alignSelf: "center" }}>
                Version {appVersion} ({buildNumber})
            </Text>
        </View>

            <Text
            style={{
                fontSize: 17,
                fontWeight: "600",
                color: colors.accent,
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
            color: colors.secondaryText,
            alignSelf: "center"
          }}
        >
          A lightweight digital sheet music library and reader built for
          musicians, accompanists, and conductors.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
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
            color: colors.text,
          }}
        >
          Features
        </Text>

        {features.map((feature) => (
          <Text
            key={feature}
            style={{
              fontSize: 16,
              color: colors.text,
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
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 22,
            marginBottom: 20,
            elevation: 1,
            }}>
            <Text style={{
                fontSize: 21,
                fontWeight: "700",
                marginBottom: 12,
                color: colors.text,
            }}>What's New</Text>

            <Text style={{fontSize: 16,
                color: colors.text,}}>Version {appVersion}</Text>

            {changes.map((feature) => (
            <Text
                key={feature}
                style={{
                fontSize: 16,
                color: colors.text,
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
          backgroundColor: colors.surface,
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
            color: colors.text,
          }}
        >
          Storage & Privacy
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.secondaryText,
          }}
        >
          Your music library and metadata are stored locally on your device.
          Imported PDFs are not uploaded unless you explicitly enable a backup
          feature.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.surface,
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
            color: colors.text,
          }}
        >
          Support
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.secondaryText,
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
              color: colors.accent,
            }}
          >
            Open GitHub Issues
          </Text>
        </Pressable>
      </View>

<View
        style={{
          backgroundColor: colors.surface,
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
            color: colors.text,
          }}
        >
          Open Source Licenses
        </Text>

        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.secondaryText,
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
              color: colors.accent,
            }}
          >
            View Open Source Licenses
          </Text>
        </Pressable>
      </View>

      <Text
        style={{
          textAlign: "center",
          color: colors.secondaryText,
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