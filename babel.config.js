const { inspectorBabelPlugin } = require("react-native-dev-inspector/metro");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      inspectorBabelPlugin,
      // Must be listed last
      "react-native-reanimated/plugin",
    ],
  };
};
