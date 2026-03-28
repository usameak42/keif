import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Simulation Failed</Text>
      <Text style={styles.body}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Tweak and retry"
      >
        <Text style={styles.buttonText}>Tweak & Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.destructive,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.destructive,
    marginBottom: Spacing.sm,
  },
  body: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  button: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.accent,
  },
});
