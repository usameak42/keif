import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

interface DeleteConfirmModalProps {
  visible: boolean;
  onDelete: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ visible, onDelete, onCancel }: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.heading}>Delete this run?</Text>
          <Text style={styles.body}>This cannot be undone.</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete run"
          >
            <Text style={styles.deleteButtonText}>Delete Run</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.keepButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Keep run"
          >
            <Text style={styles.keepButtonText}>Keep Run</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.lg,
  },
  heading: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 29,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  deleteButton: {
    backgroundColor: Colors.destructive,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: "#EAE2D7",
  },
  keepButton: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  keepButtonText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    color: Colors.textSecondary,
  },
});
