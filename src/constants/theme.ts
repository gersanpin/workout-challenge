export const colors = {
  bg: '#0F1A14',
  bgElevated: '#17241C',
  bgSoft: '#1E3026',
  surface: '#243A2E',
  border: '#2F4A3A',
  text: '#F2F7F3',
  textMuted: '#A3B8AB',
  textDim: '#6F8A7A',
  accent: '#C8F135',
  accentDark: '#9BC40F',
  danger: '#FF6B5A',
  warning: '#F5C542',
  white: '#FFFFFF',
  overlay: 'rgba(15, 26, 20, 0.72)',
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
  lg: 18,
  pill: 999,
};

export const typography = {
  brand: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
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
