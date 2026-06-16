/**
 * StructBay Enterprise Design System — approved palette only.
 * All UI must reference these tokens (or CSS variables mapped from them).
 */
export const palette = {
  orange: "#FE5E00",
  /** Hover / pressed primary */
  orangeHover: "#E05200",
  cream: "#FAF3E1",
  creamSecondary: "#F5E7C6",
  black: "#222222",
} as const;

/** Text / chrome derived only from the palette (opacity on black or cream). */
export const derived = {
  textOnDark: palette.cream,
  textOnDarkMuted: "rgba(250, 243, 225, 0.65)",
  textOnLight: palette.black,
  textOnLightMuted: "rgba(34, 34, 34, 0.58)",
  borderOnDark: "rgba(250, 243, 225, 0.12)",
  borderOnLight: "rgba(34, 34, 34, 0.12)",
  orangeSubtle: "rgba(254, 94, 0, 0.12)",
  orangeRing: "rgba(254, 94, 0, 0.22)",
} as const;

/** Semantic roles → hex (for charts, exports, non-CSS contexts). */
export const semantic = {
  brand: palette.orange,
  pageBackground: palette.cream,
  surface: palette.cream,
  surfaceAlt: palette.creamSecondary,
  chromeDark: palette.black,
  textPrimary: palette.black,
  textInverse: palette.cream,
} as const;

export type PaletteKey = keyof typeof palette;
