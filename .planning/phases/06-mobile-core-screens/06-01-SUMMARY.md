---
phase: 06-mobile-core-screens
plan: 01
subsystem: ui
tags: [expo, react-native, typescript, jest, expo-router, victory-native, inter-font]

# Dependency graph
requires:
  - phase: 05-integration-tests-fastapi-backend
    provides: FastAPI /simulate endpoint with SimulationInput/Output contracts
provides:
  - Expo project scaffold at keif-mobile/ with file-based routing
  - Design tokens (colors, typography, spacing) matching UI-SPEC
  - TypeScript types mirroring backend SimulationInput/SimulationOutput
  - Root layout with filtration transition animations (JS stack)
  - Jest test infrastructure with 7 Wave 0 stub test files
  - Brew method constants with defaults for all 6 methods
  - Grinder presets (Comandante, 1Zpresso, Baratza, Manual)
affects: [06-02-PLAN, 06-03-PLAN]

# Tech tracking
tech-stack:
  added: [expo@55, expo-router, react-native-reanimated, react-native-gesture-handler, victory-native, @expo-google-fonts/inter, @react-navigation/stack, jest@29, jest-expo, @testing-library/react-native, @shopify/react-native-skia, babel-preset-expo]
  patterns: [expo-router file-based routing, withLayoutContext JS stack, filtration card transitions, design token constants]

key-files:
  created:
    - keif-mobile/app/_layout.tsx
    - keif-mobile/app/index.tsx
    - keif-mobile/types/simulation.ts
    - keif-mobile/constants/colors.ts
    - keif-mobile/constants/typography.ts
    - keif-mobile/constants/spacing.ts
    - keif-mobile/constants/api.ts
    - keif-mobile/constants/brewMethods.ts
    - keif-mobile/jest.config.js
    - keif-mobile/__tests__/unit/MethodSelector.test.tsx
    - keif-mobile/__tests__/unit/ParameterForm.test.tsx
    - keif-mobile/__tests__/unit/GrinderSelector.test.tsx
    - keif-mobile/__tests__/unit/apiClient.test.ts
    - keif-mobile/__tests__/unit/LoadingState.test.tsx
    - keif-mobile/__tests__/unit/ResultsScreen.test.tsx
    - keif-mobile/__tests__/unit/SCAChart.test.tsx
  modified:
    - keif-mobile/package.json
    - keif-mobile/app.config.ts
    - keif-mobile/babel.config.js

key-decisions:
  - "Jest 29 over Jest 30: jest-expo preset incompatible with Jest 30 module scoping; downgraded for compatibility"
  - "Removed newArchEnabled from app.config.ts: not in ExpoConfig type for SDK 55 canary"
  - "withLayoutContext requires 4 type params in expo-router SDK 55 (StackNavigationOptions, Navigator, State, EventMap)"

patterns-established:
  - "Design tokens as const objects in constants/ directory"
  - "TypeScript types mirror backend Pydantic schemas in types/simulation.ts"
  - "JS stack via withLayoutContext for custom cardStyleInterpolator transitions"
  - "Test stubs follow describe/it pattern with TODO comments referencing requirement IDs"

requirements-completed: [MOB-01, MOB-04]

# Metrics
duration: 9min
completed: 2026-03-28
---

# Phase 06 Plan 01: Expo Scaffold Summary

**Expo Router project with Inter fonts, filtration transitions, design tokens matching UI-SPEC, TypeScript types mirroring backend API, and 7 passing Wave 0 jest stubs**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-28T11:13:30Z
- **Completed:** 2026-03-28T11:23:27Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- Expo Router file-based routing project at keif-mobile/ with JS stack navigator and filtration transitions (drip-forward push, rise-back pop, 350ms timing)
- Design tokens exactly matching UI-SPEC: 14 colors, 4 typography sizes with 2 weights, 7 spacing values
- TypeScript type contracts mirroring backend SimulationInput/SimulationOutput schemas with BrewMethod, RoastLevel, SimMode, SCAPosition types
- Jest test infrastructure with 7 passing stub test files covering all Phase 6 requirements (MOB-01 through MOB-08)

## Task Commits

Each task was committed atomically:

1. **Task 1: Expo project scaffolding + design tokens + type contracts + root layout** - `c7a609b` (feat)
2. **Task 2: Wave 0 jest infrastructure + 7 stub test files** - `49401aa` (test)

## Files Created/Modified
- `keif-mobile/app/_layout.tsx` - Root layout with JS stack, filtration transitions, Inter font loading
- `keif-mobile/app/index.tsx` - Placeholder rotary selector screen
- `keif-mobile/types/simulation.ts` - TypeScript types mirroring backend SimulationInput/Output
- `keif-mobile/constants/colors.ts` - 14 color tokens matching UI-SPEC
- `keif-mobile/constants/typography.ts` - 4 typography presets (label, body, heading, display)
- `keif-mobile/constants/spacing.ts` - 7-step spacing scale (xs through xxxl)
- `keif-mobile/constants/api.ts` - API base URL from expo-constants
- `keif-mobile/constants/brewMethods.ts` - 6 brew methods with defaults + 4 grinder presets
- `keif-mobile/app.config.ts` - Expo config with expo-router and expo-font plugins
- `keif-mobile/babel.config.js` - Babel config with reanimated plugin last
- `keif-mobile/jest.config.js` - Jest config with jest-expo preset
- `keif-mobile/__tests__/unit/*.test.tsx` - 7 stub test files for Wave 0

## Decisions Made
- **Jest 29 over Jest 30:** jest-expo preset is incompatible with Jest 30's stricter module scoping (`_execModule` scope restriction). Downgraded jest to v29 for reliable test execution.
- **Removed newArchEnabled:** The `newArchEnabled` property is not in the ExpoConfig TypeScript type for SDK 55 canary. Removed to pass type checking.
- **withLayoutContext 4 type params:** expo-router SDK 55 requires all 4 generic type arguments (Options, Navigator, State, EventMap) unlike earlier examples with 2.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed react-native-worklets for reanimated plugin**
- **Found during:** Task 2 (jest test execution)
- **Issue:** react-native-reanimated/plugin requires react-native-worklets module at babel transform time
- **Fix:** Installed react-native-worklets as dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** Jest tests pass
- **Committed in:** 49401aa (Task 2 commit)

**2. [Rule 3 - Blocking] Installed babel-preset-expo for jest transformation**
- **Found during:** Task 2 (jest test execution)
- **Issue:** jest-expo preset requires babel-preset-expo but it wasn't installed as dev dependency
- **Fix:** Installed babel-preset-expo as dev dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** Jest tests pass
- **Committed in:** 49401aa (Task 2 commit)

**3. [Rule 1 - Bug] Downgraded Jest 30 to Jest 29**
- **Found during:** Task 2 (jest test execution)
- **Issue:** Jest 30 module scoping prevents jest-expo setup files from importing across boundaries
- **Fix:** Downgraded jest and @types/jest to v29
- **Files modified:** package.json, package-lock.json
- **Verification:** All 7 test suites pass
- **Committed in:** 49401aa (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for test infrastructure to function. No scope creep.

## Issues Encountered
- Expo project was pre-created with `blank-typescript` template using old `App.tsx` entry point. Converted to expo-router by changing `main` to `expo-router/entry`, removing App.tsx and index.ts, and creating app/ directory with _layout.tsx.
- npm peer dependency conflicts required `--legacy-peer-deps` flag for all installs due to canary SDK version mismatches.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all files contain complete implementations per plan specification. Test files are intentionally stub-only as Wave 0 scaffolding.

## Next Phase Readiness
- Expo project scaffold complete with all design tokens, types, and navigation
- Jest infrastructure ready for real component tests in Plans 02 and 03
- Root layout filtration transitions ready for screen implementations
- TypeScript types ready for API client implementation

---
*Phase: 06-mobile-core-screens*
*Completed: 2026-03-28*
