import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { ChartLegend } from "./ChartLegend";
import type { ExtractionPoint } from "../types/simulation";

interface OverlaidCurveChartProps {
  dataA: ExtractionPoint[];
  dataB: ExtractionPoint[];
  labelA: string;
  labelB: string;
}

interface MergedPoint {
  t: number;
  ey_a: number;
  ey_b: number;
}

function mergeExtractionData(dataA: ExtractionPoint[], dataB: ExtractionPoint[]): MergedPoint[] {
  // Use the longer array as the time base, match the shorter array by nearest t
  const base = dataA.length >= dataB.length ? dataA : dataB;
  const other = dataA.length >= dataB.length ? dataB : dataA;
  const baseIsA = dataA.length >= dataB.length;

  return base.map((pt) => {
    let closest = other[0];
    let minDist = Math.abs(pt.t - (closest?.t ?? 0));
    for (const oPt of other) {
      const dist = Math.abs(pt.t - oPt.t);
      if (dist < minDist) {
        minDist = dist;
        closest = oPt;
      }
    }
    return {
      t: pt.t,
      ey_a: baseIsA ? pt.ey : (closest?.ey ?? 0),
      ey_b: baseIsA ? (closest?.ey ?? 0) : pt.ey,
    };
  });
}

export function OverlaidCurveChart({ dataA, dataB, labelA, labelB }: OverlaidCurveChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - Spacing.md * 4;
  const chartHeight = chartWidth * (9 / 16);

  const mergedData = mergeExtractionData(dataA, dataB);

  if (mergedData.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Extraction Curves</Text>
        <Text style={styles.empty}>No extraction curve data available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Extraction Curves</Text>
      <View style={{ height: chartHeight }}>
        <CartesianChart
          data={mergedData as unknown as Record<string, unknown>[]}
          xKey={"t" as never}
          yKeys={["ey_a", "ey_b"] as never}
          axisOptions={{
            font: null,
            tickCount: { x: 5, y: 5 },
            lineColor: Colors.borderSubtle,
            labelColor: Colors.textSecondary,
          }}
        >
          {({ points }: any) => (
            <>
              <Line points={points.ey_a} color="#D97A26" strokeWidth={2} curveType="natural" />
              <Line points={points.ey_b} color="#5B9BD5" strokeWidth={2} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
      <ChartLegend
        items={[
          { color: "#D97A26", label: labelA },
          { color: "#5B9BD5", label: labelB, dashed: true },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  empty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
});
