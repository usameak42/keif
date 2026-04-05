# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Three-tier client-server simulation pipeline

**Key Characteristics:**
- Mobile app (React Native/Expo) is the sole client; communicates with the engine over HTTP REST
- Python engine exposes a single `/simulate` POST endpoint via FastAPI; all 6 brew methods share one route with dispatch-table routing
- Physics is entirely server-side; the mobile app has zero business logic — it collects parameters, sends JSON, and renders results
- Two execution modes per method: `fast` (biexponential kinetics, < 1 ms) and `accurate` (ODE/PDE solver, < 4 s end-to-end)
- Pydantic models are the contract boundary: `SimulationInput` / `SimulationOutput` are mirrored exactly in TypeScript at `brewos-engine/keif-mobile/types/simulation.ts`

## Layers

**Mobile UI Layer:**
- Purpose: Collect brew parameters from user, fire simulation requests, render results and history
- Location: `brewos-engine/keif-mobile/`
- Contains: Expo Router screens (`app/`), reusable components (`components/`), custom hooks (`hooks/`), React Context (`context/`), design tokens (`constants/`), shared types (`types/simulation.ts`)
- Depends on: FastAPI backend over HTTP; `expo-sqlite` for local run history; `victory-native` / `@shopify/react-native-skia` for charts
- Used by: End users on iOS and Android

**API Gateway Layer:**
- Purpose: Accept HTTP requests, validate inputs via Pydantic, dispatch to the correct method module, and serialize `SimulationOutput` as JSON
- Location: `brewos/api.py`
- Contains: FastAPI `app` instance, CORS middleware, `RequestValidationError` handler (returns structured 422), `_DISPATCH` dict mapping method string to `simulate()` function, `/health` GET, `/simulate` POST
- Depends on: `brewos.models.inputs`, `brewos.models.outputs`, all six method modules
- Used by: Mobile app via `useSimulation` hook; `tests/test_api.py`

**Validation Layer:**
- Purpose: Validate and normalize all simulation parameters before physics computation
- Location: `brewos/models/inputs.py`, `brewos/models/outputs.py`
- Contains:
  - `SimulationInput` — Pydantic BaseModel with `BrewMethod`, `Mode`, `RoastLevel` enums; cross-field validator enforcing grind source consistency
  - `SimulationOutput` — top-level result; nested `ExtractionPoint`, `PSDPoint`, `FlavorProfile`, `TempPoint`, `SCAPosition`
- Depends on: Pydantic 2.0+
- Used by: API layer (deserialization), all solvers (input), method modules (output)

**Method Orchestration Layer:**
- Purpose: Declare per-method geometry defaults and dispatch to the appropriate solver mode
- Location: `brewos/methods/`
- Contains: `french_press.py`, `v60.py`, `kalita.py`, `espresso.py`, `moka_pot.py`, `aeropress.py` — each exposes a `simulate(inp: SimulationInput) -> SimulationOutput` function; espresso additionally runs the Lee 2023 channeling overlay post-solve; aeropress implements a hybrid two-phase pipeline (immersion steep then Darcy pressure push)
- Depends on: Corresponding solver modules, `brewos.utils.channeling`, `brewos.utils.output_helpers`
- Used by: `_DISPATCH` table in `brewos/api.py`

**Solver Layer:**
- Purpose: Implement peer-reviewed physics models (ODE/PDE systems) for extraction kinetics
- Location: `brewos/solvers/`
- Contains:
  - `immersion.py` — Moroney 2016 3-ODE well-mixed system (`solve_accurate`) and Maille 2021 biexponential (`solve_fast`); used by French Press and AeroPress (steep phase)
  - `percolation.py` — Moroney 2015 1D advection-diffusion-reaction PDE via Method of Lines, N=30 spatial nodes (`solve_accurate`) and biexponential fast path (`solve_fast`); used by V60, Kalita, Espresso
  - `pressure.py` — Moka Pot 6-ODE thermo-fluid system (Siregar 2026 + Moroney 2016 kinetics); models steam pressure via Clausius-Clapeyron and Arrhenius viscosity
- Depends on: `scipy.integrate.solve_ivp` (Radau stiff ODE method), NumPy, `brewos.utils.params`, `brewos.utils.co2_bloom`, `brewos.utils.output_helpers`
- Used by: Method modules only; never called directly from the API layer

**Utilities Layer:**
- Purpose: Shared physics helpers and output assembly routines consumed by all solvers
- Location: `brewos/utils/`
- Contains:
  - `params.py` — vault constants (Moroney 2015/2016, Liang 2021), `derive_immersion_params()`, `derive_percolation_params()`, `kozeny_carman_permeability()`
  - `output_helpers.py` — `resolve_psd()`, `estimate_flavor_profile()`, `generate_warnings()`, `brew_ratio_recommendation()`, `compute_eui()`, `compute_temperature_curve()`, `classify_sca_position()`, `estimate_caffeine()`, `compute_puck_resistance()`
  - `co2_bloom.py` — Smrke 2018 bi-exponential CO2 degassing modifier; returns `kB` multiplier in [0, 1] based on roast level and bean age
  - `channeling.py` — Lee 2023 two-pathway channeling risk score for espresso; returns float in [0, 1]
  - `psd.py` — log-normal PSD fallback generator for manual grind-size entry
- Depends on: NumPy, SciPy
- Used by: Solvers (params, co2_bloom, output_helpers), espresso method (channeling)

**Grinder Database Layer:**
- Purpose: Look up particle size distributions by grinder model name and click setting
- Location: `brewos/grinders/`
- Contains:
  - `__init__.py` — `load_grinder(name, setting)` loader; builds bimodal PSD from JSON preset using `scipy.stats.lognorm`
  - `comandante_c40_mk4.json` — Comandante C40 MK4 preset (1–40 clicks)
  - `1zpresso_j-max.json` — 1Zpresso J-Max preset (1–120 clicks)
  - `baratza_encore.json` — Baratza Encore preset (1–40 settings)
- Depends on: NumPy, SciPy (lognorm)
- Used by: `output_helpers.resolve_psd()` when `grinder_name` is set on the input

## Data Flow

**Simulation Request (mobile to engine to response):**

1. User selects brew method on `app/index.tsx` (RotarySelector); navigates to `app/dashboard.tsx`
2. `dashboard.tsx` collects form state (dose, water, temp, time, grinder, roast, mode) and constructs a `SimulationInput` TypeScript object
3. Route push to `app/results.tsx` passes `input` as a JSON route param
4. `results.tsx` calls `useSimulation()` hook on mount; hook POSTs JSON to `{API_BASE_URL}/simulate`
5. FastAPI `api.py` deserializes body into `SimulationInput` Pydantic model (validation happens here; returns structured 422 on failure)
6. `_DISPATCH[body.method.value]` routes to the appropriate method module `simulate()` function
7. Method module resolves geometry defaults, calls `solver.solve_accurate()` or `solver.solve_fast()` based on `inp.mode`
8. Solver calls `resolve_psd()` — grinder DB lookup or log-normal fallback; derives physics params via `params.py`
9. ODE/PDE solved via `scipy.integrate.solve_ivp`; raw solution scaled via Liang 2021 equilibrium anchor
10. `output_helpers` assemble `SimulationOutput`: TDS%, EY%, extraction curve, PSD, flavor profile, temp curve, SCA position, caffeine, warnings
11. Method module applies post-processing overlays where applicable: espresso adds Lee 2023 channeling risk; aeropress appends Darcy push-phase EY increment
12. FastAPI serializes `SimulationOutput` as JSON; response sent to mobile app
13. `useSimulation` hook stores result in state; `results.tsx` renders `ResultCalloutCard`, `SCAChart`, `ZoneVerdict`; stores result in `SimulationResultContext` for downstream screens

**Run History Flow:**

1. User navigates to `app/history.tsx`; `useRunHistory` hook opens `expo-sqlite` database `keif-runs.db`
2. `SaveRunPrompt` triggers `save(name, input, output)` — serializes both as JSON strings, inserts row into `saved_runs` table
3. Saved runs listed as `RunListItem` components; long-press enters selection mode for delete or archive
4. Tapping "Compare" on two selected runs pushes to `app/compare.tsx`; `useRunComparison` fetches both rows by ID, deserializes JSON, renders overlaid charts and metric columns side-by-side

**State Management:**
- `SimulationResultContext` (`context/SimulationResultContext.tsx`) — React Context holding `currentInput`, `currentOutput`, `currentRunSaved` for cross-screen access (results → extended → history → compare)
- No global state library; all other state is local `useState` within screens and hooks
- Persistent state: `expo-sqlite` local SQLite database in `useRunHistory` and `useRunComparison` hooks

## Key Abstractions

**SimulationInput / SimulationOutput (contract boundary):**
- Purpose: Single source of truth for all simulation parameters and results; Python and TypeScript mirrors must stay in sync
- Python: `brewos/models/inputs.py`, `brewos/models/outputs.py`
- TypeScript mirror: `brewos-engine/keif-mobile/types/simulation.ts`
- Pattern: Pydantic BaseModel (Python) / TypeScript interface (mobile); TS file comment reads "Mirrors brewos/models/inputs.py SimulationInput exactly"

**Method Module (`simulate()` function):**
- Purpose: Per-method orchestration; declares geometry defaults, selects solver, applies method-specific post-processing
- Examples: `brewos/methods/french_press.py`, `brewos/methods/espresso.py`, `brewos/methods/aeropress.py`
- Pattern: Module exports one `simulate(inp: SimulationInput) -> SimulationOutput` function registered in `_DISPATCH` in `api.py`; AeroPress is the exception — implements a two-phase hybrid pipeline within the method module itself

**Solver (solve_accurate / solve_fast):**
- Purpose: Physics model implementation; accepts `SimulationInput`, returns fully populated `SimulationOutput`
- Examples: `brewos/solvers/immersion.py`, `brewos/solvers/percolation.py`, `brewos/solvers/pressure.py`
- Pattern: Two top-level functions per module — `solve_accurate(inp)` and `solve_fast(inp)`; `pressure.py` deviates (moka pot specific, no generic fast/accurate pair)

**useSimulation Hook:**
- Purpose: Encapsulates the full HTTP request lifecycle for a single simulation run
- Location: `brewos-engine/keif-mobile/hooks/useSimulation.ts`
- Pattern: Returns `{ simulate, loading, result, error, clearError, clearResult }`; called by `results.tsx` on mount via `useEffect`

## Entry Points

**Mobile App Root:**
- Location: `brewos-engine/keif-mobile/app/_layout.tsx`
- Triggers: Expo Router on app launch
- Responsibilities: Load Inter fonts, wrap app in `SimulationResultProvider`, configure `JsStack` navigator with custom "filtration" transition animation (drip-forward push, rise-back pop)

**Method Selection Screen:**
- Location: `brewos-engine/keif-mobile/app/index.tsx`
- Triggers: Default route "/"
- Responsibilities: Render `RotarySelector` for 6 brew methods; call `useHealthCheck()` to probe `/health` on mount and surface `WarmupBanner` if backend is cold; navigate to dashboard on selection

**FastAPI Application:**
- Location: `brewos/api.py`
- Triggers: `uvicorn brewos.api:app` (or Koyeb cloud deployment)
- Responsibilities: CORS setup, structured 422 error handler, `/health` and `/simulate` routes

**PoC Script:**
- Location: `poc/moroney_2016_immersion_ode.py`
- Triggers: Direct execution (`python poc/moroney_2016_immersion_ode.py`)
- Responsibilities: Standalone validation of the Moroney 2016 ODE; produces PNG plots in `poc/outputs/`

## Error Handling

**Strategy:** Fail fast at the boundary; physics code does not use try/catch

**Patterns:**
- Input validation: Pydantic `@field_validator` and `@model_validator` raise `ValueError` with descriptive messages; FastAPI converts these to structured 422 JSON via `validation_exception_handler` in `api.py`
- ODE solver failure: `scipy.integrate.solve_ivp` result checked immediately after solve; `RuntimeError(f"ODE solver failed: {sol.message}")` raised if `sol.success` is False
- Numerical bounds: `max(0.0, min(var, limit))` clamping applied to ODE state variables at every integration step to prevent NaN propagation
- Mobile HTTP errors: `useSimulation` hook catches non-200 responses; 422 bodies are parsed and surfaced as a string via `setError`; network failures yield "Could not reach the server" fallback; `ErrorCard` component displays errors in-screen
- Backend cold-start: `useHealthCheck` probes `/health` with 5 s timeout; shows `WarmupBanner` if backend not ready; retries once after 5 s

## Cross-Cutting Concerns

**Logging:** No structured logging; Python engine uses no log calls; mobile surfaces errors via `ErrorCard` component
**Validation:** All input validation delegated to Pydantic; no manual checks in solvers or method modules
**Authentication:** None — API is publicly accessible; CORS set to `allow_origins=["*"]` with `allow_credentials=False`
**Physics traceability:** All constants in `brewos/utils/params.py` include source paper and vault location in inline comments; solver docstrings cite the paper and equation numbers implemented

---

*Architecture analysis: 2026-04-01*
