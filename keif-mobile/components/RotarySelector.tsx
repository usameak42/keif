import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Colors } from "../constants/colors";
import { Typography } from "../constants/typography";

const ITEM_HEIGHT = 60;
const VISIBLE_COUNT = 3;
const SNAP_CONFIG = { damping: 0.7, stiffness: 150 };

interface RotarySelectorProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function RotarySelector({ items, selectedIndex, onSelect }: RotarySelectorProps) {
  const translateY = useSharedValue(-selectedIndex * ITEM_HEIGHT);
  const startY = useSharedValue(0);

  const snapToIndex = useCallback(
    (index: number) => {
      "worklet";
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      translateY.value = withSpring(-clamped * ITEM_HEIGHT, SNAP_CONFIG);
      runOnJS(onSelect)(clamped);
    },
    [items.length, onSelect, translateY],
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      const projected = translateY.value + event.velocityY * 0.15;
      const rawIndex = Math.round(-projected / ITEM_HEIGHT);
      snapToIndex(rawIndex);
    });

  const handleItemPress = useCallback(
    (index: number) => {
      onSelect(index);
      translateY.value = withSpring(-index * ITEM_HEIGHT, SNAP_CONFIG);
    },
    [onSelect, translateY],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={styles.container}>
        <View style={styles.window}>
          {items.map((item, index) => (
            <RotaryItem
              key={item}
              label={item}
              index={index}
              translateY={translateY}
              onPress={handleItemPress}
            />
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

interface RotaryItemProps {
  label: string;
  index: number;
  translateY: Animated.SharedValue<number>;
  onPress: (index: number) => void;
}

function RotaryItem({ label, index, translateY, onPress }: RotaryItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const centerOffset = translateY.value + index * ITEM_HEIGHT;
    const distance = Math.abs(centerOffset) / ITEM_HEIGHT;
    const scale = distance < 0.5 ? 1.2 : 0.85;
    const opacity = distance < 0.5 ? 1 : 0.6;

    return {
      transform: [
        { translateY: centerOffset },
        { scale },
      ],
      opacity,
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const centerOffset = translateY.value + index * ITEM_HEIGHT;
    const distance = Math.abs(centerOffset) / ITEM_HEIGHT;
    const isSelected = distance < 0.5;

    return {
      color: isSelected ? Colors.accent : Colors.textSecondary,
    };
  });

  return (
    <Animated.View style={[styles.item, animatedStyle]}>
      <Pressable
        onPress={() => onPress(index)}
        style={styles.itemPressable}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      >
        <Animated.Text style={[styles.itemTextBase, textStyle]}>
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: VISIBLE_COUNT * ITEM_HEIGHT,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  window: {
    height: VISIBLE_COUNT * ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
  },
  itemPressable: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTextBase: {
    fontFamily: Typography.heading.fontFamily,
    fontSize: Typography.heading.fontSize,
    lineHeight: Typography.heading.lineHeight,
    textAlign: "center",
  },
});
