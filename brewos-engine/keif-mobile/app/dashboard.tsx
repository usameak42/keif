import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";
import { Spacing } from "../constants/spacing";
import { BREW_METHODS, GRINDER_PRESETS } from "../constants/brewMethods";
import type { SimulationInput, RoastLevel, SimMode } from "../types/simulation";
import { BackButton } from "../components/BackButton";
import { GrinderDropdown } from "../components/GrinderDropdown";
import { ClickSpinner } from "../components/ClickSpinner";
import { FormField } from "../components/FormField";
import { SegmentedControl } from "../components/SegmentedControl";
import RoastPillSelector from "../components/RoastPillSelector";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SimulateButton } from "../components/SimulateButton";

type GrinderPreset = (typeof GRINDER_PRESETS)[number];

const ROAST_LEVELS: RoastLevel[] = ["light", "medium_light", "medium", "medium_dark", "dark"];
const SIM_MODES: SimMode[] = ["fast", "accurate"];

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ method: string }>();

  const methodOption = useMemo(
    () => BREW_METHODS.find((m) => m.value === params.method) ?? BREW_METHODS[0],
    [params.method],
  );

  // Form state
  const [selectedGrinder, setSelectedGrinder] = useState<GrinderPreset>(GRINDER_PRESETS[0]);
  const [grinderSetting, setGrinderSetting] = useState(20);
  const [grindSizeMicrons, setGrindSizeMicrons] = useState("");
  const [dose, setDose] = useState(String(methodOption.defaultDose));
  const [water, setWater] = useState(String(methodOption.defaultWater));
  const [temp, setTemp] = useState(String(methodOption.defaultTemp));
  const [time, setTime] = useState(String(methodOption.defaultTime));
  const [roastLevel, setRoastLevel] = useState<RoastLevel>("medium");
  const [modeIndex, setModeIndex] = useState(0); // Fast

  const isManualGrinder = selectedGrinder.value === null;

  useEffect(() => {
    AsyncStorage.getItem("lastRoastLevel").then((stored) => {
      if (stored && ROAST_LEVELS.includes(stored as RoastLevel)) {
        setRoastLevel(stored as RoastLevel);
      }
    });
  }, []);

  const handleRoastSelect = useCallback((level: RoastLevel) => {
    setRoastLevel(level);
    AsyncStorage.setItem("lastRoastLevel", level);
  }, []);

  const handleSimulate = () => {
    const input: SimulationInput = {
      method: methodOption.value,
      coffee_dose: parseFloat(dose),
      water_amount: parseFloat(water),
      water_temp: parseFloat(temp),
      brew_time: parseFloat(time),
      roast_level: roastLevel,
      mode: SIM_MODES[modeIndex],
      grinder_name: selectedGrinder.value,
      grinder_setting: selectedGrinder.value ? grinderSetting : null,
      grind_size: isManualGrinder ? parseFloat(grindSizeMicrons) : null,
    };

    router.push({
      pathname: "/results",
      params: { input: JSON.stringify(input) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <BackButton label="Back" onPress={() => router.back()} />
          <Text style={styles.heading}>{methodOption.label}</Text>

          {/* Grinder selection */}
          <View style={styles.fieldGap}>
            <Text style={styles.sectionLabel}>Grinder</Text>
            <GrinderDropdown
              selectedGrinder={selectedGrinder}
              onSelect={setSelectedGrinder}
            />
          </View>

          {/* Grinder setting or manual microns */}
          <View style={styles.fieldGap}>
            {isManualGrinder ? (
              <FormField
                label="Grind Size"
                value={grindSizeMicrons}
                onChangeText={setGrindSizeMicrons}
                suffix="um"
                placeholder="e.g. 800"
                keyboardType="decimal-pad"
              />
            ) : (
              <>
                <Text style={styles.sectionLabel}>
                  Grinder Setting ({selectedGrinder.unit})
                </Text>
                <ClickSpinner
                  value={grinderSetting}
                  onValueChange={setGrinderSetting}
                  min={selectedGrinder.minSetting ?? 1}
                  max={selectedGrinder.maxSetting ?? 40}
                  unit={selectedGrinder.unit ?? "clicks"}
                />
              </>
            )}
          </View>

          {/* Dose */}
          <View style={styles.fieldGap}>
            <FormField
              label="Dose"
              value={dose}
              onChangeText={setDose}
              suffix="g"
            />
          </View>

          {/* Water */}
          <View style={styles.fieldGap}>
            <FormField
              label="Water"
              value={water}
              onChangeText={setWater}
              suffix="g"
            />
          </View>

          {/* Temperature */}
          <View style={styles.fieldGap}>
            <FormField
              label="Temperature"
              value={temp}
              onChangeText={setTemp}
              suffix="C"
            />
          </View>

          {/* Time */}
          <View style={styles.fieldGap}>
            <FormField
              label="Time"
              value={time}
              onChangeText={setTime}
              suffix="s"
            />
          </View>

          {/* Roast Level */}
          <View style={styles.fieldGap}>
            <Text style={styles.sectionLabel}>Roast Level</Text>
            <RoastPillSelector
              selectedLevel={roastLevel}
              onSelect={handleRoastSelect}
            />
          </View>

          {/* Mode */}
          <View style={styles.fieldGap}>
            <Text style={styles.sectionLabel}>Mode</Text>
            <SegmentedControl
              segments={["Fast", "Accurate"]}
              selectedIndex={modeIndex}
              onSelect={setModeIndex}
            />
          </View>

          {/* Simulate */}
          <View style={styles.simulateWrapper}>
            <SimulateButton onPress={handleSimulate} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dominant,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heading: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldGap: {
    marginBottom: Spacing.md,
  },
  simulateWrapper: {
    marginTop: Spacing.xxl,
  },
});
