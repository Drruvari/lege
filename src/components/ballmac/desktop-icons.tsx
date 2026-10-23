import * as React from "react"

import { AppIcon, DriveIcon, FileIcon, FolderIcon, type IconTone } from "@/components/ballmac/mac-icons"
import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

type DesktopItem = {
  /** Unique id. */
  id: string
  /** Label under the icon. */
  name: string
  /** What it is. */
  kind: "folder" | "file" | "drive" | "app"
  /** Column on the grid, counted from the left starting at 0. */
  col: number
  /** Row on the grid, counted from the top starting at 0. */
  row: number
  /** Extension badge for files. */
  ext?: string
  /** Icon color. */
  tone?: IconTone
  /** Glyph for an app icon. */
  glyph?: React.ReactNode
}

type DesktopIconsProps = Omit<React.ComponentProps<"div">, "onChange" | "children"> & {
  /** The icons and where they sit. */
  items: DesktopItem[]
  /** Called with the new list after icons are dragged to other cells. */
  onItemsChange?: (items: DesktopItem[]) => void
  /** Called when an icon is opened with a double-click or Return. */
  onOpen?: (item: DesktopItem) => void
  /** Size of one grid cell in pixels. */
  cell?: number
  /** Accessible name of the desktop. */
  label?: string
}

function Glyph({ item }: { item: DesktopItem }) {
  if (item.kind === "folder") return <FolderIcon size={56} tone={item.tone ?? "blue"} />
  if (item.kind === "drive") return <DriveIcon size={56} />
  if (item.kind === "app") return <AppIcon size={52} tone={item.tone ?? "blue"}>{item.glyph}</AppIcon>
  return <FileIcon size={56} tone={item.tone ?? "graphite"} label={item.ext} />
}

/**
 * A macOS desktop: icons on a grid. Click or drag a box to select, drag icons to move them (they snap to cells),
 * double-click or press Return to open. Arrow keys move focus; Alt plus an arrow key moves the focused icon.
 */
function DesktopIcons({ items: initial, onItemsChange, onOpen, cell = 96, label, className, style, ...props }: DesktopIconsProps) {
  const msg = useMessages()
  label ??= msg("desktop-icons.label", "Desktop")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [items, setItems] = React.useState(initial)
  const [selected, setSelected] = React.useState<string[]>([])
  const [focusId, setFocusId] = React.useState(initial[0]?.id)
  const [drag, setDrag] = React.useState<{ dx: number; dy: number } | null>(null)
  const [band, setBand] = React.useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const refs = React.useRef(new Map<string, HTMLElement>())
  const gesture = React.useRef<{ kind: "item" | "band"; startX: number; startY: number; moved: boolean; base: string[]; ids: string[]; originals: Map<string, DesktopItem> } | null>(null)

  React.useEffect(() => setItems(initial), [initial])

  const commit = React.useCallback(
    (next: DesktopItem[]) => {
      setItems(next)
      onItemsChange?.(next)
    },
    [onItemsChange]
  )

  const bounds = () => {
    const el = rootRef.current
    return { cols: Math.max(1, Math.floor((el?.clientWidth ?? cell) / cell)), rows: Math.max(1, Math.floor((el?.clientHeight ?? cell) / cell)) }
  }

  function relative(e: { clientX: number; clientY: number }) {
    const box = rootRef.current!.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  function onItemDown(e: React.PointerEvent, item: DesktopItem) {
    if (e.button !== 0) return
    e.stopPropagation()
    const additive = e.metaKey || e.ctrlKey || e.shiftKey
    let ids = selected
    if (!selected.includes(item.id)) ids = additive ? [...selected, item.id] : [item.id]
    else if (additive) ids = selected.filter((s) => s !== item.id)
    setSelected(ids)
    setFocusId(item.id)
    gesture.current = { kind: "item", startX: e.clientX, startY: e.clientY, moved: false, base: ids, ids: ids.includes(item.id) ? ids : [item.id], originals: new Map(items.map((i) => [i.id, i])) }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function onRootDown(e: React.PointerEvent) {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    const p = relative(e)
    const additive = e.metaKey || e.ctrlKey || e.shiftKey
    gesture.current = { kind: "band", startX: p.x, startY: p.y, moved: false, base: additive ? selected : [], ids: [], originals: new Map() }
    if (!additive) setSelected([])
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onMove(e: React.PointerEvent) {
    const g = gesture.current
    if (!g) return
    if (g.kind === "item") {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (!g.moved && Math.hypot(dx, dy) < 4) return
      g.moved = true
      setDrag({ dx, dy })
    } else {
      const p = relative(e)
      if (!g.moved && Math.hypot(p.x - g.startX, p.y - g.startY) < 4) return
      g.moved = true
      const rect = { x1: Math.min(g.startX, p.x), y1: Math.min(g.startY, p.y), x2: Math.max(g.startX, p.x), y2: Math.max(g.startY, p.y) }
      setBand({ ...rect })
      const hit = items.filter((it) => {
        const l = it.col * cell + 8
        const t = it.row * cell + 4
        return l < rect.x2 && l + cell - 16 > rect.x1 && t < rect.y2 && t + cell - 8 > rect.y1
      })
      setSelected([...new Set([...g.base, ...hit.map((h) => h.id)])])
    }
  }

  function onUp() {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if (g.kind === "band") return setBand(null)
    if (!g.moved || !drag) return setDrag(null)
    const { cols, rows } = bounds()
    const taken = new Set(items.filter((i) => !g.ids.includes(i.id)).map((i) => `${i.col},${i.row}`))
    const moved = new Map<string, DesktopItem>()
    for (const id of g.ids) {
      const o = g.originals.get(id)!
      let col = Math.min(cols - 1, Math.max(0, Math.round(o.col + drag.dx / cell)))
      let row = Math.min(rows - 1, Math.max(0, Math.round(o.row + drag.dy / cell)))
      // If the cell is taken, look outward for the nearest free one.
      for (let ring = 1; taken.has(`${col},${row}`) && ring < 12; ring++) {
        const options: [number, number][] = []
        for (let dc = -ring; dc <= ring; dc++) for (let dr = -ring; dr <= ring; dr++) if (Math.max(Math.abs(dc), Math.abs(dr)) === ring) options.push([col + dc, row + dr])
        const free = options.find(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows && !taken.has(`${c},${r}`))
        if (free) [col, row] = free
      }
      taken.add(`${col},${row}`)
      moved.set(id, { ...o, col, row })
    }
    setDrag(null)
    commit(items.map((i) => moved.get(i.id) ?? i))
  }

  function onKeyDown(e: React.KeyboardEvent, item: DesktopItem) {
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (e.key in dirs) {
      e.preventDefault()
      const [dc, dr] = dirs[e.key]!
      if (e.altKey) {
        const { cols, rows } = bounds()
        const col = item.col + dc
        const row = item.row + dr
        if (col < 0 || row < 0 || col >= cols || row >= rows || items.some((i) => i.id !== item.id && i.col === col && i.row === row)) return
        commit(items.map((i) => (i.id === item.id ? { ...i, col, row } : i)))
        return
      }
      // Move focus to the nearest icon in that direction.
      const candidates = items
        .filter((i) => i.id !== item.id && (dc ? Math.sign(i.col - item.col) === dc : Math.sign(i.row - item.row) === dr))
        .sort((a, b) => Math.hypot((a.col - item.col) * (dc ? 1 : 3), (a.row - item.row) * (dr ? 1 : 3)) - Math.hypot((b.col - item.col) * (dc ? 1 : 3), (b.row - item.row) * (dr ? 1 : 3)))
      const next = candidates[0]
      if (next) {
        setFocusId(next.id)
        setSelected([next.id])
        refs.current.get(next.id)?.focus()
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      onOpen?.(item)
    } else if (e.key === " ") {
      e.preventDefault()
      setSelected((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]))
    } else if (e.key === "Escape") setSelected([])
  }

  const moving = drag && gesture.current?.kind === "item" ? new Set(gesture.current.ids) : null

  return (
    <div
      ref={rootRef}
      data-slot="desktop-icons"
      role="listbox"
      aria-label={label}
      aria-multiselectable="true"
      onPointerDown={onRootDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className={cn("relative touch-none overflow-hidden select-none [--mac-accent:oklch(0.53_0.2_258)]", className)}
      style={style}
      {...props}
    >
      {items.map((item) => {
        const isSel = selected.includes(item.id)
        const shift = moving?.has(item.id) && drag ? { x: drag.dx, y: drag.dy } : { x: 0, y: 0 }
        return (
          <div
            key={item.id}
            ref={(el) => {
              if (el) refs.current.set(item.id, el)
              else refs.current.delete(item.id)
            }}
            role="option"
            aria-selected={isSel}
            aria-label={`${item.name}, ${item.kind}`}
            tabIndex={focusId === item.id ? 0 : -1}
            onPointerDown={(e) => onItemDown(e, item)}
            onDoubleClick={() => onOpen?.(item)}
            onFocus={() => setFocusId(item.id)}
            onKeyDown={(e) => onKeyDown(e, item)}
            className={cn(
              "absolute flex flex-col items-center gap-1 rounded-lg px-0 pt-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
              moving?.has(item.id) ? "z-20 cursor-grabbing" : "cursor-default transition-[left,top] duration-150 motion-reduce:transition-none"
            )}
            style={{ left: item.col * cell + 8, top: item.row * cell + 4, width: cell - 16, transform: `translate(${shift.x}px, ${shift.y}px)` }}
          >
            <span className={cn("rounded-lg p-0.5", isSel && "bg-white/25")}>
              <Glyph item={item} />
            </span>
            <span
              aria-hidden="true"
              className={cn("line-clamp-2 max-w-full rounded-[5px] px-1.5 text-center text-[12px] leading-[14px] font-medium break-words text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]", isSel && "bg-(--mac-accent) [text-shadow:none]")}
            >
              {item.name}
            </span>
          </div>
        )
      })}
      {band && (
        <span aria-hidden="true" className="pointer-events-none absolute z-30 rounded-[3px] border border-white/70 bg-white/20" style={{ left: band.x1, top: band.y1, width: band.x2 - band.x1, height: band.y2 - band.y1 }} />
      )}
    </div>
  )
}

export { DesktopIcons, type DesktopIconsProps, type DesktopItem }
