"""Hario V60 -- percolation solver with cone geometry defaults."""

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput
from brewos.solvers.percolation import solve_accurate, solve_fast

V60_DEFAULTS = {
    "bed_depth_m":      0.050,    # ~5cm cone bed for 15g dose
    "bed_diameter_m":   0.080,    # ~80mm effective diameter
    "pressure_bar":     0.0,      # gravity-driven
    "flow_rate_mL_s":   3.5,      # typical V60 pour rate
    "grind_size_um":    600.0,    # medium-fine default
    "brew_time":        180.0,    # 3 min
    "brew_ratio_min":   15.0,
    "brew_ratio_max":   17.0,
    "porosity":         0.40,     # typical pour-over bed
    "method_type":      "pour-over",
    "k_vessel":         0.0030,     # Newton cooling coefficient [1/s] — ceramic cone
}


def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run V60 simulation, dispatching to correct solver mode."""
    if inp.mode.value == "accurate":
        return solve_accurate(inp, method_defaults=V60_DEFAULTS)
    else:
        return solve_fast(inp, method_defaults=V60_DEFAULTS)
