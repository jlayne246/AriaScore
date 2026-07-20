import "dotenv/config";

const version =
  process.env.APP_VERSION_NAME ?? "1.0.4";

const versionCode = Number.parseInt(
  process.env.APP_VERSION_CODE ?? "7",
  10
);

export default ({ config }) => ({
  ...config,
  name: "AriaScore",
  slug: "ariascore",
  scheme: "ariascore",
  version: version,
  orientation: "default",
  icon: "./assets/adaptive-icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0099FF",
  },

  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: "com.jlayne246.ariascore",
  },

  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0099FF",
    },
    versionCode: versionCode,
    edgeToEdgeEnabled: true,
    package: "com.jlayne246.ariascore",
  },

  updates: {
    ...config.updates,
    fallbackToCacheTimeout: 0,
  },

  web: {
    ...config.web,
    favicon: "./assets/favicon.png",
  },

  extra: {
    ...config.extra,
    buildMode:
      process.env.EXPO_PUBLIC_BUILD_MODE ??
      "production",
    eas: {
      projectId:
        "3d7912dd-b338-46d4-9545-b1933e85224a",
    },
  },

  owner: "jlayne246",

  plugins: [
    ...(config.plugins || []),
    "expo-dev-client",
    "expo-font",
    "expo-share-intent",
  ],
});