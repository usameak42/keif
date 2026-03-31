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
    "light":  {"tau_fast": 2*86400, "tau_slow": 10*86400, "A_fast": 0.4, "A_slow": 0.6, "beta": 0.15},
    "medium": {"tau_fast": 3*86400, "tau_slow": 14*86400, "A_fast": 0.5, "A_slow": 0.5, "beta": 0.20},
    "dark":   {"tau_fast": 5*86400, "tau_slow": 21*86400, "A_fast": 0.6, "A_slow": 0.4, "beta": 0.25},
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
        One of "light", "medium", "dark".
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
