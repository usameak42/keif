import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, useWindowDimensions } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import type { TempPoint } from "../types/simulation";

interface TempCurveInlineProps {
  data: TempPoint[];
}

export function TempCurveInline({ data }: TempCurveInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  // Account for screen padding (Spacing.xl * 2) + card padding (16 * 2)
  const chartWidth = screenWidth - Spacing.xl * 2 - 32 - 32;
  const chartHeight = chartWidth * (1 / 3);

  const maxT = Math.max(...data.map((d) => d.t));
  const maxTemp = Math.max(...data.map((d) => d.temp_c));
  const minTemp = Math.min(...data.map((d) => d.temp_c));

  return (
    <View>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={styles.toggle}>{expanded ? "Hide curve" : "View curve"}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={{ height: chartHeight, marginTop: 8 }}>
          <CartesianChart
            data={data as unknown as Record<string, unknown>[]}
            xKey={"t" as never}
            yKeys={["temp_c"] as never[]}
            domain={{ x: [0, maxT], y: [minTemp - 2, maxTemp + 2] }}
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
                points={points.temp_c}
                color="#EB9E47"
                strokeWidth={2}
                curveType="natural"
              />
            )}
          </CartesianChart>
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
});
