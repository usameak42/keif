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

// Mirrors brewos/models/outputs.py SimulationOutput (fields used in Phase 6)
export interface SCAPosition {
  tds_percent: number;
  ey_percent: number;
  zone: string;
  on_chart: boolean;
}

export interface SimulationOutput {
  tds_percent: number;
  extraction_yield: number;
  mode_used: string;
  sca_position: SCAPosition | null;
  warnings: string[];
}

export interface ApiError {
  detail: string;
  errors?: string[];
}
