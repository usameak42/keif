module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/react-native-skia|victory-native|@unimodules/.*|unimodules|sentry-expo|native-base|react-clone-referenced-element|@sentry/.*)"
  ],
};
