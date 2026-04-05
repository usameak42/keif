"""French Press end-to-end tests with 7-output assembly and VAL-01 validation."""

import pytest

from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod
from brewos.models.outputs import SimulationOutput
from brewos.methods import french_press
from brewos.utils.output_helpers import generate_warnings


# ─────────────────────────────────────────────────────────────────────────────
# STANDARD SCENARIO FIXTURE
# 15g / 250g / 93°C / medium / 240s / Comandante C40 MK4 at click 25
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture
def standard_input_accurate():
    return SimulationInput(
        coffee_dose=15.0,
        water_amount=250.0,
        water_temp=93.0,
        grinder_name="Comandante C40 MK4",
        grinder_setting=25,
        brew_time=240.0,
        roast_level=RoastLevel.medium,
        method=BrewMethod.french_press, mode=Mode.accurate,
    )


@pytest.fixture
def standard_input_fast():
    return SimulationInput(
        coffee_dose=15.0,
        water_amount=250.0,
        water_temp=93.0,
        grinder_name="Comandante C40 MK4",
        grinder_setting=25,
        brew_time=240.0,
        roast_level=RoastLevel.medium,
        method=BrewMethod.french_press, mode=Mode.fast,
    )


# ─────────────────────────────────────────────────────────────────────────────
# COMPLETENESS + SCHEMA
# ─────────────────────────────────────────────────────────────────────────────
def test_output_completeness(standard_input_accurate):
    """All 7 SimulationOutput fields are non-null and physically plausible."""
    result = french_press.simulate(standard_input_accurate)
    assert isinstance(result, SimulationOutput)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert len(result.extraction_curve) > 0
    assert len(result.psd_curve) == 50
    assert result.flavor_profile.sour > 0
    assert result.flavor_profile.sweet > 0
    assert result.flavor_profile.bitter > 0
    assert abs(result.flavor_profile.sour + result.flavor_profile.sweet
               + result.flavor_profile.bitter - 1.0) < 0.01
    assert result.brew_ratio > 0
    assert len(result.brew_ratio_recommendation) > 0
    assert isinstance(result.warnings, list)


def test_flavor_sweet_dominant_ideal_zone(standard_input_accurate):
    """Standard scenario EY ~21.51% → sweet is dominant flavor axis."""
    result = french_press.simulate(standard_input_accurate)
    assert result.flavor_profile.sweet > result.flavor_profile.sour
    assert result.flavor_profile.sweet > result.flavor_profile.bitter


def test_brew_ratio_value(standard_input_accurate):
    """brew_ratio == water_amount / coffee_dose = 250/15 ≈ 16.667."""
    result = french_press.simulate(standard_input_accurate)
    assert abs(result.brew_ratio - 16.667) < 0.01


def test_brew_ratio_recommendation_in_range(standard_input_accurate):
    """Standard ratio 16.67:1 is within optimal range → recommendation says 'optimal'."""
    result = french_press.simulate(standard_input_accurate)
    assert "optimal" in result.brew_ratio_recommendation.lower()


def test_brew_ratio_recommendation_out_of_range():
    """Very high brew ratio (water=400, dose=15 → 26.7:1) triggers recommendation."""
    inp = SimulationInput(
        coffee_dose=15.0,
        water_amount=400.0,
        water_temp=93.0,
        grinder_name="Comandante C40 MK4",
        grinder_setting=25,
        brew_time=240.0,
        roast_level=RoastLevel.medium,
        method=BrewMethod.french_press, mode=Mode.fast,
    )
    result = french_press.simulate(inp)
    # Ratio is 26.7 — well outside 15-18, recommendation should suggest reducing water
    assert "water" in result.brew_ratio_recommendation.lower() or \
           "dilute" in result.brew_ratio_recommendation.lower() or \
           "ratio" in result.brew_ratio_recommendation.lower()


# ─────────────────────────────────────────────────────────────────────────────
# WARNINGS
# ─────────────────────────────────────────────────────────────────────────────
def test_warnings_under_extraction():
    """_generate_warnings with EY=15% triggers under-extraction warning."""
    warns = generate_warnings(15.0, 16.67, 93.0)
    assert any("under" in w.lower() for w in warns)


def test_warnings_over_extraction():
    """_generate_warnings with EY=25% triggers over-extraction warning."""
    warns = generate_warnings(25.0, 16.67, 93.0)
    assert any("over" in w.lower() for w in warns)


def test_warnings_temp_too_low():
    """_generate_warnings with water_temp=80°C triggers temperature warning."""
    warns = generate_warnings(21.0, 16.67, 80.0)
    assert any("temperature" in w.lower() or "temp" in w.lower() for w in warns)


# ─────────────────────────────────────────────────────────────────────────────
# MANUAL GRIND SIZE (LOG-NORMAL PSD FALLBACK)
# ─────────────────────────────────────────────────────────────────────────────
def test_manual_grind_produces_lognormal_psd():
    """Input with grind_size=500.0 (no grinder_name) produces 50-point PSD."""
    inp = SimulationInput(
        coffee_dose=15.0,
        water_amount=250.0,
        water_temp=93.0,
        grind_size=500.0,
        brew_time=240.0,
        roast_level=RoastLevel.medium,
        method=BrewMethod.french_press, mode=Mode.accurate,
    )
    result = french_press.simulate(inp)
    assert len(result.psd_curve) == 50
    total_frac = sum(p.fraction for p in result.psd_curve)
    assert abs(total_frac - 1.0) < 0.01


# ─────────────────────────────────────────────────────────────────────────────
# VAL-01 ACCEPTANCE CRITERION
# ─────────────────────────────────────────────────────────────────────────────
def test_val_01_accurate_ey(standard_input_accurate):
    """VAL-01: accurate mode EY within ±1.5% of published 21.51% target."""
    result = french_press.simulate(standard_input_accurate)
    assert abs(result.extraction_yield - 21.51) < 1.5, (
        f"VAL-01 FAIL: EY={result.extraction_yield:.3f}% (target 21.51% ±1.5%)"
    )


def test_val_01_fast_vs_accurate(standard_input_accurate, standard_input_fast):
    """Fast and accurate mode EY are within ±2.0% of each other."""
    accurate = french_press.simulate(standard_input_accurate)
    fast     = french_press.simulate(standard_input_fast)
    assert abs(accurate.extraction_yield - fast.extraction_yield) < 2.0, (
        f"Mode delta: accurate={accurate.extraction_yield:.2f}% "
        f"fast={fast.extraction_yield:.2f}% (delta must be < 2%)"
    )
