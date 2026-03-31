import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart } from "victory-native";
import { Rect as SkiaRect, Circle } from "@shopify/react-native-skia";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import { ChartLegend } from "./ChartLegend";
import type { BrewMethod } from "../types/simulation";

interface CompareSCAChartProps {
  tdsA: number;
  eyA: number;
  tdsB: number;
  eyB: number;
  method: BrewMethod;
  labelA: string;
  labelB: string;
}

// SCA ideal zones (same as SCAChart.tsx)
const FILTER_ZONE = { eyMin: 18, eyMax: 22, tdsMin: 1.15, tdsMax: 1.35 };
const ESPRESSO_ZONE = { eyMin: 18, eyMax: 22, tdsMin: 8, tdsMax: 10 };

function getChartConfig(method: BrewMethod) {
  if (method === "espresso") {
    return {
      yRange: [6, 12] as [number, number],
      zone: ESPRESSO_ZONE,
    };
  }
  return {
    yRange: [0.8, 1.6] as [number, number],
    zone: FILTER_ZONE,
  };
}

export function CompareSCAChart({
  tdsA,
  eyA,
  tdsB,
  eyB,
  method,
  labelA,
  labelB,
}: CompareSCAChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - Spacing.md * 4;
  const chartHeight = chartWidth * 0.75;

  const { yRange, zone } = getChartConfig(method);
  const data = [
    { ey: eyA, tds: tdsA },
    { ey: eyB, tds: tdsB },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>SCA Brew Chart</Text>
      <View style={{ height: chartHeight }}>
        <CartesianChart
          data={data as unknown as Record<string, unknown>[]}
          xKey={"ey" as never}
          yKeys={["tds"] as never}
          domain={{ x: [14, 26], y: yRange }}
          axisOptions={{
            font: null,
            tickCount: { x: 5, y: 5 },
            lineColor: Colors.borderSubtle,
            labelColor: Colors.textSecondary,
          }}
        >
          {({ xScale, yScale }: any) => {
            const zoneX = xScale(zone.eyMin);
            const zoneW = xScale(zone.eyMax) - zoneX;
            const zoneY = yScale(zone.tdsMax);
            const zoneH = yScale(zone.tdsMin) - zoneY;

            return (
              <>
                <SkiaRect
                  x={zoneX}
                  y={zoneY}
                  width={zoneW}
                  height={zoneH}
                  color="rgba(217, 122, 38, 0.2)"
                />
                <SkiaRect
                  x={zoneX}
                  y={zoneY}
                  width={zoneW}
                  height={zoneH}
                  color="rgba(217, 122, 38, 0.4)"
                  style="stroke"
                  strokeWidth={1}
                />
                <Circle cx={xScale(eyA)} cy={yScale(tdsA)} r={6} color="#D97A26" />
                <Circle cx={xScale(eyB)} cy={yScale(tdsB)} r={6} color="#5B9BD5" />
              </>
            );
          }}
        </CartesianChart>
      </View>
      <ChartLegend
        items={[
          { color: "#D97A26", label: labelA },
          { color: "#5B9BD5", label: labelB },
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
});
