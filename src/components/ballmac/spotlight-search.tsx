"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

type SpotlightSearchProps = React.ComponentProps<typeof CommandPrimitive>

/**
 * cmdk scrolls the selected row (and its group heading) into view with scrollIntoView, which also
 * scrolls the page when the palette is off-screen, e.g. an inline demo below the fold. Route those
 * calls to the results list only, so selection never moves the page.
 */
function scrollWithinList(this: HTMLElement) {
  const list = this.closest<HTMLElement>("[cmdk-list]")
  if (!list) return
  const bounds = list.getBoundingClientRect()
  const rect = this.getBoundingClientRect()
  if (rect.top < bounds.top) list.scrollTop -= bounds.top - rect.top + 8
  else if (rect.bottom > bounds.bottom) list.scrollTop += rect.bottom - bounds.bottom + 8
}

function keepScrollInList(el: HTMLElement | null) {
  if (el) el.scrollIntoView = scrollWithinList
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as React.RefObject<T | null>).current = value
}

/**
 * A macOS Spotlight-style command palette on cmdk: a large translucent search field over grouped results.
 * Renders inline; wrap it in SpotlightSearchDialog for a ⌘K overlay.
 */
function SpotlightSearch({ className, loop = true, ...props }: SpotlightSearchProps) {
  return (
    <CommandPrimitive
      data-slot="spotlight-search"
      loop={loop}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-[22px] border border-white/45 bg-background/70 text-foreground",
        "shadow-[0_0_0_0.5px_rgb(0_0_0/0.14),0_30px_70px_-20px_rgb(0_0_0/0.45)] backdrop-blur-3xl backdrop-saturate-150",
        "dark:border-white/10 dark:bg-background/60 dark:shadow-[0_0_0_0.5px_rgb(0_0_0/0.7),0_30px_70px_-20px_rgb(0_0_0/0.8)]",
        className
      )}
      {...props}
    />
  )
}

type SpotlightSearchInputProps = React.ComponentProps<typeof CommandPrimitive.Input> & {
  /** Content at the trailing end of the field, e.g. a Kbd hint or the top hit's kind. */
  trailing?: React.ReactNode
}

function SpotlightSearchInput({ className, placeholder, trailing, ...props }: SpotlightSearchInputProps) {
  const msg = useMessages()
  placeholder ??= msg("spotlight-search.placeholder", "Spotlight Search")
  return (
    <div data-slot="spotlight-search-field" className="flex h-14 shrink-0 items-center gap-3 px-4">
      <SearchIcon className="size-5 shrink-0 text-foreground/50" aria-hidden="true" />
      <CommandPrimitive.Input
        data-slot="spotlight-search-input"
        placeholder={placeholder}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-xl font-normal tracking-tight text-foreground outline-none placeholder:text-foreground/35 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {trailing ? <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">{trailing}</div> : null}
    </div>
  )
}

type SpotlightSearchListProps = React.ComponentProps<typeof CommandPrimitive.List>

function SpotlightSearchList({ className, ...props }: SpotlightSearchListProps) {
  return (
    <CommandPrimitive.List
      data-slot="spotlight-search-list"
      className={cn(
        "max-h-[min(24rem,60dvh)] scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain border-t border-foreground/[0.08] p-2 empty:hidden",
        className
      )}
      {...props}
    />
  )
}

function SpotlightSearchEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="spotlight-search-empty"
      className={cn("py-8 text-center text-sm text-foreground/50", className)}
      {...props}
    />
  )
}

function SpotlightSearchGroup({ ref, className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      ref={(el: HTMLDivElement | null) => {
        keepScrollInList(el?.querySelector<HTMLElement>("[cmdk-group-heading]") ?? null)
        setRef(ref, el)
      }}
      data-slot="spotlight-search-group"
      className={cn(
        "[&:not(:first-child)]:mt-1.5 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-foreground/45",
        className
      )}
      {...props}
    />
  )
}

function SpotlightSearchSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="spotlight-search-separator" className={cn("mx-2.5 my-1.5 h-px bg-foreground/[0.08]", className)} {...props} />
}

type SpotlightSearchItemProps = React.ComponentProps<typeof CommandPrimitive.Item> & {
  /** Icon, drawn in a small rounded tile. */
  icon?: React.ReactNode
  /** Classes for the icon tile (a gradient or color, like an app icon). */
  iconClassName?: string
  /** Secondary text at the trailing end: a kind ("Application"), a path, or a shortcut. */
  detail?: React.ReactNode
}

function SpotlightSearchItem({ ref, icon, iconClassName, detail, value, className, children, ...props }: SpotlightSearchItemProps) {
  return (
    <CommandPrimitive.Item
      ref={(el: HTMLDivElement | null) => {
        keepScrollInList(el)
        setRef(ref, el)
      }}
      data-slot="spotlight-search-item"
      // Match on the title only, not the detail text ("Application" would match almost any query).
      value={value ?? (typeof children === "string" ? children : undefined)}
      className={cn(
        "group/spotlight-item relative flex h-10 cursor-default items-center gap-3 rounded-[10px] px-2.5 text-sm outline-none select-none",
        "data-[selected=true]:bg-[color-mix(in_oklch,var(--ring),black_28%)] data-[selected=true]:text-white data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    >
      {icon ? (
        <span
          data-slot="spotlight-search-item-icon"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-foreground/[0.07] text-foreground/75 shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.2)] [&_svg:not([class*='size-'])]:size-4",
            !iconClassName && "group-data-[selected=true]/spotlight-item:bg-white/20 group-data-[selected=true]/spotlight-item:text-white",
            iconClassName
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {detail ? (
        <span data-slot="spotlight-search-item-detail" className="shrink-0 text-xs text-muted-foreground group-data-[selected=true]/spotlight-item:text-white/90">
          {detail}
        </span>
      ) : null}
    </CommandPrimitive.Item>
  )
}

type SpotlightSearchFooterProps = React.ComponentProps<"div">

/** A hint row under the results, e.g. "↵ Open · ⌘↵ Show in Folder". */
function SpotlightSearchFooter({ className, ...props }: SpotlightSearchFooterProps) {
  return (
    <div
      data-slot="spotlight-search-footer"
      className={cn("flex h-9 shrink-0 items-center gap-3 border-t border-foreground/[0.08] px-4 text-xs text-foreground/50", className)}
      {...props}
    />
  )
}

/**
 * Calls `onTrigger` when ⌘ + key (Ctrl + key on Windows and Linux) is pressed anywhere on the page.
 * Pass `key = false` to turn it off.
 */
function useSpotlightHotkey(onTrigger: () => void, key: string | false = "k") {
  const callback = React.useRef(onTrigger)
  React.useEffect(() => {
    callback.current = onTrigger
  })
  React.useEffect(() => {
    if (!key) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault()
        callback.current()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [key])
}

type SpotlightSearchDialogProps = Omit<SpotlightSearchProps, "title"> & {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Key that toggles the dialog together with ⌘ (or Ctrl). false turns the shortcut off. */
  hotkey?: string | false
  /** Accessible dialog title (visually hidden). */
  title?: string
}

/** SpotlightSearch in a Radix dialog near the top of the screen, toggled with ⌘K by default. Escape closes it. */
function SpotlightSearchDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = "k",
  title,
  className,
  children,
  ...props
}: SpotlightSearchDialogProps) {
  const msg = useMessages()
  title ??= msg("spotlight-search.title", "Spotlight Search")
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  useSpotlightHotkey(() => setOpen(!open), hotkey)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="spotlight-search-overlay"
          className="fixed inset-0 z-50 bg-black/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none dark:bg-black/30"
        />
        <DialogPrimitive.Content
          data-slot="spotlight-search-dialog"
          aria-describedby={undefined}
          className="fixed top-[16dvh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.97] duration-150 motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <SpotlightSearch className={className} {...props}>
            {children}
          </SpotlightSearch>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export {
  SpotlightSearch,
  SpotlightSearchDialog,
  SpotlightSearchEmpty,
  SpotlightSearchFooter,
  SpotlightSearchGroup,
  SpotlightSearchInput,
  SpotlightSearchItem,
  SpotlightSearchList,
  SpotlightSearchSeparator,
  useSpotlightHotkey,
  type SpotlightSearchDialogProps,
  type SpotlightSearchFooterProps,
  type SpotlightSearchInputProps,
  type SpotlightSearchItemProps,
  type SpotlightSearchListProps,
  type SpotlightSearchProps,
}
