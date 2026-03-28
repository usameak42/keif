import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";
import type { BrewMethod } from "../types/simulation";

const METHOD_DISPLAY: Record<BrewMethod, string> = {
  french_press: "French Press",
  v60: "V60",
  kalita: "Kalita Wave",
  espresso: "Espresso",
  moka_pot: "Moka Pot",
  aeropress: "AeroPress",
};

interface SaveRunPromptProps {
  method: BrewMethod;
  onSave: (name: string) => void;
  onSkip: () => void;
}

export function SaveRunPrompt({ method, onSave, onSkip }: SaveRunPromptProps) {
  const autoFillName = `${METHOD_DISPLAY[method]} \u00B7 ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const [runName, setRunName] = useState(autoFillName);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Save This Run?</Text>
      <TextInput
        style={styles.input}
        value={runName}
        onChangeText={setRunName}
        placeholder="e.g. Morning V60"
        placeholderTextColor="#808080"
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => onSave(runName.trim() || autoFillName)}
        accessibilityRole="button"
        accessibilityLabel="Save run"
      >
        <Text style={styles.saveButtonText}>Save Run</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSkip}
        style={styles.skipButton}
        accessibilityRole="button"
        accessibilityLabel="Skip saving"
      >
        <Text style={styles.skipText}>Skip for Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: "#28221F",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
    color: "#16100D",
  },
  skipButton: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
