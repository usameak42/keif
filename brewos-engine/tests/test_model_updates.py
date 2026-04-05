"""Model updates and output_helpers extraction verification."""

import pytest
from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod
from brewos.models.outputs import SimulationOutput, FlavorProfile, PSDPoint, ExtractionPoint


# --- Model field tests ---

def test_pressure_bar_field():
    """SimulationInput accepts pressure_bar=9.0; defaults to None."""
    inp_with = SimulationInput(
        coffee_dose=18.0, water_amount=36.0, water_temp=93.0,
        grind_size=300.0, brew_time=25.0, roast_level=RoastLevel.medium,
        method=BrewMethod.espresso, pressure_bar=9.0,
    )
    assert inp_with.pressure_bar == 9.0
    inp_without = SimulationInput(
        coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
        grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
        method=BrewMethod.v60,
    )
    assert inp_without.pressure_bar is None


def test_pressure_bar_rejects_negative():
    """pressure_bar must be >= 0."""
    with pytest.raises(ValueError):
        SimulationInput(
            coffee_dose=18.0, water_amount=36.0, water_temp=93.0,
            grind_size=300.0, brew_time=25.0, roast_level=RoastLevel.medium,
            method=BrewMethod.espresso, pressure_bar=-1.0,
        )


def test_channeling_risk_field():
    """SimulationOutput accepts channeling_risk=0.45; defaults to None."""
    flavor = FlavorProfile(sour=0.2, sweet=0.6, bitter=0.2)
    out = SimulationOutput(
        tds_percent=1.35, extraction_yield=20.0,
        extraction_curve=[ExtractionPoint(t=0.0, ey=0.0)],
        psd_curve=[PSDPoint(size_um=600.0, fraction=1.0)],
        flavor_profile=flavor, brew_ratio=16.67,
        brew_ratio_recommendation="optimal", warnings=[],
        mode_used="accurate", channeling_risk=0.45,
    )
    assert out.channeling_risk == 0.45
    out_none = SimulationOutput(
        tds_percent=1.35, extraction_yield=20.0,
        extraction_curve=[ExtractionPoint(t=0.0, ey=0.0)],
        psd_curve=[PSDPoint(size_um=600.0, fraction=1.0)],
        flavor_profile=flavor, brew_ratio=16.67,
        brew_ratio_recommendation="optimal", warnings=[],
        mode_used="accurate",
    )
    assert out_none.channeling_risk is None


# --- Output helpers tests ---

def test_resolve_psd_returns_tuple():
    """resolve_psd returns (grind_size_um, List[PSDPoint]) for manual grind_size."""
    from brewos.utils.output_helpers import resolve_psd
    inp = SimulationInput(
        coffee_dose=15.0, water_amount=250.0, water_temp=93.0,
        grind_size=600.0, brew_time=180.0, roast_level=RoastLevel.medium,
        method=BrewMethod.v60,
    )
    grind_um, psd_points = resolve_psd(inp)
    assert isinstance(psd_points, list)
    assert len(psd_points) > 0
    assert isinstance(grind_um, float)
    assert grind_um == 600.0


def test_estimate_flavor_profile_sweet():
    """estimate_flavor_profile(20.0) returns FlavorProfile with sweet dominant."""
    from brewos.utils.output_helpers import estimate_flavor_profile
    fp = estimate_flavor_profile(20.0)
    assert isinstance(fp, FlavorProfile)
    assert fp.sweet >= fp.sour
    assert fp.sweet >= fp.bitter


def test_generate_warnings_overextraction():
    """generate_warnings flags over-extraction for EY > 24%."""
    from brewos.utils.output_helpers import generate_warnings
    warnings = generate_warnings(26.0, 16.67, 93.0, "accurate")
    assert any("over" in w.lower() or "extract" in w.lower() for w in warnings)


def test_brew_ratio_recommendation_optimal():
    """brew_ratio_recommendation(16.67) returns string containing 'optimal' or 'within'."""
    from brewos.utils.output_helpers import brew_ratio_recommendation
    rec = brew_ratio_recommendation(16.67)
    assert isinstance(rec, str)
    assert len(rec) > 0
