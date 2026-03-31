---
status: awaiting_human_verify
trigger: "Four bugs: expo-sqlite-api, save-button-blocked, skip-flag-wrong, no-history-access"
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:00:00Z
---

## Current Focus

hypothesis: All 4 bugs have clear root causes identified from code reading
test: Apply fixes and verify
expecting: All bugs resolved
next_action: Apply fixes to all 4 bugs

## Symptoms

expected:
- Bug 3: SQLite should work using SDK 52 API (openDatabaseSync, not legacy openDatabase/exec)
- Bug 4: "Save Run" button should save the run to history
- Bug 5: "Skip for now" should NOT set currentRunSaved=true; pressing "Save & History" after skip should show save prompt again
- Bug 6: Users should be able to access run history from the home screen

actual:
- Bug 3: ExpoSQLite.exec is not a function -- legacy API being used in SDK 52
- Bug 4: Save Run button does nothing -- blocked by Bug 3
- Bug 5: "Skip for now" sets currentRunSaved=true, hiding the save prompt on subsequent taps
- Bug 6: No history button/icon on the home screen

errors: "ExpoSQLite.exec is not a function" at runtime
reproduction: See objective
started: Introduced during phase 07 implementation. Never worked correctly.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-29T00:01:00Z
  checked: hooks/useRunHistory.ts line 1
  found: Imports from "expo-sqlite/legacy" which uses the old callback-based API (openDatabase, db.transaction, tx.executeSql). expo-sqlite v14 (SDK 52) native module does not expose .exec for legacy mode in Expo Go, causing "ExpoSQLite.exec is not a function".
  implication: Bug 3 root cause confirmed. Must rewrite to use SDK 52 synchronous API (openDatabaseSync + db.runSync/getAllSync).

- timestamp: 2026-03-29T00:02:00Z
  checked: hooks/useRunHistory.ts save function
  found: save() uses db.transaction/tx.executeSql which fails because of Bug 3. The save function itself is correct in logic but blocked by the broken SQLite API.
  implication: Bug 4 is a downstream effect of Bug 3. Fixing Bug 3 fixes Bug 4.

- timestamp: 2026-03-29T00:03:00Z
  checked: app/history.tsx line 93
  found: onSkip callback is `() => setCurrentRunSaved(true)`. This permanently hides the save prompt for the current run even though user chose to skip.
  implication: Bug 5 root cause confirmed. onSkip should dismiss the prompt temporarily (e.g., local state) without setting currentRunSaved=true.

- timestamp: 2026-03-29T00:04:00Z
  checked: app/index.tsx (home screen)
  found: Home screen only has RotarySelector for brew method selection. No button or link to access run history. History is only accessible from results screen via "Save & History" button.
  implication: Bug 6 root cause confirmed. Need to add a history navigation element to the home screen.

## Resolution

root_cause:
- Bug 3: useRunHistory.ts imports from "expo-sqlite/legacy" which uses the old callback API. expo-sqlite v14 native module doesn't support legacy .exec in Expo Go.
- Bug 4: Downstream of Bug 3 -- save function uses the same broken legacy API.
- Bug 5: history.tsx onSkip sets currentRunSaved=true globally, preventing the save prompt from reappearing.
- Bug 6: index.tsx (home screen) has no navigation path to history screen.

fix:
- Bug 3+4: Rewrote useRunHistory.ts from expo-sqlite/legacy (openDatabase/transaction/executeSql) to SDK 52 sync API (openDatabaseSync/runSync/getAllSync). Also rewrote useRunComparison.ts with same migration (getFirstSync).
- Bug 5: Changed onSkip in history.tsx from setCurrentRunSaved(true) to local skippedThisVisit state. Save prompt reappears on next visit to history screen.
- Bug 6: Added "Run History" button to home screen (index.tsx) below the hint text, navigating to /history.

verification: TypeScript compiles with zero errors (npx tsc --noEmit). Awaiting human verification on device.
files_changed:
- hooks/useRunHistory.ts
- hooks/useRunComparison.ts
- app/history.tsx
- app/index.tsx
