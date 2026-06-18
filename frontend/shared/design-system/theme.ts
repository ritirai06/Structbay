import { palette, derived, semantic } from "./design-tokens";

/**
 * CSS custom property names (set globally in `shared/styles/index.css`).
 */
export const cssVars = {
  primary: "--primary",
  primaryHover: "--primary-hover",
  background: "--background",
  surface: "--surface",
  card: "--card",
  dark: "--dark",
  darkSecondary: "--dark-secondary",
  border: "--border",
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
  success: "--success",
  warning: "--warning",
  danger: "--danger",
} as const;

/**
 * Tailwind utility-aligned class bundles for portals.
 */
export const portal = {
  mainSurface: "min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-sb-cream text-sb-ink",
  page: "p-6 min-h-full bg-sb-cream text-sb-ink",
  chrome: "bg-sb-ink text-white border-sb-border-dark",
  header: "sb-header sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-sb-border-dark bg-sb-ink px-6",
  input:
    "w-full h-input rounded-input border border-sb-border bg-sb-card px-4 text-sm text-sb-ink placeholder:text-sb-text-secondary shadow-sm transition-colors focus:outline-none focus:border-sb-orange focus:ring-2 focus:ring-[var(--sb-orange-ring)]",
  panel: "rounded-card border border-sb-border bg-sb-card p-5 shadow-sm",
  card: "rounded-card border border-sb-border bg-sb-card p-5",
  tableHead: "bg-sb-ink text-white text-left text-xs font-bold uppercase tracking-wider",
  sidebar: "sb-sidebar flex h-screen shrink-0 flex-col border-r border-sb-border-dark",
  sidebarLink: "sb-sidebar-link",
  sidebarLinkActive: "sb-sidebar-link sb-sidebar-link--active",
} as const;

export const charts = {
  series: [
    semantic.brand,
    semantic.chromeDark,
    semantic.surfaceAlt,
    palette.primaryHover,
    palette.card,
  ],
} as const;
