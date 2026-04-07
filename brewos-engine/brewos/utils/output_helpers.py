"""Shared output assembly helpers for all BrewOS solvers."""

from typing import List, Optional

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import FlavorProfile, PSDPoint


def resolve_psd(inp: SimulationInput) -> tuple:
    """Resolve grind size (um) and PSD list from SimulationInput.

    If grinder_name is set, loads bimodal PSD from grinder DB.
    Otherwise, uses inp.grind_size with a fallback log-normal PSD.

    Returns
    -------
    (grind_size_um: float, psd_curve: list[PSDPoint])
    """
    if inp.grinder_name is not None:
        from brewos.grinders import load_grinder
        grinder_data = load_grinder(inp.grinder_name, inp.grinder_setting)
        grind_size_um = grinder_data["median_um"]
        psd_curve = [PSDPoint(**p) for p in grinder_data["psd"]]
    else:
        grind_size_um = inp.grind_size
        from brewos.utils.psd import generate_lognormal_psd
        psd_data = generate_lognormal_psd(grind_size_um)
        psd_curve = [PSDPoint(**p) for p in psd_data]
    return grind_size_um, psd_curve


def estimate_flavor_profile(ey_percent: float) -> FlavorProfile:
    """Piecewise linear interpolation of flavor axes from EY%.

    Based on SCA extraction order:
    - Under-extracted (EY < 18%): acids dominate -> sour high
    - Ideal (18-22%): sugars dominate -> sweet high
    - Over-extracted (EY > 22%): bitter compounds dominate

    Scores are normalized so sour + sweet + bitter = 1.0.
    """
    if ey_percent < 16.0:
        sour, sweet, bitter = 0.7, 0.2, 0.1
    elif ey_percent < 18.0:
        t = (ey_percent - 16.0) / 2.0          # 0 to 1
        sour   = 0.7 - 0.4 * t                 # 0.7 -> 0.3
        sweet  = 0.2 + 0.4 * t                 # 0.2 -> 0.6
        bitter = 0.1
    elif ey_percent <= 22.0:
        sour, sweet, bitter = 0.2, 0.6, 0.2
    elif ey_percent <= 24.0:
        t = (ey_percent - 22.0) / 2.0          # 0 to 1
        sour   = 0.2 - 0.1 * t                 # 0.2 -> 0.1
        sweet  = 0.6 - 0.3 * t                 # 0.6 -> 0.3
        bitter = 0.2 + 0.4 * t                 # 0.2 -> 0.6
    else:
        sour, sweet, bitter = 0.1, 0.3, 0.6

    total = sour + sweet + bitter
    return FlavorProfile(
        sour=round(sour / total, 3),
        sweet=round(sweet / total, 3),
        bitter=round(bitter / total, 3),
    )


# Brew ratio bounds and display labels per method type.
# Each entry: (ratio_min, ratio_max, method_label, range_display)
_RATIO_BOUNDS: dict = {
    "espresso":  (1.5,  3.0,  "espresso",  "1.5-3:1"),
    "pour-over": (15.0, 17.0, "pour-over", "15-17:1"),
    "immersion": (15.0, 18.0, "immersion", "15-18:1"),
    "moka":      (6.0,  12.0, "moka pot",  "6-12:1"),
    "aeropress": (6.0,  17.0, "AeroPress", "6-17:1"),
}
_DEFAULT_RATIO_BOUNDS = _RATIO_BOUNDS["immersion"]


def generate_warnings(ey_percent: float, brew_ratio: float,
                      water_temp: float, mode_used: Optional[str] = None,
                      method_type: Optional[str] = None) -> List[str]:
    """Generate physics-based warnings."""
    warnings = []
    if ey_percent > 22.0:
        warnings.append(
            f"Over-extraction: EY {ey_percent:.1f}% exceeds 22% SCA upper bound"
        )
    if ey_percent < 18.0:
        warnings.append(
            f"Under-extraction: EY {ey_percent:.1f}% below 18% SCA lower bound"
        )
    ratio_min, ratio_max, label, range_str = _RATIO_BOUNDS.get(method_type, _DEFAULT_RATIO_BOUNDS)
    if brew_ratio < ratio_min or brew_ratio > ratio_max:
        warnings.append(
            f"Brew ratio {brew_ratio:.1f}:1 outside typical {label} range ({range_str})"
        )
    if water_temp < 90.0:
        warnings.append(
            f"Water temperature {water_temp:.0f}C below recommended 90-96C range"
        )
    if water_temp > 96.0:
        warnings.append(
            f"Water temperature {water_temp:.0f}C above recommended 90-96C range"
        )
    return warnings


def brew_ratio_recommendation(brew_ratio: float,
                              method_type: Optional[str] = None) -> str:
    """Recommend brew ratio adjustment based on method type."""
    ratio_min, ratio_max, label, range_str = _RATIO_BOUNDS.get(method_type, _DEFAULT_RATIO_BOUNDS)
    if brew_ratio < ratio_min:
        return (
            f"Ratio {brew_ratio:.1f}:1 is strong. "
            f"Consider increasing water to reach {range_str} for balanced extraction."
        )
    elif brew_ratio > ratio_max:
        return (
            f"Ratio {brew_ratio:.1f}:1 is dilute. "
            f"Consider reducing water to reach {range_str} for balanced extraction."
        )
    return f"Ratio {brew_ratio:.1f}:1 is within optimal {label} range ({range_str})."


# ─────────────────────────────────────────────────────────────────────────────
# EXTENDED OUTPUT HELPERS — OUT-07, OUT-10, OUT-11, OUT-12, OUT-13
# ─────────────────────────────────────────────────────────────────────────────

def compute_eui(c_h_final, c_sat: float) -> float:
    """Extraction uniformity index from spatial c_h variance (Moroney 2019).

    EUI = 1 - clip(std / mean, 0, 1), clamped to [0, 1].
    EUI = 1.0 means perfectly uniform across the bed.
    """
    import numpy as np
    c_norm = np.clip(c_h_final, 0.0, c_sat)
    c_mean = np.mean(c_norm)
    if c_mean < 1e-9:
        return 1.0
    return float(np.clip(1.0 - np.std(c_norm) / c_mean, 0.0, 1.0))


def compute_temperature_curve(t_eval, T_0: float, k_vessel: float,
                              T_ambient: float = 20.0):
    """Newton's Law of Cooling: T(t) = T_amb + (T_0 - T_amb) * exp(-k * t).

    k_vessel = 0.0 models isothermal vessel (active heating, e.g. moka on stove).
    """
    import numpy as np
    from brewos.models.outputs import TempPoint
    t_arr = np.asarray(t_eval, dtype=float)
    temps = T_ambient + (T_0 - T_ambient) * np.exp(-k_vessel * t_arr)
    return [TempPoint(t=round(float(t), 2), temp_c=round(float(c), 2))
            for t, c in zip(t_arr, temps)]


def classify_sca_position(tds_percent: float, ey_percent: float,
                          method_type: Optional[str] = None):
    """SCA Brew Control Chart classification.

    Standard: TDS 1.15-1.45%, EY 18-22%.
    Espresso:  TDS 8.0-12.0%, EY 18-22%.
    """
    from brewos.models.outputs import SCAPosition
    if method_type == "espresso":
        tds_lo, tds_hi = 8.0, 12.0
    else:
        tds_lo, tds_hi = 1.15, 1.45

    ey_ok  = 18.0 <= ey_percent <= 22.0
    tds_ok = tds_lo <= tds_percent <= tds_hi

    if ey_percent < 18.0:
        zone = "under_extracted"
    elif ey_percent > 22.0:
        zone = "over_extracted"
    elif tds_ok:
        zone = "ideal"
    elif tds_percent < tds_lo:
        zone = "weak"
    else:
        zone = "strong"

    on_chart = 0.5 <= tds_percent <= 20.0  # displayable range covers both espresso and drip

    return SCAPosition(
        tds_percent=round(tds_percent, 4),
        ey_percent=round(ey_percent, 3),
        zone=zone,
        on_chart=on_chart,
    )


def estimate_caffeine(coffee_dose_g: float, ey_percent: float,
                      water_volume_ml: float) -> float:
    """Empirical caffeine concentration in mg/mL.

    Based on: typical arabica 1.2% caffeine by dry mass; transfer efficiency
    proportional to EY% relative to 22% SCA upper bound. Beverage volume
    discounted by 5% for water absorbed by grounds.
    Ref: Taip et al. 2025 proportional empirical model.
    """
    CAFFEINE_FRACTION = 0.012           # 1.2% by dry mass (SCA 2019 arabica reference)
    transfer_eff = min(ey_percent / 22.0, 1.0)
    beverage_ml  = water_volume_ml * 0.95
    if beverage_ml < 1.0:
        return 0.0
    return round((coffee_dose_g * CAFFEINE_FRACTION * transfer_eff) / beverage_ml, 4)


# ─────────────────────────────────────────────────────────────────────────────
# AGTRON ROAST COLOR — SCA Gourmet scale midpoints
# Source: SCA Gourmet scale from Obsidian roast_level_parameters.md, HIGH confidence.
# ─────────────────────────────────────────────────────────────────────────────
AGTRON_MIDPOINTS: dict = {
    "light":        75,
    "medium_light": 65,
    "medium":       55,
    "medium_dark":  45,
    "dark":         35,
}


def get_agtron_number(roast_level: str) -> int:
    """Return Agtron midpoint for roast level (SCA Gourmet scale)."""
    return AGTRON_MIDPOINTS.get(roast_level, 55)  # fallback to medium


def compute_puck_resistance(grind_size_um: float, porosity: float,
                            pressure_bar: float) -> float:
    """Normalised puck resistance [0, 1], 1 = tight/resistant puck.

    Uses Kozeny-Carman permeability; normalised between a loose puck
    reference (k_high = 1e-12 m^2) and a tight puck reference (k_low = 1e-14 m^2).
    """
    from brewos.utils.params import kozeny_carman_permeability
    K_low  = 1.0e-14   # tight puck reference [m^2]
    K_high = 1.0e-12   # loose puck reference [m^2]
    k_perm = kozeny_carman_permeability(grind_size_um * 1.0e-6, porosity)
    resistance = 1.0 - (k_perm - K_low) / (K_high - K_low)
    return float(max(0.0, min(resistance, 1.0)))
