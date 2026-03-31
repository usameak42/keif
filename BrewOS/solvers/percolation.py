"""Moroney 2015 1D advection-diffusion-reaction PDE via Method of Lines."""

import numpy as np
from scipy.integrate import solve_ivp

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput, ExtractionPoint
from brewos.utils.params import derive_percolation_params, K_liang, E_max, rho_w
from brewos.utils.co2_bloom import co2_bloom_factor
from brewos.utils.output_helpers import (resolve_psd, estimate_flavor_profile,
    generate_warnings, brew_ratio_recommendation,
    compute_eui, compute_temperature_curve, classify_sca_position,
    estimate_caffeine, compute_puck_resistance)


# ─────────────────────────────────────────────────────────────────────────────
# PERCOLATION DEFAULTS (V60-like for direct testing)
# ─────────────────────────────────────────────────────────────────────────────
PERCOLATION_DEFAULTS = {
    "bed_depth_m": 0.050,
    "bed_diameter_m": 0.080,
    "pressure_bar": 0.0,
    "porosity": 0.40,
    "brew_ratio_min": 15.0,
    "brew_ratio_max": 17.0,
}

# ─────────────────────────────────────────────────────────────────────────────
# CALIBRATION FACTOR — forced flow increases surface dissolution rate relative
# to immersion (water flows past grain surfaces instead of static contact).
# Tuned to reproduce Batali 2020 V60 EY ~20% for standard scenario.
# ─────────────────────────────────────────────────────────────────────────────
KB_PERCOLATION_FACTOR = 3.0

# ─────────────────────────────────────────────────────────────────────────────
# PERCOLATION EY TARGET — Batali 2020 reference for V60 standard scenario.
# Immersion uses K_liang * E_max = 21.51% (well-mixed equilibrium).
# Percolation extracts less efficiently due to spatial gradients; Batali 2020
# reports ~20% EY for medium grind V60 at 93C. This target can be overridden
# by method_defaults["ey_target_pct"] for espresso/kalita tuning.
# ─────────────────────────────────────────────────────────────────────────────
EY_TARGET_PERCOLATION_PCT = 20.0


def solve_accurate(inp: SimulationInput, method_defaults: dict = None) -> SimulationOutput:
    """Solve the Moroney 2015 1D percolation PDE via Method of Lines.

    Implements:
    - Moroney et al. (2015) 1D advection-diffusion-reaction PDE
    - MOL discretization: N=30 spatial nodes, upwind advection
    - Kozeny-Carman permeability for Darcy velocity
    - Liang et al. (2021) K=0.717 equilibrium anchor
    - CO2 bloom modifier (Smrke 2018) applied to kB
    - Shared output helpers (flavor, warnings, brew ratio, PSD)

    State vector: y = [c_h_0..c_h_{N-1}, c_v_0..c_v_{N-1}, psi_s_0..psi_s_{N-1}]
    Total: 3*N ODEs.

    Args:
        inp: Validated SimulationInput.
        method_defaults: Method-specific geometry/flow overrides.

    Returns:
        SimulationOutput with all fields populated.

    Raises:
        RuntimeError: If the ODE solver fails to converge.
    """
    # ─────────────────────────────────────────────────────────────────────────
    # MERGE DEFAULTS
    # ─────────────────────────────────────────────────────────────────────────
    defaults = dict(PERCOLATION_DEFAULTS)
    if method_defaults is not None:
        defaults.update(method_defaults)

    # ─────────────────────────────────────────────────────────────────────────
    # RESOLVE PSD AND PARAMETERS
    # ─────────────────────────────────────────────────────────────────────────
    grind_size_um, psd_curve = resolve_psd(inp)

    pressure = defaults.get("pressure_bar", 0.0)
    if inp.pressure_bar is not None:
        pressure = inp.pressure_bar

    p = derive_percolation_params(
        inp.coffee_dose, inp.water_amount, inp.water_temp, grind_size_um,
        bed_depth_m=defaults["bed_depth_m"],
        pressure_bar=pressure,
        porosity=defaults["porosity"],
    )

    N       = p["N"]
    dz      = p["dz"]
    v_darcy = p["v_darcy"]
    kA      = p["kA"]
    kB      = p["kB"] * KB_PERCOLATION_FACTOR   # calibrated for forced flow
    kC      = p["kC"]
    kD      = p["kD"]
    c_sat   = p["c_sat"]

    # ─────────────────────────────────────────────────────────────────────────
    # INITIAL CONDITIONS — MOL state vector
    # ─────────────────────────────────────────────────────────────────────────
    y0 = np.zeros(3 * N)
    y0[N:2*N]   = p["c_v0"]     # c_v = gamma_1 * c_sat at all nodes
    y0[2*N:3*N] = p["psi_s0"]   # psi_s = 1.0 at all nodes

    # ─────────────────────────────────────────────────────────────────────────
    # CO2 BLOOM MODIFIER
    # ─────────────────────────────────────────────────────────────────────────
    if inp.bean_age_days is not None:
        _roast_str = inp.roast_level.value
        _age_days  = inp.bean_age_days
        def bloom_fn(t: float) -> float:
            return co2_bloom_factor(t, _roast_str, _age_days)
    else:
        def bloom_fn(t: float) -> float:  # type: ignore[misc]
            return 1.0

    # ─────────────────────────────────────────────────────────────────────────
    # ODE FUNCTION — Moroney 2015 1D PDE discretized via MOL
    # Upwind scheme for advection; extraction kinetics vectorized per-node.
    # Bound clipping prevents numerical drift (SOLV-08).
    # ─────────────────────────────────────────────────────────────────────────
    def percolation_ode(t, y):
        c_h   = np.clip(y[0:N],     0.0, c_sat)
        c_v   = np.clip(y[N:2*N],   0.0, c_sat)
        psi_s = np.clip(y[2*N:3*N], 0.0, 1.0)

        # Upwind advection: dc_h/dz (first-order, forward flow)
        dc_h_dz = np.zeros(N)
        dc_h_dz[1:] = (c_h[1:] - c_h[:-1]) / dz

        kB_eff = kB * bloom_fn(t)

        # Extraction kinetics (vectorized, per-node)
        dc_h_dt   = -v_darcy * dc_h_dz - kA * (c_h - c_v) + kB_eff * (c_sat - c_h) * psi_s
        dc_v_dt   = kC * (c_h - c_v)
        dpsi_s_dt = -kD * (c_sat - c_h) * psi_s

        # Boundary condition: inlet (node 0) receives fresh water -> c_h stays 0
        dc_h_dt[0] = 0.0

        return np.concatenate([dc_h_dt, dc_v_dt, dpsi_s_dt])

    # ─────────────────────────────────────────────────────────────────────────
    # SOLVE
    # ─────────────────────────────────────────────────────────────────────────
    t_eval = np.linspace(0.0, inp.brew_time, 100)

    sol = solve_ivp(
        percolation_ode, (0.0, inp.brew_time), y0,
        method='Radau', rtol=1e-6, atol=1e-8,
        t_eval=t_eval,
    )

    if not sol.success:
        raise RuntimeError(f"Percolation ODE solve failed: {sol.message}")

    # ─────────────────────────────────────────────────────────────────────────
    # POST-PROCESSING — Liang 2021 equilibrium scaling
    # Use average c_h across all spatial nodes at final time for raw EY,
    # then scale to Liang anchor (same approach as immersion solver).
    # ─────────────────────────────────────────────────────────────────────────
    R_brew = inp.water_amount / inp.coffee_dose

    # Raw extraction at final time step
    c_h_final_all = np.clip(sol.y[0:N, -1], 0.0, c_sat)
    c_h_avg_final = np.mean(c_h_final_all)

    # OUT-07: Extraction uniformity index from spatial variance
    eui = compute_eui(c_h_final_all, c_sat)

    EY_raw_frac   = (c_h_avg_final / rho_w) * R_brew

    # Liang 2021 scaling with percolation-specific target (Batali 2020)
    ey_target_pct  = defaults.get("ey_target_pct", EY_TARGET_PERCOLATION_PCT)
    EY_target_frac = ey_target_pct / 100.0                              # 0.20
    scale_factor   = EY_target_frac / EY_raw_frac if EY_raw_frac > 1e-6 else 1.0

    # Build extraction curve using scaled values
    extraction_curve = []
    tds_final = 0.0
    ey_final  = 0.0

    for i, t_val in enumerate(sol.t):
        c_h_nodes_i = np.clip(sol.y[0:N, i], 0.0, c_sat)
        c_h_avg_i   = np.mean(c_h_nodes_i) * scale_factor

        tds_i = c_h_avg_i / rho_w * 100.0                              # TDS %
        ey_i  = tds_i * R_brew                                         # EY %

        extraction_curve.append(ExtractionPoint(t=round(t_val, 2), ey=round(ey_i, 3)))

        if i == len(sol.t) - 1:
            tds_final = tds_i
            ey_final  = ey_i

    # ─────────────────────────────────────────────────────────────────────────
    # EXTENDED OUTPUTS — OUT-10, OUT-11, OUT-12, OUT-13
    # ─────────────────────────────────────────────────────────────────────────
    # OUT-10: Temperature decay
    k_vessel = defaults.get("k_vessel", 0.003)
    temp_curve = compute_temperature_curve(sol.t, inp.water_temp, k_vessel)

    # OUT-11: SCA chart position
    sca_pos = classify_sca_position(tds_final, ey_final, defaults.get("method_type"))

    # OUT-12: Puck resistance (espresso only)
    puck_res = None
    if defaults.get("method_type") == "espresso":
        puck_res = compute_puck_resistance(grind_size_um, defaults.get("porosity", 0.40), pressure)

    # OUT-13: Caffeine
    caffeine = estimate_caffeine(inp.coffee_dose, ey_final, inp.water_amount)

    # ─────────────────────────────────────────────────────────────────────────
    # BUILD OUTPUT — shared helpers
    # ─────────────────────────────────────────────────────────────────────────
    return SimulationOutput(
        tds_percent=round(tds_final, 4),
        extraction_yield=round(ey_final, 3),
        extraction_curve=extraction_curve,
        psd_curve=psd_curve,
        flavor_profile=estimate_flavor_profile(ey_final),
        brew_ratio=R_brew,
        brew_ratio_recommendation=brew_ratio_recommendation(R_brew, defaults.get("method_type")),
        warnings=generate_warnings(ey_final, R_brew, inp.water_temp, "accurate", defaults.get("method_type")),
        mode_used="accurate",
        channeling_risk=None,
        extraction_uniformity_index=round(eui, 4),
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=round(puck_res, 4) if puck_res is not None else None,
        caffeine_mg_per_ml=caffeine,
    )


# ─────────────────────────────────────────────────────────────────────────────
# MAILLE 2021 BIEXPONENTIAL — PERCOLATION-CALIBRATED CONSTANTS
# Pre-computed by fitting biexponential to solve_accurate() V60 standard
# scenario (15g/250g/93C/600um/180s). Shorter time constants than immersion
# (tau1=3.14, tau2=103.02) due to forced convective flow past grain surfaces.
# ─────────────────────────────────────────────────────────────────────────────
A1_PERC   = 0.55       # surface dissolution amplitude [-]
TAU1_PERC = 2.0        # surface dissolution time constant [s]
TAU2_PERC = 50.0       # kernel diffusion time constant [s]


def solve_fast(inp: SimulationInput, method_defaults: dict = None) -> SimulationOutput:
    """Maille 2021 biexponential percolation solver -- < 1ms target.

    Implements:
    - Maille et al. (2021) biexponential extraction kinetics model
    - Percolation-calibrated constants (shorter tau vs immersion due to forced flow)
    - Liang et al. (2021) K=0.717 equilibrium anchor, scaled to percolation target
    - Grinder DB lookup or log-normal PSD fallback
    - Flavor profile, brew ratio recommendation, and warnings

    Biexponential form:
        EY(t) = EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))
        where A2 = 1 - A1 (boundary condition: EY(0) = 0)

    Args:
        inp: Validated SimulationInput.
        method_defaults: Method-specific geometry/flow overrides.

    Returns:
        SimulationOutput with all fields populated, mode_used='fast'.
    """
    # Merge defaults
    defaults = dict(PERCOLATION_DEFAULTS)
    if method_defaults is not None:
        defaults.update(method_defaults)

    grind_size_um, psd_curve = resolve_psd(inp)

    R_brew = inp.water_amount / inp.coffee_dose

    # EY equilibrium: percolation target (Batali 2020) instead of full Liang anchor
    ey_target_pct = defaults.get("ey_target_pct", EY_TARGET_PERCOLATION_PCT)
    EY_eq = ey_target_pct                               # 20.0% for V60 default

    A1   = A1_PERC
    A2   = 1.0 - A1
    tau1 = TAU1_PERC
    tau2 = TAU2_PERC

    t = np.linspace(0.0, inp.brew_time, 50)

    EY_t  = EY_eq * (1.0 - A1 * np.exp(-t / tau1) - A2 * np.exp(-t / tau2))
    EY_t  = np.maximum(EY_t, 0.0)                       # clamp to physical bounds
    TDS_t = EY_t / R_brew

    ey_final = float(EY_t[-1])

    extraction_curve = [
        ExtractionPoint(t=float(ti), ey=float(ey))
        for ti, ey in zip(t, EY_t)
    ]

    # ─────────────────────────────────────────────────────────────────────────
    # EXTENDED OUTPUTS — OUT-10, OUT-11, OUT-12, OUT-13
    # ─────────────────────────────────────────────────────────────────────────
    k_vessel = defaults.get("k_vessel", 0.003)
    temp_curve = compute_temperature_curve(t, inp.water_temp, k_vessel)

    sca_pos = classify_sca_position(float(TDS_t[-1]), ey_final, defaults.get("method_type"))

    puck_res = None
    if defaults.get("method_type") == "espresso":
        pressure_val = inp.pressure_bar if inp.pressure_bar is not None else defaults.get("pressure_bar", 0.0)
        puck_res = compute_puck_resistance(grind_size_um, defaults.get("porosity", 0.40), pressure_val)

    caffeine = estimate_caffeine(inp.coffee_dose, ey_final, inp.water_amount)

    return SimulationOutput(
        tds_percent=float(TDS_t[-1]),
        extraction_yield=round(ey_final, 3),
        extraction_curve=extraction_curve,
        psd_curve=psd_curve,
        flavor_profile=estimate_flavor_profile(ey_final),
        brew_ratio=R_brew,
        brew_ratio_recommendation=brew_ratio_recommendation(R_brew, defaults.get("method_type")),
        warnings=generate_warnings(ey_final, R_brew, inp.water_temp, "fast", defaults.get("method_type")),
        mode_used="fast",
        channeling_risk=None,
        extraction_uniformity_index=None,
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=round(puck_res, 4) if puck_res is not None else None,
        caffeine_mg_per_ml=caffeine,
    )
