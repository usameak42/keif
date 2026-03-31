---
status: awaiting_human_verify
trigger: "tapping a saved run in the history list navigates to the extended output screen"
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:00:00Z
---

## Current Focus

hypothesis: handlePress only handles selectionMode toggling; no navigation logic exists for normal tap
test: Read handlePress function in history.tsx
expecting: No code path for non-selectionMode press
next_action: Add navigation logic to handlePress for non-selectionMode case

## Symptoms

expected: Short-pressing a run navigates to extended output screen with that run's data
actual: Tapping a run does nothing; only long-press (for comparison selection) is handled
errors: none
reproduction: Open history screen, tap any saved run
started: Feature never implemented

## Eliminated

(none)

## Evidence

- timestamp: 2026-03-29T00:01:00Z
  checked: handlePress in app/history.tsx (line 44-54)
  found: handlePress only toggles selectedIds when selectionMode is true; does nothing when selectionMode is false
  implication: This is the root cause -- no navigation code exists for normal tap

- timestamp: 2026-03-29T00:01:30Z
  checked: useRunHistory hook -- SavedRun type
  found: SavedRun stores input_json and output_json as stringified JSON -- full data is available
  implication: No schema changes needed; just parse JSON, set context, navigate

- timestamp: 2026-03-29T00:02:00Z
  checked: Extended screen (app/extended.tsx)
  found: Reads currentOutput and currentInput from SimulationResultContext
  implication: Set context values before navigating to /extended

- timestamp: 2026-03-29T00:02:30Z
  checked: SimulationResultContext
  found: Provides setCurrentInput and setCurrentOutput setters
  implication: Already available in history.tsx via useSimulationResult hook

## Resolution

root_cause: handlePress in history.tsx has no code path for non-selectionMode taps -- the function body is entirely inside an `if (selectionMode)` block with no else clause
fix: Add else clause to handlePress that parses the saved run's JSON, sets context, and navigates to /extended
verification: TypeScript compiles cleanly. Logic verified by code review -- handlePress now parses saved JSON, sets context, and navigates to /extended when not in selection mode.
files_changed: [app/history.tsx]
