"""Tests for Moroney 2016 immersion solver (accurate mode) — Phase 01-01."""

import math

import pytest

from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod
from brewos.models.outputs import SimulationOutput
from brewos.solvers.immersion import solve_accurate


# ─────────────────────────────────────────────────────────────────────────────
# STANDARD TEST SCENARIO: 15g / 250g / 93°C / medium / 240s / grind_size=500µm
# ─────────────────────────────────────────────────────────────────────────────
STANDARD_INPUT = SimulationInput(
    coffee_dose=15.0,
    water_amount=250.0,
    water_temp=93.0,
    grind_size=500.0,
    brew_time=240.0,
    roast_level=RoastLevel.medium,
    method=BrewMethod.french_press,
    mode=Mode.accurate,
)


def test_accurate_output_shape():
    """solve_accurate returns a SimulationOutput with positive TDS and EY, non-empty curve."""
    result = solve_accurate(STANDARD_INPUT)

    assert isinstance(result, SimulationOutput)
    assert result.tds_percent > 0, f"tds_percent={result.tds_percent} must be > 0"
    assert result.extraction_yield > 0, f"extraction_yield={result.extraction_yield} must be > 0"
    assert len(result.extraction_curve) > 0, "extraction_curve must be non-empty"
    assert result.mode_used == "accurate"


def test_accurate_ey_liang():
    """solve_accurate returns extraction_yield within 1.5% absolute of 21.51 (VAL-01 criterion)."""
    result = solve_accurate(STANDARD_INPUT)

    assert abs(result.extraction_yield - 21.51) < 1.5, (
        f"extraction_yield={result.extraction_yield:.4f} not within 1.5% of 21.51"
    )


def test_liang_scaling():
    """Liang 2021 equilibrium scaling anchors EY endpoint to K_liang * E_max * 100 = 21.51%."""
    result = solve_accurate(STANDARD_INPUT)

    assert abs(result.extraction_yield - 21.51) < 0.05, (
        f"extraction_yield={result.extraction_yield:.4f} not within 0.05% of 21.51 "
        "(tight tolerance: scaling should anchor to exactly K_liang * E_max * 100)"
    )


def test_extraction_curve_monotonic():
    """extraction_curve has strictly increasing t values and monotonically non-decreasing EY."""
    result = solve_accurate(STANDARD_INPUT)

    curve = result.extraction_curve
    assert len(curve) >= 2, "extraction_curve must have at least 2 points"

    for i in range(1, len(curve)):
        assert curve[i].t > curve[i - 1].t, (
            f"t values not strictly increasing at index {i}: "
            f"{curve[i-1].t} -> {curve[i].t}"
        )
        assert curve[i].ey >= curve[i - 1].ey - 1e-9, (
            f"EY not monotonically non-decreasing at index {i}: "
            f"{curve[i-1].ey:.6f} -> {curve[i].ey:.6f}"
        )


def test_bound_clipping():
    """No NaN in output; TDS and EY stay within physical plausibility bounds."""
    result = solve_accurate(STANDARD_INPUT)

    assert not math.isnan(result.tds_percent), "tds_percent is NaN"
    assert not math.isnan(result.extraction_yield), "extraction_yield is NaN"
    assert 0 < result.tds_percent < 5, (
        f"tds_percent={result.tds_percent:.4f} outside physical range (0, 5)"
    )
    assert 0 < result.extraction_yield < 30, (
        f"extraction_yield={result.extraction_yield:.4f} outside physical range (0, 30)"
    )
    for pt in result.extraction_curve:
        assert not math.isnan(pt.ey), f"NaN ey at t={pt.t}"
