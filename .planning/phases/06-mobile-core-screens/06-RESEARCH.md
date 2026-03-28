# Phase 6: Mobile Core Screens - Research

**Researched:** 2026-03-28
**Domain:** Expo / React Native mobile app with custom navigation, form input, API integration, and Victory Native charting
**Confidence:** HIGH

## Summary

Phase 6 is a greenfield Expo/React Native project that delivers three screens (Rotary Selector, Brew Dashboard, Results) with a custom "filtration" navigation metaphor, numeric parameter input forms, API integration to the deployed FastAPI backend, and an SCA brew chart rendered with Victory Native. The project has no existing mobile code -- everything is built from scratch.

The critical technical challenges are: (1) the custom rotary/drum selector component requiring react-native-reanimated gesture handling and spring physics, (2) the "filtration" transition animations requiring a JS-based stack navigator (`@react-navigation/stack`) instead of the default native stack since Expo Router's native stack does not expose `cardStyleInterpolator`, and (3) the SCA brew chart overlay using Victory Native's CartesianChart with custom Skia `Rect` elements for the ideal zone rectangle.

**Primary recommendation:** Use Expo SDK 52 with Expo Router (file-based routing), wrapping `@react-navigation/stack` via `withLayoutContext` for custom filtration transitions. Build the rotary selector as a custom component with `react-native-reanimated` + `react-native-gesture-handler`. Use Victory Native (v41) with `@shopify/react-native-skia` for the SCA chart.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: "Filtration" navigation pattern -- three-screen linear flow: Rotary Selector -> Brew Dashboard -> Results. No tab bars, no menus.
- D-02: Forward transition = content dissolves and drips downward (Y: 0 -> +40px, opacity: 1 -> 0) while incoming fades in from above (Y: -40px -> 0, opacity: 0 -> 1). Duration: 350ms, easing: ease-out. Back transition = reverse.
- D-03: Back/tweak button on Results returns to Brew Dashboard (and from Dashboard to Rotary Selector). No standard back arrow -- custom touch target.
- D-04: First screen. User picks from all 6 brew methods.
- D-05: "Rotary Selector" implies a rotating/scrolling selector UI -- custom component, not a standard picker or list.
- D-06: Single scrollable screen. All parameters visible in one view.
- D-07: Parameter order: Grinder model -> Setting -> Dose -> Water -> Temperature -> Time -> Roast level -> Mode toggle -> Simulate button.
- D-08: Grinder input: dropdown for model (Comandante C40 MK4, 1Zpresso J-Max, Baratza Encore, Manual). If preset -> click spinner. If Manual -> micron text field.
- D-09: Roast level: segmented selector -- Light / Medium / Dark.
- D-10: Fast / Accurate mode: segmented toggle. Accurate triggers loading spinner (<4s).
- D-11: Simulate button at bottom of scroll. Single tap triggers API call.
- D-12: Balanced split layout -- TDS%/EY%/zone verdict callouts upper, SCA chart lower.
- D-13: Zone verdict: "Ideal", "Under-extracted", or "Over-extracted" with color coding.
- D-14: SCA brew chart with result point plotted against ideal zone rectangle (Victory Native).
- D-15: Accurate mode badge "Detailed simulation".
- D-16: API base URL stored as environment variable / Expo constant -- not hardcoded.
- D-17: GET /health on app launch for cold-start warm-up.

### Claude's Discretion
- TypeScript throughout (standard for Expo projects)
- State management: local React state / context (no Redux/Zustand)
- Navigation library: Expo Router -- recommended based on research (see below)
- Directory structure: screens/, components/, hooks/, constants/
- Error handling for API failures (network errors, 422 validation errors)

### Deferred Ideas (OUT OF SCOPE)
- Extended output charts (extraction curve, PSD, flavor axis) -- Phase 7
- Run history / save / compare -- Phase 7
- Cold brew / decoction methods -- out of scope (v2)
- On-device simulation (no backend dependency) -- out of scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOB-01 | User can select brew method from 6 options | Rotary selector custom component with reanimated gesture + spring snap |
| MOB-02 | User can select grinder from preset database OR enter grind size manually | Conditional form field: dropdown -> click spinner vs. text input for manual microns |
| MOB-03 | User can enter brew parameters (dose, water, temp, time) | Numeric FormField component with suffix labels, numeric keyboard type |
| MOB-04 | User can select roast level (light/medium/dark) | Reusable SegmentedControl component (3 segments) |
| MOB-05 | User can toggle fast vs accurate mode | Reusable SegmentedControl component (2 segments) |
| MOB-06 | User can run simulation and see loading state | fetch() POST to /simulate, skeleton shimmer while accurate mode computes |
| MOB-07 | User can see TDS% and EY% as primary callouts | ResultCalloutCard component with Display typography (36px SemiBold) |
| MOB-08 | User can see SCA brew chart with result vs ideal zone | Victory Native CartesianChart + Scatter + custom Skia Rect for zone overlay |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | 52.0.49 | Expo SDK -- managed workflow | Latest stable SDK; required for all Expo projects |
| expo-router | 4.0.22 | File-based routing | Official Expo routing solution; integrates with React Navigation |
| react-native-reanimated | 4.3.0 | Animations (rotary, shimmer, transitions) | Required by Victory Native; standard for RN animations |
| react-native-gesture-handler | 2.30.1 | Touch/pan gestures (rotary selector) | Required by React Navigation and Victory Native |
| victory-native | 41.20.2 | SCA brew chart (scatter + zone overlay) | Locked by CLAUDE.md; Skia-powered charting |
| @shopify/react-native-skia | 2.5.4 | Skia rendering engine (required by Victory Native) | Peer dependency of victory-native |
| @react-navigation/stack | 7.8.8 | JS-based stack navigator for custom transitions | Required for cardStyleInterpolator (native stack lacks this) |
| typescript | ~5.6 | Type safety | Standard for Expo projects |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-font | latest (SDK 52 compatible) | Load Inter font | Typography spec requires Inter |
| @expo-google-fonts/inter | 0.4.2 | Inter font files | Provides Inter_400Regular, Inter_600SemiBold |
| react-native-safe-area-context | 5.7.0 | Safe area insets (status bar, home indicator) | All screens need safe area padding |
| @expo/vector-icons | 15.1.1 | Ionicons subset for icons | Checkmark icon (zone verdict), chevron (dropdown) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-navigation/stack | Expo Router native Stack | Native stack does NOT support cardStyleInterpolator -- cannot implement filtration transitions |
| fetch() | axios | fetch() is built-in, sufficient for 2 endpoints, no extra dependency needed |
| Local state / Context | Zustand / Redux | Overkill for 3 screens with one-directional data flow |
| Custom rotary component | react-native-animated-wheel-picker | Package has unhealthy release cadence; custom build gives full control over the exact UX spec |

**Installation:**
```bash
npx create-expo-app@latest keif-mobile --template blank-typescript
cd keif-mobile
npx expo install expo-router react-native-reanimated react-native-gesture-handler react-native-safe-area-context @shopify/react-native-skia victory-native expo-font @expo-google-fonts/inter @expo/vector-icons
npm install @react-navigation/stack
```

**Version verification:** All versions above were verified against npm registry on 2026-03-28. Expo SDK 52 is the latest stable (SDK 53/55 are canary only).

## Architecture Patterns

### Recommended Project Structure

```
keif-mobile/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout: wraps with custom JS Stack + fonts
│   ├── index.tsx               # Rotary Selector screen (entry point)
│   ├── dashboard.tsx           # Brew Dashboard screen
│   └── results.tsx             # Results screen
├── components/
│   ├── RotarySelector.tsx      # Custom rotary/drum picker
│   ├── FormField.tsx           # Reusable numeric input with label + suffix
│   ├── ClickSpinner.tsx        # -/+ stepper for grinder setting
│   ├── SegmentedControl.tsx    # Reusable segmented toggle (2 or 3 segments)
│   ├── GrinderDropdown.tsx     # Bottom sheet / modal grinder picker
│   ├── SimulateButton.tsx      # Full-width accent CTA
│   ├── ResultCalloutCard.tsx   # TDS% or EY% display card
│   ├── ZoneVerdict.tsx         # Colored verdict text + icon
│   ├── SCAChart.tsx            # Victory Native chart with zone overlay
│   ├── SkeletonShimmer.tsx     # Loading placeholder with shimmer
│   ├── ErrorCard.tsx           # Error display with retry CTA
│   ├── BackButton.tsx          # Custom back touch target
│   └── WarmupBanner.tsx        # Backend cold-start notice
├── hooks/
│   ├── useSimulation.ts        # API call hook (POST /simulate)
│   └── useHealthCheck.ts       # GET /health on mount
├── constants/
│   ├── colors.ts               # Color tokens from UI spec
│   ├── typography.ts           # Font size/weight/lineHeight definitions
│   ├── spacing.ts              # Spacing scale (xs through 3xl)
│   ├── api.ts                  # API_BASE_URL from env, endpoint paths
│   └── brewMethods.ts          # Method labels, enum values, default params
├── types/
│   ├── simulation.ts           # TypeScript types mirroring SimulationInput/Output
│   └── navigation.ts           # Route param types
├── app.config.ts               # Expo config with EXPO_PUBLIC_API_URL
├── package.json
└── tsconfig.json
```

### Pattern 1: Custom JS Stack with Expo Router (Filtration Transitions)

**What:** Wrap `@react-navigation/stack`'s `createStackNavigator` with Expo Router's `withLayoutContext` to get file-based routing WITH custom `cardStyleInterpolator`.

**When to use:** Whenever you need custom transition animations that the native stack does not support.

**Example:**
```typescript
// app/_layout.tsx
import { withLayoutContext } from "expo-router";
import { createStackNavigator, StackNavigationOptions } from "@react-navigation/stack";

const { Navigator } = createStackNavigator();
const JsStack = withLayoutContext<StackNavigationOptions, typeof Navigator>(Navigator);

const filtrationForward = ({ current, layouts }: any) => ({
  cardStyle: {
    opacity: current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [{
      translateY: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-40, 0],  // incoming rises from above
      }),
    }],
  },
});

export default function Layout() {
  return (
    <JsStack
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: filtrationForward,
        transitionSpec: {
          open: { animation: "timing", config: { duration: 350, easing: Easing.out(Easing.ease) } },
          close: { animation: "timing", config: { duration: 350, easing: Easing.out(Easing.ease) } },
        },
        cardStyle: { backgroundColor: "#16100D" },
      }}
    />
  );
}
```

**Source:** [Expo Router Stack Docs](https://docs.expo.dev/router/advanced/stack/), [React Navigation Stack Navigator](https://reactnavigation.org/docs/stack-navigator/), [Expo GitHub Issue #35917](https://github.com/expo/expo/issues/35917)

### Pattern 2: Custom Rotary Selector with Reanimated + Gesture Handler

**What:** A vertical drum picker with 3 visible items, pan gesture to scroll, spring snap to nearest item.

**When to use:** MOB-01 brew method selection.

**Example:**
```typescript
// components/RotarySelector.tsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const ITEM_HEIGHT = 60;
const SNAP_CONFIG = { damping: 0.7, stiffness: 150 };

export function RotarySelector({ items, onSelect }: Props) {
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => { translateY.value = startY.value + e.translationY; })
    .onEnd(() => {
      const snappedIndex = Math.round(-translateY.value / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(snappedIndex, items.length - 1));
      translateY.value = withSpring(-clampedIndex * ITEM_HEIGHT, SNAP_CONFIG);
      runOnJS(onSelect)(clampedIndex);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
      }))}>
        {items.map((item, i) => (
          <RotaryItem key={item} label={item} index={i} translateY={translateY} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}
```

**Source:** [React Native Reanimated Gestures](https://docs.swmansion.com/react-native-reanimated/docs/3.x/fundamentals/handling-gestures/)

### Pattern 3: SCA Brew Chart with Victory Native + Custom Skia Overlay

**What:** CartesianChart with a single scatter point (the result) and a custom Skia `Rect` for the SCA ideal zone.

**When to use:** MOB-08 results display.

**Example:**
```typescript
// components/SCAChart.tsx
import { CartesianChart, Scatter } from "victory-native";
import { Rect as SkiaRect } from "@shopify/react-native-skia";

// SCA ideal zone: EY 18-22%, TDS 1.15-1.35% (filter)
const IDEAL_ZONE = { eyMin: 18, eyMax: 22, tdsMin: 1.15, tdsMax: 1.35 };

export function SCAChart({ tds, ey }: { tds: number; ey: number }) {
  const data = [{ ey, tds }];

  return (
    <CartesianChart
      data={data}
      xKey="ey"
      yKeys={["tds"]}
      domain={{ x: [14, 26], y: [0.8, 1.6] }}
    >
      {({ xScale, yScale, points }) => {
        const zoneX = xScale(IDEAL_ZONE.eyMin);
        const zoneW = xScale(IDEAL_ZONE.eyMax) - zoneX;
        const zoneY = yScale(IDEAL_ZONE.tdsMax);  // y-axis inverted in canvas
        const zoneH = yScale(IDEAL_ZONE.tdsMin) - zoneY;

        return (
          <>
            <SkiaRect
              x={zoneX} y={zoneY}
              width={zoneW} height={zoneH}
              color="rgba(217, 122, 38, 0.2)"
            />
            <Scatter points={points.tds} radius={5} color="#D97A26" style="fill" />
          </>
        );
      }}
    </CartesianChart>
  );
}
```

**Source:** [Victory Native CartesianChart Docs](https://nearform.com/open-source/victory-native/docs/cartesian/cartesian-chart/), [Victory Native Scatter Docs](https://nearform.com/open-source/victory-native/docs/cartesian/scatter/)

### Pattern 4: API Client with Type-Safe Fetch

**What:** Simple fetch-based API client with typed request/response, timeout handling, and error extraction.

**When to use:** All API calls (MOB-06).

**Example:**
```typescript
// hooks/useSimulation.ts
import { useState, useCallback } from "react";
import { API_BASE_URL } from "../constants/api";
import type { SimulationInput, SimulationOutput, ApiError } from "../types/simulation";

export function useSimulation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (input: SimulationInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.status === 422) {
        const body: ApiError = await res.json();
        setError(body.errors?.join("; ") ?? body.detail ?? "Validation error");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e: any) {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { simulate, loading, result, error, clearError: () => setError(null) };
}
```

### Anti-Patterns to Avoid

- **Native stack with custom transitions:** Expo Router's default `Stack` wraps `@react-navigation/native-stack` which does NOT support `cardStyleInterpolator`. You MUST use the JS stack via `withLayoutContext`.
- **Hardcoded API URL:** Must use `EXPO_PUBLIC_API_URL` env var in `app.config.ts`, never a string literal in component code.
- **Global state library for 3 screens:** Local state + passing via route params or context is sufficient. Redux/Zustand adds unnecessary complexity.
- **Third-party wheel picker:** Available packages (react-native-animated-wheel-picker) have stale release cadences and won't match the exact UI spec. Custom build is the correct approach.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Safe area insets | Manual StatusBar height calc | react-native-safe-area-context | Handles notches, home indicators, dynamic island across all devices |
| Spring physics / gesture animations | Manual Animated.Value math | react-native-reanimated SharedValues | Runs on UI thread (60fps), handles gesture interruption correctly |
| Chart axes, scales, tick marks | Manual canvas math | Victory Native CartesianChart | D3-backed scales, automatic tick generation, axis labeling |
| Icon rendering | SVG imports or custom images | @expo/vector-icons (Ionicons) | Bundled with Expo, tree-shaken, consistent cross-platform |
| Font loading | Manual fetch + loadAsync | expo-font + @expo-google-fonts | Handles async font loading, splash screen integration |

**Key insight:** The custom components in this phase (RotarySelector, SkeletonShimmer, FiltrationTransition) are UX-signature elements that must be hand-built. But infrastructure (gestures, animations, charts, fonts, safe areas) should use established libraries.

## Common Pitfalls

### Pitfall 1: Native Stack vs JS Stack Confusion
**What goes wrong:** Developer uses Expo Router's default `Stack` (native stack) and cannot find `cardStyleInterpolator` in the options. Transitions fall back to platform defaults.
**Why it happens:** Expo Router defaults to `@react-navigation/native-stack` for performance. The native stack uses platform-native transitions and does not support JS-side card interpolators.
**How to avoid:** Explicitly use `@react-navigation/stack` wrapped with `withLayoutContext` in the root `_layout.tsx`. Accept the minor performance tradeoff (JS-driven transitions vs native).
**Warning signs:** `cardStyleInterpolator` option is silently ignored; transitions look like standard iOS/Android push animations.

### Pitfall 2: Victory Native Peer Dependency Mismatch
**What goes wrong:** Victory Native 41 requires specific versions of `@shopify/react-native-skia` and `react-native-reanimated`. Version mismatches cause runtime crashes (white screen, "cannot read property of undefined" in Skia canvas).
**Why it happens:** npm auto-resolves to latest versions which may not match Victory Native's peer dependency expectations.
**How to avoid:** Use `npx expo install victory-native @shopify/react-native-skia react-native-reanimated` -- Expo's installer resolves SDK-compatible versions.
**Warning signs:** Metro bundler warnings about peer dependency mismatches; blank chart area with no error.

### Pitfall 3: Reanimated Babel Plugin Missing
**What goes wrong:** Reanimated worklets throw "Reanimated 2 failed to create a worklet" or similar runtime errors.
**Why it happens:** `react-native-reanimated/plugin` must be the last plugin in `babel.config.js`. Forgetting this or placing it before other plugins breaks worklet compilation.
**How to avoid:** Add `plugins: ["react-native-reanimated/plugin"]` as the LAST entry in `babel.config.js`. Clear Metro cache after adding: `npx expo start --clear`.
**Warning signs:** "ReanimatedError" in dev console; animations don't run.

### Pitfall 4: Numeric Keyboard Input Handling
**What goes wrong:** User types "15.5" but the value is stored as string, or decimal point is not supported, or the keyboard type shows letters on Android.
**Why it happens:** React Native's `keyboardType="numeric"` behaves differently on iOS (allows decimal) vs Android (may not). TextInput value is always a string.
**How to avoid:** Use `keyboardType="decimal-pad"` for fields that accept decimals (dose, water, temp). Parse with `parseFloat()` on blur, not on every keystroke. Validate that the parsed value is a valid number.
**Warning signs:** `NaN` sent to API; Android keyboard shows period but input ignores it.

### Pitfall 5: API Field Name Mismatch
**What goes wrong:** The app sends `water_mass` but the API expects `water_amount`. Pydantic returns a 422 validation error that's hard to debug.
**Why it happens:** The UI spec and API schema use slightly different naming. Easy to confuse `water_amount` (API) with `water_mass` or `water`.
**How to avoid:** Define a TypeScript type that exactly mirrors `SimulationInput` from `brewos/models/inputs.py`. Map form state to API fields in a single `buildSimulationInput()` function.
**Warning signs:** 422 errors with "field required" for fields you think you're sending.

### Pitfall 6: SCA Chart Y-Axis Inversion
**What goes wrong:** The ideal zone rectangle appears upside down on the chart because Skia canvas Y coordinates increase downward, but TDS% values increase upward.
**Why it happens:** When using `yScale()` to convert data values to canvas coordinates, higher TDS values map to lower Y pixel values. If you compute `zoneY = yScale(tdsMin)` instead of `yScale(tdsMax)`, the rectangle draws from the wrong origin.
**How to avoid:** Always use `yScale(tdsMax)` for the top of the zone rectangle (smallest Y pixel value) and compute height as `yScale(tdsMin) - yScale(tdsMax)`.
**Warning signs:** Zone rectangle is below the scatter point when it should surround it.

## Code Examples

### TypeScript Types Mirroring Backend Schema

```typescript
// types/simulation.ts
// Mirrors brewos/models/inputs.py SimulationInput exactly
export type BrewMethod = "french_press" | "v60" | "kalita" | "espresso" | "moka_pot" | "aeropress";
export type RoastLevel = "light" | "medium" | "dark";
export type SimMode = "fast" | "accurate";

export interface SimulationInput {
  method: BrewMethod;
  coffee_dose: number;          // g, must be > 0
  water_amount: number;         // g, must be > 0
  water_temp: number;           // C, 0 < temp < 100
  brew_time: number;            // s, must be > 0
  roast_level: RoastLevel;
  mode: SimMode;
  grinder_name: string | null;  // null if Manual
  grinder_setting: number | null; // null if Manual
  grind_size: number | null;    // um, null if preset
}

// Mirrors brewos/models/outputs.py SimulationOutput (fields used in Phase 6)
export interface SCAPosition {
  tds_percent: number;
  ey_percent: number;
  zone: string;  // "ideal" | "under_extracted" | "over_extracted" | "weak" | "strong"
  on_chart: boolean;
}

export interface SimulationOutput {
  tds_percent: number;
  extraction_yield: number;
  mode_used: string;
  sca_position: SCAPosition | null;
  warnings: string[];
  // Phase 7 fields exist in API response but ignored in Phase 6 UI
}

export interface ApiError {
  detail: string;
  errors?: string[];
}
```

### Skeleton Shimmer Loading Component

```typescript
// components/SkeletonShimmer.tsx
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, View } from "react-native";

export function SkeletonShimmer({ width, height }: { width: number; height: number }) {
  const shimmerX = useSharedValue(-width);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(width, { duration: 1500 }),
      -1,  // infinite repeat
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#251D18",
    borderRadius: 16,
    overflow: "hidden",
  },
  shimmer: {
    width: "30%",
    height: "100%",
    backgroundColor: "#28221F",
    opacity: 0.6,
  },
});
```

### Health Check Hook

```typescript
// hooks/useHealthCheck.ts
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../constants/api";

export function useHealthCheck() {
  const [backendReady, setBackendReady] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        setBackendReady(res.ok);
      } catch {
        setBackendReady(false);
      }
    };
    check();
  }, []);

  return { backendReady };
}
```

### Color and Typography Constants

```typescript
// constants/colors.ts
export const Colors = {
  dominant: "#16100D",
  card: "#251D18",
  accent: "#D97A26",
  accentActive: "#EB9E47",
  destructive: "#D94F4F",
  textPrimary: "#EAE2D7",
  textSecondary: "#808080",
  surfaceField: "#28221F",
  borderSubtle: "#3B322B",
  zoneUnder: "#5B9BD5",
  zoneOver: "#D94F4F",
  zoneIdeal: "#D97A26",
  spinnerTrack: "#3B322B",
  spinnerActive: "#D97A26",
} as const;

// constants/typography.ts
export const Typography = {
  label: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  body: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24 },
  heading: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 29 },
  display: { fontSize: 36, fontFamily: "Inter_600SemiBold", lineHeight: 40 },
} as const;

// constants/spacing.ts
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Navigation manual config | Expo Router file-based routing | Expo SDK 49+ (2023) | Routes defined by file structure in app/ directory |
| Victory Native (old, web-based API) | Victory Native XL (Skia-powered) | v40+ (2024) | Breaking API change; uses CartesianChart + render children pattern |
| Reanimated 2 | Reanimated 3/4 | 2024-2025 | SharedValues API stable; Fabric support in v4 |
| @react-navigation/stack default | @react-navigation/native-stack default | React Nav 7 (2024) | Native stack is now the default; JS stack still available for custom animations |

**Deprecated/outdated:**
- `Victory` (web) components like `<VictoryChart>`, `<VictoryScatter>` do NOT work in React Native -- must use `victory-native` with CartesianChart pattern
- `Animated` from `react-native` core -- use `react-native-reanimated` for all animations (UI thread performance)
- `cardStyleInterpolator` in native stack -- this option only exists in `@react-navigation/stack` (JS stack)

## Open Questions

1. **SCA Chart domain for espresso**
   - What we know: Filter brew SCA chart uses EY 14-26%, TDS 0.8-1.6%. Espresso uses EY 14-26%, TDS 6-12%.
   - What's unclear: The API's `sca_position.zone` field handles classification, but the chart Y-axis range must change based on brew method.
   - Recommendation: Use `sca_position.on_chart` from API to determine if the chart is displayable. Branch chart domain based on method: espresso gets different Y-axis range. This is a simple conditional in the SCAChart component.

2. **Back transition direction (filtration metaphor)**
   - What we know: Forward = drip down, Back = rise up. Both use cardStyleInterpolator.
   - What's unclear: Whether a single interpolator can detect direction (push vs pop) to apply the correct animation.
   - Recommendation: React Navigation's `cardStyleInterpolator` receives `current.progress` which goes 0->1 on push and `closing` animated node indicates pop. Use `closing` to branch between downward (push) and upward (pop) animations.

3. **Expo project location relative to brewos-engine**
   - What we know: `brewos-engine/` is the Python sub-repo. Mobile code needs a separate location.
   - What's unclear: Whether to create `keif-mobile/` at the repo root alongside `brewos-engine/` or inside it.
   - Recommendation: Create `keif-mobile/` at `D:\Coding\Keif\keif-mobile\` -- parallel to `brewos-engine/`, under the same local root. This keeps the mobile app separate from the Python package while staying in the same project workspace. Add it to `sub_repos` in config.json.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Expo CLI, Metro bundler | Yes | v24.13.0 | -- |
| npm | Package installation | Yes | 11.6.2 | -- |
| npx | create-expo-app, expo start | Yes | 11.6.2 | -- |
| iOS Simulator | Testing on iOS | Unknown | -- | Test on Android emulator first; iOS requires macOS |
| Android Emulator | Testing on Android | Unknown | -- | Use Expo Go on physical device |
| Expo Go app | Quick testing on device | N/A | -- | Install on phone from app store |

**Missing dependencies with no fallback:**
- None blocking -- Node.js and npm are available.

**Missing dependencies with fallback:**
- iOS Simulator: Requires macOS with Xcode. If running on Windows (current environment), test with Android emulator or Expo Go on physical iOS device.
- Android Emulator: Needs Android Studio with AVD. Can use Expo Go on physical Android device as alternative.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (bundled with Expo) + React Native Testing Library |
| Config file | `jest.config.js` (generated by create-expo-app, or configured in package.json) |
| Quick run command | `npx jest --watchAll=false` |
| Full suite command | `npx jest --coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOB-01 | Rotary selector renders 6 methods, selection callback fires | unit | `npx jest components/RotarySelector --watchAll=false` | Wave 0 |
| MOB-02 | Grinder dropdown switches between preset spinner and manual input | unit | `npx jest components/GrinderDropdown --watchAll=false` | Wave 0 |
| MOB-03 | FormField validates numeric input, rejects non-numeric | unit | `npx jest components/FormField --watchAll=false` | Wave 0 |
| MOB-04 | SegmentedControl renders 3 roast options, fires onSelect | unit | `npx jest components/SegmentedControl --watchAll=false` | Wave 0 |
| MOB-05 | Mode toggle switches between fast/accurate | unit | `npx jest components/SegmentedControl --watchAll=false` | Wave 0 (shared component) |
| MOB-06 | useSimulation hook: loading state true during fetch, handles 422 error | unit | `npx jest hooks/useSimulation --watchAll=false` | Wave 0 |
| MOB-07 | ResultCalloutCard renders TDS% and EY% values | unit | `npx jest components/ResultCalloutCard --watchAll=false` | Wave 0 |
| MOB-08 | SCAChart renders without crash, receives tds/ey props | smoke | `npx jest components/SCAChart --watchAll=false` | Wave 0 |
| E2E-01 | Full flow: select method -> fill params -> simulate -> see results | manual | Expo Go on device / emulator | Manual verification |

### Sampling Rate
- **Per task commit:** `npx jest --watchAll=false`
- **Per wave merge:** `npx jest --coverage`
- **Phase gate:** Full suite green + manual E2E on Expo Go before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `jest.config.js` -- configure with react-native preset and module name mappers for assets
- [ ] `jest.setup.js` -- mock react-native-reanimated, @shopify/react-native-skia, and expo-font
- [ ] `@testing-library/react-native` -- install as dev dependency
- [ ] `jest-expo` -- install as dev dependency (Expo's Jest preset)
- [ ] Test files for all components listed above

## Sources

### Primary (HIGH confidence)
- [Expo Router Stack Docs](https://docs.expo.dev/router/advanced/stack/) -- confirmed native stack lacks cardStyleInterpolator
- [React Navigation Stack Navigator](https://reactnavigation.org/docs/stack-navigator/) -- cardStyleInterpolator API, transitionSpec configuration
- [Victory Native CartesianChart](https://nearform.com/open-source/victory-native/docs/cartesian/cartesian-chart/) -- render function arguments (xScale, yScale, chartBounds, points)
- [Victory Native Scatter](https://nearform.com/open-source/victory-native/docs/cartesian/scatter/) -- Scatter component props (points, radius, shape, color)
- [React Native Reanimated Gestures](https://docs.swmansion.com/react-native-reanimated/docs/3.x/fundamentals/handling-gestures/) -- Pan gesture + spring snap pattern
- npm registry -- verified all package versions on 2026-03-28
- `brewos-engine/brewos/models/inputs.py` -- SimulationInput schema (exact field names and types)
- `brewos-engine/brewos/models/outputs.py` -- SimulationOutput schema (SCAPosition, tds_percent, extraction_yield)
- `brewos-engine/brewos/api.py` -- POST /simulate, GET /health routes, CORS config

### Secondary (MEDIUM confidence)
- [Expo GitHub Issue #35917](https://github.com/expo/expo/issues/35917) -- confirms cardStyleInterpolator not available on native stack
- [Expo Router Discussion #492](https://github.com/expo/router/discussions/492) -- community solutions for custom transitions
- [Wolt Page Transition Article](https://iamshadi.medium.com/re-creating-the-wolts-smooth-page-transition-with-expo-router-in-react-native-0b34541452db) -- withLayoutContext pattern for JS stack + Expo Router

### Tertiary (LOW confidence)
- Rotary selector implementation details -- no authoritative source; custom build based on Reanimated + GestureHandler primitives. Pattern is well-established but exact implementation needs iteration.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry, Expo SDK 52 is stable
- Architecture: HIGH -- Expo Router + JS stack pattern confirmed by official docs and community
- Pitfalls: HIGH -- each pitfall verified through official docs or known React Navigation behavior
- Victory Native chart pattern: MEDIUM -- CartesianChart render children pattern confirmed by docs, but custom Rect overlay not shown in official examples (extrapolated from Skia docs)
- Rotary selector: MEDIUM -- no official component matches the spec; custom build using well-documented Reanimated/GestureHandler primitives

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Expo SDK 52 stable; Victory Native 41 stable)
