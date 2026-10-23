import * as React from "react"
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react"

import { cn } from "@/lib/utils"

/** The island's spring: fast, with the small overshoot that makes it feel alive. */
const islandSpring: Transition = { type: "spring", stiffness: 420, damping: 30, mass: 0.9 }

type DynamicIslandViewProps = React.ComponentProps<"div"> & {
  /** Identifies this view; the island shows the view whose value matches its `view` prop. */
  value: string
  /** Corner radius in px while this view is showing. Around half the height gives a pill. */
  radius?: number
  /** Announced to screen readers when this view appears (the visual content is not re-read on every change). */
  label?: string
}

/**
 * One state of the island. Size it with className (e.g. `h-9 w-32`, or padding around content):
 * the island morphs to whatever size the active view has.
 */
function DynamicIslandView({ value, radius: _radius, label: _label, className, ...props }: DynamicIslandViewProps) {
  return <div data-slot="dynamic-island-view" data-value={value} className={cn("flex items-center", className)} {...props} />
}

type DynamicIslandProps = React.ComponentProps<"div"> & {
  /** Value of the view to show. Changing it morphs the island to the new view. */
  view: string
  /** "pill" floats with all corners rounded; "notch" hangs from the top edge with square top corners, like a MacBook notch. */
  shape?: "pill" | "notch"
}

/**
 * A black surface that morphs between views with a spring layout animation, like the iPhone Dynamic Island
 * or a MacBook notch app. Pass `<DynamicIslandView value="…">` children and choose one with `view`.
 */
function DynamicIsland({ view, shape = "pill", className, children, ...props }: DynamicIslandProps) {
  const views = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<DynamicIslandViewProps> => React.isValidElement(child) && typeof (child.props as DynamicIslandViewProps).value === "string"
  )
  const active = views.find((child) => child.props.value === view) ?? views[0]
  const radius = active?.props.radius ?? 22
  const notch = shape === "notch"

  return (
    <MotionConfig reducedMotion="user">
      <div data-slot="dynamic-island-root" data-shape={shape} className={cn("flex justify-center", className)} {...props}>
        <motion.div
          layout
          data-slot="dynamic-island"
          data-view={active?.props.value}
          initial={false}
          animate={{
            borderTopLeftRadius: notch ? 0 : radius,
            borderTopRightRadius: notch ? 0 : radius,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
          }}
          transition={islandSpring}
          className={cn(
            "relative isolate overflow-hidden bg-black text-white antialiased",
            notch
              ? "shadow-[0_10px_30px_-10px_rgb(0_0_0/0.55)]"
              : "shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_10px_30px_-10px_rgb(0_0_0/0.55)]"
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {active ? (
              <motion.div
                key={active.props.value}
                layout="position"
                initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { ...islandSpring, delay: 0.06 } }}
                exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)", transition: { duration: 0.14 } }}
              >
                {active}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
        <span role="status" aria-live="polite" aria-atomic="true" data-slot="dynamic-island-announcer" className="sr-only">
          {active?.props.label ?? ""}
        </span>
      </div>
    </MotionConfig>
  )
}

export { DynamicIsland, DynamicIslandView, islandSpring, type DynamicIslandProps, type DynamicIslandViewProps }
