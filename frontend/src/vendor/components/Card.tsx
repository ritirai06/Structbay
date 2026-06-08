import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function Card({ title, children, className = "", action, icon }: CardProps) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: "var(--sb-card)", border: "1px solid var(--sb-border)" }}
    >
      {title && (
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--sb-border)" }}
        >
          <div className="flex items-center gap-2">
            {icon && <span style={{ color: "var(--sb-orange)" }}>{icon}</span>}
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--sb-text-muted)" }}>
              {title}
            </h2>
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
