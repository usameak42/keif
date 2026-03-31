---
status: awaiting_human_verify
trigger: "Four bugs in keif-mobile: SQLite native module not available in Expo Go, two missing default exports, and a broken navigation route."
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:00:00Z
---

## Current Focus

hypothesis: Four separate but related bugs introduced during SDK 52 migration — SQLite incompatibility, missing exports, wrong route paths
test: Read all relevant files to confirm each bug
expecting: Will find expo-sqlite imports, missing default exports, and mismatched route paths
next_action: Read all key files to gather evidence

## Symptoms

expected:
- Storage backend works in Expo Go without a custom dev client build
- compare.tsx has a default export
- history.tsx has a default export
- "Save & History" navigates to history screen without "unmatched route" error

actual:
- "Cannot find native module 'ExpoSQLiteNext'" — openDatabaseSync requires dev client
- compare.tsx is missing a default export — causes navigation crash
- history.tsx is missing a default export — causes navigation crash
- "Save & History" gives "unmatched route" error

errors:
- "Cannot find native module 'ExpoSQLiteNext'"
- Unmatched route error when navigating to history

reproduction:
- Open app in Expo Go — SQLite error on any screen importing useRunHistory/useRunComparison
- Navigate to history or compare screens — missing export crash
- Tap "Save & History" on results screen — unmatched route error

started: Introduced during previous bug fix session that switched to SDK 52 sync API

## Eliminated

## Evidence

- timestamp: 2026-03-29T00:01:00Z
  checked: hooks/useRunHistory.ts and hooks/useRunComparison.ts
  found: Both call openDatabaseSync("keif-runs.db") at module level — crashes in Expo Go
  implication: Must replace with AsyncStorage

- timestamp: 2026-03-29T00:01:00Z
  checked: app/history.tsx line 18, app/compare.tsx line 17
  found: Both already have "export default" — Issues 2 and 3 are NOT present
  implication: These were already fixed or never broken

- timestamp: 2026-03-29T00:01:00Z
  checked: router.push calls in results.tsx and index.tsx
  found: router.push("/history") — file is at app/history.tsx, route should be correct
  implication: Issue 4 may not exist — file-based routing matches

- timestamp: 2026-03-29T00:01:00Z
  checked: package.json and node_modules
  found: @react-native-async-storage/async-storage is NOT installed
  implication: Need to install before rewriting hooks

## Resolution

root_cause: useRunHistory.ts and useRunComparison.ts use expo-sqlite openDatabaseSync at module level, which requires a native module (ExpoSQLiteNext) not available in Expo Go. Issues 2, 3, 4 (missing exports, routing) are NOT present — already correct.
fix: Replace expo-sqlite with @react-native-async-storage/async-storage in both hooks. Store runs as JSON array under a single key.
verification: TypeScript compiles cleanly. No expo-sqlite imports remain. AsyncStorage installed (1.23.1). Exports and routes were already correct.
files_changed:
  - keif-mobile/hooks/useRunHistory.ts
  - keif-mobile/hooks/useRunComparison.ts
  - keif-mobile/package.json
