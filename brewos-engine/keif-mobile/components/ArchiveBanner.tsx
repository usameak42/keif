import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

interface ArchiveBannerProps {
  count: number;
  onArchive: () => void;
  onDismiss: () => void;
}

export function ArchiveBanner({ count, onArchive, onDismiss }: ArchiveBannerProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.messageRow}>
        <Ionicons name="alert-circle" size={20} color="#E8C547" />
        <Text style={styles.messageText}>
          You have {count} saved runs. Archive older runs to keep the app fast.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.archiveButton}
        onPress={onArchive}
        accessibilityRole="button"
        accessibilityLabel="Archive runs older than 30 days"
      >
        <Text style={styles.archiveButtonText}>Archive Runs Older Than 30 Days</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss warning">
        <Text style={styles.dismissText}>Dismiss Warning</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(232, 197, 71, 0.15)",
    borderLeftWidth: 4,
    borderLeftColor: "#E8C547",
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  messageText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  archiveButton: {
    borderWidth: 1,
    borderColor: "#E8C547",
    borderRadius: 8,
    height: 40,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  archiveButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    color: "#E8C547",
  },
  dismissText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
});
