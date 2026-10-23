"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Toolbar as Primitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

type ToolbarProps = Omit<React.ComponentProps<typeof Primitive.Root>, "title"> & {
  /** Accessible name of the toolbar. */
  label: string
  /** Large title at the leading edge. */
  title?: React.ReactNode
  /** Smaller line under the title, such as an item count. */
  subtitle?: React.ReactNode
}

/**
 * A macOS-style toolbar: translucent, with an optional title block and groups of buttons.
 * Built on Radix Toolbar, so Left and Right arrows move between buttons and the whole bar is one Tab stop.
 */
function Toolbar({ label, title, subtitle, className, children, ...props }: ToolbarProps) {
  return (
    <Primitive.Root
      data-slot="toolbar"
      aria-label={label}
      className={cn("flex min-h-[var(--bm-toolbar-h,52px)] w-full items-center gap-1.5 border-b border-foreground/[0.08] bg-background/70 px-3 text-foreground backdrop-blur-xl backdrop-saturate-150 [scrollbar-width:none] max-sm:overflow-x-auto [&::-webkit-scrollbar]:hidden", className)}
      {...props}
    >
      {(title || subtitle) && (
        <div className="me-3 grid min-w-0 shrink-0 leading-tight">
          {title && <span className="truncate text-[15px] font-semibold">{title}</span>}
          {subtitle && <span className="truncate text-[11px] text-muted-foreground">{subtitle}</span>}
        </div>
      )}
      {children}
    </Primitive.Root>
  )
}

type ToolbarButtonProps = React.ComponentProps<typeof Primitive.Button> & {
  /** Icon. */
  icon?: React.ReactNode
  /** Show the text label under the icon (the classic macOS toolbar item) instead of icon only. */
  labeled?: boolean
  /** Shown as a pressed (toggled on) button. */
  pressed?: boolean
}

/** An icon button. Icon-only buttons need an aria-label; labeled ones use their text. */
function ToolbarButton({ icon, labeled = false, pressed, className, children, ...props }: ToolbarButtonProps) {
  return (
    <Primitive.Button
      data-slot="toolbar-button"
      aria-pressed={pressed}
      title={props["aria-label"]}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-foreground/75 outline-none transition-colors duration-100 hover:bg-foreground/[0.07] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-foreground/[0.1] aria-pressed:text-foreground [&_svg]:size-[18px] [&_svg]:shrink-0",
        labeled ? "min-w-14 flex-col gap-0.5 px-2 py-1 text-[10px]" : "h-8 min-w-8 gap-1.5 px-1.5 text-[13px]",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Primitive.Button>
  )
}

function ToolbarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="toolbar-group" role="group" className={cn("flex items-center gap-0.5", className)} {...props} />
}

type ToolbarSegmentedProps = React.ComponentProps<typeof Primitive.ToggleGroup>

/** A single-choice segmented control, such as icon / list / column view. Use ToolbarSegment for the choices. */
function ToolbarSegmented({ className, ...props }: ToolbarSegmentedProps) {
  return (
    <Primitive.ToggleGroup
      data-slot="toolbar-segmented"
      className={cn("inline-flex items-center gap-px rounded-lg bg-foreground/[0.06] p-0.5", className)}
      {...props}
    />
  )
}

function ToolbarSegment({ className, ...props }: React.ComponentProps<typeof Primitive.ToggleItem>) {
  return (
    <Primitive.ToggleItem
      data-slot="toolbar-segment"
      className={cn(
        "inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-foreground/70 outline-none transition-[background-color,color,box-shadow] duration-100 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-[0_0.5px_1.5px_rgb(0_0_0/0.25)] dark:data-[state=on]:bg-foreground/[0.18] [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function ToolbarSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator data-slot="toolbar-separator" className={cn("mx-1.5 h-5 w-px bg-foreground/15", className)} {...props} />
}

/** Pushes everything after it to the trailing edge. */
function ToolbarSpacer({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="toolbar-spacer" aria-hidden="true" className={cn("flex-1", className)} {...props} />
}

type ToolbarSearchProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Width when collapsed, as a CSS length. */
  collapsedWidth?: string
  /** Width when focused or filled. */
  expandedWidth?: string
  /** Called when the clear button is pressed. */
  onClear?: () => void
}

/** A search field that widens when focused, with a clear button. */
function ToolbarSearch({ collapsedWidth = "9rem", expandedWidth = "15rem", className, value, onClear, "aria-label": ariaLabel, ...props }: ToolbarSearchProps) {
  const msg = useMessages()
  ariaLabel ??= msg("toolbar.ariaLabel", "Search")
  const filled = typeof value === "string" ? value.length > 0 : false
  return (
    <div
      data-slot="toolbar-search"
      className="group/search relative w-(--collapsed) shrink-0 transition-[width] duration-200 ease-out focus-within:w-(--expanded) motion-reduce:transition-none"
      style={{ ["--collapsed" as string]: collapsedWidth, ["--expanded" as string]: expandedWidth }}
    >
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 start-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        aria-label={ariaLabel}
        placeholder={msg("toolbar.search", "Search")}
        className={cn(
          "h-7 w-full rounded-md border border-foreground/10 bg-foreground/[0.05] pe-7 ps-7 text-[13px] outline-none transition-[box-shadow,background-color] placeholder:text-muted-foreground focus:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden",
          className
        )}
        {...props}
      />
      {filled && onClear && (
        <button
          type="button"
          aria-label={msg("toolbar.clearSearch", "Clear search")}
          onClick={onClear}
          className="absolute top-1/2 end-1.5 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/30 text-background outline-none hover:bg-foreground/50 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-2.5" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

export {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarSegmented,
  ToolbarSegment,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarSearch,
  type ToolbarProps,
  type ToolbarButtonProps,
  type ToolbarSearchProps,
}
