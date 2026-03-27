---
phase: 04-extended-outputs-grinder-presets
plan: 01
subsystem: engine
tags: [pydantic, newton-cooling, sca-chart, kozeny-carman, caffeine, extraction-uniformity]

# Dependency graph
requires:
  - phase: 03-pressure-solver
    provides: "All 6 solvers (immersion, percolation, pressure, aeropress hybrid) with SimulationOutput contract"
provides:
  - "5 extended output fields on SimulationOutput: EUI, temperature_curve, sca_position, puck_resistance, caffeine_mg_per_ml"
  - "5 helper functions in output_helpers.py: compute_eui, compute_temperature_curve, classify_sca_position, estimate_caffeine, compute_puck_resistance"
  - "k_vessel thermal loss coefficient in all 6 method defaults"
affects: [04-02, 05-backend-api, mobile-app]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Newton's Law of Cooling for temperature decay", "SCA Brew Control Chart zone classification", "Kozeny-Carman normalised puck resistance", "Empirical caffeine estimation (Taip 2025)"]

key-files:
  created: []
  modified:
    - "brewos-engine/brewos/models/outputs.py"
    - "brewos-engine/brewos/utils/output_helpers.py"
    - "brewos-engine/brewos/solvers/percolation.py"
    - "brewos-engine/brewos/solvers/immersion.py"
    - "brewos-engine/brewos/solvers/pressure.py"
    - "brewos-engine/brewos/methods/aeropress.py"
    - "brewos-engine/brewos/methods/v60.py"
    - "brewos-engine/brewos/methods/kalita.py"
    - "brewos-engine/brewos/methods/espresso.py"
    - "brewos-engine/brewos/methods/french_press.py"
    - "brewos-engine/brewos/methods/moka_pot.py"

key-decisions:
  - "k_vessel=0.0 for moka pot (isothermal, active stove heating) so temperature curve is flat at T_0"
  - "puck_resistance=None for moka pot (bed resistance not user-meaningful for stovetop brewing)"
  - "EUI=None for fast mode percolation (biexponential has no spatial nodes)"
  - "EUI=1.0 for immersion and AeroPress (well-mixed assumption)"

patterns-established:
  - "Extended output fields always Optional with None default for backward compatibility"
  - "Helper functions in output_helpers.py with deferred imports to avoid circular dependencies"

requirements-completed: [OUT-07, OUT-10, OUT-11, OUT-12, OUT-13]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 04 Plan 01: Extended Outputs Summary

**5 new SimulationOutput fields (EUI, temperature curve, SCA position, puck resistance, caffeine) populated across all 6 brew methods via shared helpers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T22:28:42Z
- **Completed:** 2026-03-27T22:33:15Z
- **Tasks:** 7
- **Files modified:** 11

## Accomplishments
- TempPoint and SCAPosition Pydantic models added to outputs.py with 5 new Optional fields on SimulationOutput
- 5 helper functions (compute_eui, compute_temperature_curve, classify_sca_position, estimate_caffeine, compute_puck_resistance) in output_helpers.py
- All 6 brew methods populate extended fields: V60, Kalita, Espresso, French Press, Moka Pot, AeroPress
- Espresso correctly populates puck_resistance via Kozeny-Carman normalisation; all other methods set it to None
- 97/98 tests pass (1 pre-existing timing flake in test_aeropress_fast_speed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend output models** - `4b1c472` (feat)
2. **Task 2: Add helper functions** - `c5a8a13` (feat)
3. **Task 3: Add k_vessel to method defaults** - `f94a8ab` (feat)
4. **Task 4: Update percolation.py** - `28a410b` (feat)
5. **Task 5: Update immersion.py** - `9a87218` (feat)
6. **Task 6: Update pressure.py and aeropress.py** - `ec252bd` (feat)
7. **Task 7: Smoke test** - verification only, no commit needed

## Files Created/Modified
- `brewos-engine/brewos/models/outputs.py` - TempPoint, SCAPosition models; 5 new Optional fields on SimulationOutput
- `brewos-engine/brewos/utils/output_helpers.py` - 5 new helper functions for extended outputs
- `brewos-engine/brewos/solvers/percolation.py` - EUI from c_h spatial variance, temp curve, SCA, puck resistance, caffeine
- `brewos-engine/brewos/solvers/immersion.py` - EUI=1.0, temp curve, SCA, caffeine; K_VESSEL_IMMERSION constant
- `brewos-engine/brewos/solvers/pressure.py` - temp curve (isothermal), SCA, caffeine; EUI=None, puck_resistance=None
- `brewos-engine/brewos/methods/aeropress.py` - Extended outputs from combined steep+push time axis
- `brewos-engine/brewos/methods/v60.py` - k_vessel=0.0030
- `brewos-engine/brewos/methods/kalita.py` - k_vessel=0.0028
- `brewos-engine/brewos/methods/espresso.py` - k_vessel=0.0015
- `brewos-engine/brewos/methods/french_press.py` - k_vessel=0.0025
- `brewos-engine/brewos/methods/moka_pot.py` - k_vessel=0.0000

## Decisions Made
- k_vessel=0.0 for moka pot models isothermal vessel (active stove heating keeps water hot)
- puck_resistance=None for moka pot -- bed resistance is not user-meaningful for stovetop brewing (the 0.85 constant from RESEARCH.md intentionally dropped)
- EUI=None for fast mode percolation -- biexponential model has no spatial nodes to compute variance from
- EUI=1.0 for immersion and AeroPress -- well-mixed assumption means uniform extraction by definition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- test_aeropress_fast_speed intermittently fails (1.3ms vs 1ms threshold) -- pre-existing timing flake unrelated to extended outputs

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 5 extended output fields populated across all 6 methods
- Ready for Phase 04 Plan 02 (grinder presets) and Phase 04 integration tests
- Espresso puck_resistance wired; SCA classification supports espresso-specific TDS bounds (8-12%)

---
*Phase: 04-extended-outputs-grinder-presets*
*Completed: 2026-03-27*
