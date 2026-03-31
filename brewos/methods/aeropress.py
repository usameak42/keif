"""AeroPress -- hybrid orchestration: immersion steep -> pressure push pipeline."""

import numpy as np
from scipy.integrate import solve_ivp

from brewos.models.inputs import SimulationInput, Mode
from brewos.models.outputs import SimulationOutput, ExtractionPoint
from brewos.solvers.immersion import solve_accurate as immersion_accurate, solve_fast as immersion_fast, _biexponential_steep
from brewos.utils.params import kozeny_carman_permeability, K_liang, E_max, rho_w
from brewos.utils.output_helpers import (resolve_psd, estimate_flavor_profile,
    generate_warnings, brew_ratio_recommendation,
    compute_eui, compute_temperature_curve, classify_sca_position,
    estimate_caffeine, compute_puck_resistance)


# ─────────────────────────────────────────────────────────────────────────────
# AEROPRESS DEFAULTS — standard recipe geometry and timing
# ─────────────────────────────────────────────────────────────────────────────
AEROPRESS_DEFAULTS = {
    "steep_time_s":       60.0,       # typical AeroPress steep
    "push_time_s":        30.0,       # plunge duration
    "push_pressure_bar":  0.5,        # manual hand pressure
    "bed_depth_m":        0.030,      # AeroPress chamber depth
    "bed_diameter_m":     0.063,      # AeroPress inner diameter
    "porosity":           0.40,
    "method_type":        "aeropress",
    "ey_target_pct":      19.0,
    "k_vessel":           0.0020,   # Newton cooling coefficient [1/s] — plastic chamber
}


# ─────────────────────────────────────────────────────────────────────────────
# ACCURATE MODE — immersion steep (Moroney ODE) + pressure push (1-ODE Darcy)
# ─────────────────────────────────────────────────────────────────────────────

def _solve_hybrid_accurate(inp: SimulationInput) -> SimulationOutput:
    """AeroPress accurate hybrid: steep via immersion ODE, push via Darcy advection ODE.

    Phase 1 (steep): Call immersion.solve_accurate() with steep_time_s.
    Phase 2 (push):  1-ODE advective washout during plunger push.
    Combine: raw total EY = steep EY + push increment, then scale to AeroPress target.
    """
    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1: IMMERSION STEEP — delegate to Moroney 2016 ODE solver
    # DECISION-005: do NOT reimplement the Moroney ODE
    # ─────────────────────────────────────────────────────────────────────────
    steep_inp = inp.model_copy(update={
        "brew_time": AEROPRESS_DEFAULTS["steep_time_s"],
    })
    steep_result = immersion_accurate(steep_inp)
    ey_steep = steep_result.extraction_yield          # %

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 2: PRESSURE PUSH — Darcy flow advective washout
    # ─────────────────────────────────────────────────────────────────────────
    grind_size_um, psd_curve = resolve_psd(inp)

    d_particle_m = grind_size_um * 1e-6
    porosity     = AEROPRESS_DEFAULTS["porosity"]
    K_bed        = kozeny_carman_permeability(d_particle_m, porosity)
    mu           = 0.3e-3                              # water viscosity at 93C [Pa*s]
    L_bed        = AEROPRESS_DEFAULTS["bed_depth_m"]
    d_bed        = AEROPRESS_DEFAULTS["bed_diameter_m"]
    A_bed        = np.pi * (d_bed / 2.0) ** 2
    V_pore       = A_bed * L_bed * porosity

    push_pressure = AEROPRESS_DEFAULTS["push_pressure_bar"]
    push_time     = AEROPRESS_DEFAULTS["push_time_s"]

    # Darcy superficial velocity [m/s]
    q = K_bed / mu * (push_pressure * 1e5) / L_bed
    q = min(q, 5.0e-3)                                # cap at 5 mm/s

    # Initial intergranular concentration from steep EY
    R_brew = inp.water_amount / inp.coffee_dose
    c_h0_push = ey_steep / 100.0 * rho_w / R_brew

    # 1-ODE: advective washout during push
    # dc_h/dt = -(q / V_pore) * c_h  (solubles carried out of bed)
    washout_rate = q / max(V_pore, 1e-9)

    def push_ode(t, y):
        c_h = max(y[0], 0.0)
        return [-washout_rate * c_h]

    t_push = np.linspace(0.0, push_time, 50)

    sol = solve_ivp(
        push_ode, (0.0, push_time), [c_h0_push],
        method='Radau', t_eval=t_push,
        rtol=1e-8, atol=1e-10,
    )

    if not sol.success:
        raise RuntimeError(f"AeroPress push ODE failed: {sol.message}")

    # Push extraction increment: mass washed out of pore volume
    c_h_push = np.maximum(sol.y[0], 0.0)
    delta_c_h = c_h0_push - float(c_h_push[-1])       # concentration drop [kg/m3]
    coffee_mass_kg = inp.coffee_dose * 1e-3            # kg
    push_ey_increment = delta_c_h * V_pore / coffee_mass_kg * 100.0

    # ─────────────────────────────────────────────────────────────────────────
    # COMBINE — raw total EY, then scale to AeroPress target
    # The immersion solver applies Liang scaling (21.51% for full immersion).
    # AeroPress has its own target (19%) reflecting shorter contact + lower
    # brew ratio. We rescale the combined raw kinetics to this target,
    # preserving the steep-vs-push proportion. This is the same pattern used
    # by the moka pot solver.
    # ─────────────────────────────────────────────────────────────────────────
    raw_total = ey_steep + max(push_ey_increment, 0.0)
    ey_target = AEROPRESS_DEFAULTS["ey_target_pct"]
    scale = ey_target / raw_total if raw_total > 1e-6 else 1.0

    total_ey = min(raw_total * scale, E_max * 100.0)   # == ey_target (unless clamped)
    ey_steep_scaled = ey_steep * scale

    # TDS from total EY
    tds_pct = total_ey / R_brew

    # ─────────────────────────────────────────────────────────────────────────
    # BUILD EXTRACTION CURVE — steep curve (scaled) + push phase extension
    # ─────────────────────────────────────────────────────────────────────────
    steep_curve_scaled = [
        ExtractionPoint(t=pt.t, ey=round(pt.ey * scale, 3))
        for pt in steep_result.extraction_curve
    ]
    t_offset = AEROPRESS_DEFAULTS["steep_time_s"]

    push_ey_t = []
    for i, ti in enumerate(t_push):
        delta_at_t = (c_h0_push - float(c_h_push[i])) * V_pore / coffee_mass_kg * 100.0
        raw_ey_at_t = ey_steep + max(delta_at_t, 0.0)
        scaled_ey_at_t = min(raw_ey_at_t * scale, E_max * 100.0)
        push_ey_t.append(ExtractionPoint(
            t=round(t_offset + float(ti), 2),
            ey=round(scaled_ey_at_t, 3),
        ))

    extraction_curve = steep_curve_scaled + push_ey_t

    # ─────────────────────────────────────────────────────────────────────────
    # EXTENDED OUTPUTS
    # ─────────────────────────────────────────────────────────────────────────
    combined_t_eval = [pt.t for pt in extraction_curve]
    k_vessel = AEROPRESS_DEFAULTS.get("k_vessel", 0.002)
    temp_curve = compute_temperature_curve(combined_t_eval, inp.water_temp, k_vessel)
    sca_pos = classify_sca_position(tds_pct, total_ey)   # standard bounds
    caffeine = estimate_caffeine(inp.coffee_dose, total_ey, inp.water_amount)

    # ─────────────────────────────────────────────────────────────────────────
    # BUILD OUTPUT — shared helpers
    # ─────────────────────────────────────────────────────────────────────────
    return SimulationOutput(
        tds_percent=round(tds_pct, 4),
        extraction_yield=round(total_ey, 3),
        extraction_curve=extraction_curve,
        psd_curve=psd_curve,
        flavor_profile=estimate_flavor_profile(total_ey),
        brew_ratio=R_brew,
        brew_ratio_recommendation=brew_ratio_recommendation(R_brew, AEROPRESS_DEFAULTS["method_type"]),
        warnings=generate_warnings(total_ey, R_brew, inp.water_temp, "accurate", AEROPRESS_DEFAULTS["method_type"]),
        mode_used="accurate",
        extraction_uniformity_index=1.0,
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=None,
        caffeine_mg_per_ml=caffeine,
    )


# ─────────────────────────────────────────────────────────────────────────────
# FAST MODE — biexponential steep + push increment
# ─────────────────────────────────────────────────────────────────────────────

# AeroPress-calibrated biexponential constants for push phase.
# Moderate pressure vs moka pot (0.5 bar vs 1.5 bar).
_A1_PUSH   = 0.55
_TAU1_PUSH = 4.0          # surface dissolution [s]
_TAU2_PUSH = 60.0         # kernel diffusion [s]

def _solve_hybrid_fast(inp: SimulationInput) -> SimulationOutput:
    """AeroPress fast hybrid: biexponential steep + push increment.

    Phase 1 (steep): Call immersion.solve_fast() with steep_time_s.
    Phase 2 (push): Biexponential model for push contribution above steep.
    Combine: total EY = steep EY + push increment, targeting ey_target_pct.
    """
    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 1: IMMERSION STEEP — biexponential kinetics (no full SimulationOutput)
    # Use lightweight helper to avoid redundant Pydantic model construction.
    # ─────────────────────────────────────────────────────────────────────────
    steep_inp = inp.model_copy(update={
        "brew_time": AEROPRESS_DEFAULTS["steep_time_s"],
    })
    ey_steep, steep_curve_raw = _biexponential_steep(steep_inp)

    # ─────────────────────────────────────────────────────────────────────────
    # PHASE 2: PUSH INCREMENT — biexponential washout of remaining solubles
    # The push phase extracts additional solubles from the bed via pressure.
    # Model: a fraction of the remaining extractable solubles (E_max*100 - ey_steep)
    # is washed out following biexponential kinetics during push_time.
    # ─────────────────────────────────────────────────────────────────────────
    ey_target = AEROPRESS_DEFAULTS["ey_target_pct"]
    push_time = AEROPRESS_DEFAULTS["push_time_s"]

    A1   = _A1_PUSH
    A2   = 1.0 - A1
    tau1 = _TAU1_PUSH
    tau2 = _TAU2_PUSH

    # Fraction of remaining solubles extracted during push
    frac_extracted = 1.0 - A1 * np.exp(-push_time / tau1) - A2 * np.exp(-push_time / tau2)
    remaining_ey = ey_target - ey_steep                # headroom to target
    push_increment = max(remaining_ey * frac_extracted, 0.0) if remaining_ey > 0 else 0.0

    # ─────────────────────────────────────────────────────────────────────────
    # COMBINE
    # ─────────────────────────────────────────────────────────────────────────
    total_ey = ey_steep + push_increment
    total_ey = min(total_ey, E_max * 100.0)

    R_brew  = inp.water_amount / inp.coffee_dose
    tds_pct = total_ey / R_brew

    # ─────────────────────────────────────────────────────────────────────────
    # BUILD EXTRACTION CURVE — steep curve + push phase points
    # ─────────────────────────────────────────────────────────────────────────
    _grind_size_um, psd_curve = resolve_psd(inp)

    steep_curve = steep_curve_raw
    t_offset = AEROPRESS_DEFAULTS["steep_time_s"]

    n_push = 20
    t_push = np.linspace(0.0, push_time, n_push)
    push_points = []
    for ti in t_push:
        frac_t = 1.0 - A1 * np.exp(-ti / tau1) - A2 * np.exp(-ti / tau2)
        inc_t = max(remaining_ey * frac_t, 0.0) if remaining_ey > 0 else 0.0
        ey_t = min(ey_steep + inc_t, E_max * 100.0)
        push_points.append(ExtractionPoint(
            t=round(t_offset + float(ti), 2),
            ey=round(ey_t, 3),
        ))

    extraction_curve = list(steep_curve) + push_points

    # Extended outputs
    combined_t_eval = [pt.t for pt in extraction_curve]
    k_vessel = AEROPRESS_DEFAULTS.get("k_vessel", 0.002)
    temp_curve = compute_temperature_curve(combined_t_eval, inp.water_temp, k_vessel)
    sca_pos = classify_sca_position(tds_pct, total_ey)
    caffeine = estimate_caffeine(inp.coffee_dose, total_ey, inp.water_amount)

    return SimulationOutput(
        tds_percent=round(tds_pct, 4),
        extraction_yield=round(total_ey, 3),
        extraction_curve=extraction_curve,
        psd_curve=psd_curve,
        flavor_profile=estimate_flavor_profile(total_ey),
        brew_ratio=R_brew,
        brew_ratio_recommendation=brew_ratio_recommendation(R_brew, AEROPRESS_DEFAULTS["method_type"]),
        warnings=generate_warnings(total_ey, R_brew, inp.water_temp, "fast", AEROPRESS_DEFAULTS["method_type"]),
        mode_used="fast",
        extraction_uniformity_index=1.0,
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=None,
        caffeine_mg_per_ml=caffeine,
    )


# ─────────────────────────────────────────────────────────────────────────────
# DISPATCHER
# ─────────────────────────────────────────────────────────────────────────────

def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run AeroPress hybrid simulation (immersion steep + pressure push).

    Dispatches to accurate or fast mode based on inp.mode.

    Args:
        inp: Validated SimulationInput with AeroPress parameters.

    Returns:
        SimulationOutput with all fields populated.
    """
    if inp.mode == Mode.accurate:
        return _solve_hybrid_accurate(inp)
    else:
        return _solve_hybrid_fast(inp)
