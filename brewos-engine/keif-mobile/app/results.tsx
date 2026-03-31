import React, { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import { useSimulation } from "../hooks/useSimulation";
import { useSimulationResult } from "../context/SimulationResultContext";
import { ResultCalloutCard } from "../components/ResultCalloutCard";
import { ZoneVerdict } from "../components/ZoneVerdict";
import { SCAChart } from "../components/SCAChart";
import { SkeletonShimmer } from "../components/SkeletonShimmer";
import { ErrorCard } from "../components/ErrorCard";
import { BackButton } from "../components/BackButton";
import type { SimulationInput } from "../types/simulation";

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { simulate, loading, result, error } = useSimulation();
  const { setCurrentInput, setCurrentOutput, setCurrentRunSaved } = useSimulationResult();

  const input: SimulationInput = JSON.parse(params.input as string);

  useEffect(() => {
    setCurrentRunSaved(false);
    simulate(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) {
      setCurrentInput(input);
      setCurrentOutput(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const cardWidth = (screenWidth - Spacing.xl * 2 - Spacing.md) / 2;
  const chartSkeletonWidth = screenWidth - Spacing.xl * 2;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton label="Tweak" onPress={() => router.back()} />

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={styles.cardRow}>
              <SkeletonShimmer width={cardWidth} height={120} />
              <SkeletonShimmer width={cardWidth} height={120} />
            </View>
            <SkeletonShimmer width={chartSkeletonWidth} height={chartSkeletonWidth * 0.75} />
            {input.mode === "accurate" && (
              <Text style={styles.loadingText}>Running detailed simulation...</Text>
            )}
          </View>
        )}

        {/* Error state */}
        {!loading && error && !result && (
          <View style={styles.errorContainer}>
            <ErrorCard message={error} onRetry={() => router.back()} />
          </View>
        )}

        {/* Success state */}
        {!loading && result && (
          <View style={styles.resultContainer}>
            <View style={styles.cardRow}>
              <ResultCalloutCard value={result.tds_percent} label="TDS" />
              <ResultCalloutCard value={result.extraction_yield} label="Extraction Yield" />
            </View>

            <View style={styles.verdictRow}>
              <ZoneVerdict zone={result.sca_position?.zone ?? "unknown"} />
            </View>

            {result.mode_used === "accurate" && (
              <Text style={styles.badge}>Detailed simulation</Text>
            )}

            {result.sca_position?.on_chart ? (
              <SCAChart
                tds={result.tds_percent}
                ey={result.extraction_yield}
                method={input.method}
              />
            ) : (
              <Text style={styles.noChart}>
                Chart not available for this result range
              </Text>
            )}

            <View style={styles.ctaGroup}>
              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={() => router.push("/extended")}
                accessibilityRole="button"
                accessibilityLabel="View Details"
              >
                <Text style={styles.ctaPrimaryText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondary}
                onPress={() => router.push("/history")}
                accessibilityRole="button"
                accessibilityLabel="Save & History"
              >
                <Text style={styles.ctaSecondaryText}>Save & History</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dominant,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  cardRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  errorContainer: {
    marginTop: Spacing.lg,
  },
  resultContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  verdictRow: {
    marginTop: Spacing.xs,
  },
  badge: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  noChart: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  ctaGroup: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  ctaPrimary: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaPrimaryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.accent,
  },
  ctaSecondary: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaSecondaryText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    color: Colors.textSecondary,
  },
});
