import type { ReactNode } from "react";
import { Link } from "react-router";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";

type PageWidth = "default" | "medium" | "narrow";

export function UtilityPage({
  children,
  width = "default",
  className = "",
}: {
  children: ReactNode;
  width?: PageWidth;
  className?: string;
}) {
  const wrapClass =
    width === "narrow"
      ? "sf-utility-wrap sf-utility-wrap--narrow"
      : width === "medium"
        ? "sf-utility-wrap sf-utility-wrap--medium"
        : "sf-utility-wrap";
  return (
    <div className={`sf-utility-page ${className}`.trim()}>
      <div className={wrapClass}>{children}</div>
    </div>
  );
}

export function UtilityBreadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="sf-utility-crumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-2">
          {i > 0 && <ChevronRight aria-hidden />}
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span className="sf-utility-crumb__current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function UtilityHero({
  title,
  description,
  icon: Icon,
  variant = "dark",
  features,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  variant?: "dark" | "brand";
  features?: string[];
}) {
  return (
    <div className={`sf-utility-hero ${variant === "brand" ? "sf-utility-hero--brand" : ""}`}>
      <div className="sf-utility-hero__row">
        {Icon && (
          <div className="sf-utility-hero__icon" aria-hidden>
            <Icon />
          </div>
        )}
        <div className="min-w-0">
          <h1>{title}</h1>
          <p>{description}</p>
          {features && features.length > 0 && (
            <div className="sf-utility-hero__pills">
              {features.map((f) => (
                <span key={f}>
                  <Check aria-hidden />
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UtilityCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`sf-utility-card ${className}`.trim()}>{children}</div>;
}

export function UtilitySectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="sf-utility-section-label">{children}</h2>;
}
