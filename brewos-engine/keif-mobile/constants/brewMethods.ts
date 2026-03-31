import type { BrewMethod } from "../types/simulation";

export interface BrewMethodOption {
  label: string;
  value: BrewMethod;
  defaultDose: number;
  defaultWater: number;
  defaultTemp: number;
  defaultTime: number;
}

export const BREW_METHODS: BrewMethodOption[] = [
  { label: "French Press", value: "french_press", defaultDose: 15, defaultWater: 250, defaultTemp: 93, defaultTime: 240 },
  { label: "V60", value: "v60", defaultDose: 15, defaultWater: 250, defaultTemp: 93, defaultTime: 180 },
  { label: "Kalita Wave", value: "kalita", defaultDose: 15, defaultWater: 250, defaultTemp: 93, defaultTime: 210 },
  { label: "Espresso", value: "espresso", defaultDose: 18, defaultWater: 36, defaultTemp: 93, defaultTime: 25 },
  { label: "Moka Pot", value: "moka_pot", defaultDose: 15, defaultWater: 150, defaultTemp: 93, defaultTime: 180 },
  { label: "AeroPress", value: "aeropress", defaultDose: 15, defaultWater: 200, defaultTemp: 85, defaultTime: 120 },
];

export const GRINDER_PRESETS = [
  { label: "Comandante C40 MK4", value: "Comandante C40 MK4", unit: "clicks", minSetting: 1, maxSetting: 40 },
  { label: "1Zpresso J-Max", value: "1Zpresso J-Max", unit: "clicks", minSetting: 1, maxSetting: 120 },
  { label: "Baratza Encore", value: "Baratza Encore", unit: "settings", minSetting: 1, maxSetting: 40 },
  { label: "Manual (enter microns)", value: null, unit: null, minSetting: null, maxSetting: null },
] as const;
