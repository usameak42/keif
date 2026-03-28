---
phase: 07-mobile-extended-run-history
plan: 02
subsystem: ui
tags: [react-native, expo, expo-sqlite, victory-native, skia, typescript]

# Dependency graph
requires:
  - phase: 07-01
    provides: SimulationResultContext, extended SimulationOutput type, ChartLegend component
provides:
  - useRunHistory hook (SQLite CRUD: save, listActive, deleteById, archiveOlderThan)
  - useRunComparison hook (load and parse two runs by ID)
  - Run History screen (app/history.tsx) with save prompt, FlatList, selection mode, archive banner
  - Compare View screen (app/compare.tsx) with 4-section comparison layout
  - 9 new components (SaveRunPrompt, RunListItem, ArchiveBanner, EmptyState, DeleteConfirmModal, CompareMetricColumns, OverlaidCurveChart, CompareSCAChart, FlavorCompareBars)
affects: []

# Tech tracking
tech-stack:
  added: [expo-sqlite ~14.0.6]
  patterns: [expo-sqlite async API with openDatabaseAsync, merged extraction curve data for Victory Native dual-line overlay, Skia Circle for dual scatter points on SCA chart]

key-files:
  created:
    - keif-mobile/hooks/useRunHistory.ts
    - keif-mobile/hooks/useRunComparison.ts
    - keif-mobile/components/SaveRunPrompt.tsx
    - keif-mobile/components/RunListItem.tsx
    - keif-mobile/components/ArchiveBanner.tsx
    - keif-mobile/components/EmptyState.tsx
    - keif-mobile/components/DeleteConfirmModal.tsx
    - keif-mobile/components/CompareMetricColumns.tsx
    - keif-mobile/components/OverlaidCurveChart.tsx
    - keif-mobile/components/CompareSCAChart.tsx
    - keif-mobile/components/FlavorCompareBars.tsx
    - keif-mobile/app/history.tsx
    - keif-mobile/app/compare.tsx
  modified:
    - keif-mobile/package.json

key-decisions:
  - "expo-sqlite ~14.0.6 for SDK 52 compatibility; async API (openDatabaseAsync, getAllAsync, runAsync, getFirstAsync)"
  - "Extraction curve merge uses nearest-t matching from longer array as time base for Victory Native dual-line overlay"
  - "CompareSCAChart uses Skia Circle primitives directly instead of Victory Native Scatter for per-run color control"
  - "Victory Native type casting pattern reused from Plan 01: data as unknown as Record<string, unknown>[], xKey as never, points as any"

patterns-established:
  - "SQLite hook pattern: useRef for db instance, useEffect async IIFE for init, useCallback for CRUD ops with reload"
  - "Merged curve data: nearest-t matching to align two ExtractionPoint arrays into single CartesianChart data array"

requirements-completed: [MOB-13, MOB-14, MOB-15, MOB-16]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 7 Plan 02: Run History and Compare View Summary

**SQLite-backed run history with save/delete/archive CRUD, FlatList with selection mode, and 4-section compare view (metrics, overlaid curves, SCA chart, flavor bars)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T19:57:22Z
- **Completed:** 2026-03-28T20:02:30Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Added expo-sqlite ~14.0.6 dependency for local SQLite storage
- Built useRunHistory hook with full CRUD: save, listActive, deleteById, archiveOlderThan (soft-delete)
- Built useRunComparison hook to load and parse two runs by ID for compare view
- Created 5 Run History components: SaveRunPrompt (auto-filled name), RunListItem (swipe-to-delete), ArchiveBanner (>100 warning), EmptyState, DeleteConfirmModal
- Built app/history.tsx with FlatList, long-press selection mode, compare bar, save prompt integration via SimulationResultContext
- Created 4 Compare View components: CompareMetricColumns (TDS/EY/zone + delta), OverlaidCurveChart (merged dual-line), CompareSCAChart (dual Skia Circle points), FlavorCompareBars (dual bars per axis)
- Built app/compare.tsx with 4-section scroll layout, loading shimmer, and error guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-sqlite + create hooks** - `b21fac6` (feat)
2. **Task 2: Build history components + app/history.tsx** - `46e4d4c` (feat)
3. **Task 3: Build compare components + app/compare.tsx** - `1f5fae1` (feat)

## Files Created/Modified
- `keif-mobile/package.json` - Added expo-sqlite ~14.0.6
- `keif-mobile/hooks/useRunHistory.ts` - SQLite CRUD hook (save, listActive, deleteById, archiveOlderThan, reload)
- `keif-mobile/hooks/useRunComparison.ts` - Load and parse two runs by ID
- `keif-mobile/components/SaveRunPrompt.tsx` - Save card with auto-filled name and Save/Skip actions
- `keif-mobile/components/RunListItem.tsx` - Swipeable list item with selection checkbox and metrics
- `keif-mobile/components/ArchiveBanner.tsx` - Warning banner for >100 runs with archive action
- `keif-mobile/components/EmptyState.tsx` - Empty state with flask icon
- `keif-mobile/components/DeleteConfirmModal.tsx` - Bottom sheet confirmation modal
- `keif-mobile/components/CompareMetricColumns.tsx` - Side-by-side TDS/EY/zone with delta indicators
- `keif-mobile/components/OverlaidCurveChart.tsx` - Dual-line extraction curve via merged data
- `keif-mobile/components/CompareSCAChart.tsx` - SCA chart with two Skia Circle scatter points
- `keif-mobile/components/FlavorCompareBars.tsx` - Dual bars per flavor axis (sour/sweet/bitter)
- `keif-mobile/app/history.tsx` - Run History screen with save prompt, FlatList, selection mode, compare bar
- `keif-mobile/app/compare.tsx` - Compare View screen with 4-section layout

## Decisions Made
- Used expo-sqlite ~14.0.6 async API (openDatabaseAsync) for SDK 52 compatibility. Database file: keif-runs.db.
- Extraction curve merge: nearest-t matching from the longer array as time base, producing a single merged array with ey_a and ey_b keys for CartesianChart dual yKeys.
- CompareSCAChart renders two Skia Circle primitives instead of Victory Native Scatter to allow per-run color control (orange for Run A, blue for Run B).
- Victory Native type casting pattern from Plan 01 reused consistently: `data as unknown as Record<string, unknown>[]`, `xKey as never`, `points as any`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - expo-sqlite uses local device storage with no external configuration.

## Known Stubs
None - all components are wired to real SQLite data and SimulationResultContext.

## Self-Check: PASSED

All 13 created files exist. All 3 task commit hashes verified in git log.

---
*Phase: 07-mobile-extended-run-history*
*Completed: 2026-03-28*
