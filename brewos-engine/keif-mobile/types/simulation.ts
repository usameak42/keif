// Mirrors brewos/models/inputs.py SimulationInput exactly
export type BrewMethod = "french_press" | "v60" | "kalita" | "espresso" | "moka_pot" | "aeropress";
export type RoastLevel = "light" | "medium" | "dark";
export type SimMode = "fast" | "accurate";

export interface SimulationInput {
  method: BrewMethod;
  coffee_dose: number;
  water_amount: number;
  water_temp: number;
  brew_time: number;
  roast_level: RoastLevel;
  mode: SimMode;
  grinder_name: string | null;
  grinder_setting: number | null;
  grind_size: number | null;
}

// Mirrors brewos/models/outputs.py SimulationOutput
export interface SCAPosition {
  tds_percent: number;
  ey_percent: number;
  zone: string;
  on_chart: boolean;
}

export interface ExtractionPoint {
  t: number;       // seconds
  ey: number;      // extraction yield %
}

export interface PSDPoint {
  size_um: number;  // particle size um
  fraction: number; // volume fraction 0-1
}

export interface FlavorProfile {
  sour: number;     // 0-1
  sweet: number;    // 0-1
  bitter: number;   // 0-1
}

export interface TempPoint {
  t: number;        // seconds
  temp_c: number;   // degrees C
}

export interface SimulationOutput {
  tds_percent: number;
  extraction_yield: number;
  extraction_curve: ExtractionPoint[];
  psd_curve: PSDPoint[];
  flavor_profile: FlavorProfile;
  brew_ratio: number;
  brew_ratio_recommendation: string;
  warnings: string[];
  mode_used: string;
  sca_position: SCAPosition | null;
  channeling_risk: number | null;
  extraction_uniformity_index: number | null;
  temperature_curve: TempPoint[] | null;
  puck_resistance: number | null;
  caffeine_mg_per_ml: number | null;
}

export interface ApiError {
  detail: string;
  errors?: string[];
}
