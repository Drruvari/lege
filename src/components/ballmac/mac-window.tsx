import * as React from "react"

import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

type MacWindowContextValue = {
  active: boolean
  onClose?: () => void
  onMinimize?: () => void
  onZoom?: () => void
}

const MacWindowContext = React.createContext<MacWindowContextValue>({ active: true })

type MacWindowProps = React.ComponentProps<"div"> & {
  /** Active (key) window: colored traffic lights and full-strength title. Inactive windows gray out, as on macOS. */
  active?: boolean
  /** Called by the red close button. Without a handler the light is drawn but not focusable. */
  onClose?: () => void
  /** Called by the yellow minimize button. */
  onMinimize?: () => void
  /** Called by the green zoom (full screen) button. */
  onZoom?: () => void
}

/**
 * A macOS window frame. Compose it from MacWindowTitleBar + MacWindowContent, or MacWindowSidebar +
 * MacWindowMain for a sidebar layout with vibrancy. Traffic-light colors are the --mac-close, --mac-minimize
 * and --mac-zoom CSS variables; override them on the window if you like.
 */
function MacWindow({ active = true, onClose, onMinimize, onZoom, className, style, ...props }: MacWindowProps) {
  const context = React.useMemo(() => ({ active, onClose, onMinimize, onZoom }), [active, onClose, onMinimize, onZoom])
  return (
    <MacWindowContext.Provider value={context}>
      <div
        data-slot="mac-window"
        data-state={active ? "active" : "inactive"}
        className={cn(
          "group/mac-window relative isolate flex min-w-0 flex-col overflow-hidden rounded-[14px] bg-card text-card-foreground has-[[data-slot=mac-window-sidebar]]:flex-row has-[[data-slot=mac-window-sidebar]]:bg-transparent",
          "shadow-[0_0_0_0.5px_rgb(0_0_0/0.22),0_24px_60px_-12px_rgb(0_0_0/0.35),0_8px_20px_-8px_rgb(0_0_0/0.2)]",
          "dark:shadow-[0_0_0_0.5px_rgb(0_0_0/0.9),inset_0_0_0_0.5px_rgb(255_255_255/0.16),0_24px_60px_-12px_rgb(0_0_0/0.7)]",
          "data-[state=inactive]:shadow-[0_0_0_0.5px_rgb(0_0_0/0.18),0_12px_30px_-12px_rgb(0_0_0/0.25)]",
          "dark:data-[state=inactive]:shadow-[0_0_0_0.5px_rgb(0_0_0/0.9),inset_0_0_0_0.5px_rgb(255_255_255/0.1),0_12px_30px_-12px_rgb(0_0_0/0.5)]",
          className
        )}
        style={
          {
            "--mac-close": "oklch(0.7 0.19 25)",
            "--mac-minimize": "oklch(0.84 0.16 84)",
            "--mac-zoom": "oklch(0.76 0.19 145)",
            ...style,
          } as React.CSSProperties
        }
        {...props}
      />
    </MacWindowContext.Provider>
  )
}

const glyphs = {
  close: <path d="M3.5 3.5l5 5m0-5l-5 5" strokeWidth="1.3" strokeLinecap="round" />,
  minimize: <path d="M3 6h6" strokeWidth="1.4" strokeLinecap="round" />,
  zoom: <path d="M3.4 8.6V5l3.6 3.6zM8.6 3.4V7L5 3.4z" stroke="none" fill="currentColor" />,
} as const

function TrafficLight({ kind, label, onPress }: { kind: keyof typeof glyphs; label: string; onPress?: () => void }) {
  const shared = cn(
    "relative flex size-3 shrink-0 items-center justify-center rounded-full text-black/60 outline-none",
    "bg-(--light) shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.18)] dark:shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.12)]",
    "group-data-[state=inactive]/mac-window:bg-foreground/15 group-data-[state=inactive]/mac-window:group-hover/lights:bg-(--light)"
  )
  const style = { "--light": `var(--mac-${kind})` } as React.CSSProperties
  const glyph = (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      stroke="currentColor"
      fill="none"
      className="size-3 opacity-0 transition-opacity duration-100 group-hover/lights:opacity-100 group-has-[:focus-visible]/lights:opacity-100"
    >
      {glyphs[kind]}
    </svg>
  )
  if (!onPress) {
    return (
      <span data-slot={`mac-window-${kind}`} className={shared} style={style} aria-hidden="true">
        {glyph}
      </span>
    )
  }
  return (
    <button
      type="button"
      data-slot={`mac-window-${kind}`}
      aria-label={label}
      onClick={onPress}
      className={cn(shared, "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background")}
      style={style}
    >
      {glyph}
    </button>
  )
}

type MacWindowControlsProps = React.ComponentProps<"div"> & {
  /** Accessible labels for the three buttons. */
  labels?: { close?: string; minimize?: string; zoom?: string }
}

/** The red, yellow and green traffic lights. Glyphs appear when the pointer is over any of them. */
function MacWindowControls({ labels, className, ...props }: MacWindowControlsProps) {
  const { onClose, onMinimize, onZoom } = React.useContext(MacWindowContext)
  const msg = useMessages()
  return (
    <div data-slot="mac-window-controls" dir="ltr" className={cn("group/lights flex shrink-0 items-center gap-2", className)} {...props}>
      <TrafficLight kind="close" label={labels?.close ?? msg("mac-window.close", "Close window")} onPress={onClose} />
      <TrafficLight kind="minimize" label={labels?.minimize ?? msg("mac-window.minimize", "Minimize window")} onPress={onMinimize} />
      <TrafficLight kind="zoom" label={labels?.zoom ?? msg("mac-window.zoom", "Zoom window")} onPress={onZoom} />
    </div>
  )
}

type MacWindowTitleBarProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Window title, centered in the bar. */
  title?: React.ReactNode
  /** Draw the traffic lights at the leading edge. Turn off when a MacWindowSidebar already shows them. */
  controls?: boolean
}

/**
 * The title bar. With only a title it is a compact 28px bar; children render as a trailing toolbar
 * and grow it to the 52px unified-toolbar height.
 */
function MacWindowTitleBar({ title, controls = true, className, children, ...props }: MacWindowTitleBarProps) {
  const hasToolbar = React.Children.count(children) > 0
  return (
    <div
      data-slot="mac-window-titlebar"
      className={cn(
        "relative flex shrink-0 items-center gap-3 border-b border-foreground/[0.08] px-3 select-none",
        hasToolbar ? "h-[52px] px-4" : "h-8",
        className
      )}
      {...props}
    >
      {controls ? <MacWindowControls /> : null}
      {title ? (
        <div
          data-slot="mac-window-title"
          className={cn(
            "pointer-events-none truncate text-[13px] font-semibold text-foreground/85 group-data-[state=inactive]/mac-window:text-muted-foreground",
            hasToolbar ? "min-w-0" : "absolute inset-x-20 text-center"
          )}
        >
          {title}
        </div>
      ) : null}
      {hasToolbar ? (
        <div data-slot="mac-window-toolbar" className="ms-auto flex min-w-0 items-center gap-1 text-foreground/70 group-data-[state=inactive]/mac-window:text-foreground/35">
          {children}
        </div>
      ) : null}
    </div>
  )
}

type MacWindowToolbarButtonProps = React.ComponentProps<"button">

/** A borderless toolbar button that highlights on hover, sized for 16px icons. Give icon-only buttons an aria-label. */
function MacWindowToolbarButton({ className, type = "button", ...props }: MacWindowToolbarButtonProps) {
  return (
    <button
      type={type}
      data-slot="mac-window-toolbar-button"
      className={cn(
        "inline-flex h-7 min-w-7 shrink-0 items-center justify-center gap-1.5 rounded-md px-1.5 text-[13px] outline-none transition-colors duration-150 hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

type MacWindowSidebarProps = React.ComponentProps<"div"> & {
  /** Draw the traffic lights at the top of the sidebar. */
  controls?: boolean
}

/** A translucent source-list sidebar that blurs whatever is behind the window (vibrancy). */
function MacWindowSidebar({ controls = true, className, children, ...props }: MacWindowSidebarProps) {
  return (
    <div
      data-slot="mac-window-sidebar"
      className={cn(
        "flex w-52 shrink-0 flex-col border-e border-foreground/[0.08] bg-background/60 backdrop-blur-2xl backdrop-saturate-150 dark:bg-background/50",
        className
      )}
      {...props}
    >
      {controls ? (
        <div className="flex h-[52px] shrink-0 items-center px-4">
          <MacWindowControls />
        </div>
      ) : null}
      {children}
    </div>
  )
}

type MacWindowSidebarItemProps = React.ComponentProps<"button"> & {
  /** Marks the selected row (sets aria-current). */
  selected?: boolean
}

/** A source-list row: icon, label and an optional trailing count. */
function MacWindowSidebarItem({ selected = false, className, type = "button", ...props }: MacWindowSidebarItemProps) {
  return (
    <button
      type={type}
      data-slot="mac-window-sidebar-item"
      data-selected={selected ? "" : undefined}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex h-7 w-full items-center gap-2 rounded-md px-2 text-start text-[13px] text-foreground/85 outline-none transition-colors duration-100 hover:bg-foreground/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/50 data-selected:bg-foreground/[0.09] data-selected:font-medium data-selected:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

type MacWindowMainProps = React.ComponentProps<"div">

/** The opaque column next to a sidebar; holds the title bar and content. */
function MacWindowMain({ className, ...props }: MacWindowMainProps) {
  return <div data-slot="mac-window-main" className={cn("flex min-w-0 flex-1 flex-col bg-card", className)} {...props} />
}

type MacWindowContentProps = React.ComponentProps<"div">

function MacWindowContent({ className, ...props }: MacWindowContentProps) {
  return <div data-slot="mac-window-content" className={cn("min-h-0 flex-1 overflow-auto", className)} {...props} />
}

export {
  MacWindow,
  MacWindowContent,
  MacWindowControls,
  MacWindowMain,
  MacWindowSidebar,
  MacWindowSidebarItem,
  MacWindowTitleBar,
  MacWindowToolbarButton,
  type MacWindowContentProps,
  type MacWindowControlsProps,
  type MacWindowMainProps,
  type MacWindowProps,
  type MacWindowSidebarItemProps,
  type MacWindowSidebarProps,
  type MacWindowTitleBarProps,
  type MacWindowToolbarButtonProps,
}
