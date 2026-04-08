export type BrewMethodId = 'v60' | 'espresso' | 'french-press' | 'moka-pot' | 'kalita-wave' | 'aeropress';

export interface BrewMethod {
  id: BrewMethodId;
  name: string;
  shortName: string;
  cssVar: string;
  colors: {
    primary: string;
    glow: string;
    deep: string;
  };
  defaults: {
    dose: number;
    water: number;
    grindSize: number;
    temperature: number;
    brewTime: number;
    roastLevel: string;
  };
  ranges: {
    dose: [number, number];
    water: [number, number];
    grindSize: [number, number];
    temperature: [number, number];
    brewTime: [number, number];
  };
}

export const brewMethods: BrewMethod[] = [
  {
    id: 'v60',
    name: 'Hario V60',
    shortName: 'V60',
    cssVar: 'method-v60',
    colors: { primary: 'hsl(36, 75%, 50%)', glow: 'hsl(38, 85%, 62%)', deep: 'hsl(30, 65%, 22%)' },
    defaults: { dose: 15, water: 250, grindSize: 400, temperature: 93, brewTime: 180, roastLevel: 'medium' },
    ranges: { dose: [10, 30], water: [150, 500], grindSize: [200, 800], temperature: [85, 100], brewTime: [120, 300] },
  },
  {
    id: 'espresso',
    name: 'Espresso',
    shortName: 'ESP',
    cssVar: 'method-espresso',
    colors: { primary: 'hsl(350, 55%, 40%)', glow: 'hsl(348, 65%, 52%)', deep: 'hsl(345, 45%, 18%)' },
    defaults: { dose: 18, water: 36, grindSize: 200, temperature: 93, brewTime: 28, roastLevel: 'medium-dark' },
    ranges: { dose: [14, 22], water: [28, 50], grindSize: [100, 400], temperature: [88, 96], brewTime: [20, 40] },
  },
  {
    id: 'french-press',
    name: 'French Press',
    shortName: 'FP',
    cssVar: 'method-french-press',
    colors: { primary: 'hsl(150, 40%, 32%)', glow: 'hsl(148, 50%, 45%)', deep: 'hsl(155, 35%, 14%)' },
    defaults: { dose: 30, water: 500, grindSize: 700, temperature: 95, brewTime: 240, roastLevel: 'medium' },
    ranges: { dose: [15, 60], water: [250, 1000], grindSize: [500, 1000], temperature: [90, 100], brewTime: [180, 360] },
  },
  {
    id: 'moka-pot',
    name: 'Moka Pot',
    shortName: 'MOKA',
    cssVar: 'method-moka-pot',
    colors: { primary: 'hsl(18, 55%, 42%)', glow: 'hsl(16, 65%, 52%)', deep: 'hsl(22, 45%, 18%)' },
    defaults: { dose: 15, water: 150, grindSize: 300, temperature: 95, brewTime: 180, roastLevel: 'medium-dark' },
    ranges: { dose: [10, 25], water: [100, 300], grindSize: [200, 500], temperature: [90, 100], brewTime: [120, 300] },
  },
  {
    id: 'kalita-wave',
    name: 'Kalita Wave',
    shortName: 'KW',
    cssVar: 'method-kalita-wave',
    colors: { primary: 'hsl(275, 35%, 45%)', glow: 'hsl(270, 45%, 55%)', deep: 'hsl(278, 30%, 20%)' },
    defaults: { dose: 15, water: 250, grindSize: 450, temperature: 92, brewTime: 210, roastLevel: 'medium' },
    ranges: { dose: [10, 30], water: [150, 500], grindSize: [300, 700], temperature: [85, 100], brewTime: [150, 300] },
  },
  {
    id: 'aeropress',
    name: 'AeroPress',
    shortName: 'AP',
    cssVar: 'method-aeropress',
    colors: { primary: 'hsl(200, 50%, 42%)', glow: 'hsl(198, 60%, 52%)', deep: 'hsl(205, 40%, 18%)' },
    defaults: { dose: 15, water: 200, grindSize: 350, temperature: 85, brewTime: 90, roastLevel: 'light' },
    ranges: { dose: [10, 25], water: [100, 300], grindSize: [200, 600], temperature: [75, 100], brewTime: [60, 240] },
  },
];

export const getMethod = (id: BrewMethodId) => brewMethods.find(m => m.id === id)!;