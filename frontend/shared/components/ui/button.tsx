import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5E00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0D] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-[#FE5E00] text-[#0D0D0D] shadow hover:bg-[#E05200] active:scale-[0.98]",
        destructive:
          "bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white",
        outline:
          "border border-white/20 bg-transparent text-[#F4E9D8] hover:border-[#FE5E00] hover:text-[#FE5E00]",
        secondary:
          "bg-[#222222] text-[#F4E9D8] border border-white/10 hover:bg-[#2A2A2A] hover:border-white/20",
        ghost:  "bg-transparent text-[#D4C4A8] hover:bg-[#222222] hover:text-[#F4E9D8]",
        link:   "text-[#FE5E00] underline-offset-4 hover:underline hover:text-[#E05200]",
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
