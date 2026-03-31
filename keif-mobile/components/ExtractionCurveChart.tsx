import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
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

  const font = useFont(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    12
  );

  const maxT = Math.max(...data.map((d) => d.t));
  const maxEY = Math.max(...data.map((d) => d.ey));

  return (
    <View
      style={styles.card}
      accessibilityLabel={`Extraction curve: EY rises to ${maxEY.toFixed(1)}% over ${maxT} seconds`}
    >
      <View style={styles.chartRow}>
        <View style={styles.yLabelContainer}>
          <Text style={styles.yLabelText} numberOfLines={1}>EY %</Text>
        </View>
        <View style={{ flex: 1, height: chartHeight }}>
          <CartesianChart
            data={data as unknown as Record<string, unknown>[]}
            xKey={"t" as never}
            yKeys={["ey"] as never[]}
            domain={{ x: [0, maxT], y: [0, maxEY * 1.1] }}
            axisOptions={{
              font,
              tickCount: { x: 5, y: 5 },
              lineColor: Colors.borderSubtle,
              labelColor: Colors.textPrimary,
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
      <Text style={styles.xLabel}>Time (s)</Text>
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
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  yLabelContainer: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  yLabelText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    transform: [{ rotate: "-90deg" }],
    width: 80,
    textAlign: "center",
  },
  xLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
});
