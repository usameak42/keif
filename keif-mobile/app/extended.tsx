import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import { useSimulationResult } from "../context/SimulationResultContext";
import { BackButton } from "../components/BackButton";
import { ErrorCard } from "../components/ErrorCard";
import { ExtractionCurveChart } from "../components/ExtractionCurveChart";
import { PSDChart } from "../components/PSDChart";
import { FlavorBars } from "../components/FlavorBars";
import { ExtendedDetailCard } from "../components/ExtendedDetailCard";
import { TempCurveInline } from "../components/TempCurveInline";

function getRiskLevel(value: number): "low" | "medium" | "high" {
  if (value < 0.3) return "low";
  if (value <= 0.6) return "medium";
  return "high";
}

function getEUIDescriptor(value: number): { label: string; color: string } {
  if (value < 0.3) return { label: "Poor", color: Colors.destructive };
  if (value < 0.6) return { label: "Moderate", color: "#E8C547" };
  if (value < 0.8) return { label: "Good", color: Colors.textPrimary };
  return { label: "Excellent", color: "#6BBF6B" };
}

export default function ExtendedScreen() {
  const router = useRouter();
  const { currentOutput } = useSimulationResult();

  if (!currentOutput) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrapper}>
          <BackButton label="Back to Results" onPress={() => router.back()} />
          <ErrorCard
            message="Couldn't load detailed results. Go back and try simulating again."
            onRetry={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const co2Warning = currentOutput.warnings.find(
    (w) => w.toLowerCase().includes("co2") || w.toLowerCase().includes("bloom")
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton label="Back to Results" onPress={() => router.back()} />
        <Text style={styles.title}>Detailed Results</Text>

        {/* Section A -- Extraction Curve */}
        <Text style={styles.sectionHeading}>Extraction Curve</Text>
        <ExtractionCurveChart data={currentOutput.extraction_curve} />

        {/* Section B -- PSD Curve */}
        <Text style={styles.sectionHeading}>Particle Size Distribution</Text>
        <PSDChart data={currentOutput.psd_curve} />

        {/* Section C -- Flavor Axis */}
        <Text style={styles.sectionHeading}>Flavor Profile</Text>
        <View style={styles.card}>
          <FlavorBars profile={currentOutput.flavor_profile} />
        </View>

        {/* Section D -- Detail Cards */}
        <Text style={styles.sectionHeading}>Details</Text>
        <View style={styles.detailCards}>
          {/* 1. Brew Ratio (always) */}
          <ExtendedDetailCard
            label="Brew Ratio"
            value={`${currentOutput.brew_ratio.toFixed(1)}:1`}
          >
            <Text style={styles.recommendation}>
              {currentOutput.brew_ratio_recommendation}
            </Text>
          </ExtendedDetailCard>

          {/* 2. Channeling Risk (conditional) */}
          {currentOutput.channeling_risk !== null && (
            <ExtendedDetailCard
              label="Channeling Risk"
              value={`${currentOutput.channeling_risk.toFixed(2)}/1.0`}
              riskLevel={getRiskLevel(currentOutput.channeling_risk)}
            />
          )}

          {/* 3. CO2 Degassing Effect (always) */}
          <ExtendedDetailCard
            label="CO2 Degassing Effect"
            value={co2Warning || "Bloom window active"}
          />

          {/* 4. Temperature at End (conditional) */}
          {currentOutput.temperature_curve !== null &&
            currentOutput.temperature_curve.length > 0 && (
              <ExtendedDetailCard
                label="Temperature at End"
                value={`${currentOutput.temperature_curve[currentOutput.temperature_curve.length - 1].temp_c.toFixed(1)}\u00B0C`}
              >
                <TempCurveInline data={currentOutput.temperature_curve} />
              </ExtendedDetailCard>
            )}

          {/* 5. Extraction Uniformity (conditional) */}
          {currentOutput.extraction_uniformity_index !== null && (() => {
            const descriptor = getEUIDescriptor(currentOutput.extraction_uniformity_index!);
            return (
              <ExtendedDetailCard
                label="Extraction Uniformity"
                value={currentOutput.extraction_uniformity_index!.toFixed(2)}
              >
                <Text style={[styles.descriptor, { color: descriptor.color }]}>
                  {descriptor.label}
                </Text>
              </ExtendedDetailCard>
            );
          })()}

          {/* 6. Puck Resistance (conditional) */}
          {currentOutput.puck_resistance !== null && (
            <ExtendedDetailCard
              label="Puck Resistance"
              value={`${currentOutput.puck_resistance.toFixed(2)}/1.0`}
            />
          )}

          {/* 7. Caffeine (conditional) */}
          {currentOutput.caffeine_mg_per_ml !== null && (
            <ExtendedDetailCard
              label="Caffeine"
              value={`${currentOutput.caffeine_mg_per_ml.toFixed(2)} mg/mL`}
            />
          )}
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  errorWrapper: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
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
    borderRadius: 12,
    padding: Spacing.md,
  },
  detailCards: {
    gap: 12,
  },
  recommendation: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  descriptor: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
});
