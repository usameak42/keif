# Codebase Concerns

**Analysis Date:** 2026-03-26

## Tech Debt

**Incomplete solver implementations:**
- Issue: Multiple brewing methods and solvers exist as stub docstrings only
- Files: `brewos/methods/espresso.py`, `brewos/methods/aeropress.py`, `brewos/methods/kalita.py`, `brewos/methods/moka_pot.py`, `brewos/methods/v60.py`, `brewos/solvers/percolation.py`, `brewos/solvers/pressure.py`, `brewos/utils/psd.py`
- Impact: These modules cannot perform simulations. Only `brewos/methods/french_press.py` (immersion) is partially implemented via the PoC in `brewos/poc/moroney_2016_immersion_ode.py`. Percolation, pressure-driven espresso/moka pot, and grind analysis are non-functional.
- Fix approach: Implement each solver method from the physics equations vault. Start with percolation (Moroney 2015 PDE) and pressure solvers (Moroney 2019 / Siregar 2026).

**Ad-hoc equilibrium scaling (BREWOS-TODO-001):**
- Issue: The immersion ODE (Moroney 2016) lacks re-adsorption term, causing overestimated extraction. Linear post-solve scaling to Liang 2021 equilibrium is a workaround, not a proper model.
- Files: `brewos/poc/moroney_2016_immersion_ode.py` lines 161-177; `tests/test_immersion_poc.py`
- Impact: EY and TDS validation pass by construction due to linear scaling. Real time-series validation (experimental TDS vs time) is deferred. Model cannot extrapolate to new brew ratios or temperatures reliably.
- Fix approach: Implement proper re-adsorption backward flux term in the ODE system. Anchor to Liang 2021 physically (equilibrium boundary condition) rather than post-solve scaling. Validate against published immersion datasets (Batali et al., Liang et al.).

**Parameter estimation and uncertainty:**
- Issue: Several critical parameters are estimated rather than from literature
- Files: `brewos/poc/moroney_2016_immersion_ode.py` lines 77-93
- Impact: Estimates used: phi_v_inf = 0.40, c_s = 1050 kg/m³. These control intragranular kinetics (c_v diffusion rates). Extraction curve timing is sensitive to D_v which derives from these.
- Fix approach: Read Moroney 2015 full paper (not just vault Table 1) to extract phi_v_inf and c_s directly. Propagate uncertainty via ensemble runs (±10% parameter sweeps).

---

## Known Bugs

**DC_v sign error (fixed in Phase 8):**
- Symptoms: Phase 7 had dc_v = -kC*(c_h-c_v), causing c_v to increase instead of decrease. EY_raw reached 179% (impossible).
- Files: `brewos/poc/moroney_2016_immersion_ode.py` line 113 (now correct: `dc_v = +kC*(c_h-c_v)`)
- Trigger: ODE integration with negative diffusion flux
- Status: RESOLVED in Phase 8. Sign verified against Moroney 2016 vault equation and physical reasoning (solute diffuses down concentration gradient c_h→c_v means c_v increases).

**EY formula inconsistency (fixed in Phase 8):**
- Symptoms: Phase 7 used wrong EY formula, underestimating by ~18%. Corrected to dilute approximation EY% = TDS% × R_brew.
- Files: `brewos/poc/moroney_2016_immersion_ode.py` lines 156-157
- Trigger: None known in current code; fixed retroactively
- Status: RESOLVED. Formula now matches SCA ideal (dilute approximation valid for TDS < 2%).

**IC constraint violation (fixed in Phase 8):**
- Symptoms: phi_c0 estimated at 0.10 implied gamma_1 = 1.24 (impossible, must be ≤1). Now derived from IC constraint.
- Files: `brewos/poc/moroney_2016_immersion_ode.py` lines 82-87
- Trigger: Initialization of c_v(0) = gamma_1 * c_sat
- Status: RESOLVED. phi_c0 now computed as gamma_1 * c_sat * phi_v_inf / c_s ≈ 0.0567, satisfying IC by construction.

---

## Security Considerations

**No authentication in simulation engine:**
- Risk: If BrewOS API is exposed publicly, no auth requirement exists. Unlimited free simulations could be run.
- Files: All files in `brewos/` (pure computation, no auth checks)
- Current mitigation: No API layer exists yet. Engine is library-only.
- Recommendations: When API layer is added (future phase), implement rate limiting, API key validation, or user quotas.

**Dependency vulnerability risk:**
- Risk: scipy and numpy are not pinned to specific versions in pyproject.toml. Security patches may lag behind releases.
- Files: `pyproject.toml`
- Current mitigation: None; dependencies specified without version constraints.
- Recommendations: Pin to known-good versions (e.g., scipy>=1.11.0,<2.0; numpy>=1.24.0,<2.0). Add a security audit step to CI/CD.

**Grinder database not version-controlled:**
- Risk: Comandante C40 MK4 grind measurements exist as JSON but no versioning. If measurements are later found inaccurate, no audit trail.
- Files: `brewos/grinders/comandante_c40_mk4.json` (assumed, not found in listing)
- Current mitigation: None
- Recommendations: Version grinder data separately or commit with timestamps. Document measurement methodology and error bounds.

---

## Performance Bottlenecks

**ODE solver tolerances not optimized:**
- Problem: `moroney_2016_immersion_ode.py` line 139 uses rtol=1e-8, atol=1e-10 (very tight). Solves to t=3600s in dense eval mode.
- Files: `brewos/poc/moroney_2016_immersion_ode.py`
- Cause: Conservative tolerances ensure accuracy for validation but increase wall-clock time. scipy.solve_ivp Radau method with tight tolerances is slow for long time horizons.
- Improvement path: Benchmark with looser tolerances (rtol=1e-6, atol=1e-8) for "fast" mode. Adaptive tolerance selection (tight for accurate mode, loose for fast mode) is feasible in `brewos/models/inputs.py` Mode enum.

**No vectorization for parameter sweeps:**
- Problem: Running sensitivity analysis (varying brew ratio, temp, dose) requires sequential ODE solve calls. No batch ODE solving.
- Files: `brewos/poc/moroney_2016_immersion_ode.py` (single scenario only)
- Cause: scipy.solve_ivp does not support batch mode; would need parallel subprocess or multiprocessing.
- Improvement path: Implement batch solver wrapper using `concurrent.futures.ProcessPoolExecutor` or ray for embarrassingly-parallel parameter sweeps. Target: <100ms per scenario on 4-core machine.

---

## Fragile Areas

**Immersion ODE kinetic shape untested:**
- Files: `brewos/poc/moroney_2016_immersion_ode.py`, `tests/test_immersion_poc.py`
- Why fragile: Test validates only equilibrium endpoint (EY_final, TDS_final), not the time-series trajectory. Changes to kA, kB, kC coefficients may produce correct equilibrium by luck but wrong kinetics.
- Safe modification: Add time-series validation check. Compare extraction curve shape (time to 90%, time to 95%) to published experimental data from Liang et al., Batali et al.
- Test coverage: CRITICAL GAP — no test for extraction curve vs time. Current test lines 40-41 only check final values within ±0.05% tolerance.

**Parameter derivation chain fragile:**
- Files: `brewos/poc/moroney_2016_immersion_ode.py` lines 82-93 (phi_c0, D_v, T_surface derivation)
- Why fragile: D_v and phi_c0 depend on c_s and phi_v_inf (both estimated). Small errors (±20%) propagate multiplicatively through epsilon and T_surface calculations.
- Safe modification: Document all derivations as comments with equation references. Add assertion checks for physical bounds (0 < phi_c0 < phi_v_inf, 1e-10 < D_v < 1e-7).
- Test coverage: No unit tests for parameter derivation. Add test_parameter_constraints.py.

**Mode-dependent behavior unprovided:**
- Files: `brewos/models/inputs.py` line 31 (Mode enum: fast vs accurate), but no Mode handling in solver
- Why fragile: Mode is accepted in SimulationInput but solvers do not read it. Future implementers may apply Mode inconsistently (some solvers tight ODE tolerances, others loose).
- Safe modification: Add `mode: Mode` parameter to all solver entry points (immersion_solve, percolation_solve, etc.). Test both modes produce consistent results (within tolerance).
- Test coverage: Missing tests for Mode.fast vs Mode.accurate.

---

## Scaling Limits

**Single-grinder database insufficient for production:**
- Current capacity: Only Comandante C40 MK4 measurements exist
- Limit: Any brew with a different grinder returns "grinder not found" and forces manual grind size entry. User experience degrades significantly.
- Scaling path: Expand grinder database incrementally. Add high-volume grinders (Baratza Encore, Fellow Ode, Eureka Mignon) and espresso grinders (Notte, DriZ). Measure 3-5 samples per setting; calculate VMD and distribution fit for each.

**No distributed ODE solving:**
- Current capacity: Single-threaded solve_ivp handles ~100 scenarios/second (estimate: 333-line PoC script ≈ 10ms per solve on modern CPU)
- Limit: For fleet simulation (all user requests), >10k scenarios/day hits sequential bottleneck. Would need <10s total wall time.
- Scaling path: Implement batch solver (see Performance Bottlenecks). Parallelize across CPU cores via ProcessPoolExecutor or ray. Target: 1000 scenarios/second on 8-core machine.

**No persistent output storage:**
- Current capacity: SimulationOutput computed in-memory, returned to caller. No database.
- Limit: Cannot retrieve historical simulations, cannot audit user behavior, cannot train ML flavor models on dataset of brews.
- Scaling path: Add optional PostgreSQL backend for SimulationOutput storage. Implement caching layer (Redis) for repeated parameter sets. Consider time-series database (InfluxDB) for extraction curves.

---

## Dependencies at Risk

**scipy API stability:**
- Risk: scipy.integrate.solve_ivp may change signature or deprecated in future versions (e.g., scipy 2.0 is under development). Radau solver may move or be removed.
- Impact: Immersion ODE solver breaks; PoC must migrate to alternative solver (e.g., jax.experimental.ode, assimulo).
- Migration plan: Pin scipy to <2.0 until API stability confirmed. Monitor scipy 2.0 beta releases. Consider integration test for solver interface changes.

**numpy array shape assumptions:**
- Risk: numpy 2.0 introduced stricter type checking. Broadcasting rules may change in future versions.
- Impact: ODE system `y0 = [c_h0, c_v0, psi_s0]` and return `[dc_h, dc_v, dpsi_s]` relies on list-to-array conversion. Future numpy may require explicit array() calls.
- Migration plan: Replace all list init with `np.array([...])`. Add type hints for array arguments in solver functions. Test against numpy 2.0rc.

**pydantic 2.x breaking changes:**
- Risk: Pydantic 2.0 already introduced major breaking changes from 1.x (which had different validator syntax). Future 3.0 could be similar.
- Impact: `@field_validator` and `@model_validator` decorators in `brewos/models/inputs.py` lines 33-68 may become invalid.
- Migration plan: Document current pydantic 2.x API. Monitor pydantic changelog. Add validator regression tests (test_inputs.py with sample valid/invalid inputs).

---

## Missing Critical Features

**CO2 degassing / bloom phase not modeled:**
- Problem: BrewOS architecture specifies 9 modules; only 8 have physics sources. CO2 degassing during bloom has "no strong source found" (Phase 5, CLAUDE.md line 74).
- Blocks: Cannot model CO2 pressure buildup during pour-over (V60/Kalita) or French press decanting. Flavor transport during bloom is incomplete.
- Decision: DECISION-002_co2_degassing_bloom.md defers to v1.1. For v1.0, assume degassing is complete before extraction starts (simplification).

**Pressure solver (espresso, moka pot) stub only:**
- Problem: `brewos/solvers/pressure.py` is 1 line (docstring only). Espresso shots cannot be simulated.
- Blocks: Cannot compute TDS, EY for espresso. Espresso method module cannot be used.
- Next steps: Implement Moroney 2019 Euler-Euler PDE (1D flow + concentration in packed bed). Merge with Siregar 2026 moka pot thermal model for temperature-dependent diffusion.

**Percolation solver (drip, pour-over) stub only:**
- Problem: `brewos/solvers/percolation.py` is 1 line. Drip coffee, pour-over (V60, Kalita, Chemex) cannot be simulated.
- Blocks: Cannot model >50% of coffee brewing (drip is the most common method).
- Next steps: Implement Moroney 2015 double-porosity PDE (kernel + intergranular phases) with flow. Integrate with Grudeva 2025 transport model for variable grind.

**Grind size distribution (PSD) analysis disabled:**
- Problem: `brewos/utils/psd.py` is 1 line. Cannot compute VMD, distribution fit from raw grind measurements.
- Blocks: Manual grind size input only. Cannot leverage grinder database to compute distribution parameters (alpha, beta for bimodal model).
- Next steps: Implement Maille 2021 hybrid bimodal fit (theta_v,coarse, theta_v,fines, D_coarse, D_fines). Input: sieve data or laser diffraction. Output: Maille parameters for kinetic model.

**Flavor profile model incomplete:**
- Problem: `brewos/models/outputs.py` line 20-24 defines FlavorProfile (sour, sweet, bitter) but solver integration missing.
- Blocks: Cannot predict flavor character from parameters. output.flavor_profile is always zeros or hardcoded.
- Next steps: Integrate flavor kinetics module (Maille 2021 + PTR-ToF-MS paper equations). Map extraction curve to flavor compound kinetics. Implement taste threshold mapping (TDS vs sour, EY vs bitter, etc.).

**Temperature evolution not modeled:**
- Problem: All parameters (D_h, D_v, c_sat, reaction rates) are treated as constants at fixed T.
- Blocks: Cannot model cooling during brew (brew water cools; extraction rate slows). Espresso shots with thermal mass ignored.
- Next steps: Add 1D heat equation (lumped capacitance per Kostial 2014 or full PDE). Temperature-dependent viscosity, diffusivity via Arrhenius forms. Impact: moderate for immersion (T drop ~20°C over 5 min), critical for espresso (T drop ~50°C).

---

## Test Coverage Gaps

**Immersion equilibrium endpoint only:**
- What's not tested: Extraction kinetics shape (time-domain behavior), intermediate timepoint accuracy
- Files: `tests/test_immersion_poc.py` line 40-41 (only checks EY_final ≈ 21.51%, TDS_final ≈ 1.291%)
- Risk: ODE coefficient errors or sign flips may be masked if equilibrium value happens to be correct by coincidence.
- Priority: HIGH — add test_extraction_curve_shape.py with 3-5 experimental reference datasets.

**Parameter constraint validation missing:**
- What's not tested: Derived parameters (D_v, phi_c0) satisfy physical bounds
- Files: No test file exists; `brewos/poc/moroney_2016_immersion_ode.py` computes but does not validate
- Risk: Negative D_v or phi_c0 > phi_v_inf could be computed silently if vault values change or code is modified.
- Priority: MEDIUM — add test_parameter_constraints.py with bounds checks (0 < D_v < 1e-7, 0 < phi_c0 < phi_v_inf, etc.).

**Input model validator coverage:**
- What's not tested: All validator branches in `brewos/models/inputs.py` lines 33-68
- Files: `tests/test_immersion_poc.py` has no input validation tests
- Risk: Invalid inputs (negative dose, temperature out of range, conflicting grind sources) may not raise expected ValueError.
- Priority: MEDIUM — add test_inputs.py with parametrized invalid cases.

**Solver output validity:**
- What's not tested: SimulationOutput time-series monotonicity (EY should not decrease), flavor profile bounds (0 ≤ sour/sweet/bitter ≤ 1)
- Files: No test file exists
- Risk: Solver bug could produce non-monotonic EY or flavor values > 1.0; test would catch silently.
- Priority: LOW — add test_outputs.py with schema validation.

**No integration tests across methods:**
- What's not tested: Same brew simulated by both immersion and percolation produces similar TDS/EY (sanity check)
- Files: All method modules are stubs
- Risk: When percolation solver is implemented, could diverge significantly from immersion without detection.
- Priority: LOW (blocked until percolation implemented) — add test_cross_method_consistency.py.

**Mode (fast vs accurate) behavior untested:**
- What's not tested: Mode.fast produces same results as Mode.accurate (within tolerance)
- Files: `tests/` directory
- Risk: Mode parameter ignored; users run fast but do not get fast results.
- Priority: MEDIUM — add test_mode_consistency.py after solver integration of Mode parameter.

---

## Outstanding Research / Decision Blockers

**Moroney 2015 full paper not fully read:**
- Blocker: Three parameters (phi_v_inf, phi_c0, c_s) are estimated or derived, not directly extracted from paper.
- Impact: Intragranular kinetics uncertainty. D_v derivation is fragile.
- Action: Obtain full Moroney 2015 paper PDF. Read Table 1 carefully. Extract exact values.

**Bean density and particle shape decision deferred (DECISION-003):**
- Blocker: PSD model (Maille 2021) requires bean density and shape assumption (spherical vs rectangular).
- Impact: Grind distribution fitting cannot be automated. Flavor kinetics may be off due to diffusion geometry mismatch.
- Status: Deferred to v1.1 per DECISION-003. For v1.0, assume spherical particles with estimated density.

**Espresso single-grinder validation limitation (DECISION-004):**
- Blocker: Espresso validation will be against one grinder (assumed: Comandante C40 MK4 or similar). Multi-grinder espresso dataset not available.
- Impact: Cannot verify espresso model generalization.
- Status: Acknowledged limitation in DECISION-004. Full espresso validation deferred to v2.0.

---

*Concerns audit: 2026-03-26*
