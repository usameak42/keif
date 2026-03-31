import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

interface LegendItem {
  color: string;
  label: string;
  dashed?: boolean;
}

interface ChartLegendProps {
  items: LegendItem[];
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          {item.dashed ? (
            <View style={styles.dashedLine}>
              <View style={[styles.dashSegment, { backgroundColor: item.color }]} />
              <View style={styles.dashGap} />
              <View style={[styles.dashSegment, { backgroundColor: item.color }]} />
              <View style={styles.dashGap} />
              <View style={[styles.dashSegment, { backgroundColor: item.color }]} />
            </View>
          ) : (
            <View style={[styles.solidLine, { backgroundColor: item.color }]} />
          )}
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  solidLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  dashedLine: {
    flexDirection: "row",
    width: 16,
    height: 2,
    alignItems: "center",
  },
  dashSegment: {
    width: 4,
    height: 2,
    borderRadius: 1,
  },
  dashGap: {
    width: 2,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
