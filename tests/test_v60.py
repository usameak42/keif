"""V60 method end-to-end tests."""

import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod

V60_INP = SimulationInput(
    coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
    grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
    method=BrewMethod.v60, mode=Mode.accurate,
)


def test_v60_simulate_accurate():
    """METH-02: V60 accurate returns valid output."""
    from brewos.methods.v60 import simulate
    result = simulate(V60_INP)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert result.mode_used == "accurate"
    assert result.channeling_risk is None  # No channeling for V60


def test_v60_simulate_fast():
    """METH-02: V60 fast mode works."""
    from brewos.methods.v60 import simulate
    fast_inp = V60_INP.model_copy(update={"mode": Mode.fast})
    result = simulate(fast_inp)
    assert result.tds_percent > 0
    assert result.mode_used == "fast"
    assert result.channeling_risk is None


def test_v60_ey_in_range():
    """VAL-02: V60 EY within Batali 2020 range (20 +/-1.5%)."""
    from brewos.methods.v60 import simulate
    result = simulate(V60_INP)
    assert 18.5 <= result.extraction_yield <= 21.5, f"V60 EY={result.extraction_yield:.2f}%"


def test_v60_distinct_from_french_press():
    """V60 produces different TDS/EY than French Press for same inputs."""
    from brewos.methods.v60 import simulate as v60_sim
    from brewos.methods.french_press import simulate as fp_sim
    # Same inputs except brew method routes to different solver
    inp = SimulationInput(
        coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
        grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
        method=BrewMethod.v60, mode=Mode.accurate,
    )
    v60_result = v60_sim(inp)
    fp_result = fp_sim(inp)
    assert v60_result.extraction_yield != fp_result.extraction_yield, "V60 and French Press should produce different EY"
