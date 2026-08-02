import "dotenv/config";

const APP_VARIANTS = {
  development: {
    name: "AriaScore Dev",
    packageName: "com.jlayne246.ariascore.dev",
  },
  preview: {
    name: "AriaScore Preview",
    packageName: "com.jlayne246.ariascore.preview",
  },
  production: {
    name: "AriaScore",
    packageName: "com.jlayne246.ariascore",
  },
};

function getAppVariant() {
  const variant = process.env.APP_VARIANT;

  if (
    variant === "development" ||
    variant === "preview" ||
    variant === "production"
  ) {
    return variant;
  }

  /*
   * Default ordinary local Expo commands to development.
   * Use APP_VARIANT=production explicitly when resolving
   * production config locally.
   */
  return "development";
}

export default ({ config }) => {
  const appVariant = getAppVariant();
  const variantConfig = APP_VARIANTS[appVariant];

  const appVersion =
    process.env.APP_VERSION ?? "1.0.4";

  /*
   * Used only if you are managing Android build numbers
   * locally rather than through EAS remote versioning.
   */
  const androidVersionCode = Number(
    process.env.ANDROID_VERSION_CODE ?? "7"
  );

  /*
   * iOS buildNumber must be a string.
   */
  const iosBuildNumber =
    process.env.IOS_BUILD_NUMBER ?? "1";

  const useDevClient =
    process.env.USE_DEV_CLIENT === "true";

  return {
    ...config,

    name: variantConfig.name,
    slug: "ariascore",
    scheme: "ariascore",

    /*
     * User-facing version:
     * 1.0.4, 1.1.0, 1.2.0, etc.
     */
    version: appVersion,

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
      bundleIdentifier:
        variantConfig.packageName,

      /*
       * Remove this if EAS remotely manages build numbers.
       */
      // buildNumber: iosBuildNumber,
    },

    android: {
      ...config.android,

      adaptiveIcon: {
        foregroundImage:
          "./assets/adaptive-icon.png",
        backgroundColor: "#0099FF",
      },

      /*
       * Remove this if EAS remotely manages versionCode.
       */
      // versionCode: androidVersionCode,

      edgeToEdgeEnabled: true,
      package: variantConfig.packageName,
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

      appVariant,

      eas: {
        ...config.extra?.eas,
        projectId:
          "3d7912dd-b338-46d4-9545-b1933e85224a",
      },
    },

    owner: "jlayne246",

    plugins: [
      ...(config.plugins || []),

      ...(useDevClient
        ? ["expo-dev-client"]
        : []),

      "expo-font",
      "expo-share-intent",
    ],
  };
};
