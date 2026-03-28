import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Ionicons name="flask-outline" size={48} color={Colors.textSecondary} />
      <Text style={styles.heading}>No Saved Runs</Text>
      <Text style={styles.body}>
        Run a simulation and save it here to track your brews over time.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
});
