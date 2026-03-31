"""Kalita Wave -- percolation solver with flat-bed geometry defaults."""

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput
from brewos.solvers.percolation import solve_accurate, solve_fast

KALITA_DEFAULTS = {
    "bed_depth_m":      0.035,    # ~3.5cm flat bed for 15g dose
    "bed_diameter_m":   0.065,    # ~65mm Kalita 185 basket
    "pressure_bar":     0.0,      # gravity-driven
    "flow_rate_mL_s":   2.5,      # restricted by 3-hole design
    "grind_size_um":    650.0,    # medium-fine, slightly coarser
    "brew_time":        210.0,    # 3.5 min (slower drawdown)
    "brew_ratio_min":   15.0,
    "brew_ratio_max":   17.0,
    "porosity":         0.40,
    "method_type":      "pour-over",
    "ey_target_pct":    19.5,     # slightly lower than V60 (flat bed, restricted flow)
    "k_vessel":         0.0028,   # Newton cooling coefficient [1/s] — stainless wave
}


def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run Kalita Wave simulation, dispatching to correct solver mode."""
    if inp.mode.value == "accurate":
        return solve_accurate(inp, method_defaults=KALITA_DEFAULTS)
    else:
        return solve_fast(inp, method_defaults=KALITA_DEFAULTS)
