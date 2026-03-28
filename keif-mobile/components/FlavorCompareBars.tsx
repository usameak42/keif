import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import type { FlavorProfile } from "../types/simulation";

interface FlavorCompareBarsProps {
  profileA: FlavorProfile;
  profileB: FlavorProfile;
  labelA: string;
  labelB: string;
}

const FLAVOR_COLORS: Record<string, string> = {
  sour: "#E8C547",
  sweet: "#6BBF6B",
  bitter: "#C75B39",
};

const FLAVOR_KEYS: Array<{ key: keyof FlavorProfile; label: string }> = [
  { key: "sour", label: "Sour" },
  { key: "sweet", label: "Sweet" },
  { key: "bitter", label: "Bitter" },
];

export function FlavorCompareBars({ profileA, profileB, labelA, labelB }: FlavorCompareBarsProps) {
  return (
    <View>
      {FLAVOR_KEYS.map(({ key, label }) => {
        const valueA = profileA[key];
        const valueB = profileB[key];
        const color = FLAVOR_COLORS[key];

        return (
          <View key={key} style={styles.flavorRow}>
            <Text style={styles.flavorLabel}>{label}</Text>
            <View style={styles.barColumn}>
              {/* Run A bar */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { width: `${valueA * 100}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <View style={styles.barGap} />
              {/* Run B bar */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { width: `${valueB * 100}%`, backgroundColor: color, opacity: 0.5 },
                  ]}
                />
              </View>
            </View>
            <View style={styles.valueColumn}>
              <Text style={styles.valueText}>{valueA.toFixed(2)}</Text>
              <Text style={styles.valueText}>{valueB.toFixed(2)}</Text>
            </View>
          </View>
        );
      })}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
          <Text style={styles.legendLabel}>{labelA}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.accent, opacity: 0.5 }]} />
          <Text style={styles.legendLabel}>{labelB}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flavorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  flavorLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textPrimary,
    width: 52,
  },
  barColumn: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  barTrack: {
    height: 24,
    borderRadius: 8,
    backgroundColor: "#28221F",
    overflow: "hidden",
  },
  bar: {
    height: 24,
    borderRadius: 8,
  },
  barGap: {
    height: 4,
  },
  valueColumn: {
    minWidth: 36,
    alignItems: "flex-end",
  },
  valueText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "right",
  },
  legendRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
