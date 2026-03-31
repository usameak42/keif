# Production Readiness Report

**Project:** Keif (BrewOS) — Physics-based coffee extraction simulation
**Platform Target:** Android (Google Play Store v1.0)
**Audit Date:** 2026-03-29
**Auditor Model:** Claude Opus 4.6
**Scope:** Full repository (`brewos-engine/`) — Python backend, React Native mobile app, CI/CD, deployment

---

## Production Readiness Score: 62%

**Executive Summary:** Keif is a feature-complete, visually polished simulation app with a rock-solid physics engine (164 backend tests, peer-reviewed ODE/PDE models, clean Pydantic contracts). The mobile app has good UX with smooth Reanimated-driven transitions, proper accessibility roles, and thoughtful error states. However, **it is not production-ready for the Play Store** in its current form. The app lacks an Error Boundary (any unhandled JS exception = hard crash), has no EAS build configuration, zero frontend test coverage, no crash reporting, no request timeout on the critical `/simulate` call, no input validation on the client side, and the backend has no rate limiting. These are fixable — most within 1-2 days of focused work — but they are blockers.

---

## 🚨 Blockers (Must fix before Android launch / Play Store submission)

### B-01: No React Error Boundary — Unhandled exceptions crash the entire app

There is no `ErrorBoundary` component anywhere in the codebase. The root layout (`keif-mobile/app/_layout.tsx`) wraps the app in `SimulationResultProvider` and a stack navigator, but if **any** component throws during render — e.g., a null pointer on an unexpected API response shape, a Victory Native chart choking on malformed data — the app will display a white screen or force-close with zero recovery path.

**Impact:** Guaranteed 1-star reviews. Google Play pre-launch report will flag this.
**Fix:** Add a class-based `ErrorBoundary` at the root of `_layout.tsx:72` wrapping `<JsStack>`. Display a "Something went wrong" screen with a "Restart" button that resets state and navigates to `/`.

### B-02: No EAS Build Configuration — Cannot produce a signed APK/AAB

There is no `eas.json` file in the repository. Without it, you cannot run `eas build --platform android` to produce a signed Android App Bundle for Play Store submission. There is also no `google-services.json` (needed if you ever add Firebase/analytics), no keystore referenced, and no build profiles (development, preview, production).

**Impact:** Cannot submit to Google Play.
**Fix:** Run `eas init` in `keif-mobile/`, configure `eas.json` with at minimum a `production` profile targeting Android. Generate an upload keystore. Store it securely outside VCS.

### B-03: No request timeout on `/simulate` — Accurate mode can hang the UI indefinitely

`keif-mobile/hooks/useSimulation.ts:15` — The `fetch()` call to `/simulate` has **no timeout or AbortController**. In `accurate` mode, the backend runs SciPy ODE solvers that can take up to 4 seconds. If the Koyeb instance is cold-starting (up to 30s) or the solver hits a stiff ODE edge case, the user sees the skeleton shimmer forever with no way to cancel.

Contrast with `useHealthCheck.ts:10-11` which correctly implements `AbortController` + `setTimeout`.

**Impact:** Users will force-kill the app, which Google Play tracks as ANR (Application Not Responding) if the main thread blocks.
**Fix:** Add an `AbortController` with a 15-second timeout to the `simulate` function. Show a specific timeout error message: "Simulation timed out. Try Fast mode."

### B-04: Unvalidated client-side input — `parseFloat` on empty strings yields `NaN`

`keif-mobile/app/dashboard.tsx:47-55` — The `handleSimulate` function calls `parseFloat(dose)`, `parseFloat(water)`, `parseFloat(temp)`, `parseFloat(time)` directly on text input state. If any field is empty (the user clears a field and taps Simulate), `parseFloat("")` returns `NaN`. This `NaN` is sent to the backend, which returns a 422. But there are **two worse cases**:

1. `grind_size` (manual mode, line 55): `parseFloat("")` = `NaN` is sent as `grind_size: NaN` which may not round-trip cleanly through JSON serialization.
2. The `SimulateButton` has no `disabled` state tied to form validity — it's always pressable.

**Impact:** Poor UX (backend validation errors for empty fields), potential JSON serialization edge cases.
**Fix:** Add client-side validation before navigation. Disable the Simulate button when required fields are empty or non-numeric. Show inline validation messages.

### B-05: `JSON.parse` on route params without try/catch — crash on malformed navigation

`keif-mobile/app/results.tsx:25` — `const input: SimulationInput = JSON.parse(params.input as string);` is called at the top level of the component, **outside any try/catch**. If `params.input` is `undefined` (e.g., user deep-links to `/results` without params, or Android restores state after process death), this throws immediately, and without an Error Boundary (B-01), the app crashes.

**Impact:** Crash on deep link, process restoration, or any navigation edge case.
**Fix:** Wrap in try/catch. If parsing fails, show ErrorCard and route back to `/`.

### B-06: No `android` block in Expo config — Missing Play Store metadata

`keif-mobile/app.config.ts` has no `android` key. This means no `package` name (e.g., `com.keif.app`), no `adaptiveIcon` configuration, no `versionCode`, no `permissions` declaration, no `intentFilters` for the `keif://` deep link scheme. EAS Build will use defaults, but Play Store submission requires explicit package naming and icon assets.

**Impact:** Cannot submit to Play Store without a package identifier. Adaptive icon won't render correctly on Android home screens.
**Fix:** Add an `android` block:
```typescript
android: {
  package: "com.keif.app",
  versionCode: 1,
  adaptiveIcon: {
    foregroundImage: "./assets/adaptive-icon.png",
    backgroundColor: "#16100D",
  },
},
```

---

## ⚠️ High Priority (Strongly recommended for v1.0 stability)

### H-01: No crash reporting or analytics — Blind to production failures

There is no Sentry, Bugsnag, Firebase Crashlytics, or any telemetry SDK. Once the app is on users' devices, you will have zero visibility into:
- JavaScript exceptions
- Native crashes
- ANR events
- Which screens users visit, where they drop off
- Backend error rates from the client's perspective

**Impact:** Cannot diagnose or prioritize post-launch bugs.
**Fix:** Add `sentry-expo` (Expo-compatible, free tier). Initialize in `_layout.tsx`. This also implicitly adds an Error Boundary for Sentry's own reporting.

### H-02: Backend has no rate limiting — Vulnerable to abuse

`brewos/api.py` — The `/simulate` endpoint has zero rate limiting. Since `accurate` mode triggers ODE solvers consuming significant CPU, a single bad actor can exhaust your Koyeb instance with repeated requests.

**Impact:** Denial of service, increased hosting costs.
**Fix:** Add `slowapi` or a simple in-memory rate limiter (e.g., 60 requests/minute per IP). Consider also adding a request body size limit.

### H-03: Backend `/simulate` runs ODE solvers synchronously on the async event loop

`brewos/api.py:73-75` — The `simulate` endpoint is declared `async` but calls `simulate_fn(body)` which runs SciPy `solve_ivp` synchronously. This blocks the single Uvicorn event loop thread for up to 4 seconds per accurate-mode request. During that time, `/health` and all other requests are queued.

**Impact:** Under concurrent load, health checks fail and Koyeb may restart the container. Users see the warmup banner even when the backend is alive.
**Fix:** Either:
1. Use `await asyncio.to_thread(simulate_fn, body)` to offload to a thread pool, or
2. Run Uvicorn with `--workers 4` in the Dockerfile CMD, or
3. Remove `async` from the endpoint signature (FastAPI will auto-thread sync endpoints)

### H-04: `useRunHistory` loads entire history into memory on every mount

`keif-mobile/hooks/useRunHistory.ts:26-30` — `loadAllRuns()` reads the entire `keif_run_history` key from AsyncStorage, deserializes all JSON, then filters/sorts in memory. Each `SavedRun` contains full `input_json` and `output_json` (extraction curves with 100 points each). At 100+ runs, this is ~500KB+ of JSON parsed on every mount of the History screen.

**Impact:** Noticeable jank (200-500ms) when opening History screen on mid-range Android devices.
**Fix:** Migrate to the already-installed `expo-sqlite` (it's in `package.json` but unused). Store runs in a table with indexed columns. Query only the metadata for the list; lazy-load full JSON on detail view.

### H-05: `OverlaidCurveChart` uses O(n*m) nearest-neighbor matching

`keif-mobile/components/OverlaidCurveChart.tsx:28-43` — `mergeExtractionData` iterates the full `other` array for every point in `base` to find the closest time match. With 100 points per curve, this is 10,000 iterations per render. Not catastrophic, but unnecessary.

**Impact:** Minor frame drops on low-end devices during comparison view.
**Fix:** Since both arrays are sorted by `t`, use a two-pointer merge in O(n+m).

### H-06: No offline handling — App shows generic error when network is unavailable

The app makes no use of `NetInfo` or any connectivity check. If the device is offline:
- Home screen: WarmupBanner shows (misleading — it says "Warming up" not "You're offline")
- Results screen: Shows "Could not reach the server. Check your connection and try again." (acceptable but could be better)
- History/Compare: Work fine (local storage)

**Impact:** Confusing UX for users in poor connectivity. No proactive offline detection.
**Fix:** Add `@react-native-community/netinfo`. Show a persistent offline banner. Disable the Simulate button when offline with clear messaging.

### H-07: Font loading failure shows blank screen forever

`keif-mobile/app/_layout.tsx:67-69` — If `useFonts` fails to load (network error fetching Google Fonts on first install), the app renders an empty `<View>` with the background color and nothing else. There is no timeout, no fallback font, and no retry mechanism.

**Impact:** Users on slow networks see a blank screen on first launch.
**Fix:** Use `expo-font` with bundled font files instead of runtime Google Fonts loading. Or add a timeout that falls back to system fonts.

### H-08: `expo-sqlite` is installed but completely unused

`keif-mobile/package.json` lists `expo-sqlite: 14.0.6` as a dependency, but no file in the codebase imports it. All persistence goes through AsyncStorage (a flat key-value store). This is dead weight in the bundle.

**Impact:** Increased bundle size (~50KB) for zero functionality.
**Fix:** Either migrate run history to SQLite (recommended — see H-04) or remove the dependency.

---

## 🛠️ Refactoring & Optimization (Tech debt for post-launch)

### R-01: Zero frontend test coverage — 7 test files are all stubs

All files in `keif-mobile/__tests__/unit/` contain only `expect(true).toBe(true)` stubs with TODO comments. Example from `apiClient.test.ts:1-9`:
```typescript
describe("apiClient", () => {
  it("stub: test infrastructure works", () => {
    expect(true).toBe(true);
  });
  // TODO: MOB-05 — POST /simulate sends correct JSON body
  // ...
});
```

**Recommendation:** Prioritize tests for: (1) `useSimulation` hook (mock fetch, verify error parsing), (2) `useRunHistory` (mock AsyncStorage, verify CRUD), (3) `dashboard.tsx` form validation (once B-04 is fixed).

### R-02: No `React.memo` on expensive list items

`keif-mobile/components/RunListItem.tsx` — This component is not wrapped in `React.memo`. In a FlatList of 100+ items, every state change in the parent (selection toggle, save prompt visibility) triggers re-render of all visible items. The `useMemo` on line 46 helps with JSON parsing, but the component itself still re-renders.

**Recommendation:** Wrap `RunListItem` in `React.memo` with a custom comparator checking `run.id`, `isSelected`, and `isSelectionMode`.

### R-03: FlatList `ItemSeparatorComponent` creates new component instances on every render

`keif-mobile/app/history.tsx:123` — `ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}` creates a new anonymous function (and inline style object) on every render cycle. This defeats FlatList's internal memoization.

**Recommendation:** Extract to a stable reference:
```typescript
const Separator = () => <View style={styles.separator} />;
// In FlatList: ItemSeparatorComponent={Separator}
```

### R-04: Hardcoded color values outside the design system

Several components use raw hex colors instead of referencing `Colors.*`:
- `keif-mobile/components/OverlaidCurveChart.tsx:79,80` — `"#D97A26"`, `"#5B9BD5"`
- `keif-mobile/app/history.tsx:225` — `"#16100D"`
- `keif-mobile/components/RunListItem.tsx:122` — `"#3B322B"`, line 66: `"#EAE2D7"`
- `keif-mobile/app/extended.tsx:25-27` — `"#E8C547"`, `"#6BBF6B"` for EUI descriptors

**Recommendation:** Centralize these in `constants/colors.ts` for consistency and future theming.

### R-05: `results.tsx` re-creates `SimulationInput` object from params on every render

`keif-mobile/app/results.tsx:25` — `JSON.parse(params.input as string)` runs on every render (no `useMemo`). The parsed object is then passed to `simulate()` and `setCurrentInput()`. While small, this is unnecessary repeated work.

**Recommendation:** Wrap in `useMemo`:
```typescript
const input = useMemo(() => JSON.parse(params.input as string), [params.input]);
```

### R-06: `useRunHistory` duplicates load logic between `reload` and the initial `useEffect`

`keif-mobile/hooks/useRunHistory.ts:42-55` and `57-73` contain nearly identical load-filter-sort logic. The `useEffect` on mount could simply call `reload()` instead of duplicating the implementation.

**Recommendation:** Refactor:
```typescript
useEffect(() => { reload().finally(() => setLoading(false)); }, []);
```

### R-07: Backend Dockerfile runs single-worker Uvicorn

`Dockerfile:7` — `CMD ["uvicorn", "brewos.api:app", "--host", "0.0.0.0", "--port", "8000"]` runs a single async worker. Combined with H-03 (sync ODE solvers blocking the event loop), this means the backend can only serve one accurate-mode simulation at a time.

**Recommendation:** Add `--workers 2` (match Koyeb free-tier vCPU count). Or use Gunicorn with Uvicorn workers for proper process management.

### R-08: `RotarySelector` calls `runOnJS(onSelect)` during gesture — potential double-navigation

`keif-mobile/components/RotarySelector.tsx:32` — `runOnJS(onSelect)(clamped)` is called from `snapToIndex` (a worklet). The `onSelect` callback in `index.tsx:18-27` immediately calls `router.push()`. If the user performs a fast fling that triggers multiple snap events, `router.push("/dashboard")` could be called multiple times, stacking duplicate screens.

**Recommendation:** Add a guard (e.g., `useRef` flag) to prevent duplicate navigation within a short window.

### R-09: No structured logging on the backend

`brewos/api.py` has zero logging. No request logging, no error logging, no timing. If a simulation fails in production, there is no trace.

**Recommendation:** Add Python `logging` with structured JSON output. Log method, mode, and duration for each `/simulate` request. Log full tracebacks on 500 errors.

### R-10: `app.config.ts` missing Expo metadata fields

The config is minimal (14 lines). Missing fields that affect Play Store listing:
- `icon`: Not specified (will use Expo default)
- `splash`: Not configured (no splash screen on Android)
- `ios`/`android`: No platform-specific config
- `updates`: No OTA update configuration
- `owner`: No Expo account linked

**Recommendation:** Add `icon`, `splash`, `android` (see B-06), and `updates` (for post-launch hotfixes via EAS Update).

---

## ✅ Strengths & Commendations

### S-01: Exceptional physics engine — Peer-reviewed, well-tested, production-grade

The `brewos/` Python package is the crown jewel of this repository. Specific highlights:

- **`brewos/solvers/immersion.py`** — Implements Moroney 2016 3-ODE system with Liang 2021 equilibrium scaling. The ODE state clipping (`max(0.0, min(c_h, c_sat))`) prevents numerical drift, and the `sol.success` check at line 134 properly raises `RuntimeError` on solver failure. The fast-mode biexponential (Maille 2021) is elegant and well-calibrated.

- **`brewos/solvers/percolation.py`** — Method-of-Lines discretization of a 1D advection-diffusion PDE with 30 spatial nodes (90 coupled ODEs). The upwind advection scheme and Kozeny-Carman permeability model are textbook-correct. The Extraction Uniformity Index computed from spatial variance is a genuinely novel output metric.

- **`brewos/solvers/pressure.py`** — A 6-ODE thermo-fluid system for moka pot simulation with Clausius-Clapeyron steam pressure, Arrhenius viscosity, and event-driven termination at 95% water exhaustion. This is graduate-thesis-level modeling in a consumer app.

- **`brewos/utils/co2_bloom.py`** — Biexponential CO2 degassing model parameterized by roast level. The safe fallback (`return 1.0` for unknown roast) and bloom-window cutoff at 60s are thoughtful defensive design.

- **164 backend tests** across 21 files. Cross-method tolerance tests, solver-specific regression tests, API integration tests with CORS verification. This is well above industry average for a project of this size.

### S-02: Clean API contract between frontend and backend

The Pydantic `SimulationInput` (`brewos/models/inputs.py`) and `SimulationOutput` (`brewos/models/outputs.py`) models serve as a rigorous contract. Every field is typed, every validator has a clear error message, and the custom 422 handler (`api.py:34-46`) produces frontend-friendly error responses. The TypeScript types in `keif-mobile/types/simulation.ts` mirror the Python models accurately.

### S-03: Excellent mobile UX patterns

- **`RotarySelector`** (`keif-mobile/components/RotarySelector.tsx`) — Reanimated worklet-based gesture handling with spring physics. Velocity-projected snap (`event.velocityY * 0.15` at line 45) creates natural feel. The scale/opacity interpolation for depth effect is well-tuned.

- **`SCAChart`** (`keif-mobile/components/SCAChart.tsx`) — Correct handling of inverted y-axis with explicit comments (line 61). The Skia overlay for the ideal zone rectangle is performant and visually clean.

- **Custom filtration transition** (`_layout.tsx:25-59`) — Themed push/pop transitions with simultaneous fade+translate. The `next.progress` handling for the outgoing screen is correct and creates a layered paper-stack feel.

- **Loading states** — `SkeletonShimmer` with Reanimated-driven animation, accurate mode messaging ("Running detailed simulation..."), proper loading/error/success branching in `results.tsx:53-121`.

### S-04: Well-organized design system

`keif-mobile/constants/` establishes a consistent design language:
- **`colors.ts`** — 13+ semantic color tokens (dominant, card, accent, textPrimary, textSecondary, borderSubtle, destructive)
- **`spacing.ts`** — 7-level spacing scale (xs:4 → xxxl:48)
- **`typography.ts`** — 4 text styles (heading, body, label, value) with consistent Inter font usage

### S-05: Proper accessibility implementation

Multiple components correctly implement:
- `accessibilityRole="button"` on all touchable elements
- `accessibilityLabel` with descriptive text (e.g., `RunListItem.tsx:83` with full metric readout)
- `accessibilityState={{ selected, disabled }}` on `SegmentedControl`
- `accessibilityViewIsModal` on `DeleteConfirmModal`
- Minimum 48x48 hit targets (`RotarySelector.tsx:147-150`, `BackButton` hitSlop)

### S-06: Clean architecture — Proper separation of concerns

The mobile app follows a clear layered architecture:
- **Screens** (`app/*.tsx`) — Layout and navigation only
- **Components** (`components/*.tsx`) — Reusable, props-driven, no side effects
- **Hooks** (`hooks/*.ts`) — All data fetching and state logic
- **Context** (`context/*.tsx`) — Cross-screen shared state
- **Constants** (`constants/*.ts`) — Configuration and design tokens
- **Types** (`types/*.ts`) — Shared TypeScript contracts

No component directly calls `fetch()`. No screen manages its own async storage. This is textbook React architecture.

### S-07: Safe CORS configuration

`brewos/api.py:21-27` — `allow_origins=["*"]` with `allow_credentials=False` is intentional and documented. The comment on line 24 (`# must be False when allow_origins=["*"]`) shows awareness of the security implication. Since this is a public simulation API with no auth, wildcard CORS is appropriate.

### S-08: Defensive backend validation chain

The Pydantic validators in `brewos/models/inputs.py` form a complete validation pipeline:
- Single-field: `must_be_positive` (dose, water, time), `temp_in_range` (0-100°C), `grind_size_positive`
- Cross-field: `grind_source_consistent` ensures exactly one of (grinder_name + grinder_setting) or (manual grind_size) is provided
- All validators raise `ValueError` with clear, lowercase messages matching the project convention

No physics code ever runs on invalid input. This is the correct pattern.

---

## Priority Action Plan

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **Blocker** | B-01: Error Boundary | 1 hour | Prevents white-screen crashes |
| **Blocker** | B-02: EAS config + package name | 1 hour | Unblocks Play Store submission |
| **Blocker** | B-03: Simulate timeout | 30 min | Prevents ANR on slow backend |
| **Blocker** | B-04: Client input validation | 2 hours | Prevents NaN payload crashes |
| **Blocker** | B-05: Safe JSON parse in results | 15 min | Prevents deep link crash |
| **Blocker** | B-06: Android config block | 30 min | Required for Play Store |
| **High** | H-01: Sentry crash reporting | 2 hours | Production visibility |
| **High** | H-02: Backend rate limiting | 1 hour | Abuse prevention |
| **High** | H-03: Async solver offload | 30 min | Prevents event loop blocking |
| **High** | H-06: Offline detection | 1 hour | UX clarity |
| **High** | H-07: Bundle fonts locally | 30 min | Prevents blank screen on slow net |

**Estimated time to clear all blockers:** ~5 hours of focused work.
**Estimated time to clear blockers + high priority:** ~2 days.

---

*Report generated by Claude Opus 4.6. All line numbers reference the codebase as of commit `5f87778` on branch `main`.*
