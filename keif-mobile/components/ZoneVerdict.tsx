import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

interface ZoneVerdictProps {
  zone: string;
}

interface ZoneConfig {
  text: string;
  color: string;
  showCheck: boolean;
}

const ZONE_MAP: Record<string, ZoneConfig> = {
  ideal: { text: "Ideal", color: Colors.zoneIdeal, showCheck: true },
  under_extracted: { text: "Under-extracted", color: Colors.zoneUnder, showCheck: false },
  over_extracted: { text: "Over-extracted", color: Colors.zoneOver, showCheck: false },
  weak: { text: "Under-extracted", color: Colors.zoneUnder, showCheck: false },
  strong: { text: "Over-extracted", color: Colors.zoneOver, showCheck: false },
};

const DEFAULT_CONFIG: ZoneConfig = {
  text: "Unknown",
  color: Colors.textSecondary,
  showCheck: false,
};

export function ZoneVerdict({ zone }: ZoneVerdictProps) {
  const config = ZONE_MAP[zone] ?? DEFAULT_CONFIG;

  return (
    <View style={styles.container}>
      {config.showCheck && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={config.color}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
  },
});
