"""French Press — immersion solver with standard steep parameters."""

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput
from brewos.solvers.immersion import solve_accurate, solve_fast


# Default French Press parameters (standard recipe)
FRENCH_PRESS_DEFAULTS = {
    "brew_time":       240.0,   # 4 minutes [s]
    "water_temp":      93.0,    # [°C]
    "brew_ratio_min":  15.0,    # optimal range lower bound (water:coffee)
    "brew_ratio_max":  18.0,    # optimal range upper bound (water:coffee)
    "k_vessel":        0.0025,  # Newton cooling coefficient [1/s] — glass carafe
}


def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run French Press simulation, dispatching to correct solver mode.

    Args:
        inp: Validated SimulationInput with mode set to fast or accurate.

    Returns:
        SimulationOutput from the appropriate solver.
    """
    if inp.mode.value == "accurate":
        return solve_accurate(inp)
    else:
        return solve_fast(inp)
