import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  text: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
});
