import * as React from "react"
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react"
import { ChevronUpIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

const stackSpring: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 }

/** Offset in px of each peeking card below the one in front. */
const PEEK = 9
/** Horizontal inset in px of each peeking card. */
const INSET = 10

type NotificationStackProps = Omit<React.ComponentProps<"section">, "children"> & {
  /** Notification elements, newest first. Give each a stable `key`; new keys animate in from the top. */
  children?: React.ReactNode
  /** Controlled expanded state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. */
  defaultExpanded?: boolean
  /** Called when the stack expands or collapses. */
  onExpandedChange?: (expanded: boolean) => void
  /** Shows a "clear all" button when set. */
  onClearAll?: () => void
  /** Heading shown above the expanded list; also the region's accessible name. */
  label?: string
}

/**
 * Notifications grouped like macOS Notification Center: collapsed, the newest card sits in front with two
 * more peeking out behind it; activating the stack springs it open into a list.
 */
function NotificationStack({
  children,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  onClearAll,
  label,
  className,
  onKeyDown,
  ...props
}: NotificationStackProps) {
  const msg = useMessages()
  label ??= msg("notification-stack.label", "Notifications")
  const [uncontrolled, setUncontrolled] = React.useState(defaultExpanded)
  const expanded = expandedProp ?? uncontrolled
  const items = React.Children.toArray(children).filter(React.isValidElement)
  const count = items.length
  const stacked = !expanded && count > 1
  const peeking = Math.min(count, 3) - 1

  const expandRef = React.useRef<HTMLButtonElement>(null)
  const collapseRef = React.useRef<HTMLButtonElement>(null)
  const focusAfter = React.useRef<"expand" | "collapse" | null>(null)

  const setExpanded = (next: boolean, moveFocus = false) => {
    if (moveFocus) focusAfter.current = next ? "collapse" : "expand"
    if (expandedProp === undefined) setUncontrolled(next)
    onExpandedChange?.(next)
  }

  // Keep focus on the control that replaces the one just used.
  React.useEffect(() => {
    if (focusAfter.current === "collapse") collapseRef.current?.focus()
    if (focusAfter.current === "expand") expandRef.current?.focus()
    focusAfter.current = null
  }, [expanded])

  const headingId = React.useId()

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-labelledby={headingId}
        data-slot="notification-stack"
        data-state={expanded ? "expanded" : "collapsed"}
        className={cn("group/stack relative w-full", className)}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented && event.key === "Escape" && expanded && count > 1) {
            event.preventDefault()
            setExpanded(false, true)
          }
        }}
        {...props}
      >
        <div
          data-slot="notification-stack-header"
          className={cn("flex items-center gap-2 px-1 transition-[height,opacity] duration-200", expanded && count > 1 ? "mb-2 h-7 opacity-100" : "h-0 overflow-hidden opacity-0")}
        >
          <h3 id={headingId} className="flex-1 truncate text-[15px] font-semibold tracking-tight text-foreground">
            {label}
          </h3>
          {expanded && count > 1 ? (
            <>
              <button
                ref={collapseRef}
                type="button"
                aria-expanded="true"
                onClick={() => setExpanded(false, true)}
                className="inline-flex h-7 items-center gap-1 rounded-full bg-background/70 px-3 text-xs font-medium text-foreground/80 shadow-[0_0_0_0.5px_rgb(0_0_0/0.12)] backdrop-blur-xl outline-none transition-colors hover:bg-background/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.12)]"
              >
                <ChevronUpIcon className="size-3.5" aria-hidden="true" />
                {msg("notification-stack.showLess", "Show less")}
              </button>
              {onClearAll ? (
                <button
                  type="button"
                  aria-label={msg("notification-stack.clearAllNotifications", "Clear all notifications")}
                  onClick={onClearAll}
                  className="inline-flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground/70 shadow-[0_0_0_0.5px_rgb(0_0_0/0.12)] backdrop-blur-xl outline-none transition-colors hover:bg-background/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.12)]"
                >
                  <XIcon className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <motion.div layout="size" transition={stackSpring} className="relative" style={{ paddingBottom: stacked ? peeking * PEEK : 0 }}>
          <ul className="relative flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((child, index) => {
                const back = stacked && index > 0
                // Collapsed, the expand button stands in for the whole stack; the front card describes it.
                const covered = stacked && index === 0
                const depth = Math.min(index, 2)
                const hidden = stacked && index > 2
                return (
                  <motion.li
                    key={child.key ?? index}
                    layout
                    data-slot="notification-stack-item"
                    data-peek={back ? "" : undefined}
                    id={covered ? `${headingId}-front` : undefined}
                    aria-hidden={back || undefined}
                    inert={back || covered || undefined}
                    initial={{ opacity: 0, y: -28, scale: 0.94 }}
                    animate={{ opacity: hidden ? 0 : 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                    transition={stackSpring}
                    className={cn("list-none", back ? "absolute" : "relative", "[&[data-peek]_[data-slot=notification-content]]:opacity-0")}
                    style={{
                      zIndex: count - index,
                      ...(back ? { top: depth * PEEK, bottom: -depth * PEEK, left: depth * INSET, right: depth * INSET } : {}),
                    }}
                  >
                    {child}
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>

          {stacked ? (
            <button
              ref={expandRef}
              type="button"
              aria-expanded="false"
              aria-label={msg("notification-stack.showAllNotifications", "Show all {count} notifications", { count })}
              aria-describedby={`${headingId}-front`}
              data-slot="notification-stack-expand"
              onClick={() => setExpanded(true, true)}
              className="absolute inset-0 z-[1000] rounded-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          ) : null}
          {stacked && onClearAll ? (
            <button
              type="button"
              aria-label={msg("notification-stack.clearAllNotifications", "Clear all notifications")}
              onClick={onClearAll}
              className="absolute -top-2 -start-2 z-[1001] flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground/70 opacity-0 shadow-[0_0_0_0.5px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.15)] backdrop-blur-xl outline-none transition-opacity group-hover/stack:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 [@media(hover:none)]:opacity-100"
            >
              <XIcon className="size-3" aria-hidden="true" />
            </button>
          ) : null}
        </motion.div>
      </section>
    </MotionConfig>
  )
}

type NotificationProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** App icon, drawn in a 36px rounded tile. Style the tile with iconClassName. */
  icon?: React.ReactNode
  /** Classes for the icon tile (background gradient, color). */
  iconClassName?: string
  /** Bold first line. */
  title: React.ReactNode
  /** Short relative time, e.g. "now" or "9m ago". */
  time?: React.ReactNode
  /** Shows a dismiss button (on hover and focus) that calls this. */
  onDismiss?: () => void
  /** Accessible label of the dismiss button. */
  dismissLabel?: string
}

/** One notification card: icon, title, time and body text (children), with translucent vibrancy. */
function Notification({ icon, iconClassName, title, time, onDismiss, dismissLabel, className, children, ...props }: NotificationProps) {
  const msg = useMessages()
  dismissLabel ??= msg("notification-stack.dismissLabel", "Dismiss")
  return (
    <div
      data-slot="notification"
      className={cn(
        "group/notification relative h-full rounded-[18px] border border-white/40 bg-background/70 p-3 text-start shadow-[0_0_0_0.5px_rgb(0_0_0/0.1),0_8px_24px_-10px_rgb(0_0_0/0.3)] backdrop-blur-2xl backdrop-saturate-150",
        "dark:border-white/10 dark:bg-background/60 dark:shadow-[0_0_0_0.5px_rgb(0_0_0/0.6),0_8px_24px_-10px_rgb(0_0_0/0.6)]",
        className
      )}
      {...props}
    >
      <div data-slot="notification-content" className="flex gap-3 transition-opacity duration-200">
        {icon ? (
          <span
            data-slot="notification-icon"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-muted text-foreground shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.2)] [&_svg:not([class*='size-'])]:size-5",
              iconClassName
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{title}</p>
            {time ? <span className="shrink-0 text-xs text-muted-foreground">{time}</span> : null}
          </div>
          {children ? <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-foreground/75">{children}</div> : null}
        </div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          data-slot="notification-dismiss"
          className="absolute -top-2 -start-2 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground/70 opacity-0 shadow-[0_0_0_0.5px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.15)] backdrop-blur-xl outline-none transition-opacity group-hover/notification:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 [@media(hover:none)]:opacity-100"
        >
          <XIcon className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

export { Notification, NotificationStack, type NotificationProps, type NotificationStackProps }
