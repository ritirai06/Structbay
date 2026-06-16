import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none border",
  {
    variants: {
      variant: {
        default: "border-transparent bg-sb-orange text-white",
        secondary: "border-sb-ink/12 bg-sb-cream-secondary text-sb-ink",
        destructive: "border-sb-ink/20 bg-sb-cream-secondary text-sb-ink",
        outline: "border-sb-ink/18 bg-transparent text-sb-ink",
        gold: "border-sb-orange/25 bg-sb-orange/12 text-sb-orange",
        success: "border-sb-orange/22 bg-sb-orange/10 text-sb-orange",
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
