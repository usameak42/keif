import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

interface ClickSpinnerProps {
  value: number;
  onValueChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}

export function ClickSpinner({ value, onValueChange, min, max, unit }: ClickSpinnerProps) {
  const decrement = () => {
    const next = value - 1;
    if (next >= min) onValueChange(next);
  };

  const increment = () => {
    const next = value + 1;
    if (next <= max) onValueChange(next);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={decrement}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${unit}`}
      >
        <Text style={styles.buttonText}>-</Text>
      </Pressable>

      <Text style={styles.value}>{value}</Text>

      <Text style={styles.unit}>{unit}</Text>

      <Pressable
        onPress={increment}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${unit}`}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontFamily: Typography.heading.fontFamily,
  },
  value: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontFamily: Typography.heading.fontFamily,
    minWidth: 40,
    textAlign: "center",
  },
  unit: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
});
