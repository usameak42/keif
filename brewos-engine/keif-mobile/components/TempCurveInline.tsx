import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
import { Colors } from "../constants/colors";
import type { TempPoint } from "../types/simulation";

interface TempCurveInlineProps {
  data: TempPoint[];
}

export function TempCurveInline({ data }: TempCurveInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const chartHeight = 200;

  const font = useFont(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    10
  );

  const maxT = Math.max(...data.map((d) => d.t));
  const maxTemp = Math.max(...data.map((d) => d.temp_c));
  const minTemp = Math.min(...data.map((d) => d.temp_c));

  // X ticks: every 30s from 0 to maxT
  const xTicks: number[] = [];
  for (let t = 0; t <= maxT; t += 30) xTicks.push(t);

  // Y ticks: every 5°C aligned to nearest 5, within the domain
  const yTickMin = Math.ceil(minTemp / 5) * 5;
  const yTickMax = Math.floor(maxTemp / 5) * 5;
  const yTicks: number[] = [];
  for (let t = yTickMin; t <= yTickMax; t += 5) yTicks.push(t);

  return (
    <View>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={styles.toggle}>{expanded ? "Hide curve" : "View curve"}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 8 }}>
          <View style={styles.chartRow}>
            <View style={styles.yLabelContainer}>
              <Text style={styles.yLabelText} numberOfLines={1}>Temp (°C)</Text>
            </View>
            <View style={{ flex: 1, height: chartHeight }}>
              <CartesianChart
                data={data as unknown as Record<string, unknown>[]}
                xKey={"t" as never}
                yKeys={["temp_c"] as never[]}
                domain={{ x: [0, maxT], y: [minTemp - 2, maxTemp + 2] }}
                axisOptions={{
                  font,
                  tickValues: { x: xTicks, y: yTicks },
                  labelOffset: { x: 8, y: 8 },
                  lineColor: Colors.borderSubtle,
                  labelColor: Colors.textPrimary,
                }}
              >
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {({ points }: any) => (
                  <Line
                    points={points.temp_c}
                    color="#EB9E47"
                    strokeWidth={2}
                    curveType="natural"
                  />
                )}
              </CartesianChart>
            </View>
          </View>
          <Text style={styles.xLabel}>Time (s)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.accent,
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
