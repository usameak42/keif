# Phase 2: Percolation Solver - Research

**Researched:** 2026-03-27
**Domain:** 1D advection-diffusion-reaction PDE, Method of Lines, Darcy flow, espresso channeling physics
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 extends the engine from immersion (well-mixed ODE) to percolation (spatially-resolved PDE) brewing. The core physics is the Moroney 2015 1D advection-diffusion-reaction model, which adds a spatial dimension (bed depth z) to the same double-porosity extraction kinetics used in Phase 1. Water flows through the packed coffee bed driven by Darcy's law with Kozeny-Carman permeability; coffee dissolves from grain surfaces and kernels into the flowing liquid. The PDE is discretized in space via Method of Lines (MOL) -- converting the PDE into a system of N coupled ODEs (one per spatial node) -- then solved with `scipy.integrate.solve_ivp(method='Radau')` exactly as Phase 1's immersion solver. This reuses the same stiff ODE infrastructure.

Three method configs (V60, Kalita Wave, Espresso) parameterize the same percolation solver with different geometry, flow rate, pressure, and grind size defaults. The key differentiators are: V60 has a cone geometry with gravity-driven flow (~3-4 mL/s); Kalita Wave has a flat bed with restricted 3-hole drainage (~2-3 mL/s); Espresso has a thin puck under 9 bar pressure with very fine grind (~15-20 mL/s total flow through ~20mm bed in ~25s). The Lee 2023 two-pathway channeling overlay is a post-processing computation applied only to espresso -- it splits the bed into two competing flow pathways and computes a channeling risk score (0-1) from the flow imbalance driven by the positive feedback loop between extraction and permeability.

**Primary recommendation:** Implement `percolation.py` with `solve_accurate()` using MOL discretization (N=30 spatial nodes, finite differences on z-axis, Darcy velocity from Kozeny-Carman, same double-porosity extraction kinetics as immersion). Reuse Phase 1's Liang scaling, bound clipping, output assembly, and flavor profile patterns. The fast mode uses the same Maille biexponential framework with percolation-calibrated lambdas (shorter tau values reflecting forced flow vs. diffusion-only). Lee 2023 channeling overlay is a separate pure function called after the main solve for espresso only.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOLV-03 | Percolation solver (Moroney 2015 1D Darcy PDE + double-porosity, MOL) -- accurate mode for V60, Kalita, Espresso | MOL discretization converts 1D PDE to N-ODE system solvable with solve_ivp Radau; same extraction kinetics as Phase 1 with added advection term and Kozeny-Carman permeability |
| SOLV-04 | Percolation solver fast mode: Maille 2021 biexponential with percolation-specific lambda calibration | Same biexponential EY(t) form as Phase 1 but with shorter tau values reflecting forced flow; calibrate against accurate mode V60 standard scenario |
| METH-02 | V60 method: cone geometry, bloom timing, flow rate | Cone dripper, gravity flow ~3-4 mL/s, bed depth ~5cm for 15g dose, medium-fine grind 500-700um, brew time 2:45-3:15 |
| METH-03 | Kalita Wave method: flat-bed geometry, 3-hole restricted flow | Flat bed, 3-hole restricted drainage ~2-3 mL/s, smaller bed depth, same extraction kinetics but slower drawdown |
| METH-04 | Espresso method: 9-bar params, fine grind, thin-bed MOL | 9 bar applied pressure, 18g/36g/25s standard, bed depth ~20mm in 58mm basket, fine grind 200-400um, very high flow velocity |
| OUT-08 | Channeling risk score for espresso (Lee 2023 two-pathway) | Lee 2023 two-pathway model: split bed into 2 pathways with different initial permeabilities; positive feedback loop widens imbalance; risk score = normalized flow variance between pathways |
| VAL-02 | Accurate-mode percolation validated against Batali 2020 pour-over dataset (EY% within +/-1.5% RMSE) | Batali 2020 (Scientific Reports): V60-style drip brew, TDS targets 1.0/1.25/1.5%, EY targets 16/20/24% at 87/90/93C; standard scenario: ~20% EY at 1.25% TDS for medium grind |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scipy | 1.16.3 (installed) | `solve_ivp` with Radau for stiff MOL ODE system | Same as Phase 1; Radau handles stiffness from disparate spatial/temporal scales |
| numpy | 2.4.0 (installed) | Array operations, MOL state vector manipulation, finite differences | Required for spatial discretization arrays |
| pydantic | 2.12.5 (installed) | Input/Output model validation | Locked; SimulationInput/Output already defined |
| pytest | 9.0.2 (installed) | VAL-02 test suite | Locked by project config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| time (stdlib) | - | Performance benchmarking for fast mode < 1ms | Fast mode validation |
| math (stdlib) | - | Kozeny-Carman permeability, bed geometry calculations | Parameter derivation |

**No additional packages needed.** All dependencies already installed from Phase 1.

## Architecture Patterns

### Project Structure (within `brewos-engine/`)
```
brewos/
    solvers/
        immersion.py          # Phase 1 -- EXISTS, unchanged
        percolation.py        # NEW: solve_accurate() + solve_fast() -- MAIN WORK
    methods/
        french_press.py       # Phase 1 -- EXISTS, unchanged
        v60.py                # POPULATE: method config + simulate() dispatcher
        kalita.py             # POPULATE: method config + simulate() dispatcher
        espresso.py           # POPULATE: method config + simulate() dispatcher + channeling
    models/
        inputs.py             # May need pressure_bar field for espresso
        outputs.py            # May need channeling_risk field for OUT-08
    utils/
        params.py             # ADD: derive_percolation_params() alongside existing immersion
        co2_bloom.py          # EXISTS, reuse for percolation bloom phase
        psd.py                # EXISTS, reuse
        channeling.py         # NEW: Lee 2023 two-pathway overlay
tests/
    test_percolation_solver.py  # NEW: accurate mode + Batali validation
    test_percolation_fast.py    # NEW: fast mode + performance benchmark
    test_v60.py                 # NEW: V60 end-to-end
    test_kalita.py              # NEW: Kalita end-to-end
    test_espresso.py            # NEW: Espresso end-to-end + channeling
```

### Pattern 1: Percolation Solver -- MOL Discretization
**What:** Convert the 1D PDE into N coupled ODEs by discretizing the spatial domain (bed depth z) into N nodes. Each node has its own (c_h, c_v, psi_s) state. Advection handled by upwind finite differences; diffusion by central differences.
**When to use:** All percolation method accurate mode solves.
**Example:**
```python
# brewos/solvers/percolation.py
import numpy as np
from scipy.integrate import solve_ivp

def solve_accurate(inp: SimulationInput) -> SimulationOutput:
    """Moroney 2015 1D percolation PDE via Method of Lines.

    State vector: y = [c_h_0, ..., c_h_{N-1}, c_v_0, ..., c_v_{N-1},
                       psi_s_0, ..., psi_s_{N-1}]
    Total size: 3*N ODEs.
    """
    N = 30  # spatial nodes (20-50 range per success criteria)
    L = bed_depth  # [m] -- from method config
    dz = L / (N - 1)

    # Darcy velocity from Kozeny-Carman
    # v_darcy = (K / mu) * (delta_P / L)  for espresso (pressure-driven)
    # v_darcy = (K / mu) * rho_w * g      for pour-over (gravity-driven)

    def percolation_ode(t, y):
        c_h = y[0:N]       # intergranular concentration at each node
        c_v = y[N:2*N]     # intragranular concentration at each node
        psi_s = y[2*N:3*N] # surface coffee at each node

        # Bound clipping (SOLV-08)
        c_h = np.clip(c_h, 0.0, c_sat)
        c_v = np.clip(c_v, 0.0, c_sat)
        psi_s = np.clip(psi_s, 0.0, 1.0)

        # Advection: upwind finite difference  dc_h/dz
        dc_h_dz = np.zeros(N)
        dc_h_dz[1:] = (c_h[1:] - c_h[:-1]) / dz  # upwind for positive v

        # Extraction kinetics (same as immersion, per-node)
        dc_h_dt = (-v_darcy * dc_h_dz               # advection
                   - kA * (c_h - c_v)                 # kernel diffusion
                   + kB * (c_sat - c_h) * psi_s)      # surface dissolution
        dc_v_dt = kC * (c_h - c_v)                    # kernel
        dpsi_s_dt = -kD * (c_sat - c_h) * psi_s       # surface depletion

        return np.concatenate([dc_h_dt, dc_v_dt, dpsi_s_dt])

    # Boundary condition: c_h(z=0, t) = 0 (fresh water enters top)
    # Initial conditions: c_h=0 everywhere, c_v=gamma_1*c_sat, psi_s=1.0
    y0 = np.zeros(3 * N)
    y0[N:2*N] = gamma_1 * c_sat    # c_v initial
    y0[2*N:3*N] = 1.0              # psi_s initial

    sol = solve_ivp(percolation_ode, (0.0, brew_time), y0,
                    method='Radau', rtol=1e-6, atol=1e-8,
                    t_eval=np.linspace(0, brew_time, 100))
    ...
```

### Pattern 2: Method Config with Geometry Defaults
**What:** Each method module provides brew-specific defaults (bed geometry, flow rate, pressure) and dispatches to the percolation solver. Follows the French Press pattern from Phase 1.
**When to use:** V60, Kalita, Espresso method configs.
**Example:**
```python
# brewos/methods/v60.py
from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput
from brewos.solvers.percolation import solve_accurate, solve_fast

V60_DEFAULTS = {
    "bed_depth_m":     0.05,     # ~5cm for 15g dose in V60 cone
    "bed_diameter_m":  0.08,     # ~80mm effective diameter
    "flow_rate_mL_s":  3.5,     # gravity-driven, no restriction
    "pressure_bar":    0.0,     # gravity only (atmospheric)
    "brew_time":       180.0,   # 3 minutes [s]
    "water_temp":      93.0,    # [C]
    "brew_ratio_min":  15.0,
    "brew_ratio_max":  17.0,
}

def simulate(inp: SimulationInput) -> SimulationOutput:
    if inp.mode.value == "accurate":
        return solve_accurate(inp, method_defaults=V60_DEFAULTS)
    else:
        return solve_fast(inp, method_defaults=V60_DEFAULTS)
```

### Pattern 3: Lee 2023 Channeling Overlay (Post-Processing)
**What:** After solving the percolation PDE, run a separate two-pathway analysis to compute channeling risk. This is NOT embedded in the core solver -- it's a post-processing overlay per DECISION-010.
**When to use:** Espresso only. Does NOT run for V60 or Kalita.
**Example:**
```python
# brewos/utils/channeling.py
def compute_channeling_risk(
    grind_size_um: float,
    pressure_bar: float,
    bed_depth_m: float,
    porosity: float,
) -> float:
    """Lee 2023 two-pathway channeling risk score (0-1).

    Model: Split bed into two pathways with slightly different initial
    permeabilities (5% variance). Compute flow ratio after extraction
    feedback loop. Risk = |Q1 - Q2| / (Q1 + Q2) normalized to [0, 1].

    Higher risk for: finer grind, higher pressure, shallower bed,
    lower porosity (tighter packing).

    Returns:
        Float in [0, 1]. Values > 0.5 warrant a warning.
    """
    # Kozeny-Carman permeability for each pathway
    # K = d^2 * epsilon^3 / (180 * (1 - epsilon)^2)
    # Pathway 1: nominal porosity
    # Pathway 2: porosity * (1 - delta) where delta ~ 0.05
    ...
```

### Pattern 4: Reuse Phase 1 Utilities
**What:** Phase 1 built _resolve_psd(), _estimate_flavor_profile(), _generate_warnings(), _brew_ratio_recommendation(). These should be extracted to a shared location or imported from immersion.py.
**When to use:** Output assembly in percolation solver.
**Recommendation:** Move these helper functions to `brewos/utils/output_helpers.py` so both immersion.py and percolation.py can import them without circular dependencies. Alternatively, import directly from immersion.py (simpler but couples solvers).

### Anti-Patterns to Avoid
- **Using central differences for advection:** Central differences cause numerical oscillations (Gibbs phenomenon) for advection-dominated flow. Use upwind differences for the advection term dc_h/dz.
- **Too many spatial nodes for Radau:** N=30 gives 90 ODEs, which Radau handles well (<4s). N=100 gives 300 ODEs and may exceed the 4s time budget. Start with N=30, profile if needed.
- **Embedding channeling in the PDE solver:** Lee 2023 channeling is a post-processing overlay (DECISION-010). Do NOT add pathway splitting into the MOL system -- it would double the state vector and add unnecessary complexity.
- **Hardcoding Darcy velocity:** For pour-over, v_darcy changes as water level drops. For espresso, v_darcy is approximately constant (pressure-regulated). Use a velocity function, not a constant.
- **Sharing biexponential constants between immersion and percolation fast modes:** Percolation extraction is faster (forced flow) -- tau values must be re-calibrated for percolation, not reused from immersion.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MOL ODE integration | Custom time stepper | `scipy.integrate.solve_ivp(method='Radau')` | Same rationale as Phase 1; stiff system needs implicit solver |
| Kozeny-Carman permeability | Manual estimation | Standard K-C formula: `K = d^2 * eps^3 / (180 * (1-eps)^2)` | Well-validated for packed beds; published coffee-specific measurements confirm 10^-13 to 10^-14 m^2 range |
| Upwind finite differences | Custom advection scheme | Standard first-order upwind: `dc/dz[i] = (c[i] - c[i-1]) / dz` | Stable for positive velocity; higher order not needed at N=30 |
| Channeling model | CFD simulation | Lee 2023 analytical two-pathway model | DECISION-010 locks this as post-processing overlay; CFD is out of scope |
| Output assembly | Duplicate from immersion | Extract and share Phase 1's output helpers | Avoid code duplication; identical flavor/warning/PSD logic |

**Key insight:** The percolation solver is the immersion solver plus spatial discretization plus advection. The extraction kinetics (kA, kB, kC, kD, Liang scaling, bound clipping) are identical. The new physics is ONLY: (1) Darcy flow through the bed, (2) spatial variation in concentration along bed depth, (3) Kozeny-Carman permeability coupling grind size to flow resistance.

## Common Pitfalls

### Pitfall 1: Numerical Oscillations in Advection
**What goes wrong:** Using central differences `(c[i+1] - c[i-1]) / (2*dz)` for the advection term causes spurious oscillations at sharp concentration fronts, especially at the bed inlet where fresh water meets extracted coffee.
**Why it happens:** Central differences have zero numerical diffusion, so they amplify oscillations at discontinuities (Gibbs phenomenon).
**How to avoid:** Use first-order upwind differences: `(c[i] - c[i-1]) / dz` for positive velocity (flow from top to bottom). Add the inlet boundary condition c_h(z=0) = 0 explicitly by overriding dc_h_dt[0].
**Warning signs:** Negative concentrations, oscillating c_h values near z=0, solver stiffness warnings.

### Pitfall 2: Incorrect Darcy Velocity for Pour-Over vs Espresso
**What goes wrong:** Using the same velocity model for gravity-driven pour-over and pressure-driven espresso.
**Why it happens:** Pour-over flow is driven by hydrostatic head (rho*g*h) which varies as water drains; espresso flow is driven by pump pressure (9 bar) which is approximately constant.
**How to avoid:** For pour-over: `v = K/(mu) * rho_w * g` (gravity-driven, approximate as constant for simplicity since water is continuously poured). For espresso: `v = K/(mu) * delta_P/L` where delta_P = 9e5 Pa. The velocity difference is ~100x, which drives completely different extraction dynamics.
**Warning signs:** Pour-over producing espresso-like TDS (>5%) or espresso producing pour-over-like TDS (<1.5%).

### Pitfall 3: State Vector Size Explosion
**What goes wrong:** Choosing N=50+ nodes creates 150+ ODEs, and Radau's implicit solver forms a dense Jacobian of size 150x150. This can push solve time beyond the 4s budget.
**Why it happens:** Radau is O(N^3) for the linear algebra at each step due to dense Jacobian factorization.
**How to avoid:** Start with N=30 (90 ODEs). Profile solve time. If too slow, try: (1) provide a banded Jacobian via `jac_sparsity` parameter to solve_ivp (the MOL Jacobian IS banded), (2) reduce to N=20. The banded Jacobian approach can reduce solve time by 5-10x for large N.
**Warning signs:** solve_ivp taking >4 seconds; increasing N does not improve EY% accuracy beyond N=25.

### Pitfall 4: Missing Inlet Boundary Condition
**What goes wrong:** Forgetting to enforce c_h(z=0, t) = 0 (fresh water) at the top of the bed, causing the first node to accumulate coffee concentration unrealistically.
**Why it happens:** The MOL converts the PDE to ODEs, but boundary conditions must be manually enforced by overriding the ODE at the boundary node.
**How to avoid:** After computing dc_h_dt for all nodes, set `dc_h_dt[0] = 0` and keep `c_h[0] = 0` in the initial conditions. This models fresh water continuously entering the top of the bed.
**Warning signs:** c_h[0] growing over time instead of staying near zero; TDS at outlet unrealistically high.

### Pitfall 5: Espresso EY Outside Physical Range
**What goes wrong:** Espresso simulation producing EY outside 18-22% for the standard recipe (18g/36g/25s).
**Why it happens:** The Moroney parameters (alpha_n, beta_n, etc.) were fitted for drip/immersion coffee. Espresso operates in a different regime: very fine grind, very high pressure, very short contact time. The rate coefficients may need separate calibration.
**How to avoid:** Use the same Moroney kinetics but adjust the effective parameters for the espresso regime. The Liang 2021 K=0.717 scaling anchors the equilibrium endpoint regardless of kinetic parameters, so the main concern is getting the kinetic TIME PROFILE right (how fast extraction approaches equilibrium within 25s). Fine-tune kB (surface dissolution rate) upward for espresso's high pressure and fine grind. STATE.md already notes this concern: "alpha_n/beta_n Moroney params may need recalibration for espresso regime."
**Warning signs:** Espresso EY < 15% (under-extracted for the short time) or > 25% (unphysical).

### Pitfall 6: Biexponential Calibration with Wrong Reference Curve
**What goes wrong:** Calibrating percolation fast mode tau values against the immersion accurate mode curve instead of the percolation accurate mode curve.
**Why it happens:** Reusing Phase 1's calibration approach without changing the reference.
**How to avoid:** Run the percolation accurate solver for V60 standard scenario, extract the EY(t) curve, fit biexponential `EY(t) = EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))` via curve_fit. Expect tau1 << immersion tau1 (faster surface dissolution due to forced flow) and tau2 << immersion tau2 (faster kernel diffusion due to fresh solvent continuously passing).
**Warning signs:** Fast mode EY deviating >2% from accurate mode at the standard brew time.

## Code Examples

### Kozeny-Carman Permeability
```python
# Standard Kozeny-Carman equation for packed bed of spherical particles
# Source: well-established fluid mechanics; coffee-specific validation in
# Corrochano et al. 2015 (J. Food Engineering)
def kozeny_carman_permeability(d_particle_m: float, porosity: float) -> float:
    """Compute bed permeability from particle diameter and porosity.

    K = d^2 * eps^3 / (180 * (1 - eps)^2)

    For coffee beds: K ~ 10^-13 to 10^-14 m^2 (experimentally confirmed).

    Args:
        d_particle_m: Particle diameter in metres.
        porosity: Bed porosity (void fraction), typically 0.35-0.45 for coffee.

    Returns:
        Permeability in m^2.
    """
    return d_particle_m**2 * porosity**3 / (180.0 * (1.0 - porosity)**2)
```

### Darcy Velocity Computation
```python
# Darcy velocity for pressure-driven (espresso) and gravity-driven (pour-over) flow
def darcy_velocity(permeability_m2: float, mu_Pa_s: float,
                   delta_P_Pa: float, bed_length_m: float) -> float:
    """Darcy superficial velocity through coffee bed.

    v = (K / mu) * (delta_P / L)

    Pour-over: delta_P = rho_w * g * h_water (hydrostatic head)
    Espresso:  delta_P = 9e5 Pa (9 bar pump pressure)

    Args:
        permeability_m2: Kozeny-Carman permeability [m^2].
        mu_Pa_s: Dynamic viscosity of water [Pa.s]. At 93C: ~0.3e-3 Pa.s.
        delta_P_Pa: Pressure drop across bed [Pa].
        bed_length_m: Bed depth [m].

    Returns:
        Superficial velocity [m/s].
    """
    return (permeability_m2 / mu_Pa_s) * (delta_P_Pa / bed_length_m)
```

### MOL Boundary Conditions
```python
# Inlet boundary: fresh water (c_h = 0) enters top of bed
# Outlet boundary: free outflow (zero-gradient: dc_h/dz = 0 at z=L)
# Implementation: override first and last node in ODE right-hand side

# In the ODE function:
def percolation_ode(t, y):
    c_h = np.clip(y[0:N], 0.0, c_sat)
    c_v = np.clip(y[N:2*N], 0.0, c_sat)
    psi_s = np.clip(y[2*N:3*N], 0.0, 1.0)

    # Upwind advection (positive velocity = top to bottom)
    dc_h_dz = np.zeros(N)
    dc_h_dz[1:] = (c_h[1:] - c_h[:-1]) / dz  # interior nodes
    # dc_h_dz[0] = 0 implicitly (inlet, c_h[-1] doesn't exist)

    # Extraction kinetics per node (vectorized)
    dc_h_dt = (-v_darcy * dc_h_dz
               - kA * (c_h - c_v)
               + kB_eff * (c_sat - c_h) * psi_s)
    dc_v_dt = kC * (c_h - c_v)
    dpsi_s_dt = -kD * (c_sat - c_h) * psi_s

    # Boundary conditions
    dc_h_dt[0] = 0.0   # inlet: c_h stays at 0 (fresh water)

    return np.concatenate([dc_h_dt, dc_v_dt, dpsi_s_dt])
```

### Lee 2023 Channeling Risk Score
```python
# Lee 2023 two-pathway channeling model (arXiv:2206.12373)
# Post-processing overlay for espresso only (DECISION-010)
def compute_channeling_risk(
    grind_size_um: float,
    pressure_bar: float,
    bed_depth_m: float,
    porosity: float,
    delta_porosity: float = 0.05,  # initial porosity imbalance (5%)
) -> float:
    """Compute channeling risk score (0-1) using Lee 2023 two-pathway model.

    Physics: Two parallel pathways through the puck with slightly different
    initial porosities. Pathway with higher porosity gets more flow, which
    causes more extraction, which increases porosity further (positive feedback).

    Risk score: Normalized flow imbalance after feedback convergence.

    Args:
        grind_size_um: Median particle size [um].
        pressure_bar: Applied pressure [bar].
        bed_depth_m: Puck depth [m].
        porosity: Nominal bed porosity [-].
        delta_porosity: Initial porosity imbalance between pathways [-].

    Returns:
        Channeling risk in [0, 1]. >0.3 = moderate risk, >0.6 = high risk.
    """
    d_m = grind_size_um * 1e-6

    # Kozeny-Carman for each pathway
    eps1 = porosity + delta_porosity / 2
    eps2 = porosity - delta_porosity / 2
    K1 = d_m**2 * eps1**3 / (180.0 * (1.0 - eps1)**2)
    K2 = d_m**2 * eps2**3 / (180.0 * (1.0 - eps2)**2)

    # Flow ratio (Q proportional to K for same pressure drop)
    Q_total = K1 + K2
    flow_imbalance = abs(K1 - K2) / Q_total  # base imbalance

    # Extraction feedback amplification (Lee 2023):
    # Finer grind + higher pressure = more extraction = more feedback
    # Amplification factor increases with Peclet number (advection dominance)
    mu = 0.3e-3  # water viscosity at 93C [Pa.s]
    delta_P = pressure_bar * 1e5  # Pa
    v_avg = ((K1 + K2) / 2 / mu) * (delta_P / bed_depth_m)

    # Damkohler-like ratio: extraction rate vs residence time
    residence_time = bed_depth_m / max(v_avg, 1e-10)
    # Higher pressure and finer grind amplify channeling
    amplification = min(3.0, 1.0 + 2.0 * (1.0 - grind_size_um / 1000.0))

    risk = min(1.0, flow_imbalance * amplification)
    return round(risk, 3)
```

### Method Geometry Parameters
```python
# Geometry and flow defaults for each percolation method
# These are passed to the percolation solver to configure the spatial domain

V60_DEFAULTS = {
    "bed_depth_m":      0.050,    # ~5cm cone bed for 15g dose
    "bed_diameter_m":   0.080,    # ~80mm effective
    "pressure_bar":     0.0,      # gravity-driven
    "flow_rate_mL_s":   3.5,      # typical V60 pour rate
    "grind_size_um":    600.0,    # medium-fine default
    "brew_time":        180.0,    # 3 min
    "brew_ratio_min":   15.0,
    "brew_ratio_max":   17.0,
    "porosity":         0.40,     # typical pour-over bed
}

KALITA_DEFAULTS = {
    "bed_depth_m":      0.035,    # ~3.5cm flat bed for 15g dose
    "bed_diameter_m":   0.065,    # ~65mm Kalita 185 basket
    "pressure_bar":     0.0,      # gravity-driven
    "flow_rate_mL_s":   2.5,      # restricted by 3-hole design
    "grind_size_um":    650.0,    # medium-fine, slightly coarser than V60
    "brew_time":        210.0,    # 3.5 min (slower drawdown)
    "brew_ratio_min":   15.0,
    "brew_ratio_max":   17.0,
    "porosity":         0.40,
}

ESPRESSO_DEFAULTS = {
    "bed_depth_m":      0.020,    # ~20mm puck in 58mm basket
    "bed_diameter_m":   0.058,    # standard 58mm portafilter
    "pressure_bar":     9.0,      # standard espresso pressure
    "flow_rate_mL_s":   None,     # computed from Darcy at 9 bar
    "grind_size_um":    300.0,    # fine grind default
    "brew_time":        25.0,     # standard shot time
    "brew_ratio_min":   1.5,      # espresso ratio (1:1.5 to 1:3)
    "brew_ratio_max":   3.0,
    "porosity":         0.38,     # tighter packing under tamping
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Well-mixed ODE (Moroney 2016) | 1D PDE via MOL (Moroney 2015) | Phase 2 (this) | Captures spatial extraction gradient along bed depth |
| No channeling model | Lee 2023 two-pathway overlay | Phase 2 (this) | Quantitative risk score for espresso |
| Single tau calibration (immersion) | Per-method tau calibration | Phase 2 (this) | Percolation fast mode needs separate calibration from immersion |
| Classic K-C permeability | Modified K-C with tortuosity | Corrochano 2015 | More accurate for real coffee beds; classic K-C overestimates by ~2x |

**Deprecated/outdated:**
- Grudeva 2025 multiscale espresso model: Explicitly excluded (DECISION-010) -- lacks validated parameters, anomalous table values
- CFD approach: Out of scope -- 1D MOL sufficient and validated for v1

## Open Questions

1. **Moroney Parameters for Espresso Regime**
   - What we know: alpha_n=0.1833, beta_n=0.0447 from Moroney 2015 Table 1 were fitted for drip/immersion with Jacobs Kronung medium grind. The same kinetic model applies to espresso (DECISION-010).
   - What's unclear: Whether these fitting parameters are valid at 9 bar pressure and 200-400um grind. STATE.md flags this: "alpha_n/beta_n Moroney params may need recalibration for espresso regime."
   - Recommendation: Start with the same parameters. The Liang K=0.717 scaling anchors the equilibrium endpoint. For the 25s espresso time window, the kinetic shape matters more than equilibrium. If espresso EY falls outside 18-22%, increase kB (surface dissolution) by a pressure-dependent factor (e.g., 2-5x for 9 bar vs gravity). Document any adjustment as a calibration constant, not a parameter change.

2. **Batali 2020 Exact Reference Values**
   - What we know: Batali et al. 2020 (Scientific Reports) tested drip brew at TDS = {1.0, 1.25, 1.5}% and EY = {16, 20, 24}% at temperatures {87, 90, 93}C. The "standard" V60 scenario should target ~20% EY at ~1.25% TDS with medium grind at 93C.
   - What's unclear: The exact experimental values for a specific dose/water/grind recipe. The study used a controlled factorial design, not a "standard V60 recipe."
   - Recommendation: Use EY=20% +/-1.5% as the validation target for V60 standard scenario (15g/250g/93C/medium-fine/180s). This falls within the Batali 2020 tested range and matches SCA ideal zone center.

3. **SimulationInput Model Changes**
   - What we know: Current SimulationInput has no pressure_bar field. Espresso needs to specify pump pressure.
   - What's unclear: Whether to add pressure_bar as an optional field on SimulationInput or pass it through the method defaults dict.
   - Recommendation: Add `pressure_bar: Optional[float] = None` to SimulationInput for transparency. The espresso method config can set it to 9.0 by default. V60 and Kalita leave it as None (gravity-driven). This keeps the input model self-documenting.

4. **SimulationOutput Model Changes for Channeling**
   - What we know: OUT-08 requires a channeling risk score. Current SimulationOutput has `warnings: List[str]` but no dedicated channeling field.
   - What's unclear: Whether to add a `channeling_risk: Optional[float]` field to SimulationOutput or encode it only in the warnings list.
   - Recommendation: Add `channeling_risk: Optional[float] = None` to SimulationOutput. Set it for espresso, leave None for other methods. Also append a warning string when risk > 0.3. This satisfies OUT-08 cleanly.

5. **Percolation Biexponential Calibration**
   - What we know: Immersion fast mode has A1=0.6201, tau1=3.14s, tau2=103.02s. Percolation forced flow is faster.
   - What's unclear: Exact tau values for percolation. Expect tau1 ~ 1-3s, tau2 ~ 30-80s (faster than immersion due to continuous fresh solvent).
   - Recommendation: Calibrate by running percolation accurate mode for V60 standard scenario, extracting EY(t), fitting biexponential via curve_fit. Store per-method defaults (V60, Kalita, Espresso may have slightly different tau values due to different flow rates).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | Engine runtime | Yes | 3.12.5 | -- |
| scipy | solve_ivp Radau for MOL | Yes | 1.16.3 | -- |
| numpy | MOL state vector, finite differences | Yes | 2.4.0 | -- |
| pydantic | Input/Output models | Yes | 2.12.5 | -- |
| pytest | VAL-02 suite | Yes | 9.0.2 | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

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
| SOLV-03 | Percolation accurate mode returns valid SimulationOutput with spatial resolution | integration | `python -m pytest tests/test_percolation_solver.py::test_accurate_output -x` | No -- Wave 0 |
| SOLV-04 | Percolation fast mode < 1ms and within +/-2% of accurate for V60 standard | unit + perf | `python -m pytest tests/test_percolation_fast.py -x` | No -- Wave 0 |
| VAL-02 | Accurate mode EY within +/-1.5% of Batali 2020 for V60 standard (15g/250g/93C/medium-fine/180s) | integration | `python -m pytest tests/test_percolation_solver.py::test_batali_validation -x` | No -- Wave 0 |
| METH-02 | V60 end-to-end produces distinct TDS/EY from French Press with same inputs | integration | `python -m pytest tests/test_v60.py -x` | No -- Wave 0 |
| METH-03 | Kalita Wave end-to-end produces distinct TDS/EY from V60 with same inputs | integration | `python -m pytest tests/test_kalita.py -x` | No -- Wave 0 |
| METH-04 | Espresso 18g/36g/25s produces EY in 18-22% range | integration | `python -m pytest tests/test_espresso.py::test_standard_recipe -x` | No -- Wave 0 |
| OUT-08 | Espresso channeling risk score in [0,1]; appended to warnings when high | unit | `python -m pytest tests/test_espresso.py::test_channeling_risk -x` | No -- Wave 0 |
| SC-3 | V60, Kalita, Espresso produce measurably distinct TDS/EY for identical dose/water/grind | integration | `python -m pytest tests/test_percolation_solver.py::test_method_distinction -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd brewos-engine && python -m pytest tests/ -x -q`
- **Per wave merge:** `cd brewos-engine && python -m pytest tests/ -v`
- **Phase gate:** Full suite green (all 37 existing + new percolation tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_percolation_solver.py` -- covers SOLV-03, VAL-02, SC-3
- [ ] `tests/test_percolation_fast.py` -- covers SOLV-04
- [ ] `tests/test_v60.py` -- covers METH-02
- [ ] `tests/test_kalita.py` -- covers METH-03
- [ ] `tests/test_espresso.py` -- covers METH-04, OUT-08

## Sources

### Primary (HIGH confidence)
- `brewos-engine/brewos/solvers/immersion.py` -- Phase 1 validated solver; pattern to follow for percolation
- `brewos-engine/brewos/utils/params.py` -- Moroney 2015/2016 parameters (alpha_n, beta_n, D_h, c_sat, etc.)
- [Moroney et al. 2015, Chemical Engineering Science 137:216-234](https://www.researchgate.net/publication/282622621_Modelling_of_coffee_extraction_during_brewing_using_multiscale_methods_An_experimentally_validated_model) -- Original 1D percolation PDE with double-porosity, Darcy flow, experimentally validated
- [Moroney et al. 2016, J. Mathematics in Industry (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4986356/) -- Well-mixed system + general dimensional equations for packed bed; references 2015 model
- [Moroney et al. 2019, PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0219906) -- Extraction uniformity analysis using CFD and mathematical models; validates 1D approach against CFD
- [SciPy solve_ivp documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html) -- Confirmed Radau method, jac_sparsity support for banded Jacobians

### Secondary (MEDIUM confidence)
- [Lee 2023, arXiv:2206.12373](https://arxiv.org/abs/2206.12373) -- "Uneven Extraction in Coffee Brewing" -- two-pathway channeling model; analytical framework confirmed, but specific implementation parameters need calibration
- [Batali et al. 2020, Scientific Reports 10:16450](https://www.nature.com/articles/s41598-020-73341-4) -- Drip brew at TDS 1.0/1.25/1.5% and EY 16/20/24% at 87/90/93C; provides validation range for V60 standard scenario
- [Corrochano et al. 2015, J. Food Engineering](https://www.sciencedirect.com/science/article/pii/S0260877414004737) -- Coffee bed permeability measurements; K ~ 10^-13 to 10^-14 m^2; validates Kozeny-Carman for coffee

### Tertiary (LOW confidence)
- Espresso-regime Moroney parameters: alpha_n/beta_n may need recalibration for 9 bar / fine grind; no published espresso-specific values for this model
- Lee 2023 channeling risk score implementation: The paper describes the physics but does not define a 0-1 "risk score" metric; our scoring formula is a pragmatic interpretation of the flow imbalance
- Percolation biexponential tau values: Must be calibrated from accurate mode; no published percolation-specific Maille constants available

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Same as Phase 1; all packages installed, MOL is standard numerical method
- Architecture: HIGH -- MOL is well-established for 1D PDE; solve_ivp Radau handles the resulting ODE system; follows Phase 1 patterns directly
- Percolation physics: MEDIUM-HIGH -- Moroney 2015 is experimentally validated for drip brewing; espresso regime less certain
- Channeling overlay: MEDIUM -- Lee 2023 physics is sound but our risk score formula is a pragmatic interpretation, not directly from the paper
- Espresso parameter calibration: MEDIUM-LOW -- May need kB adjustment for 9 bar regime; STATE.md flags this concern
- Batali validation target: MEDIUM -- 20% EY is within their factorial range but not an exact single-recipe measurement

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable domain; physics papers don't change)
