import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import type { FlavorProfile } from "../types/simulation";

interface FlavorBarsProps {
  profile: FlavorProfile;
}

const FLAVORS: Array<{ key: keyof FlavorProfile; label: string; color: string }> = [
  { key: "sour", label: "Sour", color: "#E8C547" },
  { key: "sweet", label: "Sweet", color: "#6BBF6B" },
  { key: "bitter", label: "Bitter", color: "#C75B39" },
];

export function FlavorBars({ profile }: FlavorBarsProps) {
  return (
    <View style={styles.container}>
      {FLAVORS.map(({ key, label, color }) => {
        const score = profile[key];
        const pct = Math.round(score * 100);
        return (
          <View
            key={key}
            style={styles.row}
            accessibilityLabel={`${label}: ${pct} percent`}
          >
            <Text style={styles.label}>{label}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.value}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    width: 52,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  track: {
    flex: 1,
    height: 32,
    backgroundColor: "#28221F",
    borderRadius: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 8,
  },
  value: {
    minWidth: 36,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "right",
  },
});
