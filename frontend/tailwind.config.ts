import type { Config } from "tailwindcss";

/**
 * Structbay Tailwind theme extension (v4).
 * Source of truth for hex values is `shared/design-system/design-tokens.ts`.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./shared/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "sb-orange": "#E85A00",
        "sb-orange-hover": "#CC4E00",
        "sb-cream": "#FFFFFF",
        "sb-cream-secondary": "#F5F5F5",
        "sb-card": "#FFFFFF",
        "sb-ink": "#000000",
        "sb-dark-secondary": "#000000",
        "sb-page": "#FFFFFF",
        "sb-surface": "#FFFFFF",
        "sb-surface-2": "#FFFFFF",
        "sb-nav": "#000000",
        "sb-on-orange": "#ffffff",
        "sb-border": "#E5E5E5",
        "sb-border-dark": "rgba(255, 255, 255, 0.12)",
        "sb-border-light": "#E2D5BC",
        "sb-orange-subtle": "rgba(232, 90, 0, 0.12)",
        "sb-success": "#2E8B57",
        "sb-warning": "#F4A300",
        "sb-danger": "#D64545",
        "sb-text-secondary": "#666666",
        "sb-ink-muted": "#666666",
        "sb-surface-elevated": "#F9F3E7",
      },
      fontFamily: {
        sans: ["Inter", "Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        input: "12px",
        button: "12px",
        modal: "20px",
      },
      height: {
        header: "72px",
        input: "48px",
      },
    },
  },
} satisfies Config;
