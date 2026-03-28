---
phase: 06-mobile-core-screens
plan: 03
subsystem: ui
tags: [react-native, expo, victory-native, skia, api-integration, hooks]

# Dependency graph
requires:
  - phase: 06-02
    provides: "Brew Dashboard screen with form inputs, grinder selector, and simulate button navigation"
  - phase: 05-integration-tests-fastapi-backend
    provides: "FastAPI /simulate and /health endpoints"
provides:
  - "useSimulation hook for POST /simulate with loading/result/error states"
  - "useHealthCheck hook for GET /health cold-start detection"
  - "Results screen with TDS%/EY% callout cards, zone verdict, SCA chart"
  - "SkeletonShimmer loading animation component"
  - "ErrorCard with retry navigation"
  - "WarmupBanner for backend cold-start notification"
  - "Complete three-screen flow: Rotary Selector -> Dashboard -> Results"
affects: [07-extended-outputs, 07-run-history]

# Tech tracking
tech-stack:
  added: []
  patterns: ["useSimulation fetch hook with 422 parsing", "useHealthCheck with abort + retry", "Victory Native CartesianChart with Skia Rect overlay", "method-specific chart Y ranges"]

key-files:
  created:
    - keif-mobile/hooks/useSimulation.ts
    - keif-mobile/hooks/useHealthCheck.ts
    - keif-mobile/components/WarmupBanner.tsx
    - keif-mobile/components/ResultCalloutCard.tsx
    - keif-mobile/components/ZoneVerdict.tsx
    - keif-mobile/components/SCAChart.tsx
    - keif-mobile/components/SkeletonShimmer.tsx
    - keif-mobile/components/ErrorCard.tsx
    - keif-mobile/app/results.tsx
  modified:
    - keif-mobile/app/index.tsx

key-decisions:
  - "useHealthCheck wired into index.tsx (not _layout.tsx) to keep layout minimal"
  - "SCA chart uses method-specific Y ranges: espresso 6-12%, filter 0.8-1.6%"
  - "ErrorCard retry navigates back to dashboard for parameter tweaking (not inline retry)"

patterns-established:
  - "API hook pattern: useState for loading/result/error with useCallback for actions"
  - "Victory Native chart with custom Skia Rect overlay for zone rendering"
  - "Route param passing: JSON.stringify input, JSON.parse on results screen"

requirements-completed: [MOB-06, MOB-07, MOB-08]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 6 Plan 3: API Integration & Results Screen Summary

**API hooks (useSimulation/useHealthCheck), Results screen with TDS%/EY% callout cards, zone verdict, SCA brew chart (Victory Native + Skia), skeleton shimmer loading, and error handling -- completing the three-screen mobile flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T11:31:53Z
- **Completed:** 2026-03-28T11:34:58Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- useSimulation hook with POST /simulate, 422 error parsing, and loading/result/error state management
- useHealthCheck hook with 5s abort timeout and automatic 5s retry for cold-start detection
- Results screen with three states: skeleton shimmer loading, error card with retry, and success with callout cards + SCA chart
- SCA brew chart using Victory Native CartesianChart with custom Skia Rect ideal zone overlay, correct Y-axis inversion, and method-specific Y ranges (espresso vs filter)
- Full end-to-end three-screen navigation flow wired and working

## Task Commits

Each task was committed atomically:

1. **Task 1: API hooks and WarmupBanner** - `f2916d6` (feat)
2. **Task 2: SCAChart + ResultCalloutCard + ZoneVerdict** - `67420b4` (feat)
3. **Task 3: Results screen with SkeletonShimmer, ErrorCard, full wiring** - `6e98a6b` (feat)

## Files Created/Modified
- `keif-mobile/hooks/useSimulation.ts` - POST /simulate hook with loading/result/error states and 422 parsing
- `keif-mobile/hooks/useHealthCheck.ts` - GET /health on mount with 5s timeout and retry
- `keif-mobile/components/WarmupBanner.tsx` - Absolute-positioned banner for cold backend
- `keif-mobile/components/ResultCalloutCard.tsx` - TDS%/EY% display card with 36px display typography
- `keif-mobile/components/ZoneVerdict.tsx` - Zone-to-color mapping with checkmark icon for ideal
- `keif-mobile/components/SCAChart.tsx` - Victory Native CartesianChart with Skia Rect zone overlay
- `keif-mobile/components/SkeletonShimmer.tsx` - Reanimated shimmer sweep animation
- `keif-mobile/components/ErrorCard.tsx` - Error display with destructive border and retry button
- `keif-mobile/app/results.tsx` - Results screen: loading/error/success states, callouts, chart
- `keif-mobile/app/index.tsx` - Wired useHealthCheck and WarmupBanner

## Decisions Made
- useHealthCheck wired into index.tsx rather than _layout.tsx to keep the root layout focused on navigation and fonts
- SCA chart uses method-specific Y ranges: espresso 6-12%, filter 0.8-1.6% (per RESEARCH.md Open Question 1)
- ErrorCard retry navigates back to dashboard (router.back) rather than retrying the same input, giving user opportunity to adjust parameters

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are wired to live data via the useSimulation hook and route params.

## Next Phase Readiness
- Complete three-screen mobile flow is working: method selection, parameter input, API simulation, results display
- Phase 6 (mobile core screens) is fully complete
- Ready for Phase 7: extended output charts (extraction curve, PSD, flavor axis) and run history

## Self-Check: PASSED

All 9 created files verified on disk. All 3 task commit hashes (f2916d6, 67420b4, 6e98a6b) verified in git log.

---
*Phase: 06-mobile-core-screens*
*Completed: 2026-03-28*
