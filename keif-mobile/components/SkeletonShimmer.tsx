import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "../constants/colors";

interface SkeletonShimmerProps {
  width: number;
  height: number;
}

export function SkeletonShimmer({ width, height }: SkeletonShimmerProps) {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1,  // infinite repeat
      false,
    );
  }, [width, translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      <Animated.View style={[styles.shimmer, { width, height }, shimmerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
  },
  shimmer: {
    backgroundColor: Colors.surfaceField,
    opacity: 0.5,
  },
});
