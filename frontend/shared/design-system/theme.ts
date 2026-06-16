import { palette, derived, semantic } from "./design-tokens";

/**
 * CSS custom property names (set globally in `shared/styles/index.css`).
 */
export const cssVars = {
  orange: "--sb-orange",
  orangeHover: "--sb-orange-hover",
  cream: "--sb-cream",
  creamSecondary: "--sb-cream-secondary",
  black: "--sb-black",
  textOnDark: "--sb-text-on-dark",
  textOnDarkMuted: "--sb-text-on-dark-muted",
  textOnLight: "--sb-text-on-light",
  textOnLightMuted: "--sb-text-on-light-muted",
  borderOnDark: "--sb-border-on-dark",
  borderOnLight: "--sb-border-on-light",
} as const;

/**
 * Tailwind utility-aligned class bundles for portals (prefer tokens over literals).
 */
export const portal = {
  /** Admin / vendor main scroll area */
  mainSurface: "min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-sb-cream text-sb-ink",
  /** Page padding wrapper inside main */
  page: "p-6 min-h-full bg-sb-cream text-sb-ink",
  /** Dark chrome (header, sidebar shell) */
  chrome: "bg-sb-ink text-sb-cream border-sb-border-dark",
  /** Inputs on cream dashboards */
  input:
    "w-full rounded-lg border border-sb-ink/15 bg-sb-cream px-3 py-2 text-sm text-sb-ink placeholder:text-sb-ink/45 shadow-sm transition-colors focus:outline-none focus:border-sb-orange focus:ring-2 focus:ring-[var(--sb-orange-ring)]",
  /** Nested cards / panels on cream */
  panel: "rounded-xl border border-sb-ink/10 bg-sb-cream-secondary/80 p-3 shadow-sm",
  /** Data table header row */
  tableHead: "bg-sb-ink text-sb-cream text-left text-xs font-semibold uppercase tracking-wider",
} as const;

export const charts = {
  series: [
    semantic.brand,
    semantic.chromeDark,
    semantic.surfaceAlt,
    palette.orangeHover,
    palette.cream,
  ],
} as const;
