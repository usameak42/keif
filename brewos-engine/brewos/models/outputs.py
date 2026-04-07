"""Pydantic output model for BrewOS simulation — per architecture_spec.md §3."""

from typing import List, Optional

from pydantic import BaseModel


class ExtractionPoint(BaseModel):
    """Single point on the time-resolved extraction curve."""
    t: float    # seconds
    ey: float   # extraction yield %


class PSDPoint(BaseModel):
    """Single point on the particle size distribution curve."""
    size_um: float      # particle size μm
    fraction: float     # volume fraction (0–1)


class FlavorProfile(BaseModel):
    """Normalised flavor scores (0–1)."""
    sour: float
    sweet: float
    bitter: float


class TempPoint(BaseModel):
    """Single point on the water temperature decay curve."""
    t: float        # seconds
    temp_c: float   # °C


class SCAPosition(BaseModel):
    """SCA Brew Control Chart position and zone classification."""
    tds_percent: float  # Total Dissolved Solids %
    ey_percent: float   # Extraction Yield %
    zone: str           # "ideal" | "under_extracted" | "over_extracted" | "weak" | "strong"
    on_chart: bool      # True if TDS is in the chart's displayable range for this method


class SimulationOutput(BaseModel):
    """All outputs returned by a BrewOS extraction simulation."""

    tds_percent: float                          # Total Dissolved Solids %
    extraction_yield: float                     # Extraction Yield %
    extraction_curve: List[ExtractionPoint]     # EY vs time
    psd_curve: List[PSDPoint]                   # particle size distribution
    flavor_profile: FlavorProfile               # sour/sweet/bitter scores
    brew_ratio: float                           # actual water/coffee ratio used
    brew_ratio_recommendation: str              # suggestion if ratio is out of range
    warnings: List[str]                         # e.g. over-extraction, channeling risk
    mode_used: str                              # "fast" or "accurate"
    channeling_risk: Optional[float] = None     # [0, 1] for espresso; None otherwise
    extraction_uniformity_index: Optional[float] = None    # OUT-07: [0, 1], 1=uniform; percolation methods only
    temperature_curve: Optional[List[TempPoint]] = None     # OUT-10: T(t) via Newton's Law of Cooling
    sca_position: Optional[SCAPosition] = None              # OUT-11: SCA brew chart classification
    puck_resistance: Optional[float] = None                 # OUT-12: [0, 1], 1=tight puck; espresso only
    caffeine_mg_per_ml: Optional[float] = None             # OUT-13: empirical caffeine concentration
    agtron_number: Optional[int] = None                    # SCA Gourmet scale midpoint for roast level
