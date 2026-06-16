import type { CSSProperties } from "react";

export type MaterialSymbolProps = {
  /** Material Symbols ligature name, e.g. `"factory"`, `"construction"`, `"inventory_2"`. */
  name: string;
  className?: string;
  /** Pixel size (maps to `fontSize`). Default 20. */
  size?: number;
  /** FILL axis 1 — use sparingly; default outline (FILL 0). */
  filled?: boolean;
  "aria-hidden"?: boolean;
};

/**
 * Secondary icon set: **Material Symbols Outlined** (Google font).
 * Use only when Lucide does not ship a suitable construction / ERP metaphor;
 * dashboards and actions should stay on **Lucide** for one stroke language.
 */
export function MaterialSymbol({
  name,
  className = "",
  size = 20,
  filled = false,
  "aria-hidden": ariaHidden = true,
}: MaterialSymbolProps) {
  const style: CSSProperties = {
    fontSize: size,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
  };
  return (
    <span
      className={`material-symbols-outlined align-middle leading-none ${className}`}
      style={style}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  );
}
