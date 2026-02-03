
module.exports = function (api) {
  api.cache(true);

  // CRITICAL FIX: Remove dev plugins that inject __sourceLocation into JSX
  // These plugins break React.Fragment because Fragments can only have 'key' and 'children' props
  // The inject-source-location plugin adds __sourceLocation which causes runtime errors
  
  // Only enable editable components in development when explicitly requested
  // BUT disable inject-source-location to prevent Fragment errors
  const EDITABLE_COMPONENTS =
    process.env.EXPO_PUBLIC_ENABLE_EDIT_MODE === "TRUE" &&
    process.env.NODE_ENV === "development"
      ? [
          ["./babel-plugins/editable-elements.js", {}],
          // ❌ REMOVED: inject-source-location plugin - breaks React.Fragment
          // ["./babel-plugins/inject-source-location.js", {}],
        ]
      : [];

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          extensions: [
            ".ios.ts",
            ".android.ts",
            ".ts",
            ".ios.tsx",
            ".android.tsx",
            ".tsx",
            ".jsx",
            ".js",
            ".json",
          ],
          alias: {
            "@": "./",
            "@components": "./components",
            "@style": "./style",
            "@hooks": "./hooks",
            "@types": "./types",
            "@contexts": "./contexts",
            "@lib": "./lib",
          },
        },
      ],
      ...EDITABLE_COMPONENTS,
      "@babel/plugin-proposal-export-namespace-from",
      "react-native-worklets/plugin", // react-native-worklets/plugin must be listed last!
    ],
  };
};
