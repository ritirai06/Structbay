import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sb-orange focus-visible:ring-offset-2 focus-visible:ring-offset-sb-cream disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-sb-orange text-white shadow-sm hover:bg-sb-orange-hover active:scale-[0.98]",
        destructive:
          "border border-sb-ink/25 bg-transparent text-sb-ink hover:bg-sb-cream-secondary hover:border-sb-ink",
        outline:
          "border border-sb-ink bg-sb-cream text-sb-ink hover:border-sb-orange hover:text-sb-orange",
        secondary:
          "bg-sb-cream-secondary text-sb-ink border border-sb-ink/15 hover:bg-sb-cream hover:border-sb-ink/25",
        ghost: "bg-transparent text-sb-ink/70 hover:bg-sb-cream-secondary hover:text-sb-ink",
        link: "text-sb-orange underline-offset-4 hover:underline hover:text-sb-orange-hover",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
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
