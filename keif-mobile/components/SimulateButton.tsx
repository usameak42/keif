import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";

interface SimulateButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function SimulateButton({ onPress, disabled = false }: SimulateButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Run Simulation"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.text}>Run Simulation</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 52,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPressed: {
    backgroundColor: Colors.accentActive,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: Typography.body.fontSize,
    fontFamily: Typography.heading.fontFamily,
    lineHeight: Typography.body.lineHeight,
    color: Colors.dominant,
  },
});
