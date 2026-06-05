import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, children, className = "", action }: CardProps) {
  return (
    <div className={`bg-[#222222] border border-white/10 rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="font-semibold text-[#F4E9D8] text-sm">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
