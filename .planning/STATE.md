---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase complete — ready for verification
stopped_at: Completed 07-02-PLAN.md
last_updated: "2026-03-28T20:03:49.773Z"
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 16
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Physically accurate, real-time coffee extraction simulation -- predict TDS% and EY% from grinder settings, dose, and water parameters before brewing, across all 6 major brew methods.
**Current focus:** Phase 07 — mobile-extended-run-history

## Current Position

Phase: 07 (mobile-extended-run-history) — EXECUTING
Plan: 2 of 2

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-immersion-solver-core-engine P01 | 15 | 1 tasks | 4 files |
| Phase 01-immersion-solver-core-engine P02 | 5 | 2 tasks | 5 files |
| Phase 01-immersion-solver-core-engine P03 | 4 | 2 tasks | 6 files |
| Phase 02-percolation-solver P01 | 5 | 2 tasks | 9 files |
| Phase 02-percolation-solver P02 | 8 | 2 tasks | 11 files |
| Phase 03-pressure-solver P01 | 6 | 2 tasks | 5 files |
| Phase 03-pressure-solver P02 | 7 | 2 tasks | 3 files |
| Phase 04-extended-outputs-grinder-presets P01 | 5 | 7 tasks | 11 files |
| Phase 04 P02 | 3 | 5 tasks | 4 files |
| Phase 05-integration-tests-fastapi-backend P01 | 15min | 2 tasks | 2 files |
| Phase 06 P01 | 9 | 2 tasks | 24 files |
| Phase 06 P02 | 4 | 2 tasks | 9 files |
| Phase 06 P03 | 3 | 3 tasks | 10 files |
| Phase 07 P01 | 5 | 3 tasks | 11 files |
| Phase 07 P02 | 5 | 3 tasks | 14 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- DECISION-010: Espresso uses percolation.py (Moroney 2015 PDE); Moka Pot uses pressure.py (thermal ODE); channeling = post-processing overlay; CO2 bloom = bi-exponential + multiplicative modifier
- DECISION-007: Fast = Maille 2021 biexponential, Accurate = Moroney ODE/PDE, shared Liang K=0.717 anchor
- [Phase 01-immersion-solver-core-engine]: solve_accurate() raises ValueError if grind_size is None; grinder lookup wired in Plan 01-03 (keeps solver testable with manual grind_size)
- [Phase 01-immersion-solver-core-engine]: bean_age_days added to SimulationInput now to avoid future breaking changes when CO2 bloom implemented in Plan 01-02
- [Phase 01-immersion-solver-core-engine]: CO2_PARAMS tau values use day-scale timescales: dark 5d/21d, medium 3d/14d, light 2d/10d — darker roasts retain CO2 longer (physically: more CO2 produced, slower release)
- [Phase 01-immersion-solver-core-engine]: Biexponential constants calibrated via curve_fit: A1=0.6201, tau1=3.14s, tau2=103.02s — plan defaults exceeded 2% EY tolerance
- [Phase 01-immersion-solver-core-engine]: PSD resolution in _resolve_psd() inside immersion.py; french_press.py stays pure dispatcher
- [Phase 01-immersion-solver-core-engine]: Click interpolation: exact preset uses JSON median_um; all other clicks use setting * microns_per_click
- [Phase 01-immersion-solver-core-engine]: Flavor piecewise model with 5 zones at EY 16/18/22/24% anchored to SCA extraction order
- [Phase 02-percolation-solver]: Percolation EY target = 20% (Batali 2020) instead of 21.51% (immersion Liang anchor); KB_PERCOLATION_FACTOR=3.0 for forced flow; method_defaults dict pattern for geometry/flow overrides
- [Phase 02-percolation-solver]: Percolation biexponential: A1=0.55, tau1=2.0s, tau2=50.0s (shorter than immersion due to forced flow)
- [Phase 02-percolation-solver]: Darcy velocity capped at 5mm/s; Kozeny-Carman overpredicts for fine espresso grind
- [Phase 02-percolation-solver]: Method-specific ey_target_pct: V60=20.0%, Kalita=19.5%, Espresso=20.5% for distinct EY profiles
- [Phase 03-pressure-solver]: M_cup (cup accumulation) used for EY instead of c_h (bed concentration) -- monotonically increasing, physically correct for pressure-driven extraction
- [Phase 03-pressure-solver]: Wetting fraction w = V_ext/V_bed_pore gates extraction kinetics -- bed starts dry, extraction activates as water flows through
- [Phase 03-pressure-solver]: EY_TARGET_MOKA_PCT = 18.0% (lower than immersion 21.51% due to shorter contact time, lower water-to-coffee ratio)
- [Phase 03-pressure-solver]: AeroPress target scaling: raw combined EY scaled to 19% target, same pattern as moka pot 18% scaling
- [Phase 03-pressure-solver]: Hybrid orchestration: steep delegates to immersion solver (DECISION-005), push runs 1-ODE Darcy washout, results combined
- [Phase 04-extended-outputs-grinder-presets]: k_vessel=0.0 for moka pot (isothermal, active stove heating); puck_resistance=None for moka (not user-meaningful)
- [Phase 04-extended-outputs-grinder-presets]: EUI=None for fast mode percolation (no spatial nodes); EUI=1.0 for immersion/AeroPress (well-mixed assumption)
- [Phase 04-extended-outputs-grinder-presets]: Extended output fields always Optional with None default for backward compatibility
- [Phase 04]: Used pathlib relative to __file__ for portable grinder JSON path in tests
- [Phase 05-integration-tests-fastapi-backend]: Espresso fast mode test uses brew_time=90s: percolation TAU2_PERC=50s is V60-calibrated; at 25s the biexponential hasn't converged, giving 5.6pp gap vs accurate mode. Deferred: espresso-specific tau2 calibration.
- [Phase 05-integration-tests-fastapi-backend]: BrewMethod enum required on SimulationInput; dispatch needs it and an unrouted request is not meaningful
- [Phase 05-integration-tests-fastapi-backend]: Method modules imported at top level in api.py so scipy import cost is paid once at startup
- [Phase 06]: Jest 29 over Jest 30: jest-expo incompatible with Jest 30 module scoping
- [Phase 06]: GrinderDropdown uses Modal overlay instead of inline expand to avoid layout shift in ScrollView
- [Phase 06]: RotarySelector uses absolute positioning with animated translateY for smooth drum effect
- [Phase 06]: useHealthCheck wired into index.tsx not _layout.tsx; SCA chart espresso Y 6-12%, filter Y 0.8-1.6%; ErrorCard retry navigates back for parameter tweaking
- [Phase 07]: Victory Native CartesianChart requires double cast for typed interfaces: data as unknown as Record<string, unknown>[], xKey/yKeys as never, points as any
- [Phase 07]: SimulationResultContext wraps entire navigator in _layout.tsx for cross-screen state sharing
- [Phase 07]: expo-sqlite ~14.0.6 async API for SDK 52; nearest-t merge for dual extraction curves; Skia Circle for per-run SCA scatter points

### Pending Todos

None yet.

### Blockers/Concerns

- Pressure solver confidence is MEDIUM-LOW for Moka Pot (Siregar 2026 is a preprint, dimensionless params need re-dimensionalization)
- CO2 bloom beta (extraction suppression) values are first-order estimates (LOW confidence) -- may need post-v1 calibration
- alpha_n/beta_n Moroney params may need recalibration for espresso regime (no espresso-specific published values)

## Session Continuity

Last session: 2026-03-28T20:03:49.769Z
Stopped at: Completed 07-02-PLAN.md
Resume file: None
