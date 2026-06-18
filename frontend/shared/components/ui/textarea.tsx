import * as React from "react";
import { cn } from "./utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-input border border-sb-border bg-sb-card px-4 py-3 text-sm text-sb-ink shadow-sm placeholder:text-sb-text-secondary focus-visible:outline-none focus-visible:border-sb-orange focus-visible:ring-2 focus-visible:ring-[var(--sb-orange-ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
