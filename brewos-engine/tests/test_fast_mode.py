"Tests for Maille 2021 biexponential fast mode and French Press method config."

import time

import pytest

from brewos.models.inputs import SimulationInput, Mode, RoastLevel, BrewMethod
from brewos.models.outputs import SimulationOutput
from brewos.solvers.immersion import solve_fast, solve_accurate
import brewos.methods.french_press as french_press


# ─────────────────────────────────────────────────────────────────────────────
# SHARED FIXTURES
# ─────────────────────────────────────────────────────────────────────────────

STANDARD_FAST = SimulationInput(
    coffee_dose=15.0,
    water_amount=250.0,
    water_temp=93.0,
    grind_size=500.0,
    brew_time=240.0,
    roast_level=RoastLevel.medium,
    method=BrewMethod.french_press,
    mode=Mode.fast,
)

STANDARD_ACCURATE = SimulationInput(
    coffee_dose=15.0,
    water_amount=250.0,
    water_temp=93.0,
    grind_size=500.0,
    brew_time=240.0,
    roast_level=RoastLevel.medium,
    method=BrewMethod.french_press,
    mode=Mode.accurate,
)


# ─────────────────────────────────────────────────────────────────────────────
# FAST MODE SHAPE + OUTPUT TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestFastOutputShape:

    def test_fast_output_shape(self):
        """solve_fast returns SimulationOutput with mode_used=='fast' and positive outputs."""
        result = solve_fast(STANDARD_FAST)
        assert isinstance(result, SimulationOutput)
        assert result.mode_used == "fast"
        assert result.tds_percent > 0
        assert result.extraction_yield > 0

    def test_fast_curve_shape(self):
        """extraction_curve is non-empty, spans 0 to brew_time, starts near 0."""
        result = solve_fast(STANDARD_FAST)
        curve = result.extraction_curve
        assert len(curve) > 0
        assert curve[0].t == pytest.approx(0.0, abs=1.0)
        assert curve[-1].t == pytest.approx(STANDARD_FAST.brew_time, abs=1.0)
        assert curve[0].ey == pytest.approx(0.0, abs=0.5)  # starts near zero
        assert curve[-1].ey == pytest.approx(result.extraction_yield, rel=0.01)


# ─────────────────────────────────────────────────────────────────────────────
# ACCURACY vs ACCURATE MODE
# ─────────────────────────────────────────────────────────────────────────────

class TestFastAccurateTolerance:

    def test_fast_vs_accurate_tolerance(self):
        """solve_fast EY is within +/-2% absolute of solve_accurate for same input."""
        fast_result     = solve_fast(STANDARD_FAST)
        accurate_result = solve_accurate(STANDARD_ACCURATE)
        diff = abs(fast_result.extraction_yield - accurate_result.extraction_yield)
        assert diff < 2.0, (
            f"Fast EY ({fast_result.extraction_yield:.2f}%) and "
            f"accurate EY ({accurate_result.extraction_yield:.2f}%) differ by {diff:.2f}% "
            f"(tolerance: 2.0%)"
        )


# ─────────────────────────────────────────────────────────────────────────────
# PERFORMANCE
# ─────────────────────────────────────────────────────────────────────────────

class TestFastPerformance:

    def test_fast_performance(self):
        """solve_fast median execution time < 1ms across 100 iterations."""
        times_ns = []
        for _ in range(100):
            t_start = time.perf_counter_ns()
            solve_fast(STANDARD_FAST)
            t_end = time.perf_counter_ns()
            times_ns.append(t_end - t_start)

        times_ns.sort()
        median_ns = times_ns[len(times_ns) // 2]
        assert median_ns < 1_000_000, (
            f"solve_fast median time {median_ns / 1e6:.3f}ms exceeds 1ms target"
        )


# ─────────────────────────────────────────────────────────────────────────────
# FRENCH PRESS DISPATCHER
# ─────────────────────────────────────────────────────────────────────────────

class TestFrenchPressDispatches:

    def test_french_press_dispatches_fast(self):
        """french_press.simulate() dispatches to fast solver for mode=fast."""
        result = french_press.simulate(STANDARD_FAST)
        assert result.mode_used == "fast"

    def test_french_press_dispatches_accurate(self):
        """french_press.simulate() dispatches to accurate solver for mode=accurate."""
        result = french_press.simulate(STANDARD_ACCURATE)
        assert result.mode_used == "accurate"

    def test_french_press_defaults_exist(self):
        """FRENCH_PRESS_DEFAULTS dict is exported with expected keys."""
        assert hasattr(french_press, "FRENCH_PRESS_DEFAULTS")
        defaults = french_press.FRENCH_PRESS_DEFAULTS
        assert "brew_time" in defaults
        assert "water_temp" in defaults
        assert "brew_ratio_min" in defaults
        assert "brew_ratio_max" in defaults
