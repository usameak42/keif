import type { BrewMethod } from "../types/simulation";

export interface BrewMethodOption {
  label: string;
  shortName: string;
  value: BrewMethod;
  defaultDose: number;
  defaultWater: number;
  defaultTemp: number;
  defaultTime: number;
  colors: {
    primary: string;
    glow: string;
    deep: string;
  };
}

export const BREW_METHODS: BrewMethodOption[] = [
  {
    label: "French Press",
    shortName: "FP",
    value: "french_press",
    defaultDose: 15, defaultWater: 250, defaultTemp: 93, defaultTime: 240,
    colors: { primary: "hsl(150, 40%, 32%)", glow: "hsl(148, 50%, 45%)", deep: "hsl(155, 35%, 14%)" },
  },
  {
    label: "Hario V60",
    shortName: "V60",
    value: "v60",
    defaultDose: 15, defaultWater: 250, defaultTemp: 93, defaultTime: 180,
    colors: { primary: "hsl(36, 75%, 50%)", glow: "hsl(38, 85%, 62%)", deep: "hsl(30, 65%, 22%)" },
  },
  {
    label: "Kalita Wave",
    shortName: "KW",
    value: "kalita",
    defaultDose: 15, defaultWater: 250, defaultTemp: 93, defaultTime: 210,
    colors: { primary: "hsl(275, 35%, 45%)", glow: "hsl(270, 45%, 55%)", deep: "hsl(278, 30%, 20%)" },
  },
  {
    label: "Espresso",
    shortName: "ESP",
    value: "espresso",
    defaultDose: 18, defaultWater: 36, defaultTemp: 93, defaultTime: 25,
    colors: { primary: "hsl(350, 55%, 40%)", glow: "hsl(348, 65%, 52%)", deep: "hsl(345, 45%, 18%)" },
  },
  {
    label: "Moka Pot",
    shortName: "MOKA",
    value: "moka_pot",
    defaultDose: 15, defaultWater: 150, defaultTemp: 93, defaultTime: 180,
    colors: { primary: "hsl(18, 55%, 42%)", glow: "hsl(16, 65%, 52%)", deep: "hsl(22, 45%, 18%)" },
  },
  {
    label: "AeroPress",
    shortName: "AP",
    value: "aeropress",
    defaultDose: 15, defaultWater: 200, defaultTemp: 85, defaultTime: 120,
    colors: { primary: "hsl(200, 50%, 42%)", glow: "hsl(198, 60%, 52%)", deep: "hsl(205, 40%, 18%)" },
  },
];

export const GRINDER_PRESETS = [
  { label: "Comandante C40 MK4", value: "Comandante C40 MK4", unit: "clicks", minSetting: 1, maxSetting: 40 },
  { label: "1Zpresso J-Max", value: "1Zpresso J-Max", unit: "clicks", minSetting: 1, maxSetting: 120 },
  { label: "Baratza Encore", value: "Baratza Encore", unit: "settings", minSetting: 1, maxSetting: 40 },
  { label: "Manual (enter microns)", value: null, unit: null, minSetting: null, maxSetting: null },
] as const;
