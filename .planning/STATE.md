---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase complete — ready for verification
stopped_at: Completed 02-percolation-solver/02-02-PLAN.md
last_updated: "2026-03-27T00:52:46.189Z"
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-26)

**Core value:** Physically accurate, real-time coffee extraction simulation -- predict TDS% and EY% from grinder settings, dose, and water parameters before brewing, across all 6 major brew methods.
**Current focus:** Phase 02 — percolation-solver

## Current Position

Phase: 02 (percolation-solver) — EXECUTING
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

### Pending Todos

None yet.

### Blockers/Concerns

- Pressure solver confidence is MEDIUM-LOW for Moka Pot (Siregar 2026 is a preprint, dimensionless params need re-dimensionalization)
- CO2 bloom beta (extraction suppression) values are first-order estimates (LOW confidence) -- may need post-v1 calibration
- alpha_n/beta_n Moroney params may need recalibration for espresso regime (no espresso-specific published values)

## Session Continuity

Last session: 2026-03-27T00:52:46.186Z
Stopped at: Completed 02-percolation-solver/02-02-PLAN.md
Resume file: None
