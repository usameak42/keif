"""Integration tests: all 6 methods return all 13 output fields (core + extended)."""

import pytest
from brewos.models.inputs import SimulationInput, BrewMethod
from brewos.methods.french_press import simulate as fp_simulate
from brewos.methods.v60 import simulate as v60_simulate
from brewos.methods.kalita import simulate as kalita_simulate
from brewos.methods.espresso import simulate as espresso_simulate
from brewos.methods.moka_pot import simulate as moka_simulate
from brewos.methods.aeropress import simulate as aeropress_simulate


def make_input(method: str, mode: str) -> SimulationInput:
    """Standard inputs per method."""
    base = dict(roast_level="medium", mode=mode)
    if method == "french_press":
        return SimulationInput(coffee_dose=15, water_amount=250, water_temp=93, brew_time=240, grind_size=750, method=BrewMethod.french_press, **base)
    if method == "v60":
        return SimulationInput(coffee_dose=15, water_amount=250, water_temp=93, brew_time=180, grind_size=600, method=BrewMethod.v60, **base)
    if method == "kalita":
        return SimulationInput(coffee_dose=20, water_amount=320, water_temp=93, brew_time=210, grind_size=650, method=BrewMethod.kalita, **base)
    if method == "espresso":
        return SimulationInput(coffee_dose=18, water_amount=36,  water_temp=93, brew_time=25,  grind_size=200, pressure_bar=9.0, method=BrewMethod.espresso, **base)
    if method == "moka_pot":
        return SimulationInput(coffee_dose=15, water_amount=150, water_temp=80, brew_time=300, grind_size=350, method=BrewMethod.moka_pot, **base)
    if method == "aeropress":
        return SimulationInput(coffee_dose=15, water_amount=200, water_temp=85, brew_time=120, grind_size=450, method=BrewMethod.aeropress, **base)
    raise ValueError(f"Unknown method: {method}")


METHODS = {
    "french_press": fp_simulate,
    "v60":          v60_simulate,
    "kalita":       kalita_simulate,
    "espresso":     espresso_simulate,
    "moka_pot":     moka_simulate,
    "aeropress":    aeropress_simulate,
}

PERCOLATION_METHODS = {"v60", "kalita", "espresso"}


@pytest.mark.parametrize("method", list(METHODS.keys()))
@pytest.mark.parametrize("mode", ["fast", "accurate"])
def test_core_outputs_present(method, mode):
    """All 7 core output fields are non-None and physically plausible."""
    out = METHODS[method](make_input(method, mode))
    assert 0 < out.tds_percent < 100
    assert 0 < out.extraction_yield < 100
    assert len(out.extraction_curve) > 0
    assert len(out.psd_curve) > 0
    assert out.flavor_profile is not None
    assert out.brew_ratio > 0
    assert isinstance(out.brew_ratio_recommendation, str)
    assert isinstance(out.warnings, list)
    assert out.mode_used in ("fast", "accurate")


@pytest.mark.parametrize("method", list(METHODS.keys()))
@pytest.mark.parametrize("mode", ["fast", "accurate"])
def test_temperature_curve_populated(method, mode):
    """OUT-10: temperature_curve is a non-empty list of TempPoints for all methods."""
    out = METHODS[method](make_input(method, mode))
    assert out.temperature_curve is not None, f"{method}/{mode}: temperature_curve is None"
    assert len(out.temperature_curve) > 0
    # First point should be near the input temperature
    first_temp = out.temperature_curve[0].temp_c
    inp = make_input(method, mode)
    assert abs(first_temp - inp.water_temp) < 2.0, f"First temp point {first_temp} far from {inp.water_temp}"


@pytest.mark.parametrize("method", list(METHODS.keys()))
@pytest.mark.parametrize("mode", ["fast", "accurate"])
def test_sca_position_populated(method, mode):
    """OUT-11: sca_position is non-None with valid zone string for all methods."""
    out = METHODS[method](make_input(method, mode))
    assert out.sca_position is not None, f"{method}/{mode}: sca_position is None"
    assert out.sca_position.zone in (
        "ideal", "under_extracted", "over_extracted", "weak", "strong"
    )
    assert isinstance(out.sca_position.on_chart, bool)


@pytest.mark.parametrize("method", list(METHODS.keys()))
@pytest.mark.parametrize("mode", ["fast", "accurate"])
def test_caffeine_populated(method, mode):
    """OUT-13: caffeine_mg_per_ml is non-None and positive for all methods."""
    out = METHODS[method](make_input(method, mode))
    assert out.caffeine_mg_per_ml is not None, f"{method}/{mode}: caffeine_mg_per_ml is None"
    assert out.caffeine_mg_per_ml > 0


def test_eui_percolation_accurate():
    """OUT-07: EUI is non-None for V60, Kalita, Espresso in accurate mode."""
    for method in PERCOLATION_METHODS:
        out = METHODS[method](make_input(method, "accurate"))
        assert out.extraction_uniformity_index is not None, f"{method} accurate: EUI is None"
        assert 0.0 <= out.extraction_uniformity_index <= 1.0


def test_eui_immersion_is_one():
    """OUT-07: EUI is 1.0 for well-mixed immersion methods (French Press, AeroPress)."""
    for method in ("french_press", "aeropress"):
        out = METHODS[method](make_input(method, "accurate"))
        assert out.extraction_uniformity_index == 1.0, f"{method}: EUI should be 1.0"


def test_puck_resistance_espresso_only():
    """OUT-12: puck_resistance is non-None for espresso, None for all other methods."""
    espresso_out = espresso_simulate(make_input("espresso", "accurate"))
    assert espresso_out.puck_resistance is not None
    assert 0.0 <= espresso_out.puck_resistance <= 1.0

    for method in ("french_press", "v60", "kalita", "moka_pot", "aeropress"):
        out = METHODS[method](make_input(method, "accurate"))
        assert out.puck_resistance is None, f"{method}: puck_resistance should be None"


def test_channeling_risk_espresso_only():
    """OUT-08: channeling_risk is float in [0, 1] for espresso; None for all other methods."""
    espresso_out = espresso_simulate(make_input("espresso", "accurate"))
    assert espresso_out.channeling_risk is not None, "espresso: channeling_risk should not be None"
    assert 0.0 <= espresso_out.channeling_risk <= 1.0

    for method in ("french_press", "v60", "kalita", "moka_pot", "aeropress"):
        out = METHODS[method](make_input(method, "accurate"))
        assert out.channeling_risk is None, f"{method}: channeling_risk should be None"


def test_moka_eui_is_none():
    """Moka Pot EUI should be None (pressure model -- not user-meaningful)."""
    out = moka_simulate(make_input("moka_pot", "accurate"))
    assert out.extraction_uniformity_index is None


def test_moka_temperature_curve_isothermal():
    """Moka Pot uses k_vessel=0.0 (active stove heat) -- temp curve should be flat near T_0."""
    inp = make_input("moka_pot", "accurate")
    out = moka_simulate(inp)
    assert out.temperature_curve is not None
    for pt in out.temperature_curve:
        assert abs(pt.temp_c - inp.water_temp) < 1.0, (
            f"Moka temp at t={pt.t}s = {pt.temp_c}C, expected ~{inp.water_temp}C (isothermal)"
        )
