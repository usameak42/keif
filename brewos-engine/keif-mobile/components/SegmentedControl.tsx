import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({ segments, selectedIndex, onSelect }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        const isActive = index === selectedIndex;
        return (
          <Pressable
            key={segment}
            onPress={() => onSelect(index)}
            style={[styles.segment, isActive && styles.segmentActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={segment}
          >
            <Text
              style={[
                styles.segmentText,
                isActive ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 12,
    height: 40,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: Colors.accent,
  },
  segmentText: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
  },
  segmentTextActive: {
    fontFamily: Typography.heading.fontFamily,
    color: Colors.dominant,
  },
  segmentTextInactive: {
    fontFamily: Typography.label.fontFamily,
    color: Colors.textSecondary,
  },
});
