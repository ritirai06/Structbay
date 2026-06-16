import { palette, semantic } from "@shared/design-system/design-tokens";

/**
 * @deprecated Prefer `palette` / `semantic` from `@shared/design-system`.
 */
export const colors = palette;

export type ColorToken = keyof typeof palette;

export { palette, semantic };

/** Recharts-safe color array — brand palette only */
export const chartColors = [
  palette.orange,
  palette.black,
  palette.creamSecondary,
  palette.orangeHover,
  palette.cream,
] as const;
