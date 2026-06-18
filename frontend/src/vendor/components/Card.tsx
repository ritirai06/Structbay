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
      className={`rounded-card overflow-hidden border border-sb-border bg-sb-card ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-sb-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-sb-orange">{icon}</span>}
            <h2 className="vendor-section-title">
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
