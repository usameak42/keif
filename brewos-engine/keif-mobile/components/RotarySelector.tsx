import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Path, Line, Ellipse, Rect, Circle, Defs, RadialGradient, LinearGradient, Stop } from "react-native-svg";
import { Colors } from "../constants/colors";
import type { BrewMethodOption } from "../constants/brewMethods";

const ITEM_WIDTH = 140;
const SPRING_CONFIG = { stiffness: 300, damping: 28, mass: 0.8 };
const TICKS = Array.from({ length: 13 }, (_, i) => i);

const mod = (n: number, m: number) => {
  "worklet";
  return ((n % m) + m) % m;
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const SVG_PROPS = { fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function V60Icon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={48} height={48}>
      <Path d="M16 16 L32 52 L48 16" stroke={color} {...SVG_PROPS} />
      <Path d="M12 16 H52" stroke={color} {...SVG_PROPS} />
      <Line x1="32" y1="52" x2="32" y2="58" stroke={color} {...SVG_PROPS} />
      <Ellipse cx="32" cy="60" rx="8" ry="2" stroke={color} {...SVG_PROPS} />
    </Svg>
  );
}

function EspressoIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={48} height={48}>
      <Path d="M14 28 H50 L46 38 H18 Z" stroke={color} {...SVG_PROPS} />
      <Line x1="32" y1="22" x2="32" y2="28" stroke={color} {...SVG_PROPS} />
      <Circle cx="32" cy="18" r="4" stroke={color} {...SVG_PROPS} />
      <Path d="M18 38 Q32 46 46 38" stroke={color} {...SVG_PROPS} />
    </Svg>
  );
}

function FrenchPressIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={48} height={48}>
      <Rect x="18" y="18" width="28" height="36" rx="2" stroke={color} {...SVG_PROPS} />
      <Line x1="32" y1="8" x2="32" y2="18" stroke={color} {...SVG_PROPS} />
      <Line x1="26" y1="8" x2="38" y2="8" stroke={color} {...SVG_PROPS} />
      <Line x1="18" y1="34" x2="46" y2="34" stroke={color} {...SVG_PROPS} />
      <Path d="M46 26 Q52 26 52 32 Q52 38 46 38" stroke={color} {...SVG_PROPS} />
    </Svg>
  );
}

function MokaPotIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={48} height={48}>
      <Path d="M18 36 L14 54 H50 L46 36" stroke={color} {...SVG_PROPS} />
      <Path d="M22 36 L26 14 H38 L42 36" stroke={color} {...SVG_PROPS} />
      <Line x1="18" y1="36" x2="46" y2="36" stroke={color} {...SVG_PROPS} />
      <Circle cx="32" cy="10" r="3" stroke={color} {...SVG_PROPS} />
      <Path d="M46 44 Q52 44 52 48 Q52 52 46 52" stroke={color} {...SVG_PROPS} />
    </Svg>
  );
}

function KalitaIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={48} height={48}>
      <Path d="M14 16 L22 48 H42 L50 16" stroke={color} {...SVG_PROPS} />
      <Path d="M10 16 H54" stroke={color} {...SVG_PROPS} />
      <Line x1="22" y1="48" x2="42" y2="48" stroke={color} {...SVG_PROPS} />
      <Path d="M20 28 Q24 26 28 28 Q32 30 36 28 Q40 26 44 28" stroke={color} {...SVG_PROPS} />
      <Path d="M21 36 Q25 34 29 36 Q33 38 37 36 Q41 34 43 36" stroke={color} {...SVG_PROPS} />
    </Svg>
  );
}

function AeroPressIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 64 64" width={48} height={48}>
      <Rect x="22" y="20" width="20" height="34" rx="2" stroke={color} {...SVG_PROPS} />
      <Line x1="22" y1="48" x2="42" y2="48" stroke={color} {...SVG_PROPS} />
      <Line x1="32" y1="10" x2="32" y2="20" stroke={color} {...SVG_PROPS} />
      <Line x1="26" y1="10" x2="38" y2="10" stroke={color} {...SVG_PROPS} />
      <Ellipse cx="32" cy="56" rx="6" ry="2" stroke={color} {...SVG_PROPS} />
    </Svg>
  );
}

function BrewIcon({ methodValue, color }: { methodValue: string; color: string }) {
  switch (methodValue) {
    case "v60":          return <V60Icon color={color} />;
    case "espresso":     return <EspressoIcon color={color} />;
    case "french_press": return <FrenchPressIcon color={color} />;
    case "moka_pot":     return <MokaPotIcon color={color} />;
    case "kalita":       return <KalitaIcon color={color} />;
    case "aeropress":    return <AeroPressIcon color={color} />;
    default:             return null;
  }
}

// ─── Carousel Item ────────────────────────────────────────────────────────────
// Each item owns its absolute method index and computes its own position from
// the continuous scrollSV. No React state involved in positioning — zero flash.

interface CarouselItemProps {
  methodIndex: number;
  method: BrewMethodOption;
  scrollSV: Animated.SharedValue<number>;
  baseX: number;
  COUNT: number;
}

function CarouselItem({ methodIndex, method, scrollSV, baseX, COUNT }: CarouselItemProps) {
  const animStyle = useAnimatedStyle(() => {
    const relPos = methodIndex - scrollSV.value;
    const half = COUNT / 2;
    // Wrap to [-half, half) so the item always takes the shortest path
    const wrappedPos = mod(relPos + half, COUNT) - half;
    const offsetFromCenter = wrappedPos * ITEM_WIDTH;
    const dist = Math.min(Math.abs(offsetFromCenter) / ITEM_WIDTH, 2);
    const scale = Math.max(0.8, 1 - dist * 0.1);
    const opacity = Math.max(0.2, 1 - dist * 0.4);
    return {
      transform: [
        { translateX: baseX + offsetFromCenter },
        { scale },
      ],
      opacity,
    };
  });

  // Glow fades as item moves away from center: full at dist=0, ~35% at dist=1, gone at dist=1.5
  const glowAnimStyle = useAnimatedStyle(() => {
    const relPos = methodIndex - scrollSV.value;
    const half = COUNT / 2;
    const wrappedPos = mod(relPos + half, COUNT) - half;
    const dist = Math.abs(wrappedPos);
    return { opacity: Math.max(0, 1 - dist * 0.65) };
  });

  return (
    <Animated.View style={[styles.item, animStyle]}>
      {/* Per-item radial glow — brightest at center, fades for side items */}
      <Animated.View style={[styles.itemGlowWrapper, glowAnimStyle]} pointerEvents="none">
        <Svg width={ITEM_WIDTH} height={180}>
          <Defs>
            <RadialGradient id={`g${methodIndex}`} cx="50%" cy="40%" r="50%" gradientUnits="userSpaceOnUse"
              fx={ITEM_WIDTH / 2} fy={65} r={72}>
              <Stop offset="0%"   stopColor={method.colors.glow} stopOpacity={0.30} />
              <Stop offset="40%"  stopColor={method.colors.glow} stopOpacity={0.12} />
              <Stop offset="75%"  stopColor={method.colors.glow} stopOpacity={0.03} />
              <Stop offset="100%" stopColor={method.colors.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={ITEM_WIDTH / 2} cy={65} rx={72} ry={72} fill={`url(#g${methodIndex})`} />
        </Svg>
      </Animated.View>
      <BrewIcon methodValue={method.value} color={method.colors.glow} />
      <Text style={[styles.itemLabel, { color: method.colors.glow }]}>{method.label}</Text>
    </Animated.View>
  );
}

// ─── Rotary Selector ─────────────────────────────────────────────────────────

interface RotarySelectorProps {
  methods: BrewMethodOption[];
  onIndexChange: (index: number) => void;
}

export function RotarySelector({ methods, onIndexChange }: RotarySelectorProps) {
  const { width: screenWidth } = useWindowDimensions();
  const COUNT = methods.length;
  const baseX = screenWidth / 2 - ITEM_WIDTH / 2;

  const [currentIndex, setCurrentIndex] = useState(0);

  // scrollSV: continuous scroll position in item units (not pixels, not mod'd).
  // scrollSV=0 → method[0] centered, scrollSV=1 → method[1] centered, etc.
  // Never reset to 0 — this is the only source of truth for visual position.
  const scrollSV = useSharedValue(0);
  // committed: last integer target reached, used by arrow buttons on JS thread.
  const committedSV = useSharedValue(0);
  const scrollStart = useSharedValue(0);
  // tracks nearest integer during drag to fire updateIndex as center item changes
  const dragNearestSV = useSharedValue(0);

  const updateIndex = useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
      onIndexChange(idx);
    },
    [onIndexChange],
  );

  const snapTo = useCallback(
    (steps: number) => {
      const target = committedSV.value + steps;
      // Update React state immediately so border/glow color changes in sync with animation start
      updateIndex(mod(target, COUNT));
      scrollSV.value = withSpring(target, SPRING_CONFIG, (finished) => {
        "worklet";
        if (finished) {
          committedSV.value = target;
        }
      });
    },
    [COUNT, committedSV, scrollSV, updateIndex],
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Capture current animated position and cancel ongoing spring.
      // Without this, onUpdate would reset position to 0 causing a jump.
      scrollStart.value = scrollSV.value;
      dragNearestSV.value = Math.round(scrollSV.value);
      cancelAnimation(scrollSV);
    })
    .onUpdate((e) => {
      scrollSV.value = scrollStart.value - e.translationX / ITEM_WIDTH;
      const nearest = Math.round(scrollSV.value);
      if (nearest !== dragNearestSV.value) {
        dragNearestSV.value = nearest;
        runOnJS(updateIndex)(mod(nearest, COUNT));
      }
    })
    .onEnd((e) => {
      const momentum = -(e.velocityX / ITEM_WIDTH) * 0.15;
      const target = Math.round(scrollSV.value + momentum);
      // Fire immediately so border/glow color updates at snap decision time, not animation end
      runOnJS(updateIndex)(mod(target, COUNT));
      scrollSV.value = withSpring(target, SPRING_CONFIG, (finished) => {
        "worklet";
        if (finished) {
          committedSV.value = target;
        }
      });
    });

  // Fade the selection border when dragging between items
  const windowAnimStyle = useAnimatedStyle(() => {
    const frac = mod(scrollSV.value, 1);
    const distFromSnap = Math.min(frac, 1 - frac); // 0 when snapped, 0.5 at midpoint
    return { opacity: Math.max(0.08, 1 - distFromSnap * 2.4) };
  });

  const currentMethod = methods[currentIndex];

  return (
    <View style={styles.wrapper}>
      {/* Outer ambient glow — large soft wash, slow falloff like photographic lighting */}
      <View style={styles.ambientGlowWrapper} pointerEvents="none">
        <Svg width={420} height={420}>
          <Defs>
            <RadialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={currentMethod.colors.glow} stopOpacity={0.22} />
              <Stop offset="20%"  stopColor={currentMethod.colors.glow} stopOpacity={0.14} />
              <Stop offset="45%"  stopColor={currentMethod.colors.glow} stopOpacity={0.07} />
              <Stop offset="70%"  stopColor={currentMethod.colors.glow} stopOpacity={0.02} />
              <Stop offset="88%"  stopColor={currentMethod.colors.glow} stopOpacity={0.005} />
              <Stop offset="100%" stopColor={currentMethod.colors.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={210} cy={210} rx={210} ry={210} fill="url(#outerGlow)" />
        </Svg>
      </View>

      {/* Tick marks top */}
      <View style={styles.ticks}>
        {TICKS.map((i) => (
          <View key={i} style={[styles.tick, i === 6 ? styles.tickTall : styles.tickShort]} />
        ))}
      </View>

      {/* Carousel */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.carouselContainer}>
          {/* Viewing window border — fades when dragging between items */}
          <Animated.View
            style={[
              styles.viewingWindow,
              windowAnimStyle,
              {
                left: screenWidth / 2 - ITEM_WIDTH / 2,
                borderColor: currentMethod.colors.primary,
                shadowColor: currentMethod.colors.glow,
              },
            ]}
          />
          {/* Edge fades — SVG LinearGradient so items fade naturally instead of being blocked */}
          <View style={styles.fadeLeft} pointerEvents="none">
            <Svg width={Math.round(screenWidth * 0.28)} height={180}>
              <Defs>
                <LinearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%"   stopColor="#16100D" stopOpacity={0.97} />
                  <Stop offset="100%" stopColor="#16100D" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect width={Math.round(screenWidth * 0.28)} height={180} fill="url(#fadeL)" />
            </Svg>
          </View>
          <View style={styles.fadeRight} pointerEvents="none">
            <Svg width={Math.round(screenWidth * 0.28)} height={180}>
              <Defs>
                <LinearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%"   stopColor="#16100D" stopOpacity={0} />
                  <Stop offset="100%" stopColor="#16100D" stopOpacity={0.97} />
                </LinearGradient>
              </Defs>
              <Rect width={Math.round(screenWidth * 0.28)} height={180} fill="url(#fadeR)" />
            </Svg>
          </View>

          {methods.map((method, i) => (
            <CarouselItem
              key={method.value}
              methodIndex={i}
              method={method}
              scrollSV={scrollSV}
              baseX={baseX}
              COUNT={COUNT}
            />
          ))}
        </View>
      </GestureDetector>

      {/* Tick marks bottom */}
      <View style={styles.ticks}>
        {TICKS.map((i) => (
          <View key={i} style={[styles.tick, i === 6 ? styles.tickTall : styles.tickShort]} />
        ))}
      </View>

      {/* Arrow navigation */}
      <View style={styles.arrowRow}>
        <TouchableOpacity
          onPress={() => snapTo(-1)}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Previous method"
        >
          <Svg width={20} height={20} viewBox="0 0 20 20">
            <Path d="M12 4 L6 10 L12 16" stroke={Colors.textSecondary} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.rotateLabel}>rotate</Text>
        <TouchableOpacity
          onPress={() => snapTo(1)}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Next method"
        >
          <Svg width={20} height={20} viewBox="0 0 20 20">
            <Path d="M8 4 L14 10 L8 16" stroke={Colors.textSecondary} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
  },
  ambientGlowWrapper: {
    position: "absolute",
    alignSelf: "center",
    top: -88,
    zIndex: 0,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    opacity: 0.3,
    marginVertical: 8,
  },
  tick: {
    width: 2,
    borderRadius: 1,
    backgroundColor: Colors.textPrimary,
  },
  tickShort: {
    height: 8,
    opacity: 0.4,
  },
  tickTall: {
    height: 16,
    opacity: 0.9,
  },
  carouselContainer: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    zIndex: 2,
  },
  viewingWindow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: ITEM_WIDTH,
    borderWidth: 1.5,
    borderRadius: 8,
    zIndex: 10,
    // iOS glow shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "28%",
    zIndex: 5,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "28%",
    zIndex: 5,
  },
  itemGlowWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: ITEM_WIDTH,
    height: 180,
  },
  item: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: ITEM_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  itemLabel: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 20,
    opacity: 0.45,
  },
  rotateLabel: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: Colors.textSecondary,
  },
});
