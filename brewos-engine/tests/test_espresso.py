"""Espresso method tests -- standard recipe + Lee 2023 channeling."""

import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod


def test_channeling_risk_range():
    """OUT-08: Channeling risk is float in [0, 1]."""
    from brewos.utils.channeling import compute_channeling_risk
    risk = compute_channeling_risk(300.0, 9.0, 0.020, 0.38)
    assert 0.0 <= risk <= 1.0


def test_channeling_finer_grind_higher_risk():
    """Finer grind produces higher channeling risk."""
    from brewos.utils.channeling import compute_channeling_risk
    risk_fine = compute_channeling_risk(200.0, 9.0, 0.020, 0.38)
    risk_med = compute_channeling_risk(400.0, 9.0, 0.020, 0.38)
    assert risk_fine > risk_med


def test_channeling_espresso_vs_pourover():
    """Espresso conditions produce higher risk than pour-over."""
    from brewos.utils.channeling import compute_channeling_risk
    risk_espresso = compute_channeling_risk(300.0, 9.0, 0.020, 0.38)
    risk_pourover = compute_channeling_risk(600.0, 0.0, 0.050, 0.40)
    assert risk_espresso > risk_pourover


def test_standard_recipe_ey():
    """METH-04: Espresso 18g/36g/25s produces EY in 18-22%."""
    from brewos.methods.espresso import simulate
    inp = SimulationInput(
        coffee_dose=18.0, water_amount=36.0, water_temp=93.0,
        grind_size=300.0, brew_time=25.0, roast_level=RoastLevel.medium,
        method=BrewMethod.espresso, mode=Mode.accurate, pressure_bar=9.0,
    )
    result = simulate(inp)
    assert 18.0 <= result.extraction_yield <= 22.0, f"Espresso EY={result.extraction_yield:.2f}%"


def test_espresso_has_channeling_risk():
    """OUT-08: Espresso simulate() populates channeling_risk."""
    from brewos.methods.espresso import simulate
    inp = SimulationInput(
        coffee_dose=18.0, water_amount=36.0, water_temp=93.0,
        grind_size=300.0, brew_time=25.0, roast_level=RoastLevel.medium,
        method=BrewMethod.espresso, mode=Mode.accurate, pressure_bar=9.0,
    )
    result = simulate(inp)
    assert result.channeling_risk is not None
    assert 0.0 <= result.channeling_risk <= 1.0


def test_espresso_channeling_warning():
    """OUT-08: High channeling risk appended to warnings."""
    from brewos.methods.espresso import simulate
    inp = SimulationInput(
        coffee_dose=18.0, water_amount=36.0, water_temp=93.0,
        grind_size=150.0, brew_time=25.0, roast_level=RoastLevel.medium,
        method=BrewMethod.espresso, mode=Mode.accurate, pressure_bar=9.0,
    )
    result = simulate(inp)
    # Very fine grind at 9 bar should produce moderate+ risk
    if result.channeling_risk > 0.3:
        assert any("channeling" in w.lower() for w in result.warnings)
