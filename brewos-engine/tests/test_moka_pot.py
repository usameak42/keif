"""Moka Pot method integration tests — METH-05."""

import pytest
from brewos.models.inputs import SimulationInput, RoastLevel, Mode, BrewMethod
from brewos.methods.moka_pot import simulate, MOKA_POT_DEFAULTS


MOKA_INPUT = SimulationInput(
    coffee_dose=15.0, water_amount=150.0, water_temp=93.0,
    grind_size=400.0, brew_time=180.0, roast_level=RoastLevel.medium,
    method=BrewMethod.moka_pot, mode=Mode.accurate,
)


def test_simulate_accurate_mode():
    """METH-05: simulate() with Mode.accurate returns valid SimulationOutput."""
    result = simulate(MOKA_INPUT)
    assert 15.0 <= result.extraction_yield <= 22.0, (
        f"EY {result.extraction_yield:.2f}% outside 15-22% range"
    )
    assert result.mode_used == "accurate"


def test_simulate_fast_mode():
    """METH-05: simulate() with Mode.fast returns valid SimulationOutput."""
    fast_inp = MOKA_INPUT.model_copy(update={"mode": Mode.fast})
    result = simulate(fast_inp)
    assert result.mode_used == "fast"
    assert result.extraction_yield > 0
    assert result.tds_percent > 0


def test_simulate_both_modes():
    """METH-05: Both modes produce EY within 2% of each other."""
    acc_result = simulate(MOKA_INPUT)
    fast_inp = MOKA_INPUT.model_copy(update={"mode": Mode.fast})
    fast_result = simulate(fast_inp)
    assert abs(acc_result.extraction_yield - fast_result.extraction_yield) < 2.0, (
        f"Accurate {acc_result.extraction_yield:.2f}% vs Fast {fast_result.extraction_yield:.2f}%"
    )


def test_defaults_present():
    """METH-05: MOKA_POT_DEFAULTS contains required keys."""
    assert "bed_depth_m" in MOKA_POT_DEFAULTS
    assert "Q_heater_W" in MOKA_POT_DEFAULTS
    assert "method_type" in MOKA_POT_DEFAULTS
    assert "ey_target_pct" in MOKA_POT_DEFAULTS
    assert MOKA_POT_DEFAULTS["method_type"] == "moka"
    assert MOKA_POT_DEFAULTS["ey_target_pct"] == 18.0
