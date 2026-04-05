---
phase: quick-260405-o3p
plan: "01"
subsystem: mobile-ui
tags: [ux-simplification, extended-output, temperature-curve]
dependency_graph:
  requires: []
  provides: [unconditional-temp-curve-chart]
  affects: [extended-output-screen]
tech_stack:
  added: []
  patterns: [stateless-functional-component]
key_files:
  created: []
  modified:
    - brewos-engine/keif-mobile/components/TempCurveInline.tsx
decisions:
  - "Removed toggle state entirely; parent guard in extended.tsx already handles the no-data case, making the in-card toggle redundant friction"
metrics:
  duration: "3 minutes"
  completed: "2026-04-05"
  tasks: 1
  files_modified: 1
---

# Quick Task 260405-o3p: Remove Temperature Curve Toggle Summary

**One-liner:** Removed View curve / Hide curve toggle from TempCurveInline, chart now renders unconditionally using stateless functional component pattern.

## What Was Done

Simplified `TempCurveInline.tsx` to eliminate the in-card toggle button that required tapping "View curve" before the temperature decay chart appeared. The chart now renders immediately whenever the component is mounted.

Removed from the component:
- `useState` (no longer needed — no expanded state)
- `TouchableOpacity` and `Text` imports (toggle button deleted)
- `StyleSheet` import and `styles` object (only contained `toggle` style)
- `const [expanded, setExpanded] = useState(false)` state declaration
- `<TouchableOpacity onPress={...}><Text style={styles.toggle}>...</Text></TouchableOpacity>` JSX block
- `{expanded && (...)}` conditional wrapper around the chart

Kept unchanged:
- `TempCurveInlineProps` interface (`data: TempPoint[]`)
- `useWindowDimensions` for responsive chart sizing
- `chartWidth` / `chartHeight` computation
- `maxT`, `maxTemp`, `minTemp` domain bounds
- All Victory Native type casts (`as unknown as Record<string, unknown>[]`, `as never`, `any`) — required per Phase 07 decision in STATE.md
- Parent guard in `extended.tsx` (`temperature_curve !== null && length > 0`) — unchanged

## Verification

- `grep "View curve|Hide curve"` — no matches in keif-mobile/
- `grep "useState|TouchableOpacity|StyleSheet"` in TempCurveInline.tsx — no matches
- TypeScript check: zero new errors from TempCurveInline.tsx (pre-existing RotarySelector.tsx error with reanimated SharedValue is out of scope)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1    | ac21934 | feat(quick-260405-o3p-01): remove toggle from TempCurveInline, render chart unconditionally |

## Self-Check: PASSED

- File exists: `brewos-engine/keif-mobile/components/TempCurveInline.tsx` — FOUND
- Commit exists: `ac21934` — FOUND
