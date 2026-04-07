"""Cross-method smoke tests -- all 6 brew methods x 2 modes x 5 roast levels."""

import math
import pytest
from brewos.models.inputs import SimulationInput, RoastLevel, Mode, BrewMethod

from brewos.methods.french_press import simulate as french_press
from brewos.methods.v60 import simulate as v60
from brewos.methods.kalita import simulate as kalita
from brewos.methods.espresso import simulate as espresso
from brewos.methods.moka_pot import simulate as moka_pot
from brewos.methods.aeropress import simulate as aeropress

# Standard scenarios per method type — roast_level omitted; injected by parametrize
_SCENARIOS = {
    "french_press": dict(coffee_dose=15.0, water_amount=250.0, water_temp=93.0, grind_size=700.0, brew_time=240.0, method=BrewMethod.french_press),
    "v60":          dict(coffee_dose=15.0, water_amount=250.0, water_temp=93.0, grind_size=600.0, brew_time=180.0, method=BrewMethod.v60),
    "kalita":       dict(coffee_dose=15.0, water_amount=250.0, water_temp=93.0, grind_size=600.0, brew_time=180.0, method=BrewMethod.kalita),
    "espresso":     dict(coffee_dose=18.0, water_amount=36.0,  water_temp=93.0, grind_size=200.0, brew_time=25.0,  pressure_bar=9.0, method=BrewMethod.espresso),
    "moka_pot":     dict(coffee_dose=15.0, water_amount=150.0, water_temp=93.0, grind_size=400.0, brew_time=180.0, method=BrewMethod.moka_pot),
    "aeropress":    dict(coffee_dose=15.0, water_amount=200.0, water_temp=93.0, grind_size=500.0, brew_time=90.0,  method=BrewMethod.aeropress),
}

_METHODS = {
    "french_press": french_press,
    "v60": v60,
    "kalita": kalita,
    "espresso": espresso,
    "moka_pot": moka_pot,
    "aeropress": aeropress,
}

_ALL_ROASTS = [
    RoastLevel.light,
    RoastLevel.medium_light,
    RoastLevel.medium,
    RoastLevel.medium_dark,
    RoastLevel.dark,
]


@pytest.mark.parametrize("method_name", _METHODS.keys())
@pytest.mark.parametrize("mode", [Mode.fast, Mode.accurate])
def test_method_returns_valid_output(method_name, mode):
    """Every method x mode combination returns a complete SimulationOutput (medium roast)."""
    params = dict(_SCENARIOS[method_name])
    params["roast_level"] = RoastLevel.medium
    params["mode"] = mode
    inp = SimulationInput(**params)
    result = _METHODS[method_name](inp)

    assert result.tds_percent > 0, f"{method_name}/{mode.value}: tds_percent must be > 0"
    assert result.extraction_yield > 0, f"{method_name}/{mode.value}: extraction_yield must be > 0"
    assert 5.0 <= result.extraction_yield <= 30.0, f"{method_name}/{mode.value}: EY {result.extraction_yield}% outside 5-30% plausible range"
    assert len(result.extraction_curve) > 0, f"{method_name}/{mode.value}: extraction_curve empty"
    assert len(result.psd_curve) > 0, f"{method_name}/{mode.value}: psd_curve empty"
    assert result.flavor_profile is not None, f"{method_name}/{mode.value}: flavor_profile is None"
    assert result.brew_ratio > 0, f"{method_name}/{mode.value}: brew_ratio must be > 0"
    assert result.mode_used in ("fast", "accurate"), f"{method_name}/{mode.value}: invalid mode_used"


@pytest.mark.parametrize("method_name", _METHODS.keys())
@pytest.mark.parametrize("roast", _ALL_ROASTS)
def test_method_all_roast_levels(method_name, roast):
    """All 6 methods x 5 roast levels produce valid SimulationOutput (fast mode)."""
    params = dict(_SCENARIOS[method_name])
    params["roast_level"] = roast
    params["mode"] = Mode.fast
    inp = SimulationInput(**params)
    result = _METHODS[method_name](inp)

    assert not math.isnan(result.extraction_yield), \
        f"{method_name}/{roast.value}: extraction_yield is NaN"
    assert 0 < result.extraction_yield <= 30, \
        f"{method_name}/{roast.value}: EY {result.extraction_yield}% outside (0, 30]"
    assert result.tds_percent > 0, \
        f"{method_name}/{roast.value}: tds_percent must be > 0"
    assert isinstance(result.agtron_number, int), \
        f"{method_name}/{roast.value}: agtron_number must be int, got {type(result.agtron_number)}"


@pytest.mark.parametrize("method_name", _METHODS.keys())
def test_method_distinct_ey(method_name):
    """Each method returns EY > 0 (not stuck at zero)."""
    params = dict(_SCENARIOS[method_name])
    params["roast_level"] = RoastLevel.medium
    params["mode"] = Mode.fast
    inp = SimulationInput(**params)
    result = _METHODS[method_name](inp)
    assert result.extraction_yield > 5.0, f"{method_name}: EY suspiciously low ({result.extraction_yield}%)"
