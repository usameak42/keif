import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import type { KeyboardTypeOptions } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}

export function FormField({
  label,
  value,
  onChangeText,
  suffix,
  placeholder,
  keyboardType = "decimal-pad",
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          keyboardType={keyboardType}
          accessibilityLabel={label}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceField,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    padding: 0,
  },
  suffix: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
});
