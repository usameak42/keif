"BrewOS grinder database loader."

import json
from pathlib import Path
from typing import List

import numpy as np
from scipy.stats import lognorm


GRINDER_DIR = Path(__file__).parent


def load_grinder(name: str, setting: int) -> dict:
    """Load grinder PSD data from JSON preset.

    Parameters
    ----------
    name : str
        Grinder model name (e.g., "Comandante C40 MK4").
    setting : int
        Click/notch setting on the grinder.

    Returns
    -------
    dict with keys:
        "median_um": float — median particle size in microns
        "psd": list of {"size_um": float, "fraction": float}

    Raises
    ------
    ValueError
        If grinder preset not found or setting out of range.
    """
    filename = name.lower().replace(" ", "_") + ".json"
    preset_path = GRINDER_DIR / filename

    if not preset_path.exists():
        raise ValueError(f"Grinder preset not found: {name}")

    data = json.loads(preset_path.read_text(encoding="utf-8"))

    lo, hi = data["clicks_range"]
    if setting < lo or setting > hi:
        raise ValueError(
            f"Setting {setting} out of range [{lo}, {hi}] for {name}"
        )

    # Determine median_um: exact match in settings array, else use microns_per_click
    settings_list = data["settings"]
    exact = next((s for s in settings_list if s["click"] == setting), None)
    if exact is not None:
        median_um = float(exact["median_um"])
    else:
        median_um = float(setting * data["microns_per_click"])

    # Build bimodal PSD
    psd_model = data["psd_model"]
    fines_peak   = float(psd_model["fines_peak_um"])
    fines_sigma  = float(psd_model["fines_sigma"])
    fines_frac   = float(psd_model["fines_fraction"])
    main_sigma   = float(psd_model["main_sigma"])
    n_points     = 50

    sizes = np.linspace(max(1.0, fines_peak * 0.2), median_um * 2.5, n_points)

    fines_pdf = lognorm.pdf(sizes, s=fines_sigma, scale=fines_peak) * fines_frac
    main_pdf  = lognorm.pdf(sizes, s=main_sigma,  scale=median_um)  * (1.0 - fines_frac)
    combined  = fines_pdf + main_pdf

    total = combined.sum()
    if total > 0.0:
        combined = combined / total

    psd_list = [
        {"size_um": float(sz), "fraction": float(f)}
        for sz, f in zip(sizes, combined)
    ]

    return {"median_um": median_um, "psd": psd_list}
