import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

interface ResultCalloutCardProps {
  value: number;
  label: string;
}

export function ResultCalloutCard({ value, label }: ResultCalloutCardProps) {
  const formatted = value.toFixed(2);

  return (
    <View
      style={styles.card}
      accessibilityLabel={`${label} ${formatted} percent`}
    >
      <View style={styles.valueRow}>
        <Text style={styles.value}>{formatted}</Text>
        <Text style={styles.suffix}>%</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  value: {
    ...Typography.display,
    color: Colors.textPrimary,
  },
  suffix: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
