import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

export function WarmupBanner() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Warming up the engine...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Spacing.xxxl,
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 10,
    alignItems: "center",
  },
  text: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
});
