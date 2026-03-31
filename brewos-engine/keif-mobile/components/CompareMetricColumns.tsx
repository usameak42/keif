import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { ZoneVerdict } from "./ZoneVerdict";
import type { SimulationOutput } from "../types/simulation";

interface CompareMetricColumnsProps {
  runAName: string;
  runAOutput: SimulationOutput;
  runBName: string;
  runBOutput: SimulationOutput;
}

export function CompareMetricColumns({
  runAName,
  runAOutput,
  runBName,
  runBOutput,
}: CompareMetricColumnsProps) {
  const tdsDelta = runAOutput.tds_percent - runBOutput.tds_percent;
  const eyDelta = runAOutput.extraction_yield - runBOutput.extraction_yield;

  function formatDelta(d: number, decimals: number): string {
    const sign = d > 0 ? "+" : "";
    return `${sign}${d.toFixed(decimals)}%`;
  }

  return (
    <View style={styles.container}>
      {/* Run A column */}
      <View style={styles.column}>
        <Text style={styles.columnHeader} numberOfLines={1}>{runAName}</Text>
        <Text style={styles.label}>TDS</Text>
        <Text style={styles.value}>{runAOutput.tds_percent.toFixed(2)}%</Text>
        <Text style={styles.label}>EY</Text>
        <Text style={styles.value}>{runAOutput.extraction_yield.toFixed(1)}%</Text>
        <ZoneVerdict zone={runAOutput.sca_position?.zone ?? "unknown"} />
      </View>

      {/* Delta column */}
      <View style={styles.deltaColumn}>
        <View style={styles.deltaSpacer} />
        <Text style={styles.deltaLabel}>TDS</Text>
        <Text style={[styles.deltaValue, { color: tdsDelta !== 0 ? Colors.accent : Colors.textSecondary }]}>
          {formatDelta(tdsDelta, 2)}
        </Text>
        <Text style={styles.deltaLabel}>EY</Text>
        <Text style={[styles.deltaValue, { color: eyDelta !== 0 ? Colors.accent : Colors.textSecondary }]}>
          {formatDelta(eyDelta, 1)}
        </Text>
      </View>

      {/* Run B column */}
      <View style={styles.column}>
        <Text style={styles.columnHeader} numberOfLines={1}>{runBName}</Text>
        <Text style={styles.label}>TDS</Text>
        <Text style={styles.value}>{runBOutput.tds_percent.toFixed(2)}%</Text>
        <Text style={styles.label}>EY</Text>
        <Text style={styles.value}>{runBOutput.extraction_yield.toFixed(1)}%</Text>
        <ZoneVerdict zone={runBOutput.sca_position?.zone ?? "unknown"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  column: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
  },
  columnHeader: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: "#808080",
  },
  value: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 29,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  deltaColumn: {
    width: 48,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  deltaSpacer: {
    height: 28,
  },
  deltaLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
    color: "#808080",
  },
  deltaValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
});
