# Phase 3: Pressure Solver - Research

**Researched:** 2026-03-27
**Domain:** Moka Pot thermo-fluid ODE + AeroPress hybrid solver (immersion + pressure push)
**Confidence:** MEDIUM

## Summary

Phase 3 implements the final two brew methods: Moka Pot and AeroPress. Per DECISION-010, espresso already uses `percolation.py` (completed in Phase 2), so `pressure.py` is specifically for Moka Pot's unique thermo-fluid physics. AeroPress requires a standalone hybrid solver that chains the existing immersion solver with a short pressure-push phase.

The Moka Pot presents the most novel physics in the project: steam pressure builds in a sealed lower chamber as water heats past 100C, driving flow through the coffee bed only when pressure exceeds bed resistance. This requires a 6-ODE coupled system (temperature, volume extracted, 3 Moroney extraction ODEs, cup accumulation). The model is based on Siregar 2026 for thermodynamic coupling and Moroney 2016 for extraction kinetics. Confidence is MEDIUM-LOW for the thermal parameters (heat loss, heater power) but HIGH for the extraction kinetics (same Moroney framework validated in Phase 1).

AeroPress is architecturally simpler: call `immersion.solve_accurate()` for the steep phase, then apply a short pressure-push extraction increment using Darcy flow through the compressed bed. The key physics insight is that the push phase extracts additional solubles beyond what immersion alone achieves, producing higher total EY than equivalent steep-only.

**Primary recommendation:** Implement pressure.py with `solve_accurate()` and `solve_fast()` for Moka Pot only. AeroPress gets a standalone module (`aeropress.py` in solvers/) that composes immersion + pressure phases. Both share existing Kozeny-Carman and Moroney infrastructure from `utils/params.py`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOLV-05 | Pressure solver (Moroney 2016 ODE + thermal coupling, 6 ODEs) -- accurate mode for Moka Pot | 6-ODE system: T, V_ext, c_h, c_v, psi_s, M_cup. Clausius-Clapeyron for steam pressure. Kozeny-Carman for bed permeability. solve_ivp Radau, ~6 ODEs -> <100ms. |
| SOLV-06 | Pressure solver fast mode: Maille 2021 biexponential with moka-specific lambda calibration | Biexponential with moka-calibrated constants: A1=0.50, tau1=8.0s, tau2=80.0s (shorter than immersion due to pressure driving, longer than espresso due to lower pressure). EY target ~18% (mid-range moka). |
| METH-05 | Moka Pot method: configures pressure solver with steam pressure, stovetop geometry, default thermal params for common pot sizes | MOKA_POT_DEFAULTS dict: 3-cup Bialetti geometry (m_w0=150g, L_bed=5mm, A_bed=0.0038m2, Q_heater=800W). Method type "moka" for brew ratio bounds. |
| METH-06 | AeroPress method: standalone hybrid solver -- immersion steep phase followed by pressure push phase | Compose: (1) immersion.solve_accurate(steep_time) -> steep EY, (2) pressure push via Darcy flow at ~0.5 bar manual pressure through compressed bed for ~30s -> incremental EY. Sum for total. EY_target ~19% (higher than immersion ~21.51% but different dynamics). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scipy | 1.16.3 | solve_ivp with Radau for stiff 6-ODE Moka Pot system | Already in use; Radau handles stiff thermal coupling well |
| numpy | 2.4.0 | Array operations for ODE state vectors | Already in use throughout codebase |
| pydantic | 2.12.5 | SimulationInput/Output validation | Already in use; no changes needed to models |

**No new dependencies required.** Phase 3 uses the exact same stack as Phase 1 and Phase 2.

**Version verification:** Verified against installed versions on dev machine (Python 3.12.5).

## Architecture Patterns

### Recommended Project Structure
```
brewos/
  solvers/
    immersion.py       # (existing) - reused by AeroPress steep phase
    percolation.py     # (existing) - not modified in Phase 3
    pressure.py        # NEW: Moka Pot 6-ODE system (solve_accurate + solve_fast)
  methods/
    moka_pot.py        # NEW: MOKA_POT_DEFAULTS + simulate() dispatcher
    aeropress.py       # NEW: Hybrid solver (immersion steep + pressure push)
  utils/
    params.py          # MODIFIED: add derive_pressure_params() for Moka Pot
    output_helpers.py  # MODIFIED: add "moka" ratio bounds, "aeropress" ratio bounds
```

### Pattern 1: Solver Module Structure (pressure.py)
**What:** Single solver file with `solve_accurate()` and `solve_fast()` entry points, following the pattern established by `immersion.py` and `percolation.py`.
**When to use:** For Moka Pot, which has unique physics requiring its own ODE system.
**Example:**
```python
# pressure.py - follows immersion.py pattern exactly
def solve_accurate(inp: SimulationInput, method_defaults: dict = None) -> SimulationOutput:
    """Moka Pot 6-ODE thermo-fluid system with Moroney extraction kinetics."""
    defaults = dict(PRESSURE_DEFAULTS)
    if method_defaults is not None:
        defaults.update(method_defaults)
    grind_size_um, psd_curve = resolve_psd(inp)
    # ... 6-ODE system ...
    return SimulationOutput(...)

def solve_fast(inp: SimulationInput, method_defaults: dict = None) -> SimulationOutput:
    """Maille 2021 biexponential with moka-calibrated constants."""
    # ... biexponential with moka-specific A1/tau1/tau2 ...
```

### Pattern 2: Method Config (moka_pot.py)
**What:** Method file with DEFAULTS dict and `simulate()` dispatcher, following `v60.py`/`kalita.py`/`espresso.py` pattern.
**When to use:** Standard pattern for all 6 brew methods.
**Example:**
```python
# moka_pot.py - follows v60.py pattern
MOKA_POT_DEFAULTS = {
    "bed_depth_m": 0.005,       # 5mm moka pot filter basket
    "bed_diameter_m": 0.070,    # 3-cup Bialetti
    "porosity": 0.38,
    "method_type": "moka",
    "ey_target_pct": 18.0,      # mid-range moka EY
    # Thermal params (Moka-specific)
    "Q_heater_W": 800.0,        # medium stove burner
    "m_water_g": 150.0,         # 3-cup fill
    "h_loss": 10.0,             # W/(m^2*K) aluminum pot
    "A_surface_m2": 0.020,      # external surface area
    "T_ambient_C": 22.0,
}

def simulate(inp: SimulationInput) -> SimulationOutput:
    if inp.mode.value == "accurate":
        return solve_accurate(inp, method_defaults=MOKA_POT_DEFAULTS)
    else:
        return solve_fast(inp, method_defaults=MOKA_POT_DEFAULTS)
```

### Pattern 3: AeroPress Hybrid Solver (aeropress.py in methods/)
**What:** A standalone method that composes two solver phases rather than delegating to a single solver.
**When to use:** AeroPress is the only method that combines immersion + pressure in sequence.
**Key difference from other methods:** AeroPress calls immersion solver for steep phase, then adds a pressure-push extraction increment. It does NOT delegate to a single solver's `solve_accurate()`.
**Example:**
```python
# aeropress.py - standalone hybrid, NOT a thin dispatcher
from brewos.solvers.immersion import solve_accurate as immersion_accurate, solve_fast as immersion_fast

AEROPRESS_DEFAULTS = {
    "steep_time_s": 60.0,      # typical AeroPress steep
    "push_time_s": 30.0,       # plunge duration
    "push_pressure_bar": 0.5,  # manual hand pressure
    "bed_depth_m": 0.030,      # AeroPress chamber
    "bed_diameter_m": 0.063,   # AeroPress inner diameter
    "porosity": 0.40,
    "method_type": "aeropress",
    "ey_target_pct": 19.0,
}

def simulate(inp: SimulationInput) -> SimulationOutput:
    if inp.mode.value == "accurate":
        return _solve_hybrid_accurate(inp)
    else:
        return _solve_hybrid_fast(inp)
```

### Anti-Patterns to Avoid
- **Putting AeroPress in pressure.py:** AeroPress is not a pressure solver -- it is a hybrid that USES the immersion solver plus a pressure-push increment. Keep it as a standalone method file.
- **Modifying SimulationInput for thermal params:** Moka Pot thermal parameters (Q_heater, h_loss, etc.) go in `method_defaults`, NOT in `SimulationInput`. The input model stays generic across all methods.
- **Sharing ODE state between steep and push phases by pickling solve_ivp state:** Instead, extract final concentrations from steep phase and use them as initial conditions for push phase. Clean handoff, no solver coupling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Steam pressure from temperature | Custom lookup table | Clausius-Clapeyron: `P = P_ref * exp(L_v/R * (1/T_ref - 1/T))` | 3-line formula, textbook physics, accurate to 0.1% in 100-120C range |
| Bed permeability | Custom packing model | `kozeny_carman_permeability()` already in `utils/params.py` | Already validated in Phase 2 percolation solver |
| Extraction kinetics (Moroney ODE) | New rate coefficients | `derive_immersion_params()` from `utils/params.py` | Same kA/kB/kC/kD structure; add advective loss term for pressure flow |
| Biexponential fast mode | New fast mode framework | Same Maille pattern from immersion.py and percolation.py | Only calibration constants differ |
| Output assembly | Custom output builder | `resolve_psd()`, `estimate_flavor_profile()`, `generate_warnings()` from `output_helpers.py` | All shared helpers already tested in Phase 1+2 |

**Key insight:** Phase 3 reuses 80%+ of existing infrastructure. The only genuinely new code is the Moka Pot thermal coupling (Clausius-Clapeyron + energy balance ODE) and the AeroPress phase composition logic.

## Common Pitfalls

### Pitfall 1: Moka Pot ODE Stiffness from Clausius-Clapeyron
**What goes wrong:** The exponential in `P_steam(T)` creates steep gradients when T crosses 100C, causing the ODE solver to take very small steps or fail.
**Why it happens:** Clausius-Clapeyron is exponential; combined with the `max(0, P_steam - P_atm)` discontinuity at extraction onset, the system becomes stiff at the phase transition.
**How to avoid:** Use Radau solver (already standard in project). Add a smooth transition instead of hard `max()`: use `P_net = P_steam - P_atm` with a soft clamp `max(P_net, 0)` applied OUTSIDE the ODE (in post-processing of flow rate). Inside the ODE, let P_net go slightly negative (it will self-correct).
**Warning signs:** solve_ivp returns `success=False` or takes >2s for 6 ODEs.

### Pitfall 2: Water Mass Going Negative in Moka Pot
**What goes wrong:** If `V_extracted` exceeds initial water volume, `m_w(t) = m_w0 - rho_w * V_ext` goes negative, producing NaN in `dT/dt` (division by m_w).
**Why it happens:** No termination event or the ODE overshoots past the event.
**How to avoid:** Use solve_ivp `events` parameter with `terminal=True` to stop when `m_w < 0.05 * m_w0` (5% remaining = strombolian phase onset). Also clamp `m_w` inside the ODE to `max(m_w, 0.01)`.
**Warning signs:** NaN in temperature or extraction yield.

### Pitfall 3: AeroPress Push Phase IC Mismatch
**What goes wrong:** The immersion phase returns `SimulationOutput` (EY%, TDS%) but the push phase needs internal state variables (c_h, c_v, psi_s concentrations) to continue extraction.
**Why it happens:** `immersion.solve_accurate()` only returns the output model, not the raw ODE solution state.
**How to avoid:** Two approaches: (A) Extract final c_h/c_v/psi_s from the immersion ODE by exposing them (preferred -- add a `_solve_internal()` helper that returns both the output AND the raw state), or (B) Reverse-engineer concentrations from EY% and brew ratio (less accurate). Option A is cleaner.
**Warning signs:** Push phase starts from zero extraction instead of building on steep phase.

### Pitfall 4: Moka Pot EY Target Anchor
**What goes wrong:** Using Liang K_liang * E_max = 21.51% as the EY target for Moka Pot produces unrealistic results. Moka pot extracts less efficiently than immersion due to shorter contact time and lower water-to-coffee ratio.
**Why it happens:** Liang 2021 was calibrated for immersion (well-mixed, high ratio, long time). Moka pot is pressure-driven with ratio ~6-10:1 and variable temperature.
**How to avoid:** Use a moka-specific EY target of ~18% (mid-range for typical moka pot extraction). The fast mode biexponential anchors to this target.
**Warning signs:** Moka pot returning EY > 20% (unrealistically high for moka).

### Pitfall 5: AeroPress Push EY Must Exceed Steep-Only EY
**What goes wrong:** If the push phase does not add meaningful extraction, the hybrid result equals the immersion-only result, violating success criterion 3.
**Why it happens:** Push pressure too low, push time too short, or push extraction increment not properly added to steep extraction.
**How to avoid:** Verify in tests that `EY_hybrid > EY_steep_only` with a measurable margin (at least 1 percentage point). The push phase should add 1-3% EY through pressure-forced advection.
**Warning signs:** `EY_hybrid - EY_steep_only < 0.5%`.

## Code Examples

### Clausius-Clapeyron Steam Pressure
```python
# Source: Standard thermodynamics (Antoine equation simplified)
R_GAS = 8.314          # J/(mol*K)
L_V   = 40660.0        # J/mol — latent heat of vaporization for water
T_REF = 373.15         # K (100C)
P_REF = 101325.0       # Pa (1 atm)

def steam_pressure_pa(T_celsius: float) -> float:
    """Clausius-Clapeyron steam pressure at temperature T."""
    T_K = T_celsius + 273.15
    return P_REF * np.exp(L_V / R_GAS * (1.0 / T_REF - 1.0 / T_K))
```

### Temperature-Dependent Viscosity
```python
# Source: Water properties handbook
MU_REF = 0.3e-3        # Pa*s at 93C (reference viscosity)
T_MU_REF = 93.0 + 273.15  # K

def water_viscosity(T_celsius: float) -> float:
    """Water dynamic viscosity [Pa*s] using Arrhenius-like model."""
    T_K = T_celsius + 273.15
    B_mu = 2200.0       # activation energy / R [K]
    return MU_REF * np.exp(B_mu * (1.0/T_K - 1.0/T_MU_REF))
```

### Moka Pot 6-ODE System (Accurate Mode)
```python
# Source: Siregar 2026 (thermodynamics) + Moroney 2016 (extraction kinetics)
def moka_pot_ode(t, y, params):
    T, V_ext, c_h, c_v, psi_s, M_cup = y

    # Remaining water mass
    m_w = max(params["m_w0"] - rho_w * V_ext, 0.01)

    # Steam pressure (Clausius-Clapeyron)
    P_steam = steam_pressure_pa(T)
    dp_net = max(P_steam - P_REF, 0.0)

    # Darcy flow through bed
    mu = water_viscosity(T)
    q = params["K_bed"] / mu * dp_net / params["L_bed"]

    # Temperature evolution
    Q = params["Q_heater"]
    h_loss_term = params["h_loss"] * params["A_surface"] * (T - params["T_amb"])
    flow_heat = q * params["A_bed"] * rho_w * C_PW * (T - T)  # simplified
    dT = (Q - h_loss_term) / (m_w * C_PW)

    # Volume extracted
    dV = q * params["A_bed"]

    # Moroney extraction with advective loss
    V_bed_pore = params["A_bed"] * params["L_bed"] * params["porosity"]
    dc_h = -kA*(c_h - c_v) + kB*(c_sat - c_h)*psi_s - (q/max(V_bed_pore, 1e-9))*c_h
    dc_v = kC*(c_h - c_v)
    dpsi_s = -kD*(c_sat - c_h)*psi_s

    # Cup accumulation
    dM = q * params["A_bed"] * c_h

    return [dT, dV, dc_h, dc_v, dpsi_s, dM]
```

### AeroPress Hybrid Composition
```python
# Source: Project architecture (METH-06)
def _solve_hybrid_accurate(inp: SimulationInput) -> SimulationOutput:
    # Phase 1: Immersion steep
    steep_inp = inp.model_copy(update={"brew_time": STEEP_TIME})
    steep_result, steep_state = _immersion_with_state(steep_inp)

    # Phase 2: Pressure push (using final steep state as IC)
    push_ey_increment = _compute_push_extraction(
        c_h_init=steep_state["c_h_final"],
        c_v_init=steep_state["c_v_final"],
        psi_s_init=steep_state["psi_s_final"],
        push_time=PUSH_TIME,
        push_pressure=PUSH_PRESSURE,
        grind_size_um=steep_state["grind_size_um"],
    )

    # Combine
    total_ey = steep_result.extraction_yield + push_ey_increment
    # ... build SimulationOutput ...
```

### Moka Pot Fast Mode (Maille Biexponential)
```python
# Source: Maille 2021 pattern from immersion.py + percolation.py
A1_MOKA   = 0.50       # surface dissolution amplitude [-]
TAU1_MOKA = 8.0        # surface dissolution time constant [s]
TAU2_MOKA = 80.0       # kernel diffusion time constant [s]
# Rationale: shorter than immersion (pressure drives flow) but longer than
# espresso (lower pressure ~1.5 bar vs 9 bar, coarser grind)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "pressure solver" for espresso + moka | Espresso in percolation.py, Moka in pressure.py (DECISION-010) | Phase 2 planning | Espresso uses validated percolation PDE; moka gets dedicated thermal ODE |
| Grudeva 2025 multiscale espresso model | Moroney 2015 PDE with espresso params | Phase 2 research | Avoided unvalidated parameters; used well-tested framework instead |
| Siregar 2026 dimensionless framework directly | Re-dimensionalized Siregar + Moroney extraction | Phase 3 research | Produces physical TDS/EY% outputs instead of dimensionless quantities |

**Deprecated/outdated:**
- `pressure.py` was originally planned for both Espresso and Moka Pot. Per DECISION-010, only Moka Pot uses it now.
- The Siregar 2026 dimensionless parameters (Bi, Lambda, Pi, q_max) are used conceptually but NOT implemented directly -- we use dimensional parameters for physical predictions.

## Open Questions

1. **Moka Pot Thermal Parameters (h_loss, Q_heater)**
   - What we know: h_loss for aluminum pot estimated 5-15 W/(m2*K); Q_heater depends on stove type (500-1500W)
   - What's unclear: No published measurements for specific Bialetti models
   - Recommendation: Default to 3-cup Bialetti with Q_heater=800W, h_loss=10 W/(m2*K). These affect extraction onset time but not final EY significantly. Allow override via method_defaults.

2. **AeroPress Push Pressure**
   - What we know: Manual plunger force translates to ~0.3-1.0 bar depending on hand pressure
   - What's unclear: No published measurements of actual AeroPress plunger pressure during use
   - Recommendation: Default to 0.5 bar. This is within the "gentle but firm" push range.

3. **Moka Pot Fast Mode Calibration**
   - What we know: Biexponential constants should be between immersion (tau2=103s) and espresso (tau2~25s)
   - What's unclear: No direct calibration data. Will need to fit against accurate mode output.
   - Recommendation: Start with A1=0.50, tau1=8.0s, tau2=80.0s and validate that fast-accurate difference is <2% EY.

4. **AeroPress Internal State Handoff**
   - What we know: Need c_h, c_v, psi_s from end of steep phase to start push phase
   - What's unclear: Whether to expose internal ODE state from immersion.solve_accurate() or duplicate the ODE call
   - Recommendation: Add a private `_solve_immersion_raw()` helper in immersion.py that returns both SimulationOutput AND final ODE state dict. Or: AeroPress runs its own Moroney ODE for the steep phase (duplicates code but avoids modifying immersion.py). The second approach is safer for Phase 3 since it avoids touching Phase 1 code.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | All solvers | Yes | 3.12.5 | -- |
| scipy | ODE solving (solve_ivp) | Yes | 1.16.3 | -- |
| numpy | Array operations | Yes | 2.4.0 | -- |
| pydantic | Input/Output models | Yes | 2.12.5 | -- |
| pytest | Test suite | Yes | (installed) | -- |

**Missing dependencies with no fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (installed via pyproject.toml) |
| Config file | pyproject.toml [tool.pytest.ini_options] |
| Quick run command | `cd brewos-engine && python -m pytest tests/ -x -q` |
| Full suite command | `cd brewos-engine && python -m pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOLV-05 | Moka Pot accurate mode produces heating + extraction phases, EY 15-22% | unit | `python -m pytest tests/test_pressure_solver.py::test_moka_accurate_ey_range -x` | No -- Wave 0 |
| SOLV-05 | Moka Pot thermal coupling: extraction onset after heating phase | unit | `python -m pytest tests/test_pressure_solver.py::test_moka_heating_phase -x` | No -- Wave 0 |
| SOLV-06 | Moka Pot fast mode < 1ms, EY within +-2% of accurate | unit | `python -m pytest tests/test_pressure_fast.py::test_moka_fast_speed -x` | No -- Wave 0 |
| METH-05 | Moka Pot method config dispatches correctly, 3-cup defaults | unit | `python -m pytest tests/test_moka_pot.py::test_simulate_both_modes -x` | No -- Wave 0 |
| METH-06 | AeroPress hybrid: steep + push, EY > steep-only EY | unit | `python -m pytest tests/test_aeropress.py::test_hybrid_exceeds_steep -x` | No -- Wave 0 |
| SC-4 | All 6 methods pass pytest in both modes | integration | `python -m pytest tests/test_all_methods.py -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd brewos-engine && python -m pytest tests/ -x -q`
- **Per wave merge:** `cd brewos-engine && python -m pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_pressure_solver.py` -- covers SOLV-05 (Moka Pot accurate mode, heating phase, EY range)
- [ ] `tests/test_pressure_fast.py` -- covers SOLV-06 (Moka Pot fast mode speed + accuracy vs accurate)
- [ ] `tests/test_moka_pot.py` -- covers METH-05 (method config, simulate dispatcher)
- [ ] `tests/test_aeropress.py` -- covers METH-06 (hybrid solver, steep+push, EY comparison)
- [ ] `tests/test_all_methods.py` -- covers SC-4 (cross-method smoke test, all 6 methods x 2 modes)

## Sources

### Primary (HIGH confidence)
- Moroney et al. (2016) "Coffee extraction kinetics in a well mixed system" -- 3-ODE extraction kinetics used in Moka Pot
- Moroney et al. (2015) "Modelling of coffee extraction during brewing using multiscale methods" -- rate coefficients kA/kB/kC/kD
- Maille et al. (2021) -- biexponential fast mode pattern (validated in Phase 1 + Phase 2)
- Liang et al. (2021) -- K=0.717 equilibrium anchor (validated in Phase 1)
- SciPy 1.16.3 solve_ivp documentation -- Radau method for stiff ODEs

### Secondary (MEDIUM confidence)
- Siregar (2026) "A Minimal Thermo-Fluid Model for Pressure-Driven Extraction in a Moka Pot" arXiv:2601.03663 -- thermodynamic coupling structure (PREPRINT, not peer-reviewed)
- Navarini et al. (2009) -- experimental moka pot temperature profiles (for validation reference)
- `.planning/research/pressure_solver_research.md` -- prior project research (detailed equations and parameter tables)

### Tertiary (LOW confidence)
- Moka pot thermal parameters (h_loss, Q_heater) -- estimated, no direct measurements for specific pot geometries
- AeroPress plunger pressure (0.3-1.0 bar) -- anecdotal/estimated, no published measurements
- Moka biexponential calibration constants (A1=0.50, tau1=8, tau2=80) -- first-order estimates, need fitting against accurate mode

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing tools
- Architecture: HIGH - follows established patterns from Phase 1+2, DECISION-010 locked
- Moka Pot physics: MEDIUM - Moroney extraction kinetics well-validated, thermal coupling from preprint
- AeroPress physics: MEDIUM - immersion phase well-validated, push phase increment is novel but simple
- Thermal parameters: LOW - estimated, not measured, affect extraction onset timing
- Pitfalls: MEDIUM - identified from ODE solver experience in Phase 1+2

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no fast-moving dependencies)
