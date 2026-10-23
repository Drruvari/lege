import * as React from "react"
import { cn } from "@/lib/utils"

type EmptyProps = React.ComponentProps<"div"> & {
  /** Reduce vertical space when the empty state sits inside a panel. */
  compact?: boolean
}
function Empty({ className, compact = false, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      data-compact={compact}
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-5 py-10 text-center data-[compact=true]:py-6",
        className,
      )}
      {...props}
    />
  )
}
function EmptyMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-media"
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-xl [&>svg]:size-5",
        className,
      )}
      {...props}
    />
  )
}
function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="empty-title"
      className={cn("text-foreground text-sm font-semibold", className)}
      {...props}
    />
  )
}
function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "text-muted-foreground mt-1 max-w-sm text-sm leading-relaxed",
        className,
      )}
      {...props}
    />
  )
}
function EmptyAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-action"
      className={cn(
        "mt-5 flex flex-wrap items-center justify-center gap-2",
        className,
      )}
      {...props}
    />
  )
}
export {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyAction,
  type EmptyProps,
}
