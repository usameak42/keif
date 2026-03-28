import React from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useRunComparison } from "../hooks/useRunComparison";
import { BackButton } from "../components/BackButton";
import { ErrorCard } from "../components/ErrorCard";
import { SkeletonShimmer } from "../components/SkeletonShimmer";
import { CompareMetricColumns } from "../components/CompareMetricColumns";
import { OverlaidCurveChart } from "../components/OverlaidCurveChart";
import { CompareSCAChart } from "../components/CompareSCAChart";
import { FlavorCompareBars } from "../components/FlavorCompareBars";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

export default function CompareScreen() {
  const router = useRouter();
  const { runAId, runBId } = useLocalSearchParams<{ runAId: string; runBId: string }>();
  const { runA, runB, loading, error } = useRunComparison(Number(runAId), Number(runBId));
  const { width: screenWidth } = useWindowDimensions();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton label="Back" onPress={() => router.back()} />
        </View>
        <View style={styles.loadingContainer}>
          <SkeletonShimmer width={screenWidth - Spacing.md * 4} height={80} />
          <View style={{ height: Spacing.sm }} />
          <SkeletonShimmer width={screenWidth - Spacing.md * 4} height={80} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !runA || !runB) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton label="Back" onPress={() => router.back()} />
        </View>
        <View style={styles.errorWrap}>
          <ErrorCard
            message={error ?? "One or both selected runs failed to load from local storage."}
            onRetry={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackButton label="Back" onPress={() => router.back()} />
        </View>
        <Text style={styles.title}>Compare Runs</Text>
        <Text style={styles.subtitle}>
          {runA.name} <Text style={styles.vs}>vs</Text> {runB.name}
        </Text>

        {/* Section A: Key Metrics */}
        <CompareMetricColumns
          runAName={runA.name}
          runAOutput={runA.output}
          runBName={runB.name}
          runBOutput={runB.output}
        />

        {/* Section B: Overlaid Extraction Curves */}
        <Text style={styles.sectionHeading}>Extraction Curves</Text>
        <OverlaidCurveChart
          dataA={runA.output.extraction_curve}
          dataB={runB.output.extraction_curve}
          labelA={runA.name}
          labelB={runB.name}
        />

        {/* Section C: SCA Chart with Both Points */}
        <Text style={styles.sectionHeading}>SCA Brew Chart</Text>
        <CompareSCAChart
          tdsA={runA.output.tds_percent}
          eyA={runA.output.extraction_yield}
          tdsB={runB.output.tds_percent}
          eyB={runB.output.extraction_yield}
          method={runA.input.method}
          labelA={runA.name}
          labelB={runB.name}
        />

        {/* Section D: Flavor Comparison */}
        <Text style={styles.sectionHeading}>Flavor Profile</Text>
        <View style={styles.card}>
          <FlavorCompareBars
            profileA={runA.output.flavor_profile}
            profileB={runB.output.flavor_profile}
            labelA={runA.name}
            labelB={runB.name}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dominant,
  },
  header: {
    paddingTop: Spacing.sm,
  },
  loadingContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    alignItems: "center",
  },
  errorWrap: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  vs: {
    color: Colors.textSecondary,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
  },
});
