---
phase: 03-pressure-solver
verified: 2026-03-27T21:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 3: Pressure Solver Verification Report

**Phase Goal:** Implement pressure-based extraction solvers (Moka Pot + AeroPress) and close the 6-method coverage gap.
**Verified:** 2026-03-27T21:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Combined must-haves from both plans (03-01 and 03-02):

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | Moka Pot accurate mode produces a heating phase followed by extraction onset; EY% lands in 15-22% range | ✓ VERIFIED | `test_moka_accurate_ey_range` PASSES; `test_moka_heating_phase` PASSES (first 3 points < 1%, mid-curve rises > 5%) |
| 2   | Moka Pot fast mode (biexponential) completes in under 1ms and EY% is within +-2% of accurate mode | ✓ VERIFIED | `test_moka_fast_speed` PASSES (100-run avg < 1ms); `test_moka_fast_accuracy` PASSES (delta < 2%) |
| 3   | Moka Pot method config dispatches to pressure solver with 3-cup Bialetti defaults | ✓ VERIFIED | `moka_pot.py` imports `solve_accurate, solve_fast` from `brewos.solvers.pressure`; MOKA_POT_DEFAULTS contains all required keys; `test_simulate_accurate_mode` PASSES |
| 4   | AeroPress hybrid solver completes an immersion steep phase then a pressure push phase, returning combined extraction with higher EY than equivalent steep-only immersion | ✓ VERIFIED | `test_hybrid_exceeds_steep` PASSES (hybrid EY > steep EY + 1%); `_solve_hybrid_accurate` calls `immersion_accurate`, then runs 1-ODE Darcy push |
| 5   | All 6 brew methods (French Press, V60, Kalita, Espresso, Moka Pot, AeroPress) pass pytest in both fast and accurate modes | ✓ VERIFIED | `test_method_returns_valid_output[fast/accurate x 6 methods]` — 12 parametrized tests PASS; full suite 98 passed |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | min_lines | Actual Lines | Status | Notes |
| -------- | --------- | ------------ | ------ | ----- |
| `brewos-engine/brewos/solvers/pressure.py` | 120 | 379 | ✓ VERIFIED | exports `solve_accurate`, `solve_fast`, `PRESSURE_DEFAULTS`, thermo helpers |
| `brewos-engine/brewos/methods/moka_pot.py` | 20 | 27 | ✓ VERIFIED | exports `MOKA_POT_DEFAULTS`, `simulate` |
| `brewos-engine/brewos/methods/aeropress.py` | 80 | 261 | ✓ VERIFIED | exports `AEROPRESS_DEFAULTS`, `simulate`, `_solve_hybrid_accurate`, `_solve_hybrid_fast` |
| `brewos-engine/tests/test_pressure.py` | 60 | 91 | ✓ VERIFIED | 7 tests covering EY range, heating phase, fast speed, ratio bounds |
| `brewos-engine/tests/test_moka_pot.py` | 30 | 50 | ✓ VERIFIED | 4 tests: accurate mode, fast mode, both modes, defaults |
| `brewos-engine/tests/test_aeropress.py` | 40 | 73 | ✓ VERIFIED | 5 tests: hybrid exceeds steep, EY range, complete output, fast accuracy, fast speed |
| `brewos-engine/tests/test_all_methods.py` | 40 | 59 | ✓ VERIFIED | 18 parametrized tests (12 valid output + 6 distinct EY) |

All artifacts exist, are substantive (well above min_lines), and are wired into the test suite.

---

### Key Link Verification

**Plan 03-01 key links:**

| From | To | Via | Status | Evidence |
| ---- | -- | --- | ------ | -------- |
| `brewos/methods/moka_pot.py` | `brewos/solvers/pressure.py` | `from brewos.solvers.pressure import solve_accurate, solve_fast` | ✓ WIRED | Line 5 of moka_pot.py — exact import confirmed |
| `brewos/solvers/pressure.py` | `brewos/utils/params.py` | `from brewos.utils.params import` | ✓ WIRED | Line 8 of pressure.py — imports `derive_immersion_params`, `kozeny_carman_permeability`, `rho_w`, `K_liang`, `E_max` |
| `brewos/solvers/pressure.py` | `brewos/utils/output_helpers.py` | `from brewos.utils.output_helpers import` | ✓ WIRED | Line 10 of pressure.py — imports `resolve_psd`, `estimate_flavor_profile`, `generate_warnings`, `brew_ratio_recommendation`; all 4 called in both solve_accurate and solve_fast |

**Plan 03-02 key links:**

| From | To | Via | Status | Evidence |
| ---- | -- | --- | ------ | -------- |
| `brewos/methods/aeropress.py` | `brewos/solvers/immersion.py` | `from brewos.solvers.immersion import solve_accurate\|solve_fast` | ✓ WIRED | Line 8: `from brewos.solvers.immersion import solve_accurate as immersion_accurate, solve_fast as immersion_fast`; both called in respective hybrid phases |
| `brewos/methods/aeropress.py` | `brewos/utils/params.py` | `kozeny_carman_permeability` for push phase Darcy flow | ✓ WIRED | Line 9 import, line 56 call site: `K_bed = kozeny_carman_permeability(d_particle_m, porosity)` |
| `tests/test_all_methods.py` | `brewos/methods/` | imports all 6 method `simulate()` functions | ✓ WIRED | Lines 6-11: all 6 methods imported individually and called in parametrized tests |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `pressure.py::solve_accurate` | `M_cup` (EY state var) | `scipy.integrate.solve_ivp` on 6-ODE moka_pot_ode | Yes — ODE integrates physics from t=0 to brew_time | ✓ FLOWING |
| `pressure.py::solve_fast` | `EY_t` | Biexponential formula over `np.linspace(0, brew_time, 50)` | Yes — deterministic closed-form from inp parameters | ✓ FLOWING |
| `aeropress.py::_solve_hybrid_accurate` | `total_ey` | `immersion_accurate(steep_inp)` EY + `solve_ivp` push ODE | Yes — delegates to real ODE solver, combines with Darcy push | ✓ FLOWING |
| `aeropress.py::_solve_hybrid_fast` | `total_ey` | `immersion_fast(steep_inp)` EY + biexponential push increment | Yes — biexponential closed-form on remaining headroom | ✓ FLOWING |

No hollow props, no hardcoded empty arrays passed to any renderer.

---

### Behavioral Spot-Checks

Tests ran directly via pytest — all pass:

| Behavior | Test | Result | Status |
| -------- | ---- | ------ | ------ |
| Moka accurate EY in 15-22% | `test_moka_accurate_ey_range` | PASS | ✓ PASS |
| Moka fast < 1ms | `test_moka_fast_speed` | PASS | ✓ PASS |
| AeroPress hybrid exceeds steep by >= 1% | `test_hybrid_exceeds_steep` | PASS | ✓ PASS |
| AeroPress EY in 15-26% | `test_aeropress_ey_range` | PASS | ✓ PASS |
| AeroPress fast < 1ms | `test_aeropress_fast_speed` | PASS | ✓ PASS |
| All 6 methods x 2 modes valid output | 12 parametrized tests | PASS (12/12) | ✓ PASS |
| No regressions in full suite | `pytest tests/ -q` | 98 passed | ✓ PASS |

**Full suite output:** 98 passed, 7 warnings (all warnings are benign scipy Radau divide-by-zero at ODE initialization with zero-derivative initial conditions — documented in SUMMARY).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| SOLV-05 | 03-01 | Pressure solver (Moroney 2016 ODE + thermal coupling, 6 ODEs) — accurate mode for Moka Pot | ✓ SATISFIED | `pressure.py::solve_accurate` implements 6-ODE system (T, V_ext, c_h, c_v, psi_s, M_cup) with Clausius-Clapeyron + Moroney; EY 15-22% confirmed by test |
| SOLV-06 | 03-01 | Pressure solver fast mode: Maille 2021 biexponential with moka-specific lambda calibration | ✓ SATISFIED | `pressure.py::solve_fast` implements Maille biexponential (A1=0.50, tau1=8s, tau2=80s); < 1ms confirmed by test |
| METH-05 | 03-01 | Moka Pot method: configures pressure solver with steam pressure, stovetop geometry, default thermal params for common pot sizes | ✓ SATISFIED | `moka_pot.py` has MOKA_POT_DEFAULTS (3-cup Bialetti geometry, Q_heater=800W, h_loss, A_surface, T_ambient) passed as `method_defaults` to solver |
| METH-06 | 03-02 | AeroPress method: standalone hybrid solver — immersion steep phase followed by pressure push phase | ✓ SATISFIED | `aeropress.py` orchestrates `immersion_accurate/fast` (steep) + Darcy push ODE (accurate) or biexponential headroom model (fast); DECISION-005 honored — no ODE reimplementation |

All 4 phase-3 requirements satisfied. Traceability table in REQUIREMENTS.md matches (all marked Complete for Phase 3).

**Orphaned requirements check:** REQUIREMENTS.md Traceability table assigns exactly SOLV-05, SOLV-06, METH-05, METH-06 to Phase 3. No orphaned requirements.

---

### Anti-Patterns Found

Scan of all phase-3 source files:

| File | Pattern | Result |
| ---- | ------- | ------ |
| `pressure.py` | TODO/FIXME/placeholder | None found |
| `moka_pot.py` | TODO/FIXME/placeholder | None found |
| `aeropress.py` | TODO/FIXME/placeholder | None found |
| `test_pressure.py` | TODO/FIXME/placeholder | None found |
| `test_aeropress.py` | TODO/FIXME/placeholder | None found |
| `test_all_methods.py` | TODO/FIXME/placeholder | None found |
| Any file | Empty handlers / return null / return {} | None found |
| Any file | Hardcoded empty data to rendering path | None found |

No anti-patterns detected in any phase-3 artifact.

**RuntimeWarning note:** scipy Radau emits `divide by zero in scalar divide` for 7 tests using ODE accurate mode. This is a known benign numerical artifact at ODE initialization with zero-derivative initial conditions. It does not affect results and is documented in both SUMMARYs. Not classified as a blocker.

---

### Human Verification Required

None. All required behaviors are programmatically verifiable and confirmed by passing tests.

---

### Gaps Summary

No gaps. All 5 truths verified, all 7 artifacts exist and are substantive, all 6 key links confirmed wired, all 4 requirements satisfied, full 98-test suite green.

---

_Verified: 2026-03-27T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
