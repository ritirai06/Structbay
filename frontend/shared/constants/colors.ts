import { palette, semantic } from "@shared/design-system/design-tokens";

/**
 * @deprecated Prefer `palette` / `semantic` from `@shared/design-system`.
 */
export const colors = {
  orange: palette.primary,
  orangeHover: palette.primaryHover,
  cream: palette.background,
  creamSecondary: palette.surface,
  black: palette.dark,
};

export type ColorToken = keyof typeof colors;

export { palette, semantic };

/** Recharts-safe color array */
export const chartColors = [
  palette.primary,
  palette.dark,
  palette.surface,
  palette.primaryHover,
  palette.card,
] as const;
