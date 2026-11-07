/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherTheme {
  conditionKey: string;
  displayName: string;
  glowColor: string;
  coreColor: string;
  ringColor: string;
  radialGradient: string;
  accentHex: number;
  coreHex: number;
  emissiveHex: number;
  light1Hex: number;
  light2Hex: number;
  ringHex: number;
}

export const WEATHER_THEMES: Record<string, WeatherTheme> = {
  sun: {
    conditionKey: 'sun',
    displayName: 'Warm Solar (Sunny / Clear)',
    glowColor: 'rgba(245, 158, 11, 0.72)',
    coreColor: 'rgba(251, 191, 36, 0.55)',
    ringColor: 'rgba(253, 230, 138, 0.8)',
    radialGradient: 'radial-gradient(circle, rgba(245, 158, 11, 0.55) 0%, rgba(234, 88, 12, 0.35) 36%, rgba(180, 83, 9, 0.18) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0xfbbf24,     // amber-400
    coreHex: 0xd97706,       // amber-600
    emissiveHex: 0xf59e0b,   // amber-500
    light1Hex: 0xfbbf24,
    light2Hex: 0xea580c,     // orange-600
    ringHex: 0xfde68a,       // amber-200
  },
  rain: {
    conditionKey: 'rain',
    displayName: 'Cool Rain (Oceanic Blue)',
    glowColor: 'rgba(14, 165, 233, 0.72)',
    coreColor: 'rgba(56, 189, 248, 0.55)',
    ringColor: 'rgba(125, 211, 252, 0.8)',
    radialGradient: 'radial-gradient(circle, rgba(14, 165, 233, 0.55) 0%, rgba(2, 132, 199, 0.38) 36%, rgba(30, 58, 138, 0.22) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0x38bdf8,     // sky-400
    coreHex: 0x0369a1,       // sky-700
    emissiveHex: 0x0284c7,   // sky-600
    light1Hex: 0x38bdf8,
    light2Hex: 0x1d4ed8,     // blue-700
    ringHex: 0x7dd3fc,       // sky-300
  },
  thunderstorm: {
    conditionKey: 'thunderstorm',
    displayName: 'Storm Voltage (Violet / Indigo)',
    glowColor: 'rgba(168, 85, 247, 0.78)',
    coreColor: 'rgba(192, 132, 252, 0.58)',
    ringColor: 'rgba(233, 213, 255, 0.85)',
    radialGradient: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(126, 34, 206, 0.4) 36%, rgba(76, 29, 149, 0.24) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0xc084fc,     // purple-400
    coreHex: 0x7e22ce,       // purple-700
    emissiveHex: 0xa855f7,   // purple-500
    light1Hex: 0xc084fc,
    light2Hex: 0x6366f1,     // indigo-500
    ringHex: 0xe9d5ff,       // purple-200
  },
  snow: {
    conditionKey: 'snow',
    displayName: 'Glacial Frost (Cyan / Crystal White)',
    glowColor: 'rgba(165, 243, 252, 0.75)',
    coreColor: 'rgba(224, 242, 254, 0.65)',
    ringColor: 'rgba(240, 253, 250, 0.9)',
    radialGradient: 'radial-gradient(circle, rgba(165, 243, 252, 0.58) 0%, rgba(56, 189, 248, 0.32) 36%, rgba(12, 74, 110, 0.2) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0xa5f3fc,     // cyan-200
    coreHex: 0x0891b2,       // cyan-600
    emissiveHex: 0x67e8f9,   // cyan-300
    light1Hex: 0xe0f2fe,
    light2Hex: 0x38bdf8,
    ringHex: 0xf0fdfa,
  },
  clouds: {
    conditionKey: 'clouds',
    displayName: 'Overcast Pearl (Slate / Azure)',
    glowColor: 'rgba(148, 163, 184, 0.68)',
    coreColor: 'rgba(203, 213, 225, 0.52)',
    ringColor: 'rgba(186, 230, 253, 0.75)',
    radialGradient: 'radial-gradient(circle, rgba(148, 163, 184, 0.52) 0%, rgba(100, 116, 139, 0.35) 36%, rgba(30, 41, 59, 0.2) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0x94a3b8,     // slate-400
    coreHex: 0x334155,       // slate-700
    emissiveHex: 0x64748b,   // slate-500
    light1Hex: 0x94a3b8,
    light2Hex: 0x3b82f6,
    ringHex: 0xcbd5e1,
  },
  fog: {
    conditionKey: 'fog',
    displayName: 'Atmospheric Mist (Teal / Jade)',
    glowColor: 'rgba(20, 184, 166, 0.7)',
    coreColor: 'rgba(94, 234, 212, 0.52)',
    ringColor: 'rgba(153, 246, 228, 0.8)',
    radialGradient: 'radial-gradient(circle, rgba(20, 184, 166, 0.52) 0%, rgba(15, 118, 110, 0.35) 36%, rgba(19, 78, 74, 0.2) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0x2dd4bf,     // teal-400
    coreHex: 0x0f766e,       // teal-700
    emissiveHex: 0x14b8a6,   // teal-500
    light1Hex: 0x5eead4,
    light2Hex: 0x0284c7,
    ringHex: 0x99f6e4,
  },
  default: {
    conditionKey: 'default',
    displayName: 'Arc Reactor Core (Cyan / Cobalt)',
    glowColor: 'rgba(56, 189, 248, 0.65)',
    coreColor: 'rgba(14, 165, 233, 0.55)',
    ringColor: 'rgba(96, 165, 250, 0.75)',
    radialGradient: 'radial-gradient(circle, rgba(56, 189, 248, 0.55) 0%, rgba(14, 165, 233, 0.38) 35%, rgba(37, 99, 235, 0.2) 58%, rgba(2, 6, 23, 0) 75%)',
    accentHex: 0x38bdf8,
    coreHex: 0x0284c7,
    emissiveHex: 0x0284c7,
    light1Hex: 0x38bdf8,
    light2Hex: 0x2563eb,
    ringHex: 0x60a5fa,
  },
};

/**
 * Resolves a weather condition string to its corresponding orb visual theme.
 */
export function getWeatherTheme(condition?: string | null): WeatherTheme {
  if (!condition) return WEATHER_THEMES.default;
  const lower = condition.toLowerCase();

  if (
    lower.includes('sun') ||
    lower.includes('clear') ||
    lower.includes('warm') ||
    lower.includes('hot')
  ) {
    return WEATHER_THEMES.sun;
  }

  if (
    lower.includes('rain') ||
    lower.includes('drizzle') ||
    lower.includes('shower')
  ) {
    return WEATHER_THEMES.rain;
  }

  if (
    lower.includes('thunder') ||
    lower.includes('storm') ||
    lower.includes('lightning')
  ) {
    return WEATHER_THEMES.thunderstorm;
  }

  if (
    lower.includes('snow') ||
    lower.includes('ice') ||
    lower.includes('blizzard') ||
    lower.includes('freez')
  ) {
    return WEATHER_THEMES.snow;
  }

  if (
    lower.includes('fog') ||
    lower.includes('mist') ||
    lower.includes('haze')
  ) {
    return WEATHER_THEMES.fog;
  }

  if (
    lower.includes('cloud') ||
    lower.includes('overcast')
  ) {
    return WEATHER_THEMES.clouds;
  }

  return WEATHER_THEMES.default;
}
