import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import { GRINDER_PRESETS } from "../constants/brewMethods";

type GrinderPreset = (typeof GRINDER_PRESETS)[number];

interface GrinderDropdownProps {
  selectedGrinder: GrinderPreset;
  onSelect: (grinder: GrinderPreset) => void;
}

export function GrinderDropdown({ selectedGrinder, onSelect }: GrinderDropdownProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSelect = (grinder: GrinderPreset) => {
    onSelect(grinder);
    setExpanded(false);
  };

  return (
    <View>
      <Pressable
        style={styles.trigger}
        onPress={() => setExpanded(true)}
        accessibilityRole="button"
        accessibilityLabel={`Grinder: ${selectedGrinder.label}`}
      >
        <Text style={styles.triggerText}>{selectedGrinder.label}</Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </Pressable>

      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setExpanded(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Grinder</Text>
            <FlatList
              data={GRINDER_PRESETS as readonly GrinderPreset[]}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => {
                const isSelected = item.label === selectedGrinder.label;
                return (
                  <Pressable
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceField,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  triggerText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  sheetTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  option: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: Colors.accent + "33",
  },
  optionText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    color: Colors.accent,
  },
});
