# Phase 8: 5-Tier Roast Level - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** /gsd-discuss-phase 8

<domain>
## Phase Boundary

Phase 8 extends the roast level system from 3 tiers (light, medium, dark) to 5 tiers by adding medium_light and medium_dark. Changes span:
1. Python engine — `RoastLevel` enum, `co2_bloom.py` CO2 parameters, `params.py` bean density
2. FastAPI backend — accepts new enum values transparently (Pydantic handles it)
3. Mobile app — roast selector UI component replaced, TypeScript types updated, AsyncStorage persistence added

This phase does NOT add new brew methods, solvers, or screen flows.
This phase does NOT add moisture content as a simulation input field — it stays engine-internal.

</domain>

<decisions>
## Implementation Decisions

### Engine — Enum Extension

- **D-01:** Extend `RoastLevel` enum in `brewos/models/inputs.py` with two new values:
  `medium_light = "medium_light"` and `medium_dark = "medium_dark"`.
  Follow existing naming pattern: snake_case member name, lowercase string value.
  Final enum order (ascending darkness): `light`, `medium_light`, `medium`, `medium_dark`, `dark`.

### Engine — CO2 Bloom Parameters (co2_bloom.py)

- **D-02:** **Weibull-to-biexp mapping** for new tiers. Use Smrke 2018 Table 1 Weibull data
  (from `roast_level_parameters.md` in Obsidian) to derive tau_fast and tau_slow for
  medium_light and medium_dark. Methodology: average lambda across fast/medium/slow roast
  speeds per tier. Bi-exponential parameters for light, medium, dark are derived from the
  same averaging approach for consistency (not left at old estimated values).

- **D-03:** **Recalibrate all 5 tiers' beta values** using CO2 content mg/g from Obsidian
  (HIGH confidence data). Beta should be proportional to CO2 content:
  - Light: ~3.44–3.67 mg/g → beta ≈ 0.12–0.13
  - Medium-Light: ~4.00–5.50 mg/g → beta ≈ 0.15–0.18
  - Medium: ~5.71–7.34 mg/g → beta ≈ 0.20–0.24
  - Medium-Dark: ~8.00–10.00 mg/g → beta ≈ 0.27–0.32
  - Dark: ~10.16–15.62 mg/g → beta ≈ 0.33–0.40
  Planner should derive exact values proportionally, document source as Smrke 2018 +
  CO2 content synthesis doc.

- **D-04:** All CO2_PARAMS entries must be doc-commented with their derivation source
  (e.g., `# Weibull-derived from Smrke 2018 Table 1, medium-speed average`).
  Physics traceability is a hard project constraint (see CLAUDE.md).

### Engine — Bean Density (params.py)

- **D-05:** `rho_bulk_ground` becomes **roast-level dependent**. Add a `ROAST_DENSITY`
  dict to `params.py` with 5-tier midpoint values from Obsidian bean bulk density data
  (MEDIUM confidence):
  - `light`: 425 g/L (midpoint of 400–450)
  - `medium_light`: 390 g/L (midpoint of 380–400)
  - `medium`: 370 g/L (midpoint of 360–380)
  - `medium_dark`: 345 g/L (midpoint of 330–360)
  - `dark`: 315 g/L (midpoint of 300–330)
  Source comment: `# Bean bulk density by roast level — synthesis doc via Obsidian roast_level_parameters.md`

- **D-06:** `derive_immersion_params()` gains a `roast_level: str` parameter. It uses
  `ROAST_DENSITY[roast_level]` instead of the old fixed constant. All three solvers
  (`immersion.py`, `percolation.py`, `pressure.py`) must pass `inp.roast_level.value`
  when calling `derive_immersion_params()` / `derive_percolation_params()`.

- **D-07:** **Revalidation required in Phase 8.** After implementing density change, run
  `pytest` for VAL-01 (immersion EY=21.51%) and VAL-02 (percolation EY=20.0% Batali 2020)
  using `medium` roast. Document EY delta in SUMMARY.md.
  - If EY stays within ±1.5% RMSE tolerance → no further action.
  - If EY shifts beyond ±1.5% → recalibrate `K_liang` (currently `K_liang = 0.717` in
    `params.py`) and update the constant with source comment.
  Note: The user mentioned "0.838" — the codebase has `K_liang = 0.717`. Planner should
  use the live codebase value and recalibrate from there if needed.

### Mobile — Roast Selector (dashboard.tsx)

- **D-08:** Replace `SegmentedControl` for roast level with a **horizontal scroll pill
  selector** — single row, horizontally scrollable, each pill contains a label, selected
  pill is highlighted (accent color). New component: `RoastPillSelector` (or similar name
  consistent with project component conventions).

- **D-09:** Pill labels use **SCA standard terminology**:
  `Light` / `Medium Light` / `Medium` / `Medium Dark` / `Dark`
  (Maps to enum values: `light` / `medium_light` / `medium` / `medium_dark` / `dark`)

- **D-10:** **Persist last-used roast level** in `AsyncStorage` (key: `lastRoastLevel`).
  On Brew Dashboard mount, read stored value and pre-select it. Falls back to `medium`
  if no stored value. Updates storage on every selection change.

### Mobile — TypeScript Types (types/simulation.ts)

- **D-11:** Update `RoastLevel` union type:
  ```ts
  export type RoastLevel = "light" | "medium_light" | "medium" | "medium_dark" | "dark";
  ```
  The `ROAST_LEVELS` array in `dashboard.tsx` becomes:
  ```ts
  const ROAST_LEVELS: RoastLevel[] = ["light", "medium_light", "medium", "medium_dark", "dark"];
  ```
  Default index: determined by AsyncStorage lookup (see D-10); fallback index = 2 (medium).

### Engine — SimulationOutput

- **D-12:** Add `agtron_number: Optional[int]` to `SimulationOutput`. Value is the
  Agtron midpoint for the given roast level (HIGH confidence, SCA standard):
  - light: 75, medium_light: 65, medium: 55, medium_dark: 45, dark: 35
  This is a display/informational field — not used in physics calculations. Populated
  by a roast-level lookup in `output_helpers.py` (or directly in each solver's result
  assembly). Source: SCA Gourmet scale from Obsidian `roast_level_parameters.md`.

### Testing

- **D-13:** Add roast level as a **parametrize dimension** to existing smoke tests
  (e.g., `test_smoke_suite.py` or equivalent). The matrix `all 6 methods × 5 roast levels`
  = 30 combinations. Tests must confirm each combination produces a physically plausible
  `SimulationOutput` (no NaN, EY in [0, 30%], TDS > 0). No standalone new test file.

### Claude's Discretion

- Exact `RoastPillSelector` component implementation details (scroll behavior, animation,
  styling) — follow existing component conventions in `keif-mobile/components/`
- Whether `ROAST_DENSITY` lookup falls back to `medium` density for unknown roast strings
  or raises a `ValueError` — match existing error-handling style in the codebase
- AsyncStorage read/write placement (useEffect on mount vs. custom hook) — researcher
  to recommend based on existing patterns in the codebase
- Exact formula for Weibull-to-biexp tau conversion — planner to specify using
  relationship: tau_biexp ≈ lambda_weibull × 3600 (convert hours to seconds), split
  fast/slow based on dark-only confirmed ratio (20% fast / 80% slow from Smrke)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Obsidian Research Data (Primary source for all parameter values)
- `D:/Programs/Obsidian/My_Coffee_App/BrewOS_To-Do_Before_Implementation/Physics/v2-research/roast-levels/roast_level_parameters.md` — 5-tier CO2 content, bean density, Agtron, moisture, degassing tau table; confidence ratings per parameter
- `D:/Programs/Obsidian/My_Coffee_App/BrewOS_To-Do_Before_Implementation/Physics/equations/smrke_2018_co2_bloom_biexponential.md` — current bi-exp model implementation, existing 3-tier params, formula reference

### Engine Files to Modify
- `brewos-engine/brewos/models/inputs.py` — RoastLevel enum (lines 10-13)
- `brewos-engine/brewos/utils/co2_bloom.py` — CO2_PARAMS dict (lines 22-28)
- `brewos-engine/brewos/utils/params.py` — rho_bulk_ground constant + derive_immersion_params() signature
- `brewos-engine/brewos/models/outputs.py` — SimulationOutput (add agtron_number field)
- `brewos-engine/brewos/utils/output_helpers.py` — agtron lookup + populate in solvers

### Mobile Files to Modify
- `brewos-engine/keif-mobile/types/simulation.ts` — RoastLevel type (line 3)
- `brewos-engine/keif-mobile/app/dashboard.tsx` — ROAST_LEVELS array + roast selector UI
- `brewos-engine/keif-mobile/components/` — new RoastPillSelector component

### Prior Phase Decisions
- `.planning/phases/06-mobile-core-screens/06-CONTEXT.md` — D-09 (original 3-tier SegmentedControl decision being superseded), D-07 (dashboard parameter order to preserve)

### Project Constraints
- `CLAUDE.md` — Physics traceability requirement (all params must cite published papers)

</canonical_refs>

<specifics>
## Specific References

- Obsidian vault: `D:/Programs/Obsidian/My_Coffee_App` — active, open vault with full
  17-source NotebookLM synthesis at `roast_level_parameters.md`. All parameter values
  for this phase come from this document.
- Smrke 2018 Table 1 Weibull data (in `roast_level_parameters.md`): light avg lambda ≈ 338h,
  medium avg lambda ≈ 231h, dark avg lambda ≈ 195h (averages of fast/medium/slow columns).
  medium_light and medium_dark taus to be derived by interpolation of these three anchors.
- CO2 content for beta calibration: light 3.55 mg/g (mid), medium_light 4.75 mg/g (mid),
  medium 6.53 mg/g (mid), medium_dark 9.00 mg/g (mid), dark 12.89 mg/g (mid).
- Agtron midpoints: light=75, medium_light=65, medium=55, medium_dark=45, dark=35
  (SCA Gourmet scale, HIGH confidence).

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion — phase scope remains as defined in ROADMAP.md.

</deferred>

---

*Phase: 08-5-tier-roast-level*
*Context gathered: 2026-04-07 via /gsd-discuss-phase 8*
*Obsidian vault consulted: D:/Programs/Obsidian/My_Coffee_App*
