// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { withInspector } = require("react-native-dev-inspector/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
const siblingWebNextDir = path.resolve(__dirname, "..", "todolistWeb", ".next");
const escapedSiblingWebNextDir = siblingWebNextDir.replace(/[/\\]/g, "[/\\\\]");

config.watchFolders = [__dirname];
config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : config.resolver?.blockList
        ? [config.resolver.blockList]
        : []),
    new RegExp(`${escapedSiblingWebNextDir}/.*`),
  ],
};

module.exports = withUniwindConfig(
  withInspector(config, { editor: "cursor" }),
  {
    cssEntryFile: "./src/global.css",
    polyfills: { rem: 14 },
  },
);
