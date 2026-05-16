export const THEME_STORAGE_KEY = 'lekalu_theme';

export const THEME_OPTIONS = [
  { value: 'indigo', label: 'Indigo', color: '#3B82F6' },
  { value: 'blue', label: 'Blue', color: '#2563EB' },
  { value: 'purple', label: 'Purple', color: '#8B5CF6' },
  { value: 'pink', label: 'Pink', color: '#EC4899' },
  { value: 'green', label: 'Green', color: '#10B981' },
  { value: 'red', label: 'Red', color: '#EF4444' },
  { value: 'orange', label: 'Orange', color: '#F97316' },
  { value: 'teal', label: 'Teal', color: '#14B8A6' },
];

const PRESET_THEME_PALETTES = {
  indigo: {
    background: '#0F172A',
    foreground: '#1E293B',
    accent: '#3B82F6',
  },
  blue: {
    background: '#0B1A30',
    foreground: '#122642',
    accent: '#2563EB',
  },
  purple: {
    background: '#180E2B',
    foreground: '#261842',
    accent: '#8B5CF6',
  },
  pink: {
    background: '#260F1E',
    foreground: '#38182C',
    accent: '#EC4899',
  },
  green: {
    background: '#0C1C18',
    foreground: '#122D26',
    accent: '#10B981',
  },
  red: {
    background: '#280F12',
    foreground: '#40181C',
    accent: '#EF4444',
  },
  orange: {
    background: '#2A160B',
    foreground: '#442211',
    accent: '#F97316',
  },
  teal: {
    background: '#0B1F20',
    foreground: '#123032',
    accent: '#14B8A6',
  },
};

const PRESET_THEME_KEYS = new Set(Object.keys(PRESET_THEME_PALETTES));

export const DEFAULT_THEME = {
  mode: 'custom',
  preset: 'indigo',
  background: PRESET_THEME_PALETTES.indigo.background,
  foreground: PRESET_THEME_PALETTES.indigo.foreground,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value);

const normalizeHexColor = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return isHexColor(normalized) ? normalized.toUpperCase() : fallback;
};

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const hexToRgbTriplet = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
};

const rgbToTriplet = ({ r, g, b }) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

const rgbToHsl = ({ r, g, b }) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);

    switch (max) {
      case red:
        hue = ((green - blue) / delta + (green < blue ? 6 : 0));
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue *= 60;
  }

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
  };
};

const hslToRgb = (h, s, l) => {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSegment = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = secondary;
  } else if (hue < 120) {
    red = secondary;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = secondary;
  } else if (hue < 240) {
    green = secondary;
    blue = chroma;
  } else if (hue < 300) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
};

const buildAccentTriplet = (foregroundHex) => {
  const { h, s, l } = rgbToHsl(hexToRgb(foregroundHex));
  const accentLightness = l >= 50 ? clamp(l - 12, 18, 82) : clamp(l + 14, 18, 82);
  const accentSaturation = clamp(s + 8, 28, 88);
  return rgbToTriplet(hslToRgb(h, accentSaturation, accentLightness));
};

const getLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    let s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const getIsLight = (r, g, b) => getLuminance(r, g, b) > 0.45;

const createPalette = (backgroundHex, foregroundHex) => ({
  primary: hexToRgbTriplet(backgroundHex),
  secondary: hexToRgbTriplet(foregroundHex),
  accent: buildAccentTriplet(foregroundHex),
  baseBackground: hexToRgbTriplet(backgroundHex),
  baseForeground: hexToRgbTriplet(foregroundHex),
});

const getPresetPalette = (preset) => PRESET_THEME_PALETTES[preset] || PRESET_THEME_PALETTES.indigo;

const parseThemeInput = (theme) => {
  if (typeof theme === 'string') {
    const trimmed = theme.trim();

    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }

    return trimmed.toLowerCase();
  }

  if (theme && typeof theme === 'object') {
    return theme;
  }

  return null;
};

const toCustomTheme = (background, foreground, preset = null) => ({
  mode: 'custom',
  ...(preset ? { preset } : {}),
  background: normalizeHexColor(background, DEFAULT_THEME.background),
  foreground: normalizeHexColor(foreground, DEFAULT_THEME.foreground),
});

export const normalizeTheme = (theme) => {
  const parsedTheme = parseThemeInput(theme);

  if (typeof parsedTheme === 'string') {
    if (PRESET_THEME_KEYS.has(parsedTheme)) {
      const presetPalette = getPresetPalette(parsedTheme);
      return {
        mode: 'preset',
        preset: parsedTheme,
        background: presetPalette.background,
        foreground: presetPalette.foreground,
      };
    }

    return { ...DEFAULT_THEME };
  }

  if (!parsedTheme || typeof parsedTheme !== 'object') {
    return { ...DEFAULT_THEME };
  }

  const presetKey = typeof parsedTheme.preset === 'string' && PRESET_THEME_KEYS.has(parsedTheme.preset.trim().toLowerCase())
    ? parsedTheme.preset.trim().toLowerCase()
    : null;

  const sourceBackground = parsedTheme.background ?? parsedTheme.primary;
  const sourceForeground = parsedTheme.foreground ?? parsedTheme.secondary;

  if (presetKey && sourceBackground == null && sourceForeground == null) {
    const presetPalette = getPresetPalette(presetKey);
    return {
      mode: 'preset',
      preset: presetKey,
      background: presetPalette.background,
      foreground: presetPalette.foreground,
    };
  }

  if (sourceBackground != null || sourceForeground != null || parsedTheme.mode === 'custom' || parsedTheme.mode === 'preset') {
    const fallbackPreset = presetKey ? getPresetPalette(presetKey) : getPresetPalette('indigo');
    return toCustomTheme(
      sourceBackground ?? fallbackPreset.background,
      sourceForeground ?? fallbackPreset.foreground,
      presetKey
    );
  }

  return { ...DEFAULT_THEME };
};

export const resolveThemePalette = (theme) => {
  const normalizedTheme = normalizeTheme(theme);

  if (normalizedTheme.mode === 'preset' && normalizedTheme.preset && PRESET_THEME_PALETTES[normalizedTheme.preset]) {
    const presetPalette = PRESET_THEME_PALETTES[normalizedTheme.preset];
    return {
      primary: hexToRgbTriplet(presetPalette.background),
      secondary: hexToRgbTriplet(presetPalette.foreground),
      accent: hexToRgbTriplet(presetPalette.accent),
      baseBackground: hexToRgbTriplet(presetPalette.background),
      baseForeground: hexToRgbTriplet(presetPalette.foreground),
    };
  }

  return createPalette(normalizedTheme.background, normalizedTheme.foreground);
};

export const getThemeOption = (theme) => {
  const normalized = normalizeTheme(theme);

  if (normalized.mode === 'preset' && normalized.preset && PRESET_THEME_PALETTES[normalized.preset]) {
    return THEME_OPTIONS.find((option) => option.value === normalized.preset) || THEME_OPTIONS[0];
  }

  return {
    value: 'custom',
    label: 'Custom',
    color: normalized.background,
  };
};

export const applyTheme = (theme) => {
  const normalizedTheme = normalizeTheme(theme);
  const palette = resolveThemePalette(normalizedTheme);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = normalizedTheme.mode === 'preset' && normalizedTheme.preset
      ? normalizedTheme.preset
      : 'custom';

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--color-primary', palette.primary);
    rootStyle.setProperty('--color-secondary', palette.secondary);
    rootStyle.setProperty('--color-accent', palette.accent);
    rootStyle.setProperty('--theme-background-base', palette.baseBackground);
    rootStyle.setProperty('--theme-foreground-base', palette.baseForeground);
    rootStyle.setProperty('--theme-primary-base', palette.baseBackground);
    rootStyle.setProperty('--theme-secondary-base', palette.baseForeground);

    const primaryRgb = palette.primary.split(' ').map(Number);
    const secondaryRgb = palette.secondary.split(' ').map(Number);
    const accentRgb = palette.accent.split(' ').map(Number);

    const primaryIsLight = getIsLight(...primaryRgb);
    const secondaryIsLight = getIsLight(...secondaryRgb);
    const accentIsLight = getIsLight(...accentRgb);

    document.documentElement.setAttribute('data-primary-mode', primaryIsLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-secondary-mode', secondaryIsLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-accent-mode', accentIsLight ? 'light' : 'dark');

    if (primaryIsLight) {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(normalizedTheme));
  }

  return normalizedTheme;
};

export const initializeTheme = () => {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_THEME };
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return applyTheme(storedTheme || DEFAULT_THEME);
};