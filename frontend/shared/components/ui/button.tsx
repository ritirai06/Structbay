import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-button text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sb-orange focus-visible:ring-offset-2 focus-visible:ring-offset-sb-cream disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-sb-orange text-white shadow-sm hover:bg-sb-orange-hover active:scale-[0.98]",
        destructive: "bg-sb-danger text-white shadow-sm hover:brightness-105 active:scale-[0.98]",
        outline:
          "border border-sb-border bg-transparent text-sb-ink hover:border-sb-orange hover:text-sb-orange hover:bg-sb-orange-subtle",
        secondary:
          "border border-sb-border bg-transparent text-sb-ink hover:border-sb-orange hover:text-sb-orange",
        ghost: "bg-transparent text-sb-text-secondary hover:bg-sb-surface hover:text-sb-ink",
        link: "text-sb-orange underline-offset-4 hover:underline hover:text-sb-orange-hover",
        success: "bg-sb-success text-white shadow-sm hover:brightness-105 active:scale-[0.98]",
      },
      size: {
        default: "h-input px-5 py-2",
        sm: "h-9 rounded-button px-3 text-xs",
        lg: "h-12 rounded-button px-8 text-base",
        icon: "h-input w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
