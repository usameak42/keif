"""Pydantic input model for BrewOS simulation — per architecture_spec.md §3."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator


class RoastLevel(str, Enum):
    light = "light"
    medium = "medium"
    dark = "dark"


class Mode(str, Enum):
    fast = "fast"
    accurate = "accurate"


class BrewMethod(str, Enum):
    french_press = "french_press"
    v60          = "v60"
    kalita       = "kalita"
    espresso     = "espresso"
    moka_pot     = "moka_pot"
    aeropress    = "aeropress"


class SimulationInput(BaseModel):
    """All parameters required to run a BrewOS extraction simulation."""

    coffee_dose: float          # g
    water_amount: float         # g
    water_temp: float           # °C
    grind_size: Optional[float] = None  # μm — manual entry; overridden by grinder lookup
    brew_time: float            # s
    grinder_name: Optional[str] = None
    grinder_setting: Optional[int] = None  # clicks/notches; required if grinder_name set
    roast_level: RoastLevel
    bean_age_days: Optional[float] = None   # days since roast
    pressure_bar: Optional[float] = None    # bar — espresso/moka pressure; None for gravity
    method: BrewMethod              # brew method — determines solver dispatch
    mode: Mode = Mode.fast

    @field_validator("pressure_bar")
    @classmethod
    def pressure_bar_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("pressure_bar must be >= 0")
        return v

    @field_validator("coffee_dose", "water_amount", "brew_time")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("must be positive")
        return v

    @field_validator("grind_size")
    @classmethod
    def grind_size_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("grind_size must be > 0 μm")
        return v

    @field_validator("water_temp")
    @classmethod
    def temp_in_range(cls, v: float) -> float:
        if not (0 < v < 100):
            raise ValueError("water_temp must be between 0 and 100 °C (exclusive)")
        return v

    @model_validator(mode="after")
    def grind_source_consistent(self) -> "SimulationInput":
        has_grinder = self.grinder_name is not None
        has_setting = self.grinder_setting is not None
        has_manual = self.grind_size is not None

        if has_grinder and not has_setting:
            raise ValueError(
                "grinder_setting is required when grinder_name is provided"
            )
        if not has_grinder and not has_manual:
            raise ValueError(
                "either grind_size (μm) or grinder_name + grinder_setting must be provided"
            )
        return self
