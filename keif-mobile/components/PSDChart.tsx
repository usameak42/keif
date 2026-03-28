import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import type { PSDPoint } from "../types/simulation";

interface PSDChartProps {
  data: PSDPoint[];
}

export function PSDChart({ data }: PSDChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - Spacing.xl * 2 - Spacing.md * 2;
  const chartHeight = chartWidth * (9 / 16);

  const maxSizeUm = Math.max(...data.map((d) => d.size_um));
  const maxFraction = Math.max(...data.map((d) => d.fraction));

  return (
    <View style={styles.card} accessibilityLabel="Particle size distribution chart">
      <View style={{ height: chartHeight }}>
        <CartesianChart
          data={data as unknown as Record<string, unknown>[]}
          xKey={"size_um" as never}
          yKeys={["fraction"] as never[]}
          domain={{ x: [0, maxSizeUm], y: [0, maxFraction * 1.1] }}
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
              points={points.fraction}
              color="#EAE2D7"
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
