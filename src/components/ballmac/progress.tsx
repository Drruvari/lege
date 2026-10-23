import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** Show the value in a label below the bar. */
  showValue?: boolean
}
function Progress({
  className,
  value,
  max = 100,
  showValue = false,
  ...props
}: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const safeValue = value == null ? null : Math.max(0, Math.min(safeMax, value))
  const percent =
    safeValue == null ? null : Math.round((safeValue / safeMax) * 100)
  return (
    <div data-slot="progress-group" className={cn("w-full", className)}>
      <ProgressPrimitive.Root
        data-slot="progress"
        value={safeValue}
        max={safeMax}
        className="bg-muted relative h-2 w-full overflow-hidden rounded-full"
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "bg-primary block h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
            percent == null &&
              "w-1/3 motion-safe:animate-pulse motion-reduce:w-full",
          )}
          style={percent == null ? undefined : { width: `${percent}%` }}
        />
      </ProgressPrimitive.Root>
      {showValue && (
        <span
          data-slot="progress-value"
          className="text-muted-foreground mt-2 block text-end text-xs tabular-nums"
        >
          {percent == null ? "In progress" : `${percent}%`}
        </span>
      )}
    </div>
  )
}
export { Progress, type ProgressProps }
