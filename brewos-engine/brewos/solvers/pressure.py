"""Moka Pot 6-ODE thermo-fluid system — Siregar 2026 + Moroney 2016 extraction kinetics."""

import numpy as np
from scipy.integrate import solve_ivp

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput, ExtractionPoint
from brewos.utils.params import (derive_immersion_params, kozeny_carman_permeability, rho_w, K_liang, E_max,
                                  ROAST_DENSITY, MOISTURE_CONTENT)
from brewos.utils.co2_bloom import co2_bloom_factor
from brewos.utils.output_helpers import (resolve_psd, estimate_flavor_profile,
    generate_warnings, brew_ratio_recommendation,
    compute_eui, compute_temperature_curve, classify_sca_position,
    estimate_caffeine, compute_puck_resistance, get_agtron_number)


# ─────────────────────────────────────────────────────────────────────────────
# THERMODYNAMIC CONSTANTS — Clausius-Clapeyron steam pressure
# ─────────────────────────────────────────────────────────────────────────────
R_GAS  = 8.314          # J/(mol*K) — universal gas constant
L_V    = 40660.0        # J/mol — latent heat of vaporization for water
T_REF  = 373.15         # K (100C) — boiling point reference
P_REF  = 101325.0       # Pa (1 atm)
C_PW   = 4186.0         # J/(kg*K) — specific heat of water

# ─────────────────────────────────────────────────────────────────────────────
# VISCOSITY — Arrhenius-like water viscosity model
# ─────────────────────────────────────────────────────────────────────────────
MU_REF    = 0.3e-3      # Pa*s at 93C (reference viscosity)
T_MU_REF  = 93.0 + 273.15  # K
B_MU      = 2200.0      # activation energy / R [K]

# ─────────────────────────────────────────────────────────────────────────────
# MAILLE 2021 BIEXPONENTIAL — MOKA-CALIBRATED CONSTANTS
# Shorter than immersion (pressure drives flow) but longer than espresso
# (lower pressure ~1.5 bar vs 9 bar, coarser grind).
# ─────────────────────────────────────────────────────────────────────────────
A1_MOKA   = 0.50        # surface dissolution amplitude [-]
TAU1_MOKA = 8.0         # surface dissolution time constant [s]
TAU2_MOKA = 80.0        # kernel diffusion time constant [s]

# ─────────────────────────────────────────────────────────────────────────────
# MOKA POT EY TARGET — mid-range for typical moka pot extraction.
# Lower than immersion (K_liang * E_max = 21.51%) due to shorter contact
# time and lower water-to-coffee ratio (6-10:1 vs 15-18:1).
# ─────────────────────────────────────────────────────────────────────────────
EY_TARGET_MOKA_PCT = 18.0

# ─────────────────────────────────────────────────────────────────────────────
# PRESSURE DEFAULTS — 3-cup Bialetti Moka Pot geometry + thermal params
# ─────────────────────────────────────────────────────────────────────────────
PRESSURE_DEFAULTS = {
    "bed_depth_m":    0.005,       # 5mm moka pot filter basket
    "bed_diameter_m": 0.070,       # 3-cup Bialetti
    "porosity":       0.38,
    "method_type":    "moka",
    "ey_target_pct":  18.0,        # mid-range moka EY
    "Q_heater_W":     800.0,       # medium stove burner
    "m_water_g":      150.0,       # 3-cup fill
    "h_loss":         10.0,        # W/(m^2*K) aluminum pot
    "A_surface_m2":   0.020,       # external surface area
    "T_ambient_C":    22.0,
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def steam_pressure_pa(T_celsius: float) -> float:
    """Clausius-Clapeyron steam pressure at temperature T.

    Source: Standard thermodynamics (Antoine equation simplified).
    P = P_ref * exp(L_v/R * (1/T_ref - 1/T))
    """
    T_K = T_celsius + 273.15
    return P_REF * np.exp(L_V / R_GAS * (1.0 / T_REF - 1.0 / T_K))


def water_viscosity(T_celsius: float) -> float:
    """Water dynamic viscosity [Pa*s] using Arrhenius-like model.

    Source: Water properties handbook. Arrhenius form:
    mu = mu_ref * exp(B_mu * (1/T - 1/T_ref))
    """
    T_K = T_celsius + 273.15
    return MU_REF * np.exp(B_MU * (1.0 / T_K - 1.0 / T_MU_REF))


# ─────────────────────────────────────────────────────────────────────────────
# ACCURATE MODE — 6-ODE Moka Pot thermo-fluid system
# ─────────────────────────────────────────────────────────────────────────────

def solve_accurate(inp: SimulationInput, method_defaults: dict = None) -> SimulationOutput:
    """Moka Pot 6-ODE thermo-fluid system with Moroney extraction kinetics.

    State variables: [T, V_ext, c_h, c_v, psi_s, M_cup]
    - T: water temperature in lower chamber [C]
    - V_ext: cumulative volume extracted through bed [m^3]
    - c_h: intergranular concentration [kg/m^3]
    - c_v: intragranular concentration [kg/m^3]
    - psi_s: surface depletion fraction [0,1]
    - M_cup: total dissolved solids mass in upper cup [kg]

    Physics:
    - Clausius-Clapeyron steam pressure drives Darcy flow through coffee bed
    - Moroney 2016 extraction kinetics with advective loss term
    - Kozeny-Carman bed permeability
    - Energy balance with stove heating and ambient heat loss

    Args:
        inp: Validated SimulationInput.
        method_defaults: Geometry/thermal overrides (optional).

    Returns:
        SimulationOutput with all fields populated.

    Raises:
        RuntimeError: If the ODE solver fails to converge.
    """
    # ─────────────────────────────────────────────────────────────────────────
    # MERGE DEFAULTS
    # ─────────────────────────────────────────────────────────────────────────
    defaults = dict(PRESSURE_DEFAULTS)
    if method_defaults is not None:
        defaults.update(method_defaults)

    # ─────────────────────────────────────────────────────────────────────────
    # RESOLVE PSD AND MORONEY PARAMETERS
    # ─────────────────────────────────────────────────────────────────────────
    grind_size_um, psd_curve = resolve_psd(inp)

    p = derive_immersion_params(inp.coffee_dose, inp.water_amount,
                                inp.water_temp, grind_size_um,
                                roast_level=inp.roast_level.value)

    kA     = p["kA"]
    kB     = p["kB"]
    kC     = p["kC"]
    kD     = p["kD"]
    c_sat  = p["c_sat"]
    c_v0   = p["c_v0"]
    psi_s0 = p["psi_s0"]

    # ─────────────────────────────────────────────────────────────────────────
    # BED GEOMETRY AND PERMEABILITY
    # ─────────────────────────────────────────────────────────────────────────
    d_particle_m = grind_size_um * 1e-6
    porosity     = defaults["porosity"]
    K_bed        = kozeny_carman_permeability(d_particle_m, porosity)
    L_bed        = defaults["bed_depth_m"]
    A_bed        = np.pi * (defaults["bed_diameter_m"] / 2.0) ** 2
    V_bed_pore   = A_bed * L_bed * porosity

    # ─────────────────────────────────────────────────────────────────────────
    # THERMAL PARAMETERS
    # ─────────────────────────────────────────────────────────────────────────
    Q_heater   = defaults["Q_heater_W"]
    m_w0_kg    = defaults["m_water_g"] * 1e-3      # initial water mass [kg]
    h_loss     = defaults["h_loss"]
    A_surface  = defaults["A_surface_m2"]
    T_ambient  = defaults["T_ambient_C"]

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
    # INITIAL CONDITIONS — 6-ODE state vector
    # [T, V_ext, c_h, c_v, psi_s, M_cup]
    # ─────────────────────────────────────────────────────────────────────────
    T0 = inp.water_temp                          # starting water temp [C]
    y0 = [T0, 0.0, 0.0, c_v0, psi_s0, 0.0]

    # ─────────────────────────────────────────────────────────────────────────
    # ODE FUNCTION — Moka Pot 6-ODE system
    # Bound clipping prevents numerical drift outside physical bounds (SOLV-08).
    # ─────────────────────────────────────────────────────────────────────────
    V_DARCY_MAX = 5.0e-3                         # 5 mm/s cap (same as percolation)

    def moka_pot_ode(t, y):
        T, V_ext, c_h, c_v, psi_s, M_cup = y

        # Clip to physical bounds
        T      = max(T, 20.0)
        V_ext  = max(V_ext, 0.0)
        c_h    = max(0.0, min(c_h, c_sat))
        c_v    = max(0.0, min(c_v, c_sat))
        psi_s  = max(0.0, min(psi_s, 1.0))
        M_cup  = max(M_cup, 0.0)

        # Remaining water mass in lower chamber
        m_w = max(m_w0_kg - rho_w * V_ext, 0.01)

        # Steam pressure (Clausius-Clapeyron)
        P_steam = steam_pressure_pa(T)
        dp_net  = max(P_steam - P_REF, 0.0)

        # Darcy flow through coffee bed
        mu = water_viscosity(T)
        q  = K_bed / mu * dp_net / L_bed
        q  = min(q, V_DARCY_MAX)                 # cap velocity

        # Temperature evolution: stove heating - ambient losses
        dT = (Q_heater - h_loss * A_surface * (T - T_ambient)) / (m_w * C_PW)

        # Volume extracted through bed
        dV = q * A_bed

        # Wetting fraction: coffee bed is not immersed in water initially.
        # Extraction kinetics activate proportionally to how much water
        # has passed through the bed pore volume.
        w = min(V_ext / max(V_bed_pore, 1e-9), 1.0)

        # Moroney extraction with advective loss and wetting-coupled kinetics
        kB_eff = kB * bloom_fn(t)
        dc_h = (w * (-kA * (c_h - c_v)
                + kB_eff * (c_sat - c_h) * psi_s)
                - (q / max(V_bed_pore, 1e-9)) * c_h)

        dc_v   =  w * kC * (c_h - c_v)
        dpsi_s = -w * kD * (c_sat - c_h) * psi_s

        # Cup accumulation: mass of dissolved solids carried out
        dM_cup = q * A_bed * c_h

        return [dT, dV, dc_h, dc_v, dpsi_s, dM_cup]

    # ─────────────────────────────────────────────────────────────────────────
    # TERMINATION EVENT — stop when 95% of water exhausted
    # ─────────────────────────────────────────────────────────────────────────
    def water_exhausted(t, y):
        return m_w0_kg - rho_w * y[1] - 0.05 * m_w0_kg

    water_exhausted.terminal  = True
    water_exhausted.direction = -1

    # ─────────────────────────────────────────────────────────────────────────
    # SOLVE
    # ─────────────────────────────────────────────────────────────────────────
    t_end  = inp.brew_time
    t_eval = np.linspace(0.0, t_end, 100)

    with np.errstate(divide='ignore', invalid='ignore'):
        sol = solve_ivp(
            moka_pot_ode, (0.0, t_end), y0,
            method='Radau', t_eval=t_eval,
            rtol=1e-6, atol=1e-8,
            events=[water_exhausted],
        )

    if not sol.success:
        raise RuntimeError(f"Moka Pot ODE solve failed: {sol.message}")

    # ─────────────────────────────────────────────────────────────────────────
    # POST-PROCESSING — M_cup based EY with Liang-style equilibrium scaling
    # For moka pot, M_cup (total dissolved mass in cup) is the correct
    # observable: EY = M_cup / coffee_dose * 100%.
    # ─────────────────────────────────────────────────────────────────────────
    R_brew      = inp.water_amount / inp.coffee_dose
    coffee_mass = inp.coffee_dose * 1e-3           # kg

    # M_cup(t) from state index 5 — monotonically increasing
    M_cup_raw = np.maximum(sol.y[5], 0.0)
    EY_raw_pct = M_cup_raw / coffee_mass * 100.0   # raw EY% array

    # Scale to moka-specific EY target (Liang-style anchor)
    ey_target_pct   = defaults.get("ey_target_pct", EY_TARGET_MOKA_PCT)
    EY_raw_final    = float(EY_raw_pct[-1]) if EY_raw_pct[-1] > 1e-6 else 1.0
    scale_factor    = ey_target_pct / EY_raw_final

    EY_pct = EY_raw_pct * scale_factor
    ey_final = float(EY_pct[-1])

    # TDS for moka pot: dissolved mass in cup / total water that made it through
    V_ext_final = max(float(sol.y[1, -1]), 1e-9)  # m^3 of water extracted
    M_water_cup = rho_w * V_ext_final              # kg of water in cup
    tds_final   = float(M_cup_raw[-1] * scale_factor / M_water_cup * 100.0) if M_water_cup > 1e-9 else 0.0

    # Build extraction curve — handle early termination from water exhaustion.
    # If solver stopped early, extend the curve with flat final values to
    # cover the full requested brew time.
    sol_times = list(sol.t)
    sol_eys   = list(EY_pct)

    if len(sol_times) > 0 and sol_times[-1] < inp.brew_time * 0.99:
        # Solver terminated early — pad with final EY values
        t_end_actual = sol_times[-1]
        n_pad = max(1, int(100 * (inp.brew_time - t_end_actual) / inp.brew_time))
        t_pad = np.linspace(t_end_actual + 0.01, inp.brew_time, n_pad)
        sol_times.extend(t_pad.tolist())
        sol_eys.extend([float(EY_pct[-1])] * n_pad)

    extraction_curve = [
        ExtractionPoint(t=round(float(t_val), 2), ey=round(float(ey_val), 3))
        for t_val, ey_val in zip(sol_times, sol_eys)
    ]

    # ─────────────────────────────────────────────────────────────────────────
    # EXTENDED OUTPUTS — OUT-10, OUT-11, OUT-13
    # ─────────────────────────────────────────────────────────────────────────
    k_vessel = defaults.get("k_vessel", 0.0)
    temp_curve = compute_temperature_curve(sol.t, inp.water_temp, k_vessel)
    sca_pos = classify_sca_position(tds_final, ey_final, defaults.get("method_type"))
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
        extraction_uniformity_index=None,
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=None,
        caffeine_mg_per_ml=caffeine,
        agtron_number=get_agtron_number(inp.roast_level.value),
    )


# ─────────────────────────────────────────────────────────────────────────────
# FAST MODE — Maille 2021 biexponential with moka-calibrated constants
# ─────────────────────────────────────────────────────────────────────────────

def solve_fast(inp: SimulationInput, method_defaults: dict = None) -> SimulationOutput:
    """Maille 2021 biexponential moka pot solver -- < 1ms target.

    Biexponential form:
        EY(t) = EY_eq * (1 - A1*exp(-t/tau1) - A2*exp(-t/tau2))
        where A2 = 1 - A1 (boundary condition: EY(0) = 0)

    Moka-calibrated constants: shorter than immersion (pressure drives flow)
    but longer than espresso (lower pressure ~1.5 bar vs 9 bar).

    Args:
        inp: Validated SimulationInput.
        method_defaults: Geometry/thermal overrides (optional).

    Returns:
        SimulationOutput with all fields populated, mode_used='fast'.
    """
    # Merge defaults
    defaults = dict(PRESSURE_DEFAULTS)
    if method_defaults is not None:
        defaults.update(method_defaults)

    grind_size_um, psd_curve = resolve_psd(inp)

    R_brew = inp.water_amount / inp.coffee_dose

    # EY equilibrium: moka-specific target
    ey_target_pct = defaults.get("ey_target_pct", EY_TARGET_MOKA_PCT)
    EY_eq = ey_target_pct                           # 18.0% for moka default
    # Roast-level corrections: density → soluble mass; moisture → extractable fraction
    _roast          = inp.roast_level.value
    _density_factor  = ROAST_DENSITY.get(_roast, 370.0) / 370.0
    _moisture_factor = (1.0 - MOISTURE_CONTENT.get(_roast, 0.022)) / (1.0 - 0.022)
    EY_eq *= _density_factor * _moisture_factor
    if inp.bean_age_days is not None:
        EY_eq *= co2_bloom_factor(0.0, _roast, inp.bean_age_days)

    A1   = A1_MOKA
    A2   = 1.0 - A1
    tau1 = TAU1_MOKA
    tau2 = TAU2_MOKA

    t = np.linspace(0.0, inp.brew_time, 50)

    EY_t  = EY_eq * (1.0 - A1 * np.exp(-t / tau1) - A2 * np.exp(-t / tau2))
    EY_t  = np.maximum(EY_t, 0.0)                   # clamp to physical bounds
    TDS_t = EY_t / R_brew

    ey_final = float(EY_t[-1])

    extraction_curve = [
        ExtractionPoint(t=float(ti), ey=float(ey))
        for ti, ey in zip(t, EY_t)
    ]

    # Extended outputs
    k_vessel = defaults.get("k_vessel", 0.0)
    temp_curve = compute_temperature_curve(t, inp.water_temp, k_vessel)
    sca_pos = classify_sca_position(float(TDS_t[-1]), ey_final, defaults.get("method_type"))
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
        extraction_uniformity_index=None,
        temperature_curve=temp_curve,
        sca_position=sca_pos,
        puck_resistance=None,
        caffeine_mg_per_ml=caffeine,
        agtron_number=get_agtron_number(inp.roast_level.value),
    )
