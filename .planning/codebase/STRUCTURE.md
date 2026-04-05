# Codebase Structure

**Analysis Date:** 2026-04-01

## Directory Layout

```
D:/Coding/Keif/                         # Local workspace root (never pushed)
├── brewos/                             # Python physics engine (canonical, active)
│   ├── __init__.py
│   ├── api.py                          # FastAPI application entry point
│   ├── models/
│   │   ├── inputs.py                   # SimulationInput, BrewMethod, Mode, RoastLevel
│   │   └── outputs.py                  # SimulationOutput, ExtractionPoint, PSDPoint, FlavorProfile, TempPoint, SCAPosition
│   ├── solvers/
│   │   ├── immersion.py                # Moroney 2016 ODE + Maille 2021 biexponential
│   │   ├── percolation.py              # Moroney 2015 1D PDE via Method of Lines
│   │   └── pressure.py                 # Moka Pot 6-ODE thermo-fluid system
│   ├── methods/
│   │   ├── french_press.py             # Immersion solver wrapper
│   │   ├── v60.py                      # Percolation solver wrapper
│   │   ├── kalita.py                   # Percolation solver wrapper
│   │   ├── espresso.py                 # Percolation + Lee 2023 channeling overlay
│   │   ├── moka_pot.py                 # Pressure solver wrapper
│   │   └── aeropress.py                # Hybrid: immersion steep + Darcy push phase
│   ├── utils/
│   │   ├── params.py                   # Vault constants + parameter derivation functions
│   │   ├── output_helpers.py           # Shared output assembly (flavor, SCA, PSD, caffeine, etc.)
│   │   ├── co2_bloom.py                # Smrke 2018 CO2 degassing kB modifier
│   │   ├── channeling.py               # Lee 2023 two-pathway channeling risk score
│   │   └── psd.py                      # Log-normal PSD fallback for manual grind size
│   └── grinders/
│       ├── __init__.py                 # load_grinder(name, setting) -> bimodal PSD dict
│       ├── comandante_c40_mk4.json     # Comandante C40 MK4 preset (1-40 clicks)
│       ├── 1zpresso_j-max.json         # 1Zpresso J-Max preset (1-120 clicks)
│       └── baratza_encore.json         # Baratza Encore preset (1-40 settings)
├── tests/                              # 21 pytest test files
│   ├── __init__.py
│   ├── test_api.py                     # FastAPI /health and /simulate endpoint tests
│   ├── test_immersion_solver.py
│   ├── test_immersion_poc.py
│   ├── test_percolation_solver.py
│   ├── test_percolation_fast.py
│   ├── test_pressure.py
│   ├── test_french_press.py
│   ├── test_v60.py
│   ├── test_kalita.py
│   ├── test_espresso.py
│   ├── test_moka_pot.py
│   ├── test_aeropress.py
│   ├── test_all_methods.py             # Cross-method smoke tests
│   ├── test_cross_method_tolerance.py  # EY/TDS RMSE tolerance assertions
│   ├── test_fast_mode.py
│   ├── test_extended_outputs.py        # OUT-07 through OUT-13 output fields
│   ├── test_co2_bloom.py
│   ├── test_grinder_db.py
│   ├── test_grinder_presets.py
│   └── test_model_updates.py
├── poc/                                # Proof-of-concept scripts and validation outputs
│   ├── moroney_2016_immersion_ode.py   # Standalone Moroney 2016 ODE validation script
│   └── outputs/
│       ├── moroney_2016_immersion_poc.png
│       ├── moroney_2016_phase8.png
│       ├── validation_result.txt
│       └── validation_result_phase8.txt
├── brewos-engine/                      # Git repo root (pushed to GitHub)
│   ├── brewos/                         # Legacy copy — may be stale vs D:/Coding/Keif/brewos/
│   ├── keif-mobile/                    # Expo/React Native mobile app (canonical)
│   │   ├── app.config.ts               # Expo app config; injects EXPO_PUBLIC_API_URL
│   │   ├── package.json                # Expo ~52, RN 0.76, victory-native, expo-sqlite
│   │   ├── tsconfig.json
│   │   ├── babel.config.js
│   │   ├── jest.config.js
│   │   ├── app/
│   │   │   ├── _layout.tsx             # Root layout: fonts, SimulationResultProvider, stack navigator
│   │   │   ├── index.tsx               # "/" — RotarySelector method picker + health check
│   │   │   ├── dashboard.tsx           # "/dashboard" — parameter form for selected method
│   │   │   ├── results.tsx             # "/results" — triggers simulation, renders TDS/EY/SCA
│   │   │   ├── extended.tsx            # "/extended" — detailed charts (curve, PSD, flavor, temp)
│   │   │   ├── history.tsx             # "/history" — saved runs list, save prompt, archive, delete
│   │   │   └── compare.tsx             # "/compare" — side-by-side two-run comparison
│   │   ├── components/
│   │   │   ├── RotarySelector.tsx      # Swipe-to-select method picker wheel
│   │   │   ├── GrinderDropdown.tsx     # Grinder preset selector (Comandante / J-Max / Encore / Manual)
│   │   │   ├── ClickSpinner.tsx        # Integer spinner for grinder click setting
│   │   │   ├── FormField.tsx           # Text input wrapper with label
│   │   │   ├── SegmentedControl.tsx    # Tabbed toggle (roast, mode)
│   │   │   ├── SimulateButton.tsx      # CTA button for triggering simulation
│   │   │   ├── ResultCalloutCard.tsx   # TDS% / EY% hero metric cards
│   │   │   ├── ZoneVerdict.tsx         # SCA zone label (ideal / under / over / weak / strong)
│   │   │   ├── SCAChart.tsx            # Victory Native SCA Brew Control Chart
│   │   │   ├── ExtractionCurveChart.tsx # EY vs time Victory chart
│   │   │   ├── PSDChart.tsx            # Particle size distribution bar chart
│   │   │   ├── FlavorBars.tsx          # Sour/sweet/bitter horizontal bars
│   │   │   ├── TempCurveInline.tsx     # Water temperature decay curve (Newton cooling)
│   │   │   ├── ExtendedDetailCard.tsx  # EUI / channeling risk / puck resistance / caffeine card
│   │   │   ├── ChartLegend.tsx         # Chart legend helper
│   │   │   ├── CompareSCAChart.tsx     # Two-run overlaid SCA chart
│   │   │   ├── OverlaidCurveChart.tsx  # Two-run overlaid extraction curve
│   │   │   ├── CompareMetricColumns.tsx # Side-by-side metric diff table
│   │   │   ├── FlavorCompareBars.tsx   # Side-by-side flavor bar comparison
│   │   │   ├── RunListItem.tsx         # Single row in saved runs list
│   │   │   ├── SaveRunPrompt.tsx       # Name + save CTA shown after simulation
│   │   │   ├── DeleteConfirmModal.tsx  # Confirm before deleting a saved run
│   │   │   ├── ArchiveBanner.tsx       # Banner prompting archive of old runs
│   │   │   ├── EmptyState.tsx          # Empty history placeholder
│   │   │   ├── ErrorCard.tsx           # In-screen error display
│   │   │   ├── BackButton.tsx          # Labelled back navigation button
│   │   │   ├── SkeletonShimmer.tsx     # Loading skeleton animation
│   │   │   └── WarmupBanner.tsx        # Backend cold-start notification banner
│   │   ├── hooks/
│   │   │   ├── useSimulation.ts        # HTTP POST to /simulate; manages loading/result/error state
│   │   │   ├── useHealthCheck.ts       # GET /health probe; surfaces backend readiness
│   │   │   ├── useRunHistory.ts        # expo-sqlite CRUD for saved_runs table
│   │   │   └── useRunComparison.ts     # Fetch two runs by ID for side-by-side compare
│   │   ├── context/
│   │   │   └── SimulationResultContext.tsx  # Cross-screen currentInput/currentOutput/currentRunSaved
│   │   ├── constants/
│   │   │   ├── api.ts                  # API_BASE_URL (Koyeb URL or env override)
│   │   │   ├── brewMethods.ts          # BREW_METHODS array + GRINDER_PRESETS array
│   │   │   ├── colors.ts               # Color design tokens
│   │   │   ├── spacing.ts              # Spacing scale tokens
│   │   │   └── typography.ts           # Typography style tokens
│   │   ├── types/
│   │   │   └── simulation.ts           # TypeScript mirrors of Python SimulationInput/SimulationOutput
│   │   ├── __tests__/
│   │   │   └── unit/
│   │   │       ├── GrinderSelector.test.tsx
│   │   │       ├── LoadingState.test.tsx
│   │   │       ├── MethodSelector.test.tsx
│   │   │       ├── ParameterForm.test.tsx
│   │   │       ├── ResultsScreen.test.tsx
│   │   │       ├── SCAChart.test.tsx
│   │   │       └── apiClient.test.ts
│   │   └── assets/                     # App icons and splash image
│   └── tests/                          # Legacy test copies (may be stale)
├── .planning/                          # Local-only planning artifacts
│   ├── codebase/                       # Codebase map documents (this file)
│   ├── phases/                         # Phase plan files (01 through 07)
│   ├── research/
│   └── debug/
├── .memory/                            # Local-only session memory
├── pyproject.toml                      # Python 3.11+, scipy/numpy/pydantic deps, pytest config
├── requirements.txt                    # Pinned runtime deps
├── Dockerfile                          # Container image for Koyeb deployment
└── CLAUDE.md                           # Project instructions for Claude
```

## Directory Purposes

**`brewos/` (canonical engine):**
- Purpose: The active Python physics engine; this is the authoritative copy used by all tests and the running API
- Key files: `api.py` (FastAPI app), `models/inputs.py` (SimulationInput), `models/outputs.py` (SimulationOutput)
- Note: `brewos-engine/brewos/` is a secondary copy that may lag behind

**`brewos/solvers/`:**
- Purpose: Physics model implementations only — one file per solver family
- Three files: `immersion.py` (well-mixed ODE), `percolation.py` (1D PDE), `pressure.py` (thermo-fluid ODE)
- Adding a new solver: create `brewos/solvers/<name>.py` with `solve_accurate(inp)` and `solve_fast(inp)` signatures

**`brewos/methods/`:**
- Purpose: One file per brew method; thin wrappers that set geometry defaults and delegate to solvers
- Adding a new method: create `brewos/methods/<method>.py` with a `simulate(inp) -> SimulationOutput` function; register in `_DISPATCH` in `brewos/api.py`

**`brewos/utils/`:**
- Purpose: Shared physics helpers; no solver-specific code belongs here
- Key files: `params.py` (constants), `output_helpers.py` (all post-processing), `co2_bloom.py`, `channeling.py`, `psd.py`

**`brewos/grinders/`:**
- Purpose: JSON presets for grinder models; one file per grinder
- Adding a new grinder: create `brewos/grinders/<grinder_slug>.json` matching the existing schema (clicks_range, settings, microns_per_click, psd_model); add to `GRINDER_PRESETS` in `brewos-engine/keif-mobile/constants/brewMethods.ts`

**`brewos-engine/keif-mobile/app/`:**
- Purpose: Expo Router file-system routes; each file is a screen
- Route map: `/` → `index.tsx`, `/dashboard` → `dashboard.tsx`, `/results` → `results.tsx`, `/extended` → `extended.tsx`, `/history` → `history.tsx`, `/compare` → `compare.tsx`
- Adding a new screen: create a `.tsx` file here; no router registration required (Expo Router is file-system based)

**`brewos-engine/keif-mobile/components/`:**
- Purpose: Reusable, stateless (or lightly stateful) UI components
- Naming: PascalCase matching component name (e.g., `SCAChart.tsx` exports `SCAChart`)

**`brewos-engine/keif-mobile/hooks/`:**
- Purpose: Custom React hooks encapsulating async logic, data fetching, and device storage
- Adding a new hook: create `use<Name>.ts`; never import hooks from screens — keep the boundary clean

**`brewos-engine/keif-mobile/context/`:**
- Purpose: React Context providers for cross-screen shared state
- Currently one context: `SimulationResultContext.tsx`

**`brewos-engine/keif-mobile/constants/`:**
- Purpose: Static configuration and design tokens; no runtime logic
- `api.ts` — API URL resolution; `brewMethods.ts` — method and grinder arrays; `colors.ts`, `spacing.ts`, `typography.ts` — design system

**`brewos-engine/keif-mobile/types/`:**
- Purpose: TypeScript type definitions that mirror Python Pydantic models
- `simulation.ts` is the only file; must be kept in sync with `brewos/models/inputs.py` and `brewos/models/outputs.py`

**`tests/`:**
- Purpose: pytest test suite for the Python engine; 21 files covering each method, solver, utility, and the FastAPI endpoints
- Run all tests: `pytest tests/` from `D:/Coding/Keif/`

**`poc/`:**
- Purpose: Standalone validation scripts that run outside the package; used for visual verification of physics outputs
- Not imported by any production code

## Key File Locations

**Entry Points:**
- `brewos/api.py` — FastAPI application (server entry point)
- `brewos-engine/keif-mobile/app/_layout.tsx` — Mobile app root layout
- `brewos-engine/keif-mobile/app/index.tsx` — Default "/" screen
- `poc/moroney_2016_immersion_ode.py` — Standalone physics PoC

**Configuration:**
- `pyproject.toml` — Python deps, Python version requirement, pytest config
- `brewos-engine/keif-mobile/app.config.ts` — Expo config including API URL injection
- `brewos-engine/keif-mobile/package.json` — Node deps (Expo, RN, victory-native, expo-sqlite)
- `Dockerfile` — Container image for Koyeb deployment

**Contract Boundary:**
- `brewos/models/inputs.py` — Python SimulationInput (source of truth)
- `brewos/models/outputs.py` — Python SimulationOutput (source of truth)
- `brewos-engine/keif-mobile/types/simulation.ts` — TypeScript mirror (must stay in sync)

**Core Physics:**
- `brewos/utils/params.py` — All vault constants with paper references
- `brewos/solvers/immersion.py` — Moroney 2016 ODE + Maille 2021 biexponential
- `brewos/solvers/percolation.py` — Moroney 2015 1D PDE (Method of Lines)
- `brewos/solvers/pressure.py` — Moka Pot thermo-fluid 6-ODE system

**Grinder Presets:**
- `brewos/grinders/comandante_c40_mk4.json`
- `brewos/grinders/1zpresso_j-max.json`
- `brewos/grinders/baratza_encore.json`

## Naming Conventions

**Python files:**
- Lowercase with underscores: `moroney_2016_immersion_ode.py`, `output_helpers.py`
- Method files match the `BrewMethod` enum value: `french_press.py` matches `"french_press"`
- Grinder JSON files use the grinder name lowercased with underscores and spaces replaced: `"Comandante C40 MK4"` → `comandante_c40_mk4.json`

**TypeScript/React files:**
- Screen files: lowercase matching Expo Router convention (`index.tsx`, `dashboard.tsx`)
- Component files: PascalCase matching component name (`SCAChart.tsx`, `ResultCalloutCard.tsx`)
- Hook files: camelCase with `use` prefix (`useSimulation.ts`, `useRunHistory.ts`)
- Constant files: camelCase (`brewMethods.ts`, `colors.ts`)

## Where to Add New Code

**New brew method (Python):**
1. Add solver support if needed in `brewos/solvers/`
2. Create `brewos/methods/<method_name>.py` with `simulate(inp: SimulationInput) -> SimulationOutput`
3. Register in `_DISPATCH` in `brewos/api.py`
4. Add `<method_name>` value to `BrewMethod` enum in `brewos/models/inputs.py`
5. Add method entry to `BREW_METHODS` in `brewos-engine/keif-mobile/constants/brewMethods.ts`
6. Mirror enum value in `BrewMethod` type in `brewos-engine/keif-mobile/types/simulation.ts`
7. Add method-specific test file: `tests/test_<method_name>.py`

**New grinder preset:**
1. Create `brewos/grinders/<slug>.json` following the existing JSON schema
2. Add entry to `GRINDER_PRESETS` in `brewos-engine/keif-mobile/constants/brewMethods.ts`

**New output field:**
1. Add field to `SimulationOutput` in `brewos/models/outputs.py`
2. Mirror in `SimulationOutput` interface in `brewos-engine/keif-mobile/types/simulation.ts`
3. Populate field in `output_helpers.py` or directly in solver
4. Render in `extended.tsx` or a new component

**New utility function:**
- Shared output assembly: add to `brewos/utils/output_helpers.py`
- Physics constants or parameter derivation: add to `brewos/utils/params.py`
- New physical phenomenon modifier: create `brewos/utils/<name>.py`

**New mobile screen:**
- Create `brewos-engine/keif-mobile/app/<name>.tsx` (Expo Router auto-registers)
- Add navigation trigger in an existing screen using `router.push({ pathname: "/<name>", params: {...} })`

**New reusable UI component:**
- Create `brewos-engine/keif-mobile/components/<ComponentName>.tsx`
- Export a single named function component matching the filename

**New test:**
- Python: create `tests/test_<feature>.py` with pytest functions
- Mobile: create `brewos-engine/keif-mobile/__tests__/unit/<ComponentName>.test.tsx`

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow planning artifacts (phase plans, codebase maps, research notes)
- Generated: No (hand-written and AI-written)
- Committed: No (local-only, in `.gitignore` relative to brewos-engine repo root)

**`.memory/`:**
- Purpose: Cross-session AI memory files
- Generated: Yes (by GSD memory tools)
- Committed: No

**`brewos-engine/`:**
- Purpose: The actual git repository root that is pushed to GitHub (`https://github.com/usameak42/keif.git`)
- Note: `D:/Coding/Keif/` is the local workspace parent; only `brewos-engine/` and its subdirectories are version-controlled

**`poc/outputs/`:**
- Purpose: PNG plots and text files produced by `poc/moroney_2016_immersion_ode.py`
- Generated: Yes (by running the PoC script)
- Committed: Yes (validation artifacts)

**`brewos-engine/keif-mobile/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (`npm install`)
- Committed: No

---

*Structure analysis: 2026-04-01*
