"""Espresso -- percolation solver with 9-bar pressure + Lee 2023 channeling overlay."""

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput
from brewos.solvers.percolation import solve_accurate, solve_fast
from brewos.utils.channeling import compute_channeling_risk
from brewos.utils.output_helpers import resolve_psd

ESPRESSO_DEFAULTS = {
    "bed_depth_m":      0.020,    # ~20mm puck in 58mm basket
    "bed_diameter_m":   0.058,    # standard 58mm portafilter
    "pressure_bar":     9.0,      # standard espresso pressure
    "grind_size_um":    300.0,    # fine grind default
    "brew_time":        25.0,     # standard shot time
    "brew_ratio_min":   1.5,      # espresso ratio 1:1.5 to 1:3
    "brew_ratio_max":   3.0,
    "porosity":         0.38,     # tighter packing under tamping
    "method_type":      "espresso",
    "ey_target_pct":    20.5,     # typical espresso EY (higher than V60 due to pressure)
    "k_vessel":         0.0015,   # Newton cooling coefficient [1/s] — brass group head
}


def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run Espresso simulation with channeling overlay.

    After solving the extraction PDE, compute Lee 2023 channeling
    risk score and append to output. Channeling is espresso-only
    per DECISION-010.
    """
    # Resolve grind size for channeling computation
    grind_size_um, _ = resolve_psd(inp)

    # Effective pressure: use inp.pressure_bar if set, else ESPRESSO_DEFAULTS
    pressure = inp.pressure_bar if inp.pressure_bar is not None else ESPRESSO_DEFAULTS["pressure_bar"]

    # Solve extraction
    if inp.mode.value == "accurate":
        result = solve_accurate(inp, method_defaults=ESPRESSO_DEFAULTS)
    else:
        result = solve_fast(inp, method_defaults=ESPRESSO_DEFAULTS)

    # Lee 2023 channeling overlay (post-processing)
    risk = compute_channeling_risk(
        grind_size_um=grind_size_um,
        pressure_bar=pressure,
        bed_depth_m=ESPRESSO_DEFAULTS["bed_depth_m"],
        porosity=ESPRESSO_DEFAULTS["porosity"],
    )

    # Append channeling warning if risk is moderate or higher
    warnings = list(result.warnings)
    if risk > 0.3:
        warnings.append(f"Channeling risk: {risk:.2f} (moderate-high). Consider coarser grind or lower pressure.")

    # Return updated output with channeling_risk populated
    return result.model_copy(update={
        "channeling_risk": risk,
        "warnings": warnings,
    })
