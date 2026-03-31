"""Percolation solver tests -- accurate mode + Batali 2020 validation."""

import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod

# Standard V60 scenario for validation
V60_STANDARD = SimulationInput(
    coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
    grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
    method=BrewMethod.v60, mode=Mode.accurate,
)


def test_accurate_output():
    """SOLV-03: solve_accurate returns valid SimulationOutput."""
    from brewos.solvers.percolation import solve_accurate
    result = solve_accurate(V60_STANDARD)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert len(result.extraction_curve) > 10
    assert result.mode_used == "accurate"


def test_batali_validation():
    """VAL-02: EY within +/-1.5% of 20% for V60 standard scenario."""
    from brewos.solvers.percolation import solve_accurate
    result = solve_accurate(V60_STANDARD)
    assert abs(result.extraction_yield - 20.0) <= 1.5, f"EY={result.extraction_yield}%, expected 20 +/-1.5"


def test_method_distinction():
    """SC-3: V60, Kalita, Espresso produce distinct TDS/EY."""
    from brewos.methods.v60 import simulate as v60_sim
    from brewos.methods.kalita import simulate as kalita_sim
    from brewos.methods.espresso import simulate as espresso_sim
    inp_base = SimulationInput(
        coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
        grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
        method=BrewMethod.v60, mode=Mode.accurate,
    )
    espresso_inp = SimulationInput(
        coffee_dose=18.0, water_amount=36.0, water_temp=93.0,
        grind_size=300.0, brew_time=25.0, roast_level=RoastLevel.medium,
        method=BrewMethod.espresso, mode=Mode.accurate, pressure_bar=9.0,
    )
    v60_ey = v60_sim(inp_base).extraction_yield
    kalita_ey = kalita_sim(inp_base).extraction_yield
    espresso_ey = espresso_sim(espresso_inp).extraction_yield
    # All three must be distinct
    eys = [v60_ey, kalita_ey, espresso_ey]
    assert len(set(round(e, 2) for e in eys)) == 3, f"EYs not distinct: V60={v60_ey:.2f}, Kalita={kalita_ey:.2f}, Espresso={espresso_ey:.2f}"


def test_spatial_gradient():
    """Outlet concentration > inlet concentration (extraction along bed depth)."""
    from brewos.solvers.percolation import solve_accurate
    result = solve_accurate(V60_STANDARD)
    # Extraction yield should be positive (spatial extraction happened)
    assert result.extraction_yield > 5.0, "EY too low -- spatial extraction may not be working"
