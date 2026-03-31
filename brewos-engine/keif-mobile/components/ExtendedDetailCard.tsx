import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

interface ExtendedDetailCardProps {
  label: string;
  value: string;
  riskLevel?: "low" | "medium" | "high" | null;
  children?: React.ReactNode;
}

const RISK_COLORS: Record<string, string> = {
  low: "#6BBF6B",
  medium: "#E8C547",
  high: "#D94F4F",
};

export function ExtendedDetailCard({ label, value, riskLevel, children }: ExtendedDetailCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {riskLevel && (
          <View
            style={[styles.dot, { backgroundColor: RISK_COLORS[riskLevel] }]}
          />
        )}
      </View>
      {children && <View style={styles.childContainer}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: "#808080",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  value: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  childContainer: {
    marginTop: 8,
  },
});
