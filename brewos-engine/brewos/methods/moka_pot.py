"""Moka Pot -- pressure solver with stovetop geometry defaults."""

from brewos.models.inputs import SimulationInput
from brewos.models.outputs import SimulationOutput
from brewos.solvers.pressure import solve_accurate, solve_fast


MOKA_POT_DEFAULTS = {
    "bed_depth_m":    0.005,       # 5mm moka pot filter basket
    "bed_diameter_m": 0.070,       # 3-cup Bialetti
    "porosity":       0.38,
    "method_type":    "moka",
    "ey_target_pct":  18.0,        # mid-range moka EY
    "Q_heater_W":     800.0,       # medium stove burner
    "m_water_g":      150.0,       # 3-cup fill
    "h_loss":         10.0,        # W/(m^2*K) aluminum pot
    "A_surface_m2":   0.020,       # external surface area
    "T_ambient_C":    22.0,
    "k_vessel":       0.0000,     # isothermal — active stove heating
}


def simulate(inp: SimulationInput) -> SimulationOutput:
    """Run Moka Pot simulation, dispatching to correct solver mode."""
    if inp.mode.value == "accurate":
        return solve_accurate(inp, method_defaults=MOKA_POT_DEFAULTS)
    else:
        return solve_fast(inp, method_defaults=MOKA_POT_DEFAULTS)
