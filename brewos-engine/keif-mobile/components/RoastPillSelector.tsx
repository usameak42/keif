import React, { useRef, useEffect } from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import type { RoastLevel } from "../types/simulation";
import { Colors } from "../constants/colors";
import { Spacing } from "../constants/spacing";

interface RoastPillSelectorProps {
  selectedLevel: RoastLevel;
  onSelect: (level: RoastLevel) => void;
}

const PILLS: { value: RoastLevel; label: string }[] = [
  { value: "light",       label: "Light" },
  { value: "medium_light", label: "Medium Light" },
  { value: "medium",      label: "Medium" },
  { value: "medium_dark", label: "Medium Dark" },
  { value: "dark",        label: "Dark" },
];

export default function RoastPillSelector({ selectedLevel, onSelect }: RoastPillSelectorProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const pillOffsets = useRef<Partial<Record<RoastLevel, number>>>({});

  useEffect(() => {
    scrollViewRef.current?.scrollTo({
      x: pillOffsets.current[selectedLevel] ?? 0,
      animated: false,
    });
  }, [selectedLevel]);

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.contentContainer}
      style={styles.scrollView}
    >
      {PILLS.map((pill) => {
        const isSelected = pill.value === selectedLevel;
        return (
          <View
            key={pill.value}
            onLayout={(event) => {
              pillOffsets.current[pill.value] = event.nativeEvent.layout.x;
            }}
          >
            <Pressable
              onPress={() => onSelect(pill.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={pill.label}
              hitSlop={{ top: 4, bottom: 4 }}
              style={({ pressed }) => [
                styles.pill,
                isSelected
                  ? pressed
                    ? styles.pillSelectedPressed
                    : styles.pillSelected
                  : pressed
                    ? styles.pillUnselectedPressed
                    : styles.pillUnselected,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
                  isSelected && { color: Colors.dominant },
                ]}
              >
                {pill.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    paddingVertical: Spacing.xs,
  },
  contentContainer: {
    gap: Spacing.xs,
  },
  pill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pillSelected: {
    backgroundColor: Colors.accent,
  },
  pillSelectedPressed: {
    backgroundColor: Colors.accentActive,
  },
  pillUnselected: {
    backgroundColor: Colors.card,
  },
  pillUnselectedPressed: {
    backgroundColor: Colors.borderSubtle,
  },
  pillText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  pillTextSelected: {
    color: Colors.dominant,
  },
  pillTextUnselected: {
    color: Colors.textSecondary,
  },
});
