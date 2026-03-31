import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Keif",
  slug: "keif",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "keif",
  plugins: ["expo-router", "expo-font"],
  extra: {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://entire-ursa-4keif2-d4539572.koyeb.app",
  },
});
