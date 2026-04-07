"Tests for CO2 bloom modifier — Smrke 2018 bi-exponential model."

import pytest

from brewos.utils.co2_bloom import co2_bloom_factor, CO2_PARAMS


class TestCO2ParamsStructure:

    def test_co2_params_structure(self):
        """CO2_PARAMS has 5-tier roast keys with all 5 sub-keys."""
        expected_roasts = {"light", "medium_light", "medium", "medium_dark", "dark"}
        expected_keys   = {"tau_fast", "tau_slow", "A_fast", "A_slow", "beta"}

        assert set(CO2_PARAMS.keys()) == expected_roasts

        for roast, params in CO2_PARAMS.items():
            assert set(params.keys()) == expected_keys, (
                f"Missing keys for roast '{roast}': "
                f"{expected_keys - set(params.keys())}"
            )


class TestCO2BloomFactorRange:

    def test_factor_range(self):
        """co2_bloom_factor returns a value in [0.0, 1.0]."""
        factor = co2_bloom_factor(t=0, roast_level="medium", bean_age_days=7)
        assert 0.0 <= factor <= 1.0

    def test_factor_increases_with_time(self):
        """Factor at t=0 is less than factor at t=30 (CO2 degasses during bloom)."""
        factor_t0  = co2_bloom_factor(t=0,  roast_level="medium", bean_age_days=7)
        factor_t30 = co2_bloom_factor(t=30, roast_level="medium", bean_age_days=7)
        assert factor_t0 < factor_t30, (
            f"Expected factor to increase with time: t=0 → {factor_t0}, t=30 → {factor_t30}"
        )

    def test_factor_near_one_after_bloom(self):
        """Factor at t=300s is ~1.0 (CO2 effect negligible after bloom window)."""
        factor = co2_bloom_factor(t=300, roast_level="medium", bean_age_days=7)
        assert factor > 0.99, f"Expected factor > 0.99 at t=300s, got {factor}"


class TestCO2BloomRoastDependence:

    def test_dark_stronger_than_light(self):
        """Dark roast has stronger suppression at t=0 than light roast."""
        factor_dark  = co2_bloom_factor(t=0, roast_level="dark",  bean_age_days=7)
        factor_light = co2_bloom_factor(t=0, roast_level="light", bean_age_days=7)
        assert factor_dark < factor_light, (
            f"Dark roast ({factor_dark}) should suppress more than light roast ({factor_light})"
        )


class TestCO2BloomOldBeans:

    def test_old_beans_no_suppression(self):
        """Beans at 60 days post-roast have negligible CO2 → factor ~1.0."""
        factor = co2_bloom_factor(t=0, roast_level="medium", bean_age_days=60)
        assert factor > 0.99, (
            f"Expected ~1.0 for 60-day-old beans at t=0, got {factor}"
        )
