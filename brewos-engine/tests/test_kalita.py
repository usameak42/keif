"""Kalita Wave method end-to-end tests."""

import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod

KALITA_INP = SimulationInput(
    coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
    grind_size=650.0, brew_time=210.0, roast_level=RoastLevel.medium,
    method=BrewMethod.kalita, mode=Mode.accurate,
)


def test_kalita_simulate_accurate():
    """METH-03: Kalita accurate returns valid output."""
    from brewos.methods.kalita import simulate
    result = simulate(KALITA_INP)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert result.mode_used == "accurate"
    assert result.channeling_risk is None


def test_kalita_simulate_fast():
    """METH-03: Kalita fast mode works."""
    from brewos.methods.kalita import simulate
    fast_inp = KALITA_INP.model_copy(update={"mode": Mode.fast})
    result = simulate(fast_inp)
    assert result.tds_percent > 0
    assert result.mode_used == "fast"


def test_kalita_distinct_from_v60():
    """Kalita produces different TDS/EY than V60 for same inputs."""
    from brewos.methods.kalita import simulate as kalita_sim
    from brewos.methods.v60 import simulate as v60_sim
    inp_accurate = SimulationInput(
        coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
        grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
        method=BrewMethod.kalita, mode=Mode.accurate,
    )
    kalita_r = kalita_sim(inp_accurate)
    v60_r = v60_sim(inp_accurate)
    assert kalita_r.extraction_yield != v60_r.extraction_yield, "Kalita and V60 should differ due to geometry"
