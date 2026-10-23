"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { MacWindow, MacWindowContent, MacWindowTitleBar } from "@/components/ballmac/mac-window"
import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

type ManagedWindow = {
  /** Unique id. */
  id: string
  /** Title shown in the title bar and the tray. */
  title: string
  /** What the window shows. */
  content: React.ReactNode
  /** Left edge in pixels. Windows without a position cascade. */
  x?: number
  /** Top edge in pixels. */
  y?: number
  /** Width in pixels. */
  width?: number
  /** Height in pixels. */
  height?: number
  /** Smallest width it can be resized to. */
  minWidth?: number
  /** Smallest height it can be resized to. */
  minHeight?: number
}

type Rect = { x: number; y: number; w: number; h: number }
type WinState = Rect & { id: string; z: number; minimized: boolean; maximized: boolean; restore?: Rect }

type WindowManagerProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The windows. Add an entry to open one; remove it to close it. */
  windows: ManagedWindow[]
  /** Called when a window's close button is pressed. Remove the window from `windows` to actually close it. */
  onClose?: (id: string) => void
  /** Content behind the windows, such as desktop icons or a wallpaper. */
  children?: React.ReactNode
  /** Accessible name of the desktop. */
  label?: string
  /** Accessible name of the strip that holds minimized windows. */
  trayLabel?: string
}

const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const
const EDGE_STYLE: Record<(typeof EDGES)[number], string> = {
  n: "top-[-3px] start-3 end-3 h-1.5 cursor-ns-resize",
  s: "bottom-[-3px] start-3 end-3 h-1.5 cursor-ns-resize",
  e: "end-[-3px] top-3 bottom-3 w-1.5 cursor-ew-resize",
  w: "start-[-3px] top-3 bottom-3 w-1.5 cursor-ew-resize",
  ne: "top-[-4px] end-[-4px] size-3.5 cursor-nesw-resize",
  nw: "top-[-4px] start-[-4px] size-3.5 cursor-nwse-resize",
  se: "bottom-[-4px] end-[-4px] size-3.5 cursor-nwse-resize",
  sw: "bottom-[-4px] start-[-4px] size-3.5 cursor-nesw-resize",
}

function initial(w: ManagedWindow, index: number, z: number): WinState {
  return { id: w.id, x: w.x ?? 28 + index * 36, y: w.y ?? 24 + index * 30, w: w.width ?? 380, h: w.height ?? 250, z, minimized: false, maximized: false }
}

/**
 * A desktop of real, draggable windows: focus raises a window, the title bar drags, edges and corners resize,
 * double-clicking the title bar zooms, the yellow light tucks a window into the tray.
 * With a window focused, Alt plus an arrow key moves it (Shift for bigger steps), Alt+Shift+arrows resize it.
 */
function WindowManager({ windows, onClose, children, label, trayLabel, className, ...props }: WindowManagerProps) {
  const msg = useMessages()
  label ??= msg("window-manager.label", "Desktop")
  trayLabel ??= msg("window-manager.trayLabel", "Minimized windows")
  const reduce = useReducedMotion()
  const deskRef = React.useRef<HTMLDivElement>(null)
  const [states, setStates] = React.useState<WinState[]>(() => windows.map((w, i) => initial(w, i, i + 1)))
  const [dragging, setDragging] = React.useState<string | null>(null)
  const top = React.useRef(windows.length)
  const gesture = React.useRef<{ id: string; mode: "move" | "resize"; edge?: string; px: number; py: number; start: Rect } | null>(null)

  // Open windows that were added, and drop the ones that were removed.
  React.useEffect(() => {
    setStates((current) => {
      const known = new Set(current.map((s) => s.id))
      const added = windows.filter((w) => !known.has(w.id)).map((w, i) => initial(w, current.length + i, ++top.current))
      const kept = current.filter((s) => windows.some((w) => w.id === s.id))
      return added.length || kept.length !== current.length ? [...kept, ...added] : current
    })
  }, [windows])

  const count = states.length
  // Keep every window inside the desktop when it opens or when the desktop shrinks.
  React.useEffect(() => {
    const el = deskRef.current
    if (!el) return
    const fit = () => {
      const dw = el.clientWidth
      const dh = el.clientHeight
      if (!dw || !dh) return
      setStates((all) => {
        let changed = false
        const next = all.map((s) => {
          if (s.maximized) return s
          const w = Math.min(s.w, Math.max(160, dw - 16))
          const h = Math.min(s.h, Math.max(110, dh - 16))
          const x = Math.max(8, Math.min(s.x, dw - w - 8))
          const y = Math.max(0, Math.min(s.y, dh - h - 8))
          if (w === s.w && h === s.h && x === s.x && y === s.y) return s
          changed = true
          return { ...s, w, h, x, y }
        })
        return changed ? next : all
      })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [count])

  const patch = React.useCallback((id: string, change: Partial<WinState> | ((s: WinState) => Partial<WinState>)) => {
    setStates((all) => all.map((s) => (s.id === id ? { ...s, ...(typeof change === "function" ? change(s) : change) } : s)))
  }, [])

  const raise = React.useCallback((id: string) => {
    setStates((all) => {
      const me = all.find((s) => s.id === id)
      if (!me || (me.z === top.current && !me.minimized)) return all
      return all.map((s) => (s.id === id ? { ...s, z: ++top.current, minimized: false } : s))
    })
  }, [])

  const desk = () => ({ w: deskRef.current?.clientWidth ?? 800, h: deskRef.current?.clientHeight ?? 500 })
  const spec = (id: string) => windows.find((w) => w.id === id)

  function begin(e: React.PointerEvent, s: WinState, mode: "move" | "resize", edge?: string) {
    if (s.maximized && mode === "resize") return
    gesture.current = { id: s.id, mode, edge, px: e.clientX, py: e.clientY, start: { x: s.x, y: s.y, w: s.w, h: s.h } }
    setDragging(s.id)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function onMove(e: React.PointerEvent) {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.px
    const dy = e.clientY - g.py
    const { w: dw, h: dh } = desk()
    if (g.mode === "move") {
      patch(g.id, { maximized: false, x: Math.min(dw - 80, Math.max(80 - g.start.w, g.start.x + dx)), y: Math.min(dh - 32, Math.max(0, g.start.y + dy)) })
      return
    }
    const win = spec(g.id)
    const minW = win?.minWidth ?? 220
    const minH = win?.minHeight ?? 140
    let { x, y, w, h } = g.start
    const edge = g.edge ?? ""
    if (edge.includes("e")) w = Math.max(minW, g.start.w + dx)
    if (edge.includes("s")) h = Math.max(minH, g.start.h + dy)
    if (edge.includes("w")) {
      w = Math.max(minW, g.start.w - dx)
      x = g.start.x + (g.start.w - w)
    }
    if (edge.includes("n")) {
      h = Math.max(minH, g.start.h - dy)
      y = Math.max(0, g.start.y + (g.start.h - h))
      h = g.start.h + (g.start.y - y)
    }
    patch(g.id, { x, y, w, h })
  }

  function end() {
    gesture.current = null
    setDragging(null)
  }

  function zoom(s: WinState) {
    if (s.maximized) patch(s.id, { maximized: false, ...(s.restore ?? {}) })
    else patch(s.id, { maximized: true, restore: { x: s.x, y: s.y, w: s.w, h: s.h } })
    raise(s.id)
  }

  function onKeyDown(e: React.KeyboardEvent, s: WinState) {
    if (e.target !== e.currentTarget) return
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === "w") {
      e.preventDefault()
      onClose?.(s.id)
      return
    }
    if (mod && e.key.toLowerCase() === "m") {
      e.preventDefault()
      patch(s.id, { minimized: true })
      return
    }
    if (!e.altKey) return
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const d = dirs[e.key]
    if (!d) return
    e.preventDefault()
    const win = spec(s.id)
    const step = 16
    const { w: dw, h: dh } = desk()
    if (e.shiftKey) {
      patch(s.id, { maximized: false, w: Math.max(win?.minWidth ?? 220, s.w + d[0] * step), h: Math.max(win?.minHeight ?? 140, s.h + d[1] * step) })
    } else {
      patch(s.id, { maximized: false, x: Math.min(dw - 80, Math.max(80 - s.w, s.x + d[0] * step)), y: Math.min(dh - 32, Math.max(0, s.y + d[1] * step)) })
    }
  }

  const visible = states.filter((s) => !s.minimized)
  const activeId = visible.reduce<WinState | null>((best, s) => (!best || s.z > best.z ? s : best), null)?.id
  const tray = states.filter((s) => s.minimized)

  return (
    <div
      ref={deskRef}
      data-slot="window-manager"
      role="group"
      aria-label={label}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
      className={cn("relative isolate overflow-hidden [--mac-accent:oklch(0.53_0.2_258)]", className)}
      {...props}
    >
      {children}
      <AnimatePresence>
        {states.map((s) => {
          const win = spec(s.id)
          if (!win) return null
          const { w: dw, h: dh } = desk()
          const rect = s.maximized ? { x: 0, y: 0, w: dw, h: dh } : s
          return (
            <motion.div
              key={s.id}
              data-slot="managed-window"
              role="group"
              aria-label={msg("window-manager.windowAltAndArrowKeys", "{title} window. Alt and arrow keys move it; Alt, Shift and arrow keys resize it.", { title: win.title })}
              tabIndex={s.minimized ? -1 : 0}
              {...(s.minimized ? { inert: true } : {})}
              onPointerDownCapture={() => raise(s.id)}
              onFocusCapture={() => raise(s.id)}
              onKeyDown={(e) => onKeyDown(e, s)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              animate={s.minimized ? (reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: dh - s.y }) : { opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn("absolute rounded-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60", dragging !== s.id && "[transition:left_0.2s,top_0.2s,width_0.2s,height_0.2s] motion-reduce:transition-none", s.minimized && "pointer-events-none")}
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: s.z }}
            >
              <MacWindow
                active={activeId === s.id}
                className="size-full"
                onClose={() => onClose?.(s.id)}
                onMinimize={() => patch(s.id, { minimized: true })}
                onZoom={() => zoom(s)}
              >
                <MacWindowTitleBar
                  title={win.title}
                  className="cursor-grab touch-none active:cursor-grabbing"
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return
                    begin(e, s, "move")
                  }}
                  onDoubleClick={(e) => {
                    if (!(e.target as HTMLElement).closest("button")) zoom(s)
                  }}
                />
                <MacWindowContent>{win.content}</MacWindowContent>
              </MacWindow>
              {!s.maximized &&
                EDGES.map((edge) => (
                  <span key={edge} aria-hidden="true" onPointerDown={(e) => begin(e, s, "resize", edge)} className={cn("absolute z-10 touch-none", EDGE_STYLE[edge])} />
                ))}
            </motion.div>
          )
        })}
      </AnimatePresence>
      {tray.length > 0 && (
        <ul aria-label={trayLabel} className="absolute bottom-3 left-1/2 z-[999] flex max-w-[92%] -translate-x-1/2 gap-1.5 rounded-2xl border border-white/20 bg-black/35 p-1.5 shadow-lg backdrop-blur-xl">
          {tray.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={msg("window-manager.restore", "Restore {title}", { title: spec(s.id)?.title ?? s.id })}
                onClick={() => raise(s.id)}
                className="flex h-8 max-w-40 items-center rounded-xl bg-white/15 px-3 text-[12px] font-medium text-white outline-none transition-colors hover:bg-white/25 focus-visible:ring-[3px] focus-visible:ring-white/60"
              >
                <span className="truncate">{spec(s.id)?.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { WindowManager, type WindowManagerProps, type ManagedWindow }
