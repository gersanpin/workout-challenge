/**
 * Fortachones — minimal clean theme
 * Light surface, spinach green accent, navy text. No purple/glow clutter.
 */
export const colors = {
  bg: '#F7F6F2',
  bgElevated: '#FFFFFF',
  bgSoft: '#EEF3EC',
  surface: '#F0F2ED',
  border: '#D8DFD4',
  text: '#1A2420',
  textMuted: '#5C6B63',
  textDim: '#8A968E',
  accent: '#2F7D4A',
  accentSoft: '#D7EBDD',
  accentDark: '#1F5A34',
  danger: '#C23B2E',
  warning: '#C48A12',
  navy: '#1E3A5F',
  white: '#FFFFFF',
  overlay: 'rgba(26, 36, 32, 0.45)',
  chatBubbleMe: '#D7EBDD',
  chatBubbleThem: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  brand: {
    fontSize: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
};
