import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import type { ExtractionPoint } from "../types/simulation";

interface ExtractionCurveChartProps {
  data: ExtractionPoint[];
}

export function ExtractionCurveChart({ data }: ExtractionCurveChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - Spacing.xl * 2 - Spacing.md * 2;
  const chartHeight = chartWidth * (9 / 16);

  const maxT = Math.max(...data.map((d) => d.t));
  const maxEY = Math.max(...data.map((d) => d.ey));

  return (
    <View
      style={styles.card}
      accessibilityLabel={`Extraction curve: EY rises to ${maxEY.toFixed(1)}% over ${maxT} seconds`}
    >
      <View style={{ height: chartHeight }}>
        <CartesianChart
          data={data as unknown as Record<string, unknown>[]}
          xKey={"t" as never}
          yKeys={["ey"] as never[]}
          domain={{ x: [0, maxT], y: [0, maxEY * 1.1] }}
          axisOptions={{
            font: null,
            tickCount: { x: 5, y: 5 },
            lineColor: Colors.borderSubtle,
            labelColor: Colors.textSecondary,
          }}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {({ points }: any) => (
            <Line
              points={points.ey}
              color="#D97A26"
              strokeWidth={2}
              curveType="natural"
            />
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
});
