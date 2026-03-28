import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import { BREW_METHODS } from "../constants/brewMethods";
import { RotarySelector } from "../components/RotarySelector";
import { useHealthCheck } from "../hooks/useHealthCheck";
import { WarmupBanner } from "../components/WarmupBanner";

export default function RotarySelectorScreen() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { backendReady } = useHealthCheck();

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      router.push({
        pathname: "/dashboard",
        params: { method: BREW_METHODS[index].value },
      });
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.container}>
      {!backendReady && <WarmupBanner />}
      <Text style={styles.heading}>Choose your brew method</Text>

      <View style={styles.selectorWrapper}>
        <RotarySelector
          items={BREW_METHODS.map((m) => m.label)}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
        />
      </View>

      <Text style={styles.hint}>Swipe to browse, tap to select</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dominant,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  heading: {
    ...Typography.heading,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xxl,
  },
  selectorWrapper: {
    width: "100%",
    alignItems: "center",
  },
  hint: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
    textAlign: "center",
  },
});
