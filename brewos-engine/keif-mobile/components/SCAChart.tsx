import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart, Scatter } from "victory-native";
import { Rect as SkiaRect } from "@shopify/react-native-skia";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import type { BrewMethod } from "../types/simulation";

interface SCAChartProps {
  tds: number;
  ey: number;
  method: BrewMethod;
}

// SCA ideal zones
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

export function SCAChart({ tds, ey, method }: SCAChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - Spacing.xl * 2 - Spacing.md * 2;
  const chartHeight = chartWidth * 0.75;

  const { yRange, zone } = getChartConfig(method);
  const data = [{ ey, tds }];

  return (
    <View
      style={styles.card}
      accessibilityLabel={`SCA brew chart. TDS ${tds.toFixed(2)}%, EY ${ey.toFixed(1)}%`}
    >
      <Text style={styles.title}>SCA Brew Chart</Text>
      <View style={{ height: chartHeight }}>
        <CartesianChart
          data={data}
          xKey="ey"
          yKeys={["tds"]}
          domain={{ x: [14, 26], y: yRange }}
          axisOptions={{
            font: null,
            tickCount: { x: 5, y: 5 },
            lineColor: Colors.borderSubtle,
            labelColor: Colors.textSecondary,
          }}
        >
          {({ xScale, yScale, points }) => {
            // CRITICAL: yScale is inverted -- higher values have smaller pixel coords
            const zoneX = xScale(zone.eyMin);
            const zoneW = xScale(zone.eyMax) - zoneX;
            const zoneY = yScale(zone.tdsMax);    // top of zone = higher TDS = smaller Y pixel
            const zoneH = yScale(zone.tdsMin) - zoneY;  // height = lower TDS pixel - upper TDS pixel

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
                <Scatter points={points.tds} radius={5} color={Colors.accent} style="fill" />
              </>
            );
          }}
        </CartesianChart>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
  },
  title: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
});
