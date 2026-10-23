"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"
import { useDirection } from "@/lib/ballmac/direction"

type LaunchpadApp = {
  /** Unique id. */
  id: string
  /** Name under the icon. */
  name: string
  /** The icon, usually an AppIcon. */
  icon: React.ReactNode
}

type LaunchpadProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The apps to show, in order. */
  apps: LaunchpadApp[]
  /** Whether the launcher is showing. */
  open: boolean
  /** Called when the launcher asks to close (Escape, or a click on the empty background). */
  onClose?: () => void
  /** Called when an app is chosen. */
  onLaunch?: (app: LaunchpadApp) => void
  /** Width of one app cell in pixels. */
  cellWidth?: number
  /** Height of one app cell in pixels. */
  cellHeight?: number
  /** Accessible name of the launcher. */
  label?: string
}

/**
 * The macOS Launchpad: a frosted overlay with a search field, pages of apps and page dots.
 * It fills its positioned parent. Arrow keys move between apps and across pages, PageUp and PageDown turn pages,
 * and typing filters. Escape closes it.
 */
function Launchpad({ apps, open, onClose, onLaunch, cellWidth = 120, cellHeight = 112, label, className, ...props }: LaunchpadProps) {
  const dir = useDirection()
  const msg = useMessages()
  label ??= msg("launchpad.label", "Launchpad")
  const reduce = useReducedMotion()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [size, setSize] = React.useState({ w: 800, h: 560 })
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [focus, setFocus] = React.useState(0)
  const wheel = React.useRef(0)

  React.useEffect(() => {
    const el = rootRef.current
    if (!el || !open) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setPage(0)
      setFocus(0)
      const id = requestAnimationFrame(() => searchRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const cols = Math.max(2, Math.min(8, Math.floor((size.w - 48) / cellWidth)))
  const rows = Math.max(1, Math.min(5, Math.floor((size.h - 170) / cellHeight)))
  const perPage = cols * rows
  const shown = apps.filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()))
  const pages = Math.max(1, Math.ceil(shown.length / perPage))
  const current = Math.min(page, pages - 1)

  function goPage(next: number) {
    setPage(Math.min(pages - 1, Math.max(0, next)))
  }
  function focusApp(index: number) {
    const i = Math.min(shown.length - 1, Math.max(0, index))
    setFocus(i)
    setPage(Math.floor(i / perPage))
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-app-index="${i}"]`)?.focus())
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose?.()
    } else if (e.key === "PageDown" || (e.key === (dir === "rtl" ? "ArrowLeft" : "ArrowRight") && e.ctrlKey)) {
      e.preventDefault()
      goPage(current + 1)
    } else if (e.key === "PageUp" || (e.key === (dir === "rtl" ? "ArrowRight" : "ArrowLeft") && e.ctrlKey)) {
      e.preventDefault()
      goPage(current - 1)
    }
  }

  function onAppKey(e: React.KeyboardEvent, index: number) {
    const move: Record<string, number> = { ArrowRight: dir === "rtl" ? -1 : 1, ArrowLeft: dir === "rtl" ? 1 : -1, ArrowDown: cols, ArrowUp: -cols }
    if (e.key in move && !e.ctrlKey) {
      e.preventDefault()
      focusApp(index + move[e.key]!)
    } else if (e.key === "Home") {
      e.preventDefault()
      focusApp(0)
    } else if (e.key === "End") {
      e.preventDefault()
      focusApp(shown.length - 1)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={rootRef}
          data-slot="launchpad"
          role="dialog"
          aria-label={label}
          onKeyDown={onKeyDown}
          onWheel={(e) => {
            wheel.current += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
            if (Math.abs(wheel.current) > 120) {
              goPage(current + Math.sign(wheel.current))
              wheel.current = 0
            }
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.12, filter: "blur(10px)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.12, filter: "blur(10px)" }}
          transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cn("absolute inset-0 z-40 flex flex-col items-center overflow-hidden bg-black/45 text-white backdrop-blur-3xl backdrop-saturate-150", className)}
          {...(props as object)}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <div className="relative mt-5 w-56 max-w-[70%] shrink-0">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 start-2.5 size-3.5 -translate-y-1/2 text-white/70" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              aria-label={msg("launchpad.searchApps", "Search apps")}
              placeholder={msg("launchpad.search", "Search")}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
                setFocus(0)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && shown[0]) onLaunch?.(shown[0])
                else if (e.key === "ArrowDown" && shown.length) {
                  e.preventDefault()
                  focusApp(0)
                }
              }}
              className="h-7 w-full rounded-lg border border-white/20 bg-white/15 pe-3 ps-8 text-center text-[13px] text-white outline-none placeholder:text-white/70 focus-visible:bg-white/25 focus-visible:ring-[3px] focus-visible:ring-white/40 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>

          <div className="relative min-h-0 w-full flex-1 overflow-hidden" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
            <motion.div
              className="flex h-full"
              style={{ width: `${pages * 100}%` }}
              animate={{ x: `${(-current * 100) / pages}%` }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
            >
              {Array.from({ length: pages }, (_, p) => (
                <div key={p} className="flex h-full items-center justify-center" style={{ width: `${100 / pages}%` }} aria-hidden={p !== current ? true : undefined} {...(p !== current ? { inert: true } : {})}>
                  <ul className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cellWidth}px)`, gridAutoRows: `${cellHeight}px` }} aria-label={msg("launchpad.pageOf", "Page {n} of {pages}", { n: p + 1, pages })}>
                    {shown.slice(p * perPage, (p + 1) * perPage).map((app, i) => {
                      const index = p * perPage + i
                      return (
                        <li key={app.id} className="flex items-start justify-center">
                          <button
                            type="button"
                            data-app-index={index}
                            tabIndex={focus === index ? 0 : -1}
                            onFocus={() => setFocus(index)}
                            onKeyDown={(e) => onAppKey(e, index)}
                            onClick={() => onLaunch?.(app)}
                            className="group/app flex w-[104px] flex-col items-center gap-2 rounded-xl p-1.5 outline-none focus-visible:bg-white/15 focus-visible:ring-[3px] focus-visible:ring-white/50"
                          >
                            <span aria-hidden="true" className="transition-transform duration-150 group-hover/app:scale-105 group-active/app:scale-95 motion-reduce:transition-none">{app.icon}</span>
                            <span className="line-clamp-1 text-[12px] leading-4 font-medium [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">{app.name}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </motion.div>
            {shown.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">{msg("launchpad.noAppsMatch", "No apps match “{query}”.", { query })}</p>}
          </div>

          <div className="flex h-9 shrink-0 items-center gap-2" role="group" aria-label={msg("launchpad.pages", "Pages")}>
            {pages > 1 &&
              Array.from({ length: pages }, (_, p) => (
                <button
                  key={p}
                  type="button"
                  aria-label={msg("launchpad.page", "Page {n}", { n: p + 1 })}
                  aria-current={p === current ? "true" : undefined}
                  onClick={() => goPage(p)}
                  className={cn("size-2 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white", p === current ? "bg-white" : "bg-white/40 hover:bg-white/70")}
                />
              ))}
          </div>
          <p className="sr-only" role="status">
            {msg("launchpad.summary", { one: "{count} app, page {page} of {pages}", other: "{count} apps, page {page} of {pages}" }, { count: shown.length, page: current + 1, pages })}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { Launchpad, type LaunchpadProps, type LaunchpadApp }
