/**
 * KrishiMitra Design Tokens
 * 
 * Inspired by the modern AgriTech Dribbble reference design:
 * - Nature-inspired, trustworthy, and technologically sophisticated
 * - Primary Green: #145C3A
 * - Secondary Sage: #E6F1E7
 * - Background Cream: #F7F5EF
 * - Accent Gold: #E9B44C
 * - White: #FFFFFF
 * - Primary Text: #183B2B
 * - Secondary Text: #718078
 */

export const colors = {
  // Brand tokens (Exact spec)
  primary: "#145C3A",
  primaryDark: "#0C3E26",
  primaryLight: "#1E784D",
  primarySubtle: "#F0F7F2",

  secondary: "#E6F1E7",
  secondaryDark: "#C4DEC8",
  secondaryLight: "#F2F8F3",

  background: "#F7F5EF",
  backgroundMuted: "#EFECE3",

  accent: "#E9B44C",
  accentLight: "#FDF6E7",
  accentDark: "#C6932C",

  white: "#FFFFFF",
  cardBg: "#FFFFFF",

  // Typography
  textPrimary: "#183B2B",
  textSecondary: "#718078",
  textMuted: "#9EAAA3",
  textInverse: "#FFFFFF",

  // Borders & Dividers
  border: "#E7E4DC",
  borderLight: "#F0EEE6",
  borderSubtle: "rgba(24, 59, 43, 0.08)",

  // Status & Feedback
  success: "#145C3A",
  successBg: "#E6F1E7",
  successBorder: "#B9DEC0",

  warning: "#D98A1B",
  warningBg: "#FEF7ED",
  warningBorder: "#FCD39D",

  danger: "#C0392B",
  dangerBg: "#FDEDEC",
  dangerBorder: "#F5B7B1",

  info: "#2B6CB0",
  infoBg: "#EBF8FF",
  infoBorder: "#BEE3F8",

  // Legacy compatibility mappings
  forest: "#145C3A",
  forestDark: "#0C3E26",
  green: "#145C3A",
  greenLight: "#2E8B57",
  greenPale: "#E6F1E7",
  earth: "#E9B44C",
  earthSoft: "#FDF6E7",
  cream: "#F7F5EF",
  creamDark: "#EFECE3",
  sand: "#E7E4DC",
  ink: "#183B2B",
  inkMuted: "#718078",
  inkLight: "#9EAAA3",
} as const;

export const typography = {
  fontFamily: {
    regular: "Manrope_400Regular",
    medium: "Manrope_500Medium",
    semibold: "Manrope_600SemiBold",
    bold: "Manrope_700Bold",
    extrabold: "Manrope_800ExtraBold",
    // Fallback references
    heading: "Manrope_700Bold",
    body: "Manrope_400Regular",
  },
  fontSize: {
    "2xs": 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  card: 18,     // 14-20px rounded cards as specified
  cardLg: 22,
  xl: 24,
  full: 9999,
  pill: 9999,
} as const;

export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: "#183B2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  card: {
    shadowColor: "#183B2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#183B2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  floating: {
    shadowColor: "#183B2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  desktopMax: 1200,
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  breakpoints,
} as const;

export default tokens;

