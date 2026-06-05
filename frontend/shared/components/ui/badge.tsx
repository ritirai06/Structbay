import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:     "bg-[#FE5E00] text-[#0D0D0D] border-transparent",
        secondary:   "bg-[#222222] text-[#D4C4A8] border border-white/10",
        destructive: "bg-red-500/15 text-red-400 border border-red-500/20",
        outline:     "bg-transparent border border-white/20 text-[#F4E9D8]",
        gold:        "bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/25",
        success:     "bg-green-500/15 text-green-400 border border-green-500/20",
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
