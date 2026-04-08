"Moroney 2016 well-mixed ODE + Maille 2021 biexponential"

import numpy as np
from scipy.integrate import solve_ivp

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput, ExtractionPoint
from brewos.utils.params import derive_immersion_params, K_liang, E_max, rho_w
from brewos.utils.co2_bloom import co2_bloom_factor
from brewos.utils.output_helpers import (resolve_psd, estimate_flavor_profile,
    generate_warnings, brew_ratio_recommendation,
    compute_eui, compute_temperature_curve, classify_sca_position,
    estimate_caffeine, compute_puck_resistance, get_agtron_number)


# Vessel thermal loss coefficient for French Press glass carafe (Newton's Law of Cooling)
K_VESSEL_IMMERSION = 0.0025   # 1/s


# ─────────────────────────────────────────────────────────────────────────────
# MAILLE 2021 BIEXPONENTIAL DEFAULT PARAMETERS
# Calibrated by fitting the Moroney ODE accurate-mode extraction curve
# (standard scenario: 15g/250g/93C/medium/240s, grind_size=500um).
# These are module-level defaults; override at call site for other scenarios.
# ─────────────────────────────────────────────────────────────────────────────
_A1_DEFAULT   = 0.6201      # surface dissolution amplitude [-]
_TAU1_DEFAULT = 3.14        # surface dissolution time constant [s]
_TAU2_DEFAULT = 103.02      # kernel diffusion time constant [s]


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _biexponential_steep(inp: SimulationInput, n_points: int = 100):
    """Compute biexponential steep kinetics without building SimulationOutput.

    Used by AeroPress hybrid fast path to avoid redundant Pydantic model
    construction. Returns (ey_final, extraction_curve_list) only.
    """
    EY_eq = K_liang * E_max * 100.0
    A1, A2 = _A1_DEFAULT, 1.0 - _A1_DEFAULT
    t = np.linspace(0.0, inp.brew_time, n_points)
    EY_t = np.maximum(EY_eq * (1.0 - A1 * np.exp(-t / _TAU1_DEFAULT)
                                    - A2 * np.exp(-t / _TAU2_DEFAULT)), 0.0)
    extraction_curve = [ExtractionPoint(t=float(ti), ey=float(ey))
                        for ti, ey in zip(t, EY_t)]
    return float(EY_t[-1]), extraction_curve


# ─────────────────────────────────────────────────────────────────────────────
# SOLVERS
# ─────────────────────────────────────────────────────────────────────────────

def solve_accurate(inp: SimulationInput) -> SimulationOutput:
    """Solve the Moroney 2016 3-ODE immersion system with Liang 2021 equilibrium scaling.

    Implements:
    - Moroney et al. (2016) "Coffee extraction kinetics in a well mixed system"
    - Liang et al. (2021) K=0.717 equilibrium anchor (BREWOS-TODO-001)
    - CO2 bloom modifier (Smrke 2018) applied to kB when bean_age_days is set
    - Grinder DB lookup or log-normal PSD fallback
    - Flavor profile (piecewise EY->sour/sweet/bitter)
    - Brew ratio recommendation and physics warnings

    Args:
        inp: Validated SimulationInput. Either grinder_name+setting or grind_size required.

    Returns:
        SimulationOutput with all 7 core fields populated.

    Raises:
        ValueError: If neither grind_size nor grinder_name is provided.
        RuntimeError: If the ODE solver fails to converge.
    """
    grind_size_um, psd_curve = resolve_psd(inp)

    p = derive_immersion_params(inp.coffee_dose, inp.water_amount,
                                inp.water_temp, grind_size_um,
                                roast_level=inp.roast_level.value)

    kA    = p["kA"]
    kB    = p["kB"]
    kC    = p["kC"]
    kD    = p["kD"]
    c_sat = p["c_sat"]
    c_h0  = p["c_h0"]
    c_v0  = p["c_v0"]
    psi_s0 = p["psi_s0"]

    # ─────────────────────────────────────────────────────────────────────────
    # CO2 BLOOM MODIFIER — Smrke 2018 (applied to kB when bean_age_days set)
    # bloom_fn(t) returns kB multiplier in [0, 1].
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
    # ODE FUNCTION — Moroney 2016, eqs. (2.1)-(2.3)
    # Bound clipping prevents numerical drift outside physical bounds (SOLV-08).
    # ─────────────────────────────────────────────────────────────────────────
    def moroney_ode(t: float, y: list) -> list:
        c_h, c_v, psi_s = y
        c_h   = max(0.0, min(c_h,   c_sat))
        c_v   = max(0.0, min(c_v,   c_sat))
        psi_s = max(0.0, min(psi_s, 1.0))

        kB_eff = kB * bloom_fn(t)                        # CO2 correction on surface rate

        dc_h   = -kA * (c_h - c_v) + kB_eff * (c_sat - c_h) * psi_s
        dc_v   =  kC * (c_h - c_v)     # POSITIVE: coffee diffuses grain -> bulk
        dpsi_s = -kD * (c_sat - c_h) * psi_s

        return [dc_h, dc_v, dpsi_s]

    # ─────────────────────────────────────────────────────────────────────────
    # SOLVE
    # ─────────────────────────────────────────────────────────────────────────
    t_end  = inp.brew_time
    n_pts  = max(100, int(t_end))
    t_eval = np.linspace(0.0, t_end, n_pts)

    sol = solve_ivp(
        moroney_ode, (0.0, t_end), [c_h0, c_v0, psi_s0],
        method='Radau', t_eval=t_eval,
        rtol=1e-8, atol=1e-10
    )

    if not sol.success:
        raise RuntimeError(f"ODE solver failed: {sol.message}")

    # ─────────────────────────────────────────────────────────────────────────
    # POST-PROCESSING — raw extraction
    # ─────────────────────────────────────────────────────────────────────────
    c_h_raw     = np.maximum(sol.y[0], 0.0)
    EY_raw_frac = (c_h_raw[-1] / rho_w) * (inp.water_amount / inp.coffee_dose)

    # ─────────────────────────────────────────────────────────────────────────
    # LIANG 2021 EQUILIBRIUM SCALING — BREWOS-TODO-001 (SOLV-07)
    # Anchors EY endpoint to K_liang x E_max so the model agrees with measured
    # desorption equilibrium; preserves kinetic curve shape.
    # ─────────────────────────────────────────────────────────────────────────
    EY_target_frac = K_liang * E_max                                      # 0.2151
    scale_factor   = EY_target_frac / EY_raw_frac if EY_raw_frac > 1e-6 else 1.0
    c_h_scaled     = c_h_raw * scale_factor

    # Observables
    R_brew   = inp.water_amount / inp.coffee_dose
    TDS_pct  = c_h_scaled / rho_w * 100.0      # array [%]
    EY_pct   = TDS_pct * R_brew                # array [%]

    ey_final = float(EY_pct[-1])

    # ─────────────────────────────────────────────────────────────────────────
    # BUILD OUTPUT — all 7 fields + extended outputs
    # ─────────────────────────────────────────────────────────────────────────
    extraction_curve = [
        ExtractionPoint(t=float(t), ey=float(ey))
        for t, ey in zip(sol.t, EY_pct)
    ]

    tds_final = float(TDS_pct[-1])

    # OUT-07: Immersion is well-mixed — EUI=1.0 by assumption (no spatial nodes)
    eui = 1.0

    # OUT-10: Temperature decay using module-level vessel constant
    temp_curve = compute_temperature_curve(sol.t, inp.water_temp, K_VESSEL_IMMERSION)

    # OUT-11: SCA chart position (immersion methods use standard drip bounds)
    sca_pos = classify_sca_position(tds_final, ey_final)

    # OUT-13: Caffeine
    caffeine = estimate_caffeine(inp.coffee_dose, ey_final, inp.water_amount)

    return SimulationOutput(
        tds_percent=tds_final,
        extraction_yield=ey_final,
        extraction_curve=extraction_curve,
        psd_curve=psd_curve,
        flavor_profile=estimate_flavor_profile(ey_final),
        brew_ratio=R_brew,
        brew_ratio_recommendation=brew_ratio_recommendation(R_brew),
        warnings=generate_warnings(ey_final, R_brew, inp.water_temp),
        mode_used="accurate",
        extraction_uniformity_index=round(eui, 4),
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=None,
        caffeine_mg_per_ml=caffeine,
        agtron_number=get_agtron_number(inp.roast_level.value),
    )


def solve_fast(inp: SimulationInput) -> SimulationOutput:
    """Maille 2021 biexponential immersion solver -- < 1ms target.

    Implements:
    - Maille et al. (2021) biexponential extraction kinetics model
    - Liang et al. (2021) K=0.717 equilibrium anchor (EY_eq = K_liang * E_max)
    - Grinder DB lookup or log-normal PSD fallback
    - Flavor profile, brew ratio recommendation, and warnings

    Biexponential form:
        EY(t) = EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))
        where A2 = 1 - A1 (boundary condition: EY(0) = 0)

    Default A1/tau1/tau2 are calibrated against the Moroney ODE accurate-mode
    curve for the standard scenario (15g/250g/93C/medium/240s, 500um grind).

    Args:
        inp: Validated SimulationInput. Either grinder_name+setting or grind_size required.

    Returns:
        SimulationOutput with all 7 core fields populated, mode_used='fast'.
    """
    _grind_size_um, psd_curve = resolve_psd(inp)

    R_brew  = inp.water_amount / inp.coffee_dose
    EY_eq   = K_liang * E_max * 100.0          # 21.51% — Liang 2021 equilibrium anchor

    A1   = _A1_DEFAULT
    A2   = 1.0 - A1
    tau1 = _TAU1_DEFAULT
    tau2 = _TAU2_DEFAULT

    t = np.linspace(0.0, inp.brew_time, 100)

    EY_t   = EY_eq * (1.0 - A1 * np.exp(-t / tau1) - A2 * np.exp(-t / tau2))
    EY_t   = np.maximum(EY_t, 0.0)             # clamp to physical bounds
    TDS_t  = EY_t / R_brew

    ey_final = float(EY_t[-1])

    extraction_curve = [
        ExtractionPoint(t=float(ti), ey=float(ey))
        for ti, ey in zip(t, EY_t)
    ]

    # Extended outputs
    eui = 1.0
    t_eval_fast = np.linspace(0.0, inp.brew_time, 50)
    temp_curve = compute_temperature_curve(t_eval_fast, inp.water_temp, K_VESSEL_IMMERSION)
    sca_pos = classify_sca_position(float(TDS_t[-1]), ey_final)
    caffeine = estimate_caffeine(inp.coffee_dose, ey_final, inp.water_amount)

    return SimulationOutput(
        tds_percent=float(TDS_t[-1]),
        extraction_yield=ey_final,
        extraction_curve=extraction_curve,
        psd_curve=psd_curve,
        flavor_profile=estimate_flavor_profile(ey_final),
        brew_ratio=R_brew,
        brew_ratio_recommendation=brew_ratio_recommendation(R_brew),
        warnings=generate_warnings(ey_final, R_brew, inp.water_temp),
        mode_used="fast",
        extraction_uniformity_index=round(eui, 4),
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=None,
        caffeine_mg_per_ml=caffeine,
        agtron_number=get_agtron_number(inp.roast_level.value),
    )
