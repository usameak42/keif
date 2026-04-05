"""AeroPress hybrid solver tests — immersion steep + pressure push pipeline."""

import time
import pytest
from brewos.models.inputs import SimulationInput, RoastLevel, Mode, BrewMethod
from brewos.methods.aeropress import simulate, AEROPRESS_DEFAULTS

AEROPRESS_STANDARD = SimulationInput(
    coffee_dose=15.0, water_amount=200.0, water_temp=93.0,
    grind_size=500.0, brew_time=90.0, roast_level=RoastLevel.medium,
    method=BrewMethod.aeropress, mode=Mode.accurate,
)


def test_hybrid_exceeds_steep():
    """AeroPress hybrid EY must exceed scaled steep-only EY.

    The AeroPress solver applies target scaling (19%) to the raw combined
    kinetics. The push phase contributes a visible increment above the
    steep-only portion of the curve. We verify this by checking that the
    final EY exceeds the EY at the end of the steep phase (last steep
    curve point) by at least 1 percentage point.
    """
    hybrid_result = simulate(AEROPRESS_STANDARD)
    # The steep portion of the curve ends at steep_time_s.
    steep_time = AEROPRESS_DEFAULTS["steep_time_s"]
    # Find the EY at the end of the steep phase
    steep_ey = None
    for pt in hybrid_result.extraction_curve:
        if pt.t <= steep_time:
            steep_ey = pt.ey
    assert steep_ey is not None, "No steep phase points found in extraction curve"
    assert hybrid_result.extraction_yield > steep_ey + 1.0, (
        f"Hybrid EY ({hybrid_result.extraction_yield:.2f}%) must exceed "
        f"steep-only EY ({steep_ey:.2f}%) by at least 1%"
    )


def test_aeropress_ey_range():
    """AeroPress hybrid EY is in plausible range.

    Upper bound is 26% (not 25%) because AeroPress combines immersion steep
    (Liang 21.51% anchor) + push phase washout (~3-4% increment).
    """
    result = simulate(AEROPRESS_STANDARD)
    assert 15.0 <= result.extraction_yield <= 26.0


def test_aeropress_complete_output():
    result = simulate(AEROPRESS_STANDARD)
    assert result.tds_percent > 0
    assert result.extraction_yield > 0
    assert len(result.extraction_curve) > 0
    assert len(result.psd_curve) > 0
    assert result.flavor_profile is not None
    assert result.brew_ratio > 0
    assert result.mode_used == "accurate"


def test_aeropress_fast_accuracy():
    acc = simulate(AEROPRESS_STANDARD)
    fast_inp = AEROPRESS_STANDARD.model_copy(update={"mode": Mode.fast})
    fast = simulate(fast_inp)
    assert abs(acc.extraction_yield - fast.extraction_yield) < 2.0


def test_aeropress_fast_speed():
    fast_inp = AEROPRESS_STANDARD.model_copy(update={"mode": Mode.fast})
    start = time.perf_counter()
    for _ in range(100):
        simulate(fast_inp)
    elapsed = (time.perf_counter() - start) / 100
    assert elapsed < 0.001
