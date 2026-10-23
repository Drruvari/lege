"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { MotionConfig, motion } from "motion/react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { useDirection } from "@/lib/ballmac/direction"
import { cn } from "@/lib/utils"

const segmentedControlVariants = cva(
  "relative inline-flex w-fit max-w-full items-center rounded-[9px] bg-foreground/7 p-0.5 shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.06)] dark:bg-white/8 dark:shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.06)] data-[disabled]:opacity-50",
  {
    variants: {
      size: {
        sm: "h-7 text-xs",
        default: "h-8 text-[13px]",
        lg: "h-9 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  }
)

type SegmentedControlContextValue = { value: string; layoutId: string; values: string[] }
const SegmentedControlContext = React.createContext<SegmentedControlContextValue | null>(null)

type SegmentedControlProps = Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, "value" | "defaultValue" | "onValueChange" | "orientation"> &
  VariantProps<typeof segmentedControlVariants> & {
    /** Selected value (controlled). */
    value?: string
    /** Initially selected value when uncontrolled. Defaults to the first item. */
    defaultValue?: string
    /** Called with the newly selected value. */
    onValueChange?: (value: string) => void
    /** Stretch to the container width with equal segments. */
    fullWidth?: boolean
  }

/**
 * A macOS segmented control: a row of mutually exclusive options with a selected pill that slides between them.
 * It is a radio group (Radix): Tab focuses the selected segment, arrow keys move and select.
 */
function SegmentedControl({
  value: valueProp,
  defaultValue,
  onValueChange,
  size = "default",
  fullWidth = false,
  className,
  children,
  ...props
}: SegmentedControlProps) {
  const values = React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ value?: unknown }>(child) && typeof child.props.value === "string" ? [child.props.value] : []
  )
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? values[0] ?? "")
  const value = valueProp ?? uncontrolled
  const layoutId = `segmented-pill-${React.useId()}`
  const dir = useDirection(props.dir)

  return (
    <SegmentedControlContext.Provider value={{ value, layoutId, values }}>
      <MotionConfig reducedMotion="user">
        <RadioGroupPrimitive.Root
          data-slot="segmented-control"
          orientation="horizontal"
          dir={dir}
          value={value}
          onValueChange={(next) => {
            if (valueProp === undefined) setUncontrolled(next)
            onValueChange?.(next)
          }}
          className={cn(segmentedControlVariants({ size }), fullWidth && "flex w-full [&>[data-slot=segmented-control-item]]:flex-1", className)}
          {...props}
        >
          {children}
        </RadioGroupPrimitive.Root>
      </MotionConfig>
    </SegmentedControlContext.Provider>
  )
}

type SegmentedControlItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item>

/** One segment. Icon-only segments need an aria-label. */
function SegmentedControlItem({ value, className, children, ...props }: SegmentedControlItemProps) {
  const context = React.useContext(SegmentedControlContext)
  if (!context) throw new Error("SegmentedControlItem must be used inside <SegmentedControl>.")
  const selected = context.value === value
  const index = context.values.indexOf(value)
  // A hairline divider sits between two unselected neighbors, as on macOS.
  const showDivider = index > 0 && !selected && context.values[index - 1] !== context.value

  return (
    <RadioGroupPrimitive.Item
      value={value}
      data-slot="segmented-control-item"
      className={cn(
        "group/segment relative flex h-full flex-auto cursor-default items-center justify-center gap-1.5 rounded-[7px] px-3 font-medium whitespace-nowrap text-foreground/70 outline-none transition-colors duration-150 select-none",
        "hover:text-foreground data-[state=checked]:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="segmented-control-divider"
        className={cn(
          "pointer-events-none absolute top-1/2 -start-px h-[45%] w-px -translate-y-1/2 bg-foreground/15 transition-opacity duration-150",
          showDivider ? "opacity-100" : "opacity-0"
        )}
      />
      {selected ? (
        <motion.span
          layoutId={context.layoutId}
          aria-hidden="true"
          data-slot="segmented-control-indicator"
          className="absolute inset-0 rounded-[7px] bg-background shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_2px_0_rgb(0_0_0/0.14),0_2px_6px_-2px_rgb(0_0_0/0.1)] dark:bg-white/20 dark:shadow-[0_0_0_0.5px_rgb(0_0_0/0.4),inset_0_0.5px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.3)]"
          transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.8 }}
        />
      ) : null}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </RadioGroupPrimitive.Item>
  )
}

export { SegmentedControl, SegmentedControlItem, segmentedControlVariants, type SegmentedControlItemProps, type SegmentedControlProps }
