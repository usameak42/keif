# Codebase Concerns

**Analysis Date:** 2026-04-01

---

## Repository Structure Debt

**brewos-engine/ subdirectory is a tracked legacy copy inside the repo:**
- Issue: `D:/Coding/Keif/brewos-engine/` is committed to the git index (96 tracked files) even though the authoritative code has been promoted to the repo root. The `.git` directory lives at `D:/Coding/Keif/`, making the root the actual repo. `brewos-engine/` contains full duplicate copies of `brewos/`, `keif-mobile/`, `.planning/codebase/`, and review documents.
- Files: `brewos-engine/brewos/` (all solver/method/model/util files), `brewos-engine/keif-mobile/` (full mobile app), `brewos-engine/.planning/codebase/` (7 stale codebase docs)
- Impact: Every `git ls-files` operation returns 96 paths under `brewos-engine/`  alongside the true root files. New developers, CI, and the Docker build all need to know which copy is authoritative. The Dockerfile at root correctly copies `brewos/` (not `brewos-engine/brewos/`), so Docker is correct — but the tracked duplicate is misleading.
- Fix approach: Verify the two `brewos/` trees are identical (confirmed: `diff -rq` returns no output), then run `git rm -r --cached brewos-engine/` to stop tracking it. Either delete the directory or add it to `.gitignore`. Update `brewos-engine/.planning/codebase/` paths to point to root equivalents.

**keif-mobile/ stub at root has no app code:**
- Issue: `D:/Coding/Keif/keif-mobile/` exists but contains only `node_modules/`. The full mobile app lives at `D:/Coding/Keif/brewos-engine/keif-mobile/`. The stub directory is untracked (appears in `git status` as `?? keif-mobile/`).
- Files: `D:/Coding/Keif/keif-mobile/` (untracked, stub only), `D:/Coding/Keif/brewos-engine/keif-mobile/` (tracked, full Expo app)
- Impact: Running `expo start` or `npm install` from `D:/Coding/Keif/keif-mobile/` silently fails or targets wrong source. The `.gitignore` at root does not exclude `keif-mobile/`, so it shows as untracked noise.
- Fix approach: Either remove the stub directory or promote the full mobile app to `D:/Coding/Keif/keif-mobile/` to match the engine layout. Add `keif-mobile/` to `.gitignore` if the stub is intentionally empty.

**CLAUDE.md project instructions reference outdated repo root:**
- Issue: `CLAUDE.md` lines 19, 217–226 instruct all git operations to `cd` to `brewos-engine/`, list the repo root as `D:\Coding\Keif\brewos-engine\`, and describe the engine as `brewos-engine/brewos/`. The actual git repo root is `D:/Coding/Keif/`.
- Files: `D:/Coding/Keif/CLAUDE.md` (lines 19, 200, 217–226)
- Impact: Any agent or developer following CLAUDE.md will `cd` into a non-repo subdirectory before running git commands, producing "not a git repository" errors or accidentally targeting the wrong working tree.
- Fix approach: Update CLAUDE.md to set repo root to `D:\Coding\Keif\`, engine path to `brewos/`, mobile path to `brewos-engine/keif-mobile/` (until mobile is promoted), and remove the `cd brewos-engine/` instruction.

**Stale codebase docs under brewos-engine/.planning/codebase/:**
- Issue: `brewos-engine/.planning/codebase/` contains 7 tracked codebase analysis files (ARCHITECTURE.md, CONCERNS.md, CONVENTIONS.md, INTEGRATIONS.md, STACK.md, STRUCTURE.md, TESTING.md) that pre-date the repo restructure. These conflict with the authoritative docs in `D:/Coding/Keif/.planning/codebase/` (local-only, not committed).
- Files: `brewos-engine/.planning/codebase/*.md` (7 files, all tracked in git)
- Impact: `gsd:plan-phase` and `gsd:execute-phase` load from `.planning/codebase/` relative to the working directory. If cwd is `brewos-engine/`, the stale docs are loaded. The old CONCERNS.md describes solvers as "stubs" when they are now fully implemented.
- Fix approach: Remove `brewos-engine/.planning/codebase/` from git tracking (`git rm -r --cached brewos-engine/.planning/`) as part of the same cleanup that removes `brewos-engine/brewos/`.

---

## Tech Debt

**BREWOS-TODO-001 — Liang 2021 equilibrium anchor is a post-hoc scale factor:**
- Issue: The immersion solver applies a linear scale factor after the ODE solve to force the final EY to match `K_liang × E_max = 0.2151`. This is not a physical model of re-adsorption or equilibrium — it multiplies the entire concentration array by a constant derived from the raw terminal value.
- Files: `brewos/solvers/immersion.py` lines 144–150, `brewos/utils/params.py` line 23
- Impact: The kinetic curve shape is preserved but the absolute values are rescaled by construction. The model cannot extrapolate reliably to brew ratios or temperatures not seen during calibration. The scale factor is ~1.0 for the standard scenario but may diverge significantly at high/low brew ratios. Validation passes by construction, not by physics.
- Fix approach: Replace post-hoc scaling with a proper equilibrium boundary condition in the ODE system (backward flux term proportional to `K_liang`). Validate against time-series data, not just the endpoint.

**Maille 2021 biexponential parameters are calibrated to a single scenario:**
- Issue: The fast-mode biexponential constants (`_A1_DEFAULT=0.6201`, `_TAU1_DEFAULT=3.14`, `_TAU2_DEFAULT=103.02` in `brewos/solvers/immersion.py` lines 26–29) were fit to one scenario: 15g/250g/93C/medium/240s at 500µm. Similarly, moka pot constants (`A1_MOKA`, `TAU1_MOKA`, `TAU2_MOKA`) and percolation constants are manually set without a fitting procedure.
- Files: `brewos/solvers/immersion.py` lines 21–29, `brewos/solvers/pressure.py` lines 37–39, `brewos/solvers/percolation.py` (fast-mode constants)
- Impact: Fast mode EY% may diverge significantly from accurate mode for inputs that differ from the calibration scenario (extreme grind sizes, high-altitude water temps, very long/short brew times). No tolerance bounds are computed or advertised.
- Fix approach: Fit biexponential constants to a grid of accurate-mode outputs (brew ratio × temperature × grind size), or document the valid input range and emit a warning when inputs fall outside it.

**EY target constants are method-level magic numbers without published calibration:**
- Issue: `EY_TARGET_MOKA_PCT = 18.0` (`brewos/solvers/pressure.py` line 46), `EY_TARGET_PERCOLATION_PCT = 20.0` (`brewos/solvers/percolation.py` line 42), and related targets in espresso/aeropress method defaults are hardcoded. These are described as "mid-range" or citing a single paper scenario, not derived from a calibration dataset.
- Files: `brewos/solvers/pressure.py` lines 44–46, `brewos/solvers/percolation.py` lines 40–42, `brewos/methods/espresso.py`, `brewos/methods/aeropress.py`
- Impact: The Liang-style scale factor forces every simulation toward these targets regardless of input parameters. A 7-bar espresso and a 9-bar espresso will produce the same equilibrium EY. Sensitivity to pressure input is masked.
- Fix approach: Derive EY targets from published datasets per method (Batali 2020 for V60, SCAA espresso guidelines for espresso). Make targets a function of brew ratio and pressure rather than constants.

**CO2 bloom model has no strong literature source:**
- Issue: `brewos/utils/co2_bloom.py` implements a bi-exponential degassing model attributed to Smrke et al. (2018), but the session log from 2026-03-25 explicitly records: "CO2 Degassing / Bloom Phase — NO STRONG SOURCE FOUND" and links to `DECISION-002_co2_degassing_bloom.md`. The `beta` suppression factors (0.15/0.20/0.25 per roast level) and `_BLOOM_DECAY_TAU = 15.0s` appear to be estimated.
- Files: `brewos/utils/co2_bloom.py`, `brewos/solvers/immersion.py` lines 9, 96–101, `brewos/solvers/pressure.py` lines 165–173, `brewos/solvers/percolation.py`
- Impact: CO2 bloom modifier is applied to `kB` in all solvers when `bean_age_days` is set. If parameter estimates are wrong, fresh-bean simulations are systematically biased. The feature is silently enabled with no warning to callers.
- Fix approach: Mark CO2 bloom parameters with a clear "ESTIMATED — NOT FROM LITERATURE" comment. Add a warning to `SimulationOutput.warnings` when `bean_age_days` is set and `bean_age_days < 14`. Track down Smrke 2018 to verify or replace parameters.

**puck_resistance returns None in immersion and pressure solvers:**
- Issue: `compute_puck_resistance` is imported in all three solvers but `brewos/solvers/immersion.py` (lines 194, 264) and `brewos/solvers/pressure.py` (lines 329, 405) pass `puck_resistance=None` unconditionally. Only `brewos/solvers/percolation.py` calls the function.
- Files: `brewos/solvers/immersion.py` lines 194, 264; `brewos/solvers/pressure.py` lines 329, 405; `brewos/utils/output_helpers.py` lines 211–223
- Impact: Espresso simulations (which use the pressure solver) always return `puck_resistance=None`, making `OUT-12` non-functional for the method it was designed for. The mobile results screen may display nothing for puck resistance on espresso runs.
- Fix approach: Call `compute_puck_resistance` in the pressure solver accurate and fast paths with the espresso-specific porosity and `pressure_bar` from `SimulationInput`.

**extraction_uniformity_index is None in pressure and fast percolation paths:**
- Issue: `brewos/solvers/pressure.py` lines 326, 402 always set `extraction_uniformity_index=None`. The percolation fast path (`brewos/solvers/percolation.py` line 328) also sets it to None. Only the percolation accurate path computes it from spatial variance.
- Files: `brewos/solvers/pressure.py` lines 326, 402; `brewos/solvers/percolation.py` line 328
- Impact: `OUT-07` (EUI) is silently missing for espresso/moka and for all fast-mode percolation runs. The mobile extended screen may show no EUI value for these methods.
- Fix approach: Implement a simplified EUI for fast percolation (e.g., fixed value based on grind uniformity). For pressure solver, derive EUI from the Moroney/Lee channeling model if available, or propagate from percolation logic.

---

## Security Considerations

**CORS wildcard allows any origin in production:**
- Risk: `brewos/api.py` line 23 sets `allow_origins=["*"]`. This means any website can call the `/simulate` endpoint with a browser request.
- Files: `brewos/api.py` lines 21–27
- Current mitigation: None. The comment says "required for Expo Web" but wildcard origin is broader than needed.
- Recommendations: Lock `allow_origins` to the specific Expo web deployment domain in production. Keep wildcard only for local development via environment variable.

**No authentication or rate limiting on `/simulate`:**
- Risk: `/simulate` accepts arbitrary `SimulationInput` and runs a full ODE solve (up to 4s). An attacker can fire unlimited requests, exhausting CPU on the Koyeb deployment.
- Files: `brewos/api.py` lines 72–75
- Current mitigation: Koyeb free tier limits concurrency implicitly. No explicit rate limiting, API key, or auth middleware exists.
- Recommendations: Add rate limiting middleware (e.g., `slowapi`) before production launch. Consider requiring an `X-API-Key` header for the `/simulate` endpoint.

**scipy and numpy are unpinned in requirements.txt:**
- Risk: `requirements.txt` specifies `scipy` and `numpy` without version bounds. A future `pip install` may pull in a breaking version.
- Files: `D:/Coding/Keif/requirements.txt`, `D:/Coding/Keif/pyproject.toml`
- Current mitigation: `pyproject.toml` also lacks version pins for scipy/numpy.
- Recommendations: Pin both packages (e.g., `scipy>=1.11,<2.0`, `numpy>=1.24,<3.0`). Add a lockfile or use `pip-compile` for reproducible deployments.

---

## Performance Bottlenecks

**Radau ODE solver with dense time evaluation at 100 points:**
- Problem: All accurate-mode solvers call `solve_ivp` with `t_eval=np.linspace(0, t_end, 100)`, `method='Radau'`, `rtol=1e-6`, `atol=1e-8`. Radau is a stiff solver appropriate for this system but produces 100 output points regardless of brew time.
- Files: `brewos/solvers/immersion.py` solve call, `brewos/solvers/percolation.py` solve call, `brewos/solvers/pressure.py` solve call
- Cause: 100 is a reasonable default but not adaptive. Short brew times (e.g., 30s espresso) over-resolve; long brew times (e.g., 600s cold brew equivalent) under-resolve.
- Improvement path: Adaptive `n_points = max(50, int(brew_time / 2))` capped at 200. Profile wall-clock time across all 6 methods to verify 4s SLA.

**No simulation result caching:**
- Problem: Identical `SimulationInput` payloads trigger a full ODE solve on each request. The engine has no memoization layer.
- Files: `brewos/api.py` `/simulate` endpoint
- Cause: No Redis or in-memory cache is configured.
- Improvement path: Add LRU cache keyed on `SimulationInput.model_dump()` hash for fast mode. Fast mode runs are deterministic and < 1ms; caching eliminates redundant computation entirely for repeated inputs.

---

## Fragile Areas

**Liang scaling denominator has a near-zero guard but no physics check:**
- Files: `brewos/solvers/immersion.py` line 149 (`if EY_raw_frac > 1e-6 else 1.0`)
- Why fragile: If the ODE produces very low raw EY (e.g., near-zero extraction due to extreme parameters), the scale factor becomes enormous and the output values are non-physical but technically valid Pydantic models. No warning is emitted.
- Safe modification: Add an assertion or warning when `scale_factor > 5.0` (implying raw EY is less than 20% of expected). Emit a `SimulationOutput.warnings` entry.
- Test coverage: No test for scale factor blow-up with extreme inputs (e.g., 1°C water, 1g dose).

**Moka pot ODE uses fixed geometry constants regardless of SimulationInput:**
- Files: `brewos/solvers/pressure.py` lines 51–62 (`PRESSURE_DEFAULTS`)
- Why fragile: `m_water_g`, `bed_depth_m`, and `Q_heater_W` are hardcoded to 3-cup Bialetti geometry. A user passing `water_amount=100` (1-cup) still runs the ODE with `m_water_g=150`. The `method_defaults` override mechanism exists but is only used internally by `brewos/methods/moka_pot.py`.
- Safe modification: Map `SimulationInput.water_amount` to override `PRESSURE_DEFAULTS["m_water_g"]` before solving. Document that moka pot geometry is currently fixed to a single device.
- Test coverage: `tests/test_moka_pot.py` exists but likely does not test geometry-parameter mismatch.

**AeroPress hybrid path duplicates immersion biexponential without shared calibration:**
- Files: `brewos/methods/aeropress.py`, `brewos/solvers/immersion.py` lines 35–48 (`_biexponential_steep`)
- Why fragile: AeroPress uses a private helper `_biexponential_steep` that runs biexponential extraction then applies a percolation-style press phase. The constants `_A1_DEFAULT`, `_TAU1_DEFAULT`, `_TAU2_DEFAULT` from the immersion module are shared, but the press phase parameters in `aeropress.py` are independent. Changes to immersion constants will not automatically update AeroPress behavior.
- Safe modification: Extract AeroPress-specific constants to `brewos/methods/aeropress.py` with explicit documentation that they are decoupled from immersion defaults.

---

## Deployment Gaps

**Dockerfile builds from Python 3.12 but pyproject.toml requires Python 3.11+:**
- Issue: `Dockerfile` line 1 uses `python:3.12-slim` while `pyproject.toml` specifies `requires-python = ">=3.11"`. These are compatible but inconsistent. A future `>=3.12` constraint change in pyproject.toml may go unnoticed.
- Files: `D:/Coding/Keif/Dockerfile` line 1, `D:/Coding/Keif/pyproject.toml` line 8
- Fix approach: Add a comment in the Dockerfile cross-referencing the Python version constraint in `pyproject.toml`. Pin both to the same minor version.

**API base URL has two hardcoded fallback values in two files:**
- Issue: `brewos-engine/keif-mobile/constants/api.ts` line 4 falls back to `"https://keif-api.koyeb.app"`. `brewos-engine/keif-mobile/app.config.ts` line 12 falls back to `"https://entire-ursa-4keif2-d4539572.koyeb.app"`. These are different URLs. The `api.ts` fallback is never reached in practice because `app.config.ts` always provides `EXPO_PUBLIC_API_URL` via `extra`, but the inconsistency indicates stale configuration.
- Files: `brewos-engine/keif-mobile/constants/api.ts` line 4, `brewos-engine/keif-mobile/app.config.ts` line 12
- Fix approach: Remove the fallback in `api.ts` and rely solely on `app.config.ts`. If the Koyeb URL changes, only one file needs updating.

**No health check documentation for production deployment:**
- Issue: The `/health` endpoint exists (`brewos/api.py` line 67–69) and the mobile `useHealthCheck` hook polls it, but there is no documented deployment runbook, no `docker-compose.yml`, and no CI/CD pipeline. The deployment target (Koyeb) is implied by the hardcoded URL but not documented in the repo.
- Files: `D:/Coding/Keif/Dockerfile`, `D:/Coding/Keif/brewos/api.py`
- Fix approach: Add a `docker-compose.yml` for local development (`docker compose up` → engine on port 8000). Document the Koyeb deployment steps in `README.md`. Add a GitHub Actions workflow for Docker build and push on push to `main`.

---

## Test Coverage Gaps

**Grinder DB loader not tested for missing or out-of-range settings:**
- What's not tested: `load_grinder()` error paths — grinder name not found, setting below `clicks_range[0]`, setting above `clicks_range[1]`
- Files: `brewos/grinders/__init__.py`, `tests/test_grinder_db.py` (exists but may not cover error paths)
- Risk: A mobile user entering an unsupported grinder/setting combination gets an unhandled 500 rather than a clean 422.
- Priority: Medium

**API endpoint error handling not integration-tested end-to-end:**
- What's not tested: HTTP 422 validation error response format, CORS headers, method dispatch for all 6 methods via the FastAPI app
- Files: `tests/test_api.py` (exists; depth unknown), `brewos/api.py`
- Risk: Validation error handler (`validation_exception_handler`) may not format errors as expected by the mobile `apiClient`. Silent format mismatches cause parsing errors in the app.
- Priority: High — verify `test_api.py` covers all 6 method dispatches and the 422 response shape.

**CO2 bloom modifier has no edge-case tests:**
- What's not tested: `bean_age_days=0` (just-roasted), `bean_age_days=365` (fully degassed), unknown roast level string
- Files: `brewos/utils/co2_bloom.py`, `tests/test_co2_bloom.py` (exists)
- Risk: `bean_age_days=0` produces `age_s=0` which gives `residual=1.0` (maximum suppression). Depending on `beta`, `kB_eff` could drop near zero, causing near-zero extraction with no warning.
- Priority: Medium

**Fast/accurate mode consistency not validated across all 6 methods:**
- What's not tested: Fast and accurate modes produce EY within a documented tolerance (e.g., ±3%) for the same input
- Files: `tests/test_fast_mode.py` (exists), `tests/test_cross_method_tolerance.py` (exists)
- Risk: Biexponential fast mode is calibrated to one scenario. For edge inputs, fast mode may return EY that contradicts accurate mode by >10%.
- Priority: Medium

---

*Concerns audit: 2026-04-01*
