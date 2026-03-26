# Phase 1: Immersion Solver + Core Engine - Research

**Researched:** 2026-03-26
**Domain:** Scientific Python ODE solving, coffee extraction physics, Pydantic data models
**Confidence:** HIGH

## Summary

Phase 1 promotes the existing PoC (a monolithic script `poc/moroney_2016_immersion_ode.py`) into a production engine with proper separation of concerns: an immersion solver module (accurate + fast modes), a French Press method config, grinder database infrastructure, CO2 bloom modifier, and complete 7-field SimulationOutput assembly. The scaffold is already in place -- Pydantic input/output models exist with correct field definitions, directory structure is established, and one passing smoke test validates the PoC.

The core physics is well-understood: Moroney 2016 3-ODE immersion system is fully implemented in the PoC with validated equilibrium scaling (Liang 2021 K=0.717). The main engineering work is: (1) refactoring the PoC into the solver module, (2) implementing Maille 2021 biexponential fast mode, (3) building the CO2 bloom modifier as a multiplicative rate correction, (4) populating the Comandante C40 grinder preset with real PSD data, (5) implementing generic log-normal PSD fallback, and (6) assembling all 7 output fields including flavor profile estimation.

**Primary recommendation:** Extract the PoC's physics code directly into `brewos/solvers/immersion.py` as two functions (`solve_accurate` and `solve_fast`), both returning `SimulationOutput`. The PoC's parameter derivation logic becomes a shared utility. CO2 bloom is a time-dependent multiplier on kB (surface dissolution rate), not a structural ODE change.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOLV-01 | Immersion solver (Moroney 2016 3-ODE) integrated with SimulationInput/Output contract | PoC code is fully validated; refactor into `immersion.py` with `solve_accurate()` taking `SimulationInput` and returning `SimulationOutput` |
| SOLV-02 | Fast mode: Maille 2021 biexponential kinetics (< 1ms), Liang 2021 equilibrium anchor | Biexponential: `EY(t) = EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))` where EY_eq = K_liang * E_max; tau1 ~ 10-30s (surface), tau2 ~ 120-300s (kernel); fit A1, A2, tau1, tau2 from accurate mode reference curve |
| SOLV-07 | Liang 2021 equilibrium scaling K=0.717 applied post-solve | Already implemented in PoC: `scale_factor = (K_liang * E_max) / EY_raw_final`; apply to c_h trajectory |
| SOLV-08 | All solvers clip state variables to physical bounds [0, c_sat] | Already implemented in PoC ODE function: `max(0.0, min(var, bound))` pattern |
| METH-01 | French Press method configures immersion solver | French Press = immersion solver with standard steep parameters; method module selects solver and provides defaults |
| OUT-01 | TDS% and EY% for final brew state | Direct from solver: `TDS% = c_h_final / rho_w * 100`, `EY% = TDS% * R_brew` (dilute approx) |
| OUT-02 | Time-resolved extraction curve | Solver already produces `t_eval` array with EY% at each time point; wrap as `List[ExtractionPoint]` |
| OUT-03 | Particle size distribution curve from grinder preset or generic log-normal | Grinder DB returns bimodal PSD for presets; `psd.py` generates log-normal for manual micron input |
| OUT-04 | Flavor profile {sour, sweet, bitter} normalized 0-1 | Empirical mapping from EY%: under-extracted = sour-dominant, ideal = sweet-dominant, over-extracted = bitter-dominant; based on SCA extraction order |
| OUT-05 | Brew ratio used and recommendation | Computed from input: `R = water_amount / coffee_dose`; recommend if outside 15:1-18:1 for immersion |
| OUT-06 | Warnings list | Check: over-extraction (EY > 22%), under-extraction (EY < 18%), extreme brew ratio, temperature outside 90-96C range |
| OUT-09 | CO2 bloom modifier (Smrke 2018 bi-exponential) | Multiplicative correction on kB during bloom window: `kB_eff(t) = kB * (1 - beta * f_CO2(t))` where `f_CO2(t) = A_fast*exp(-t/tau_fast) + A_slow*exp(-t/tau_slow)`; parameterized by roast level |
| GRND-01 | Grinder database loader | JSON-based lookup: `load_grinder(name, setting)` returns median particle size + full PSD array |
| GRND-02 | Comandante C40 MK4 preset complete | Populate JSON with ~30 microns/click settings, bimodal PSD params (fines peak ~30-50um, main peak varies by setting) |
| GRND-11 | Generic log-normal PSD fallback | When only `grind_size` (um) is provided: generate log-normal with `mu=ln(grind_size)`, `sigma` estimated from typical grinder spread |
| VAL-01 | Accurate-mode immersion reproduces Liang 2021 EY% within +/-1.5% RMSE | Standard test: 15g/250g/93C/medium/4min; target EY ~ 21.51%; already passing in PoC |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scipy | 1.16.3 (installed; 1.17.1 latest) | `solve_ivp` with Radau method for stiff 3-ODE system | Only production-grade Python ODE solver; Radau handles stiffness in Moroney system |
| numpy | 2.4.0 (installed; 2.4.3 latest) | Array operations, linspace, log-normal distribution | Required by scipy; standard for scientific Python |
| pydantic | 2.12.5 (installed; latest) | Input/Output model validation | Locked by architecture; already in use |
| pytest | 9.0.2 (installed) | Test framework for validation suite | Locked by project config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| time (stdlib) | - | Performance benchmarking for fast mode < 1ms | Fast mode validation |
| json (stdlib) | - | Grinder database JSON loading | Grinder preset lookup |
| math (stdlib) | - | Log-normal PSD computation | Generic PSD fallback |
| pathlib (stdlib) | - | Cross-platform file path resolution for grinder JSON | Grinder DB loader |

**No additional packages needed.** All dependencies are already installed and current.

## Architecture Patterns

### Project Structure (within `brewos-engine/`)
```
brewos/
    solvers/
        __init__.py
        immersion.py          # solve_accurate() + solve_fast() -- MAIN WORK
    methods/
        __init__.py
        french_press.py       # Method config: selects immersion solver, default params
    models/
        __init__.py
        inputs.py             # SimulationInput -- EXISTS, may need bloom_time field
        outputs.py            # SimulationOutput -- EXISTS, complete for Phase 1
    grinders/
        __init__.py           # load_grinder(name, setting) function
        comandante_c40_mk4.json  # Populated with real PSD data
    utils/
        __init__.py
        psd.py                # generate_lognormal_psd(), bimodal PSD utilities
        co2_bloom.py          # Smrke 2018 CO2 degassing modifier (NEW)
        params.py             # Shared parameter derivation from PoC (NEW)
tests/
    __init__.py
    test_immersion_poc.py     # EXISTS -- keep as regression
    test_immersion_solver.py  # NEW: accurate mode + Liang validation
    test_fast_mode.py         # NEW: biexponential + performance benchmark
    test_grinder_db.py        # NEW: loader + C40 + fallback
    test_co2_bloom.py         # NEW: bloom modifier unit tests
    test_french_press.py      # NEW: end-to-end method test with 7 outputs
```

### Pattern 1: Solver Function Signature
**What:** Each solver exposes a top-level function taking `SimulationInput` and returning `SimulationOutput`.
**When to use:** All solver modules follow this pattern.
**Example:**
```python
# brewos/solvers/immersion.py
from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput

def solve_accurate(inp: SimulationInput) -> SimulationOutput:
    """Moroney 2016 3-ODE immersion solver with Liang K=0.717 scaling."""
    ...

def solve_fast(inp: SimulationInput) -> SimulationOutput:
    """Maille 2021 biexponential immersion solver."""
    ...
```

### Pattern 2: Parameter Derivation Module
**What:** Extract the PoC's parameter calculation (phi_h from brew ratio, phi_c0 from IC constraint, rate coefficients kA/kB/kC/kD) into a shared utility.
**When to use:** Both accurate and fast modes need derived physical parameters.
**Example:**
```python
# brewos/utils/params.py
def derive_immersion_params(coffee_dose_g: float, water_amount_g: float,
                            water_temp_c: float, grind_size_um: float) -> dict:
    """Derive Moroney ODE rate coefficients from brew parameters.
    Returns dict with kA, kB, kC, kD, phi_h, c_sat, rho_w, etc."""
    ...
```

### Pattern 3: CO2 Bloom as Rate Modifier
**What:** CO2 bloom modifies the surface dissolution rate (kB) multiplicatively during the bloom window, not the ODE structure.
**When to use:** When roast_level is provided and bean_age_days is recent (< 14 days default).
**Example:**
```python
# brewos/utils/co2_bloom.py
def co2_bloom_factor(t: float, roast_level: str, bean_age_days: float = 7.0) -> float:
    """Smrke 2018 bi-exponential CO2 correction factor.
    Returns multiplier in [0, 1] to apply to kB.
    At t=0 (bloom start), factor is low (CO2 blocks extraction).
    As CO2 degasses, factor approaches 1.0."""
    # f_CO2(t) = A_fast * exp(-t / tau_fast) + A_slow * exp(-t / tau_slow)
    # kB_effective = kB * (1 - beta * f_CO2(t))
    ...
```

### Pattern 4: Flavor Profile from EY%
**What:** Map extraction yield to sour/sweet/bitter scores using SCA extraction order.
**When to use:** Output assembly for every simulation.
**Example:**
```python
# Empirical mapping based on SCA extraction order:
# Under-extracted (EY < 18%): acids dominate -> sour high, sweet low, bitter low
# Ideal (18-22%): sugars dominate -> sour moderate, sweet high, bitter low
# Over-extracted (EY > 22%): bitter compounds dominate -> sour low, sweet moderate, bitter high
def estimate_flavor_profile(ey_percent: float) -> FlavorProfile:
    """Piecewise linear interpolation of flavor axes from EY%."""
    ...
```

### Anti-Patterns to Avoid
- **Hardcoding physics constants inside the ODE function:** Constants should be module-level or in a params dict, not buried in closures. The PoC does this correctly.
- **Running the ODE solver to infinity (t=3600s):** For the engine, use `brew_time` from SimulationInput (e.g., 240s for French Press), not 1 hour.
- **Modifying the ODE state vector for CO2:** The bloom modifier is multiplicative on rate coefficients, not an additional state variable. Zero structural ODE changes.
- **Building a class hierarchy for solvers:** The architecture specifies function-based solvers, not class-based. Keep it simple.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ODE integration | Custom Euler/RK4 stepper | `scipy.integrate.solve_ivp(method='Radau')` | Stiff system needs implicit solver; hand-rolled RK4 will diverge or require tiny timesteps |
| Log-normal distribution | Manual PDF formula | `numpy.random.lognormal` or `scipy.stats.lognorm` | Edge cases in normalization, CDF computation |
| JSON schema validation | Manual dict checking | Pydantic model for grinder data (or simple dict with key checks) | Already using Pydantic everywhere; consistent error handling |
| Performance timing | `datetime.now()` differences | `time.perf_counter_ns()` | Nanosecond resolution needed for < 1ms benchmark |

## Common Pitfalls

### Pitfall 1: Stiff ODE Solver Selection
**What goes wrong:** Using `method='RK45'` (default) for the Moroney system leads to extremely slow convergence or outright failure because the system has disparate timescales (surface dissolution is fast, kernel diffusion is slow).
**Why it happens:** RK45 is explicit and cannot handle stiffness.
**How to avoid:** Always use `method='Radau'` (implicit Runge-Kutta) with `rtol=1e-8, atol=1e-10` as the PoC does.
**Warning signs:** solve_ivp returns `success=False` or takes > 10 seconds for a 240s brew.

### Pitfall 2: Sign Error in dc_v
**What goes wrong:** Writing `dc_v = -kC * (c_h - c_v)` instead of `dc_v = +kC * (c_h - c_v)`. The PoC documents this as a Phase 7 bug that caused EY_raw = 179%.
**Why it happens:** Confusion about diffusion direction: coffee diffuses FROM grain (c_v) TO bulk (c_h), so c_v should DECREASE as c_h increases, but the Moroney formulation writes it as dc_v = +kC*(c_h - c_v) because c_h < c_v initially.
**How to avoid:** Copy the ODE function verbatim from the validated PoC. Add a comment referencing the Phase 8 sign correction.
**Warning signs:** EY > 30% or c_v increasing instead of decreasing.

### Pitfall 3: phi_h Hardcoding
**What goes wrong:** Using Moroney's published phi_h = 0.8272 (which is for a dense batch with different brew ratio) instead of computing it dynamically from the actual brew ratio.
**Why it happens:** The paper's Table 1 value doesn't match typical home brewing scenarios.
**How to avoid:** Always compute `phi_h = V_water / (V_water + V_coffee_apparent)` dynamically. The PoC corrected this in Phase 8.
**Warning signs:** TDS% wildly off from expected ~1.3% for standard scenario.

### Pitfall 4: EY Formula for Dilute vs Concentrated
**What goes wrong:** Using concentrated formula `EY = (TDS * (water + coffee)) / coffee` when dilute approximation `EY = TDS% * R_brew` suffices.
**Why it happens:** Multiple EY formulas exist in the literature.
**How to avoid:** For TDS < 2% (which is true for all immersion brewing), `EY% = TDS% * R_brew` is accurate to within 2% relative error. The PoC uses this.
**Warning signs:** Systematic EY offset of 0.5-1% from expected values.

### Pitfall 5: Biexponential Fast Mode Calibration
**What goes wrong:** Using arbitrary tau values for the biexponential model instead of fitting them to the accurate mode output.
**Why it happens:** Maille 2021 provides a framework but not universal constants; tau values depend on grind size, temperature, and roast level.
**How to avoid:** Pre-compute a reference accurate-mode curve for a standard scenario and fit `A1, A2, tau1, tau2` using `scipy.optimize.curve_fit`. Store fitted defaults, allow temperature/grind corrections.
**Warning signs:** Fast mode EY deviates from accurate mode by more than 2%.

### Pitfall 6: CO2 Bloom Beta Values
**What goes wrong:** Over-estimating CO2 extraction suppression, causing simulated extraction to be unrealistically low during bloom.
**Why it happens:** The beta (extraction suppression factor) values are first-order estimates (noted as LOW confidence in STATE.md). Published data quantifies gas volume, not extraction suppression directly.
**How to avoid:** Start with conservative beta values (0.1-0.3 range), verify that the bloom correction doesn't reduce total EY by more than 1-2% absolute for a typical medium roast. Make beta easily adjustable.
**Warning signs:** EY drops by > 3% when bloom modifier is enabled vs disabled.

## Code Examples

### Moroney 2016 ODE System (from validated PoC)
```python
# Source: brewos-engine/poc/moroney_2016_immersion_ode.py (lines 106-116)
def moroney_ode(t, y):
    c_h, c_v, psi_s = y
    c_h   = max(0.0, min(c_h,   c_sat))   # SOLV-08: bound clipping
    c_v   = max(0.0, min(c_v,   c_sat))
    psi_s = max(0.0, min(psi_s, 1.0))

    dc_h   = -kA * (c_h - c_v) + kB * (c_sat - c_h) * psi_s
    dc_v   =  kC * (c_h - c_v)   # POSITIVE sign -- Phase 8 correction
    dpsi_s = -kD * (c_sat - c_h) * psi_s

    return [dc_h, dc_v, dpsi_s]
```

### Liang 2021 Equilibrium Scaling (from validated PoC)
```python
# Source: brewos-engine/poc/moroney_2016_immersion_ode.py (lines 161-182)
K_liang = 0.717         # Equilibrium desorption constant
E_max   = 0.30          # Maximum achievable extraction yield (fraction)
EY_target_frac = K_liang * E_max  # 0.2151

if EY_raw_frac > 1e-6:
    scale_factor = EY_target_frac / EY_raw_frac
else:
    scale_factor = 1.0

c_h_scaled = c_h_raw * scale_factor
TDS_pct = c_h_scaled / rho_w * 100.0
EY_pct  = TDS_pct * R_brew
```

### Biexponential Fast Mode (Maille 2021 pattern)
```python
# Pattern for fast mode -- to be implemented
# EY(t) = EY_eq * (1 - A1 * exp(-t/tau1) - A2 * exp(-t/tau2))
# Where:
#   EY_eq = K_liang * E_max * 100 = 21.51%
#   tau1 ~ 10-30s  (fast surface dissolution)
#   tau2 ~ 120-300s (slow kernel diffusion)
#   A1 + A2 = 1 (constraint: EY(0) = 0)
#
# Calibration: fit to accurate-mode curve via scipy.optimize.curve_fit
import numpy as np

def biexponential_ey(t: np.ndarray, ey_eq: float,
                     a1: float, tau1: float, tau2: float) -> np.ndarray:
    a2 = 1.0 - a1
    return ey_eq * (1.0 - a1 * np.exp(-t / tau1) - a2 * np.exp(-t / tau2))
```

### CO2 Bloom Modifier (Smrke 2018 pattern)
```python
# Pattern for CO2 bloom -- to be implemented
# CO2 degassing: f(t) = A_fast * exp(-t/tau_fast) + A_slow * exp(-t/tau_slow)
# Extraction suppression: kB_eff(t) = kB * (1 - beta * f(t))
#
# Roast-dependent tau values (estimated from Smrke 2018):
CO2_PARAMS = {
    "light":  {"tau_fast": 1800, "tau_slow": 86400, "A_fast": 0.4, "A_slow": 0.6, "beta": 0.15},
    "medium": {"tau_fast": 900,  "tau_slow": 43200, "A_fast": 0.5, "A_slow": 0.5, "beta": 0.20},
    "dark":   {"tau_fast": 300,  "tau_slow": 14400, "A_fast": 0.6, "A_slow": 0.4, "beta": 0.25},
}
# Note: These tau values are on the timescale of post-roast degassing (hours/days).
# For BREW-TIME bloom (first 30-60s of pour), use a separate bloom_window
# where trapped CO2 in the grinds physically blocks water contact.
# The bloom suppression factor during brew is the residual CO2 fraction
# at bean_age_days post-roast, decaying over the bloom_time window.
```

### Grinder Database Loader
```python
# Pattern for grinder lookup
import json
from pathlib import Path

GRINDER_DIR = Path(__file__).parent

def load_grinder(name: str, setting: int) -> dict:
    """Load grinder PSD data from JSON.
    Returns: {"median_um": float, "psd": [{"size_um": float, "fraction": float}, ...]}
    """
    filename = name.lower().replace(" ", "_") + ".json"
    path = GRINDER_DIR / filename
    if not path.exists():
        raise ValueError(f"Grinder preset not found: {name}")
    data = json.loads(path.read_text())
    # Find setting in data
    ...
```

### Generic Log-Normal PSD Fallback
```python
# Pattern for fallback PSD when only grind_size (um) is provided
import numpy as np
from scipy.stats import lognorm

def generate_lognormal_psd(median_um: float, sigma: float = 0.5,
                           n_points: int = 50) -> list:
    """Generate log-normal PSD centered on median_um.
    sigma=0.5 is typical spread for a decent burr grinder."""
    sizes = np.linspace(max(1, median_um * 0.1), median_um * 3.0, n_points)
    s = sigma
    scale = median_um
    pdf = lognorm.pdf(sizes, s, scale=scale)
    pdf /= pdf.sum()  # Normalize to volume fractions summing to 1
    return [{"size_um": float(sz), "fraction": float(f)} for sz, f in zip(sizes, pdf)]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single EY formula (various) | Dilute approx `EY% = TDS% * R_brew` | PoC Phase 8 | Correct for TDS < 2%; simpler and accurate |
| Hardcoded phi_h from paper | Dynamic phi_h from brew ratio | PoC Phase 8 | Correct for arbitrary dose/water ratios |
| Raw Moroney ODE endpoint | Liang 2021 K=0.717 scaling | PoC Phase 8 | Anchors EY to empirically validated equilibrium |
| Matplotlib validation plots | pytest-based assertion suite | Phase 1 (planned) | Reproducible automated validation |

## Open Questions

1. **Maille 2021 Biexponential Calibration**
   - What we know: The fast mode uses a biexponential `EY(t) = EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))` model. The shape parameters must be calibrated to match the accurate mode.
   - What's unclear: Exact tau1, tau2 values for different grind sizes and temperatures. Maille provides the framework, not universal constants.
   - Recommendation: Run accurate mode for the standard scenario (15g/250g/93C/medium/240s), fit biexponential via `scipy.optimize.curve_fit`, store fitted defaults. Verify fast mode is within +/-2% of accurate at t=240s.

2. **CO2 Bloom Beta Values**
   - What we know: Smrke 2018 quantifies CO2 volume by roast level. Darker roasts degas faster (tau_fast ~ 5 min for dark vs ~30 min for light).
   - What's unclear: The extraction suppression factor beta (how much CO2 actually blocks extraction) is an estimate. STATE.md notes this as LOW confidence.
   - Recommendation: Implement with conservative defaults (beta = 0.15-0.25 range). Verify bloom modifier reduces EY by < 2% absolute for medium roast. Flag for post-v1 calibration.

3. **Comandante C40 PSD Data**
   - What we know: ~30 microns/click, range 0-1090um, bimodal distribution (fines peak + main peak). Coffee ad Astra 2023 analysis confirms bimodal/trimodal structure for conical burr grinders.
   - What's unclear: Exact bimodal peak positions and widths per click setting. The JSON preset is currently a placeholder.
   - Recommendation: Use published community data (honestcoffeeguide.com, Basic Barista grind chart) for median-per-click mapping. Model PSD as sum of two log-normals: fines peak at ~40um (fixed) + main peak at `setting * 30um` (varies). Sigma estimated from Coffee ad Astra uniformity data.

4. **Estimated Parameters: phi_v_inf and c_s**
   - What we know: PoC uses `phi_v_inf = 0.40` and `c_s = 1050 kg/m3` marked as "estimated -- not in vault".
   - What's unclear: Whether Moroney 2015 Table 1 contains these values. PROJECT.md notes this as an open question.
   - Recommendation: Use current estimates for v1. Document uncertainty. These affect the scale factor but not the final EY (which is anchored by Liang scaling anyway).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | Engine runtime | Yes | 3.12.5 | -- |
| scipy | ODE solver, curve_fit, lognorm | Yes | 1.16.3 | -- |
| numpy | Array operations | Yes | 2.4.0 | -- |
| pydantic | Input/Output models | Yes | 2.12.5 | -- |
| pytest | Validation suite | Yes | 9.0.2 | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

All required tools are installed and at current versions.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 |
| Config file | `brewos-engine/pyproject.toml` `[tool.pytest.ini_options]` |
| Quick run command | `cd brewos-engine && python -m pytest tests/ -x -q` |
| Full suite command | `cd brewos-engine && python -m pytest tests/ -v` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAL-01 | Accurate mode EY within +/-1.5% of Liang 2021 (15g/250g/93C/medium/240s) | integration | `python -m pytest tests/test_immersion_solver.py::test_accurate_ey_liang -x` | No -- Wave 0 |
| SOLV-01 | Accurate solver returns valid SimulationOutput | unit | `python -m pytest tests/test_immersion_solver.py::test_accurate_output_shape -x` | No -- Wave 0 |
| SOLV-02 | Fast mode < 1ms and within +/-2% of accurate | unit + perf | `python -m pytest tests/test_fast_mode.py -x` | No -- Wave 0 |
| SOLV-07 | Liang scaling applied (EY_eq approx 21.51%) | unit | `python -m pytest tests/test_immersion_solver.py::test_liang_scaling -x` | No -- Wave 0 |
| SOLV-08 | State variables clipped to [0, c_sat] | unit | `python -m pytest tests/test_immersion_solver.py::test_bound_clipping -x` | No -- Wave 0 |
| METH-01 | French Press end-to-end produces 7-field output | integration | `python -m pytest tests/test_french_press.py -x` | No -- Wave 0 |
| OUT-01..06 | All 7 output fields non-null, physically plausible | integration | `python -m pytest tests/test_french_press.py::test_output_completeness -x` | No -- Wave 0 |
| OUT-09 | CO2 bloom modifier applies roast-dependent correction | unit | `python -m pytest tests/test_co2_bloom.py -x` | No -- Wave 0 |
| GRND-01 | Grinder loader returns PSD for Comandante C40 | unit | `python -m pytest tests/test_grinder_db.py::test_comandante_c40 -x` | No -- Wave 0 |
| GRND-02 | Comandante preset has median + bimodal PSD | unit | `python -m pytest tests/test_grinder_db.py::test_c40_bimodal_psd -x` | No -- Wave 0 |
| GRND-11 | Generic log-normal PSD from manual micron input | unit | `python -m pytest tests/test_grinder_db.py::test_lognormal_fallback -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd brewos-engine && python -m pytest tests/ -x -q`
- **Per wave merge:** `cd brewos-engine && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_immersion_solver.py` -- covers SOLV-01, SOLV-07, SOLV-08, VAL-01
- [ ] `tests/test_fast_mode.py` -- covers SOLV-02
- [ ] `tests/test_co2_bloom.py` -- covers OUT-09
- [ ] `tests/test_grinder_db.py` -- covers GRND-01, GRND-02, GRND-11
- [ ] `tests/test_french_press.py` -- covers METH-01, OUT-01 through OUT-06

## Sources

### Primary (HIGH confidence)
- `brewos-engine/poc/moroney_2016_immersion_ode.py` -- Validated PoC with all physics, parameter derivations, and equilibrium scaling
- `brewos-engine/brewos/models/inputs.py` -- Existing SimulationInput contract
- `brewos-engine/brewos/models/outputs.py` -- Existing SimulationOutput contract with all 7 core fields
- [Liang et al. 2021 -- Scientific Reports](https://www.nature.com/articles/s41598-021-85787-1) -- Equilibrium desorption model, K=0.717, E_max=0.30
- SciPy solve_ivp documentation -- Confirmed Radau method availability and API (verified locally)

### Secondary (MEDIUM confidence)
- [Smrke et al. 2018 -- J. Agric. Food Chem.](https://pubs.acs.org/doi/10.1021/acs.jafc.7b03310) -- CO2 degassing gravimetric method; confirms bi-exponential model exists, roast-level dependence confirmed, but exact parameter values not extractable from search results
- [Coffee ad Astra 2023 -- PSD analysis](https://coffeeadastra.com/2023/09/21/what-i-learned-from-analyzing-300-particle-size-distributions-for-24-espresso-grinders/) -- Three-component log-normal model for grinder PSD; Comandante C40 mentioned as "more unimodal" than typical
- [Guinard 2023 -- Brewing Control Chart 2.0](https://ift.onlinelibrary.wiley.com/doi/10.1111/1750-3841.16531) -- Flavor mapping: bitter increases with TDS+EY, sourness with TDS but not EY, sweetness decreases with both
- [Honest Coffee Guide -- Comandante C40 settings](https://honestcoffeeguide.com/comandante-c40-mk4-grind-settings/) -- ~30 microns/click, range 0-1090um
- [Basic Barista -- Comandante grind chart](https://thebasicbarista.com/en-us/blogs/article/comandante-grind-size-chart) -- Click-to-brew-method mapping

### Tertiary (LOW confidence)
- CO2 bloom beta (extraction suppression) values -- First-order estimates; no published data directly links CO2 volume to extraction rate suppression
- Maille 2021 biexponential specific tau values -- Framework is established but universal constants not found in search results; must be calibrated from accurate mode

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All packages installed, versions verified, APIs confirmed
- Architecture: HIGH -- PoC validates the physics; scaffold is in place; pattern is clear
- Pitfalls: HIGH -- All major pitfalls are documented from PoC development history (Phase 7->8 corrections)
- CO2 bloom parameters: LOW -- Beta values are estimates; tau values from Smrke are for post-roast degassing (hours), not brew-time bloom (seconds)
- Biexponential calibration: MEDIUM -- Pattern is clear but specific constants need fitting

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable domain; physics papers don't change)
