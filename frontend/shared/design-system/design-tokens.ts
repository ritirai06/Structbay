/**
 * StructBay Enterprise Design System — approved palette.
 * All UI must reference these tokens (or CSS variables mapped from them).
 */
export const palette = {
  primary: "#E85A00",
  primaryHover: "#CC4E00",
  background: "#FDF6ED",
  surface: "#FDF6ED",
  card: "#FDF6ED",
  dark: "#000000",
  darkSecondary: "#000000",
  border: "#E5E5E5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  success: "#2E8B57",
  warning: "#F4A300",
  danger: "#D64545",
  white: "#FFFFFF",
} as const;

/** Legacy aliases — keep in sync with CSS variable mapping */
export const legacy = {
  orange: palette.primary,
  orangeHover: palette.primaryHover,
  cream: palette.background,
  creamSecondary: palette.surface,
  black: palette.dark,
} as const;

/** Text / chrome derived from the palette */
export const derived = {
  textOnDark: palette.white,
  textOnDarkMuted: "rgba(255, 255, 255, 0.72)",
  textOnLight: palette.textPrimary,
  textOnLightMuted: palette.textSecondary,
  borderOnDark: "rgba(255, 255, 255, 0.12)",
  borderOnLight: palette.border,
  orangeSubtle: "rgba(232, 90, 0, 0.12)",
  orangeRing: "rgba(232, 90, 0, 0.22)",
} as const;

/** Semantic roles → hex (charts, exports, non-CSS contexts) */
export const semantic = {
  brand: palette.primary,
  pageBackground: palette.background,
  surface: palette.surface,
  surfaceAlt: palette.card,
  chromeDark: palette.dark,
  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textInverse: palette.white,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
} as const;

export type PaletteKey = keyof typeof palette;
