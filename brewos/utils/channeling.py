"""Lee 2023 two-pathway channeling risk score -- post-processing overlay for espresso."""


def compute_channeling_risk(
    grind_size_um: float,
    pressure_bar: float,
    bed_depth_m: float,
    porosity: float,
    delta_porosity: float = 0.05,
) -> float:
    """Compute channeling risk score (0-1) using Lee 2023 two-pathway model.

    Higher risk for: finer grind, higher pressure, shallower bed, lower porosity.
    Returns float in [0, 1]. >0.3 = moderate risk, >0.6 = high risk.

    The two-pathway model splits the bed into a high-porosity and low-porosity
    region (eps +/- delta_porosity/2) and computes Kozeny-Carman permeability
    for each. Flow imbalance between pathways, amplified by grind fineness and
    pressure, yields the risk score.

    Args:
        grind_size_um:   Median grind size in micrometres.
        pressure_bar:    Applied pressure in bar (0 for gravity, 9 for espresso).
        bed_depth_m:     Coffee bed depth in metres.
        porosity:        Bed porosity (void fraction).
        delta_porosity:  Porosity variation between two pathways.

    Returns:
        Risk score in [0, 1].
    """
    d_m = grind_size_um * 1e-6

    # Kozeny-Carman permeability for each pathway (Lee 2023 two-pathway split)
    eps1 = porosity + delta_porosity / 2
    eps2 = porosity - delta_porosity / 2
    K1 = d_m**2 * eps1**3 / (180.0 * (1.0 - eps1)**2)
    K2 = d_m**2 * eps2**3 / (180.0 * (1.0 - eps2)**2)

    # Flow ratio (Q proportional to K for same pressure drop)
    Q_total = K1 + K2
    flow_imbalance = abs(K1 - K2) / Q_total if Q_total > 0 else 0.0

    # Grind fineness factor: finer grind = lower permeability = more sensitive
    # to porosity variation. Linear scale: 100um -> 1.0, 800um -> 0.0.
    grind_factor = max(0.0, min(1.0, (800.0 - grind_size_um) / 700.0))

    # Pressure contribution: espresso (9 bar) >> pour-over (0 bar)
    # Linear: 0 bar -> 0.0, 9 bar -> 1.0
    pressure_factor = min(1.0, max(0.0, pressure_bar / 9.0))

    # Bed depth factor: shallower bed = higher risk (less averaging)
    # 20mm espresso -> 1.0, 50mm pour-over -> 0.4
    depth_factor = min(1.0, 0.020 / max(bed_depth_m, 0.005))

    # Combined risk: weighted sum of independent factors, anchored by flow imbalance
    # flow_imbalance (~0.27 for typical delta_porosity) sets the base sensitivity
    # Each factor contributes additively to scale risk up
    raw_risk = flow_imbalance * (0.3 + 0.7 * grind_factor) * (0.3 + 1.7 * pressure_factor) * (0.3 + 0.7 * depth_factor)
    risk = min(1.0, max(0.0, raw_risk))
    return round(risk, 3)
