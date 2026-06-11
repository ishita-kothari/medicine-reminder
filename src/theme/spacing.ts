export const Spacing = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 40,
  xxl: 56,
} as const;

export const Layout = {
  minTouchTarget: 60,
  buttonHeightNormal: 60,
  buttonHeightLarge: 80,
  cardBorderRadius: 16,
  inputBorderRadius: 12,
  tabBarHeight: 70,
  headerHeight: 56,
} as const;

export const Shadows = {
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
