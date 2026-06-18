import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none border",
  {
    variants: {
      variant: {
        default: "border-transparent bg-sb-orange text-white",
        secondary: "border-sb-border bg-sb-surface text-sb-ink",
        destructive: "badge-cancelled",
        outline: "border-sb-border bg-transparent text-sb-ink",
        gold: "badge-processing",
        success: "badge-completed",
        warning: "badge-pending",
        pending: "badge-pending",
        processing: "badge-processing",
        completed: "badge-completed",
        cancelled: "badge-cancelled",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
