import type { Config } from "tailwindcss";

/**
 * StructBay Tailwind theme extension (v4).
 * Source of truth for hex values is `shared/design-system/design-tokens.ts`;
 * keep these colors in sync when the palette changes.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./shared/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "sb-orange": "#FE5E00",
        "sb-orange-hover": "#E05200",
        "sb-cream": "#FAF3E1",
        "sb-cream-secondary": "#F5E7C6",
        "sb-ink": "#222222",
        "sb-page": "#FAF3E1",
        "sb-surface": "#F5E7C6",
        "sb-surface-2": "#FAF3E1",
        "sb-nav": "#222222",
        "sb-on-orange": "#ffffff",
        "sb-border-dark": "rgba(250, 243, 225, 0.12)",
        "sb-border-light": "rgba(34, 34, 34, 0.12)",
        "sb-orange-subtle": "rgba(254, 94, 0, 0.12)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
} satisfies Config;
