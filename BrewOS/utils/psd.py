"Particle size distribution utilities."

import numpy as np
from scipy.stats import lognorm


def generate_lognormal_psd(median_um: float, sigma: float = 0.5,
                           n_points: int = 50) -> list:
    """Generate log-normal PSD centered on median_um.

    Used as fallback when only grind_size (um) is provided manually,
    without a grinder preset.

    Parameters
    ----------
    median_um : float
        Median particle size in microns.
    sigma : float
        Shape parameter. 0.5 is typical for a decent burr grinder.
    n_points : int
        Number of PSD bins.

    Returns
    -------
    list of {"size_um": float, "fraction": float}
        Normalized volume fractions summing to 1.0.
    """
    sizes = np.linspace(max(1.0, median_um * 0.1), median_um * 3.0, n_points)
    pdf   = lognorm.pdf(sizes, s=sigma, scale=median_um)
    total = pdf.sum()
    if total > 0:
        pdf = pdf / total
    return [{"size_um": float(sz), "fraction": float(f)} for sz, f in zip(sizes, pdf)]
