import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "reading flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-[0.95rem] transition-[color,border-color,background-color] duration-150 outline-none placeholder:text-muted-foreground/80 hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
