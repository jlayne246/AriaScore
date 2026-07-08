module.exports = function (api) {
  api.cache(true);
  return {
    presets:
      ["babel-preset-expo"],
    plugins: [
      // Make sure NativeWind is listed before Reanimated
      "nativewind/babel",
      "react-native-reanimated/plugin",
    ],
  };
};
