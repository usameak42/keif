"""Moka Pot pressure solver tests — SOLV-05, SOLV-06."""

import time
import pytest
from brewos.models.inputs import SimulationInput, RoastLevel, Mode, BrewMethod
from brewos.solvers.pressure import solve_accurate, solve_fast


MOKA_STANDARD = SimulationInput(
    coffee_dose=15.0, water_amount=150.0, water_temp=93.0,
    grind_size=400.0, brew_time=180.0, roast_level=RoastLevel.medium,
    method=BrewMethod.moka_pot, mode=Mode.accurate,
)


def test_moka_accurate_ey_range():
    """SOLV-05: Moka Pot accurate mode EY in 15-22% range."""
    result = solve_accurate(MOKA_STANDARD)
    assert 15.0 <= result.extraction_yield <= 22.0, (
        f"EY {result.extraction_yield:.2f}% outside 15-22% range"
    )


def test_moka_heating_phase():
    """SOLV-05: Extraction curve shows near-zero EY during heating, then extraction onset.

    At 93C start, heating phase to boiling (~100C) takes ~5s at 800W.
    The first ~3 time points (0-5s) should show near-zero EY, then
    extraction ramps up once steam pressure exceeds atmospheric.
    """
    result = solve_accurate(MOKA_STANDARD)
    # First 3 points are in the heating phase (T < 100C, no steam flow)
    early_eys = [p.ey for p in result.extraction_curve[:3]]
    assert all(ey < 1.0 for ey in early_eys), (
        f"Early points should show near-zero EY (heating phase): {early_eys}"
    )
    # Later points show substantial extraction after steam pressure onset
    mid_curve = [p for p in result.extraction_curve if p.t > 8.0 and p.t < 15.0]
    assert len(mid_curve) > 0, "Should have extraction points after heating phase"
    assert any(p.ey > 5.0 for p in mid_curve), "Post-heating points should show rising EY"
    assert result.extraction_curve[-1].ey > 10.0, "Final EY should be substantial"


def test_moka_accurate_complete_output():
    """SOLV-05: solve_accurate returns complete SimulationOutput with all 7 core fields."""
    result = solve_accurate(MOKA_STANDARD)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert len(result.extraction_curve) > 0
    assert len(result.psd_curve) > 0
    assert result.flavor_profile is not None
    assert result.brew_ratio > 0
    assert result.mode_used == "accurate"


def test_moka_fast_accuracy():
    """SOLV-06: Fast mode EY within +-2% of accurate mode."""
    acc = solve_accurate(MOKA_STANDARD)
    fast_inp = MOKA_STANDARD.model_copy(update={"mode": Mode.fast})
    fast = solve_fast(fast_inp)
    assert abs(acc.extraction_yield - fast.extraction_yield) < 2.0, (
        f"Fast EY {fast.extraction_yield:.2f}% vs Accurate {acc.extraction_yield:.2f}% differ by > 2%"
    )


def test_moka_fast_speed():
    """SOLV-06: Fast mode completes in under 1ms per call."""
    fast_inp = MOKA_STANDARD.model_copy(update={"mode": Mode.fast})
    start = time.perf_counter()
    for _ in range(100):
        solve_fast(fast_inp)
    elapsed = (time.perf_counter() - start) / 100
    assert elapsed < 0.001, f"Fast mode took {elapsed*1000:.2f}ms per call (target < 1ms)"


def test_moka_ratio_bounds():
    """Output helpers: _RATIO_BOUNDS contains 'moka' entry."""
    from brewos.utils.output_helpers import _RATIO_BOUNDS
    assert "moka" in _RATIO_BOUNDS
    lo, hi = _RATIO_BOUNDS["moka"][:2]
    assert lo == 6.0
    assert hi == 12.0


def test_aeropress_ratio_bounds():
    """Output helpers: _RATIO_BOUNDS contains 'aeropress' entry."""
    from brewos.utils.output_helpers import _RATIO_BOUNDS
    assert "aeropress" in _RATIO_BOUNDS
    lo, hi = _RATIO_BOUNDS["aeropress"][:2]
    assert lo == 6.0
    assert hi == 17.0
