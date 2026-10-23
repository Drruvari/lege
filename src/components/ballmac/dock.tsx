import * as React from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"

import { cn } from "@/lib/utils"
import { useDirection } from "@/lib/ballmac/direction"

type DockOrientation = "horizontal" | "vertical"

type DockContextValue = {
  pointer: MotionValue<number>
  size: number
  magnification: number
  distance: number
  orientation: DockOrientation
  reduceMotion: boolean
}

const DockContext = React.createContext<DockContextValue | null>(null)

function useDock() {
  const context = React.useContext(DockContext)
  if (!context) throw new Error("DockItem and DockSeparator must be used inside <Dock>.")
  return context
}

const ITEM_SELECTOR = '[data-slot="dock-item"]:not([disabled])'

function visibleItems(root: HTMLElement | null) {
  if (!root) return []
  const shown = (el: Element | null) => !el || getComputedStyle(el).display !== "none"
  return Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter((el) => shown(el) && shown(el.parentElement))
}

type DockProps = React.ComponentProps<"div"> & {
  /** Resting size of each item in px. */
  size?: number
  /** Size in px of the item right under the pointer (or keyboard focus). */
  magnification?: number
  /** How far in px from the pointer the magnification reaches. */
  distance?: number
  /** Lay the dock out in a row (bottom of the screen) or a column (side of the screen). */
  orientation?: DockOrientation
}

/**
 * A macOS-style dock. Items grow as the pointer approaches and push their neighbors apart.
 * It is a `toolbar`: Tab enters it once, arrow keys move between items, Home and End jump to the ends.
 */
function Dock({
  size = 48,
  magnification = 76,
  distance = 150,
  orientation = "horizontal",
  className,
  style,
  children,
  onPointerMove,
  onPointerLeave,
  onKeyDown,
  onFocus,
  ...props
}: DockProps) {
  const dir = useDirection()
  const ref = React.useRef<HTMLDivElement>(null)
  const pointer = useMotionValue(Number.POSITIVE_INFINITY)
  const reduceMotion = useReducedMotion() ?? false
  const vertical = orientation === "vertical"
  const current = React.useRef(0)

  // Roving tab stop: exactly one item is reachable with Tab.
  React.useEffect(() => {
    const items = visibleItems(ref.current)
    if (current.current >= items.length) current.current = 0
    items.forEach((el, i) => (el.tabIndex = i === current.current ? 0 : -1))
  })

  const context = React.useMemo<DockContextValue>(
    () => ({ pointer, size, magnification: reduceMotion ? size : magnification, distance, orientation, reduceMotion }),
    [pointer, size, magnification, distance, orientation, reduceMotion]
  )

  return (
    <DockContext.Provider value={context}>
      <div
        ref={ref}
        role="toolbar"
        aria-orientation={orientation}
        data-slot="dock"
        data-orientation={orientation}
        className={cn(
          "relative isolate flex w-max max-w-full gap-1 rounded-[22px] p-1.5",
          vertical ? "flex-col items-center justify-center" : "items-end justify-center",
          // Vibrancy: translucent glass with a hairline edge and a lit top edge.
          "border border-white/40 bg-background/45 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.45),0_0_0_0.5px_rgb(0_0_0/0.14),0_16px_40px_-12px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-150",
          "dark:border-white/12 dark:bg-background/40 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),0_0_0_0.5px_rgb(0_0_0/0.6),0_16px_40px_-12px_rgb(0_0_0/0.6)]",
          className
        )}
        style={{ [vertical ? "width" : "height"]: size + 14, ...style }}
        onPointerMove={(event) => {
          if (event.pointerType !== "touch") pointer.set(vertical ? event.clientY : event.clientX)
          onPointerMove?.(event)
        }}
        onPointerLeave={(event) => {
          pointer.set(Number.POSITIVE_INFINITY)
          onPointerLeave?.(event)
        }}
        onFocus={(event) => {
          const items = visibleItems(ref.current)
          const index = items.indexOf(event.target as HTMLElement)
          if (index !== -1) {
            current.current = index
            items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1))
          }
          onFocus?.(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const items = visibleItems(ref.current)
          const index = items.indexOf(document.activeElement as HTMLElement)
          if (index === -1) return
          const prev = vertical ? "ArrowUp" : dir === "rtl" ? "ArrowRight" : "ArrowLeft"
          const next = vertical ? "ArrowDown" : dir === "rtl" ? "ArrowLeft" : "ArrowRight"
          let target = -1
          if (event.key === next) target = (index + 1) % items.length
          else if (event.key === prev) target = (index - 1 + items.length) % items.length
          else if (event.key === "Home") target = 0
          else if (event.key === "End") target = items.length - 1
          if (target === -1) return
          event.preventDefault()
          items[target].focus()
        }}
        {...props}
      >
        {children}
      </div>
    </DockContext.Provider>
  )
}

type DockItemProps = Omit<React.ComponentProps<"button">, "children" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"> & {
  /** Name shown in the label above the item; also the accessible name. */
  label: string
  /** The icon, drawn centered on the tile at about half its size. */
  icon?: React.ReactNode
  /** Custom tile content instead of `icon`. */
  children?: React.ReactNode
  /** Shows the running indicator dot under the item. */
  active?: boolean
  /** Text added to the accessible name when `active`, so the dot isn't the only signal. */
  activeLabel?: string
  /** Bounce the item when it is clicked, like an app launching. */
  bounce?: boolean
  /** Classes for the item's outer wrapper, e.g. `max-sm:hidden` to drop an item on small screens. `className` styles the tile. */
  containerClassName?: string
}

function DockItem({
  label,
  icon,
  children,
  active = false,
  activeLabel = "running",
  bounce = true,
  containerClassName,
  className,
  style,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  type = "button",
  ...props
}: DockItemProps) {
  const { pointer, size, magnification, distance, orientation, reduceMotion } = useDock()
  const ref = React.useRef<HTMLButtonElement>(null)
  const vertical = orientation === "vertical"
  const [showLabel, setShowLabel] = React.useState(false)
  const focusedRef = React.useRef(false)

  // Distance from the pointer to this item's center, measured live so neighbors shift smoothly.
  const offset = useTransform(pointer, (value) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect || !Number.isFinite(value)) return Number.POSITIVE_INFINITY
    return value - (vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2)
  })
  const target = useTransform(offset, [-distance, 0, distance], [size, magnification, size], { clamp: true })
  const itemSize = useSpring(target, { mass: 0.1, stiffness: 170, damping: 14 })
  const lift = useMotionValue(0)

  const centerPointerOnSelf = () => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) pointer.set(vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2)
  }

  return (
    <div
      data-slot="dock-item-wrapper"
      className={cn("relative flex shrink-0", vertical ? "flex-row items-center" : "flex-col items-center", containerClassName)}
    >
      <AnimatePresence>
        {showLabel ? (
          <motion.span
            data-slot="dock-item-label"
            initial={{ opacity: 0, [vertical ? "x" : "y"]: 4 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-foreground/10 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground shadow-[0_4px_14px_-4px_rgb(0_0_0/0.3)] backdrop-blur-xl",
              vertical ? "start-full ms-3" : "bottom-full mb-2.5"
            )}
            aria-hidden="true"
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
      <motion.button
        ref={ref}
        type={type}
        data-slot="dock-item"
        data-active={active ? "" : undefined}
        aria-label={active ? `${label}, ${activeLabel}` : label}
        style={{ ...style, width: itemSize, height: itemSize, [vertical ? "x" : "y"]: lift }}
        className={cn(
          "group/dock-item relative flex shrink-0 items-center justify-center overflow-hidden rounded-[23%] bg-card text-foreground outline-none",
          "shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.22),0_1px_1px_rgb(0_0_0/0.12),0_4px_10px_-4px_rgb(0_0_0/0.35)]",
          "focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[52%] [&_svg]:shrink-0",
          // Reduced motion: no magnification, a simple highlight instead (CSS, so server and client markup match).
          "motion-reduce:transition-[filter] motion-reduce:duration-150 motion-reduce:hover:brightness-110 motion-reduce:focus-visible:brightness-110",
          className
        )}
        onClick={(event) => {
          if (bounce && !reduceMotion) {
            const up = vertical ? 14 : -18
            animate(lift, [0, up, 0, up * 0.4, 0], { duration: 0.7, times: [0, 0.3, 0.6, 0.8, 1], ease: "easeInOut" })
          }
          onClick?.(event)
        }}
        onPointerEnter={(event) => {
          setShowLabel(true)
          onPointerEnter?.(event)
        }}
        onPointerLeave={(event) => {
          if (!focusedRef.current) setShowLabel(false)
          onPointerLeave?.(event)
        }}
        onFocus={(event) => {
          let visible = true
          try {
            visible = event.currentTarget.matches(":focus-visible")
          } catch {}
          if (visible) {
            focusedRef.current = true
            setShowLabel(true)
            centerPointerOnSelf()
          }
          onFocus?.(event)
        }}
        onBlur={(event) => {
          if (focusedRef.current) {
            focusedRef.current = false
            setShowLabel(false)
            pointer.set(Number.POSITIVE_INFINITY)
          }
          onBlur?.(event)
        }}
        {...props}
      >
        <span
          aria-hidden="true"
          data-slot="dock-item-sheen"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/25 via-white/0 to-black/10"
        />
        {icon ?? children}
      </motion.button>
      {active ? (
        <span
          aria-hidden="true"
          data-slot="dock-item-indicator"
          className={cn(
            "pointer-events-none absolute size-1 rounded-full bg-foreground/70",
            vertical ? "-start-[4.5px] top-1/2 -mt-0.5" : "-bottom-[5px] left-1/2 -ms-0.5"
          )}
        />
      ) : null}
    </div>
  )
}

type DockSeparatorProps = React.ComponentProps<"div">

/** A hairline divider, like the one between apps and folders in the macOS Dock. */
function DockSeparator({ className, ...props }: DockSeparatorProps) {
  const { orientation } = useDock()
  const vertical = orientation === "vertical"
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "horizontal" : "vertical"}
      data-slot="dock-separator"
      className={cn(
        "shrink-0 self-stretch bg-foreground/20",
        vertical ? "mx-1.5 my-0.5 h-px" : "mx-0.5 my-1.5 w-px",
        className
      )}
      {...props}
    />
  )
}

export { Dock, DockItem, DockSeparator, type DockItemProps, type DockOrientation, type DockProps, type DockSeparatorProps }
