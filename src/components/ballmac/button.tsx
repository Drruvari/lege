import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex min-h-[var(--bm-target-min,0px)] min-w-[var(--bm-target-min,0px)] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 select-none active:opacity-[var(--bm-press-dim,1)] active:translate-y-[calc(1px*var(--bm-hover,1))] disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12),0_1px_2px_0_rgb(0_0_0/0.12)] hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-border bg-background shadow-xs hover:border-foreground/20 hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
        destructive: "bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/60 dark:hover:bg-destructive/50 focus-visible:ring-destructive/40",
      },
      size: {
        sm: "h-[var(--bm-control-h-sm,calc(var(--spacing)*8))] gap-1.5 px-3 text-[13px]",
        default: "h-[var(--bm-control-h,calc(var(--spacing)*9))] px-4",
        lg: "h-[var(--bm-control-h-lg,calc(var(--spacing)*11))] px-6 text-[15px]",
        icon: "size-[var(--bm-control-h,calc(var(--spacing)*9))]",
        "icon-sm": "size-[var(--bm-control-h-sm,calc(var(--spacing)*8))]",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default", shape: "default" },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (for example a link) with button styles. */
    asChild?: boolean
    /** Shows a spinner, sets aria-busy and blocks clicks. */
    loading?: boolean
  }

function Button({
  className,
  variant,
  size,
  shape,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          {/* opacity, not visibility: the label stays in the accessibility tree, so a busy button still has a name */}
          <span className="inline-flex items-center gap-2 opacity-0">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants, type ButtonProps }
