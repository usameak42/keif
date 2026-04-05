import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { BREW_METHODS } from "../constants/brewMethods";
import { RotarySelector } from "../components/RotarySelector";
import { useHealthCheck } from "../hooks/useHealthCheck";
import { WarmupBanner } from "../components/WarmupBanner";

export default function RotarySelectorScreen() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { backendReady } = useHealthCheck();

  const currentMethod = BREW_METHODS[selectedIndex];

  const handleBrew = useCallback(() => {
    router.push({
      pathname: "/dashboard",
      params: { method: currentMethod.value },
    });
  }, [router, currentMethod.value]);

  return (
    <SafeAreaView style={styles.safe}>
      {!backendReady && <WarmupBanner />}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.keif}>KEIF</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>EXTRACTION SIMULATOR</Text>
      </View>

      {/* Carousel — full screen width, no horizontal padding */}
      <View style={styles.carouselArea}>
        <RotarySelector
          methods={BREW_METHODS}
          onIndexChange={setSelectedIndex}
        />
      </View>

      {/* BREW button + history */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.brewButton, { borderColor: currentMethod.colors.primary }]}
          onPress={handleBrew}
          accessibilityRole="button"
          accessibilityLabel={`Brew ${currentMethod.label}`}
        >
          <Text style={[styles.brewText, { color: currentMethod.colors.glow }]}>
            BREW
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push("/history")}
          accessibilityRole="button"
          accessibilityLabel="Run History"
        >
          <Text style={styles.historyText}>Run History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dominant,
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  keif: {
    fontFamily: "Bitter_700Bold",
    fontSize: 48,
    lineHeight: 56,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  divider: {
    width: 64,
    height: 2,
    backgroundColor: Colors.textPrimary,
    opacity: 0.2,
    marginVertical: 10,
  },
  subtitle: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: Colors.textSecondary,
  },
  carouselArea: {
    flex: 1,
    justifyContent: "center",
  },
  bottom: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  brewButton: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  brewText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 11,
    letterSpacing: 5,
    textTransform: "uppercase",
  },
  historyButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  historyText: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 11,
    letterSpacing: 5,
    textTransform: "uppercase",
    color: Colors.textSecondary,
  },
});
