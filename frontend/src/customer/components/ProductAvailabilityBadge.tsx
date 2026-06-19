import {
  availabilityCssModifier,
  type AvailabilityInfo,
} from "../lib/productAvailability";

type Props = {
  info: AvailabilityInfo;
  className?: string;
  /** listing = compact card; pdp = product detail uppercase */
  variant?: "listing" | "pdp";
};

export function ProductAvailabilityBadge({ info, className = "", variant = "listing" }: Props) {
  const mod = availabilityCssModifier(info.stockStatus);

  if (variant === "pdp") {
    return (
      <p className={`sf-pdp-stock sf-pdp-stock--${mod} ${className}`.trim()}>
        <span className="sf-pdp-stock__dot" aria-hidden />
        {info.stockStatus === "UNPRICED"
          ? "PRICING UNAVAILABLE"
          : info.stockStatus === "LOW_STOCK"
            ? "LOW STOCK"
            : info.inStock
              ? "IN STOCK"
              : "OUT OF STOCK"}
      </p>
    );
  }

  return (
    <p className={`sf-listing-card__stock sf-listing-card__stock--${mod} ${className}`.trim()}>
      {info.label}
    </p>
  );
}
