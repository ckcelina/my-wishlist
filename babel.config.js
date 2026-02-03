
module.exports = function (api) {
  api.cache(true);

  // CRITICAL FIX: Completely disable editable components and source location injection
  // These plugins break React.Fragment because Fragments can only have 'key' and 'children' props
  // Any additional props like __sourceLocation cause runtime errors
  
  // ❌ DISABLED: All editable component plugins to prevent Fragment errors
  const EDITABLE_COMPONENTS = [];

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
