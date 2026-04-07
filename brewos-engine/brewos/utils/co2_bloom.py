"""CO2 bloom modifier — Smrke 2018 bi-exponential degassing model.

Applies a multiplicative correction to the surface dissolution rate (kB)
during the bloom window. CO2 trapped in coffee grounds physically blocks
water contact, reducing extraction rate. Effect is stronger for darker
roasts and fresher beans.

Reference: Smrke et al. (2018) J. Agric. Food Chem.
"""

import math


# ─────────────────────────────────────────────────────────────────────────────
# ROAST-DEPENDENT CO2 PARAMETERS — Smrke 2018
# tau values are POST-ROAST degassing timescales (seconds)
# tau_fast: rapid initial CO2 release; tau_slow: long-term slow release
# A_fast/A_slow: amplitude fractions (must sum to 1.0)
# beta: maximum extraction suppression factor (0 = no suppression, 1 = full block)
# ─────────────────────────────────────────────────────────────────────────────
CO2_PARAMS = {
    # Tau values: Weibull-derived from Smrke 2018 Table 1, medium-speed average per tier.
    # Conversion: tau = lambda_avg_hours * 3600 * amplitude_fraction.
    # lambda averages: light=337.7h, medium_light=284.2h (interp), medium=230.7h,
    #                  medium_dark=212.8h (interp), dark=195.0h.
    # A_fast/A_slow: 0.20/0.80 from dark-fast biexponential fit (Smrke 2018).
    # Beta: proportional to CO2 content midpoint (mg/g) from Obsidian roast_level_parameters.md.
    # Scale factor: beta_medium=0.20 / CO2_medium=6.525 mg/g = 0.03065 per mg/g.
    # Medium-Light and Medium-Dark lambdas interpolated from adjacent tier averages.
    "light":        {"tau_fast": 243144, "tau_slow": 972576, "A_fast": 0.20, "A_slow": 0.80, "beta": 0.11},  # CO2 3.56 mg/g; lambda_avg 337.7h
    "medium_light": {"tau_fast": 204624, "tau_slow": 818496, "A_fast": 0.20, "A_slow": 0.80, "beta": 0.15},  # CO2 4.75 mg/g; lambda_avg 284.2h (interp)
    "medium":       {"tau_fast": 166104, "tau_slow": 664416, "A_fast": 0.20, "A_slow": 0.80, "beta": 0.20},  # CO2 6.53 mg/g; lambda_avg 230.7h
    "medium_dark":  {"tau_fast": 153216, "tau_slow": 612864, "A_fast": 0.20, "A_slow": 0.80, "beta": 0.28},  # CO2 9.00 mg/g; lambda_avg 212.8h (interp)
    "dark":         {"tau_fast": 140400, "tau_slow": 561600, "A_fast": 0.20, "A_slow": 0.80, "beta": 0.40},  # CO2 12.89 mg/g; lambda_avg 195.0h
}

# Bloom window: CO2 effect on extraction is only significant in first ~60s of brew
BLOOM_WINDOW_S = 60.0

# Characteristic time for CO2 to escape grinds during brewing (seconds)
_BLOOM_DECAY_TAU = 15.0


def co2_bloom_factor(t: float, roast_level: str, bean_age_days: float = 7.0) -> float:
    """Return kB multiplier in [0, 1] accounting for CO2 extraction suppression.

    At t=0 with fresh beans, factor < 1.0 (CO2 blocks some extraction).
    As brew time increases past bloom window, factor approaches 1.0.
    Old beans (> 30 days) have negligible CO2 — factor ~1.0 at all times.

    Parameters
    ----------
    t : float
        Brew time in seconds (0 = start of brew).
    roast_level : str
        One of "light", "medium_light", "medium", "medium_dark", "dark".
    bean_age_days : float
        Days since roast. Default 7.0 (one week post-roast).

    Returns
    -------
    float
        Multiplier for kB, range [0, 1]. Apply as: kB_eff = kB * factor.
    """
    # Unknown roast level: no suppression
    p = CO2_PARAMS.get(roast_level)
    if p is None:
        return 1.0

    # Residual CO2 fraction at bean_age_days post-roast (bi-exponential degassing)
    age_s    = bean_age_days * 86400.0
    residual = (
        p["A_fast"] * math.exp(-age_s / p["tau_fast"])
        + p["A_slow"] * math.exp(-age_s / p["tau_slow"])
    )

    # Beans fully degassed: no suppression
    if residual < 0.01:
        return 1.0

    # During bloom window, CO2 in grinds blocks water contact.
    # 15s characteristic time for CO2 to escape grinds during brewing.
    bloom_decay  = math.exp(-t / _BLOOM_DECAY_TAU)
    suppression  = p["beta"] * residual * bloom_decay

    return max(0.0, 1.0 - suppression)
