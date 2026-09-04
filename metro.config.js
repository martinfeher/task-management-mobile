// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { withInspector } = require("react-native-dev-inspector/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(
  withInspector(config, { editor: "cursor" }),
  {
    cssEntryFile: "./src/global.css",
    polyfills: { rem: 14 },
  },
);
