import Constants from "expo-constants";

export const API_BASE_URL: string =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ?? "https://keif.onrender.com";
