import * as React from "react"
import { ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react"

import { DriveIcon, FileIcon, FolderIcon, type IconTone } from "@/components/ballmac/mac-icons"
import {
  MacWindow,
  MacWindowContent,
  MacWindowControls,
  MacWindowMain,
  MacWindowSidebar,
  MacWindowSidebarItem,
  MacWindowTitleBar,
  MacWindowToolbarButton,
} from "@/components/ballmac/mac-window"
import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"

type FinderNode = {
  /** Unique id. */
  id: string
  /** Name shown under the icon. */
  name: string
  /** What it is. */
  kind: "folder" | "file" | "drive"
  /** Extension badge for files, such as "PDF". */
  ext?: string
  /** Icon color for folders and the badge of files. */
  tone?: IconTone
  /** Size text, such as "2.4 MB". */
  size?: string
  /** Modified text, such as "Today, 9:41". */
  modified?: string
  /** Contents of a folder or drive. */
  children?: FinderNode[]
}

type FinderSidebarSection = {
  /** Section heading, such as "Favorites". */
  title: string
  items: { /** Id of the folder it opens. */ id: string; label: string; icon: React.ReactNode }[]
}

function findPath(node: FinderNode, id: string, trail: string[] = []): string[] | null {
  const here = [...trail, node.id]
  if (node.id === id) return here
  for (const child of node.children ?? []) {
    const hit = child.kind !== "file" ? findPath(child, id, here) : null
    if (hit) return hit
  }
  return null
}

function resolve(root: FinderNode, path: string[]): FinderNode[] {
  const nodes = [root]
  for (const id of path.slice(1)) {
    const next = nodes[nodes.length - 1]!.children?.find((c) => c.id === id)
    if (!next) break
    nodes.push(next)
  }
  return nodes
}

type FinderWindowProps = Omit<React.ComponentProps<"div">, "onSelect"> & {
  /** The top of the file tree: a folder or drive whose children can be browsed. */
  root: FinderNode
  /** Sidebar shortcuts. Each item opens the folder with that id. */
  sidebar?: FinderSidebarSection[]
  /** Folder to start in, as the id of any folder in the tree. Defaults to the root. */
  defaultFolder?: string
  /** "icons" is a grid, "list" shows kind, size and date. */
  view?: "icons" | "list"
  /** Called when a file is opened (double-click or Return). */
  onOpenFile?: (file: FinderNode) => void
  /** Called whenever the selection changes. */
  onSelectionChange?: (ids: string[]) => void
}

function Icon({ node, size }: { node: FinderNode; size: number }) {
  if (node.kind === "folder") return <FolderIcon size={size} tone={node.tone ?? "blue"} />
  if (node.kind === "drive") return <DriveIcon size={size} />
  return <FileIcon size={size} tone={node.tone ?? "graphite"} label={node.ext} />
}

/** A working mini Finder: sidebar, back and forward, icon and list views, selection, keyboard navigation and a path bar. */
function FinderWindow({ root, sidebar, defaultFolder, view: viewProp = "icons", onOpenFile, onSelectionChange, className, ...props }: FinderWindowProps) {
  const msg = useMessages()
  const uid = React.useId()
  const [history, setHistory] = React.useState<{ stack: string[][]; index: number }>(() => {
    const start = (defaultFolder && findPath(root, defaultFolder)) || [root.id]
    return { stack: [start], index: 0 }
  })
  const [view, setView] = React.useState(viewProp)
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [active, setActive] = React.useState(0)
  const [columns, setColumns] = React.useState(1)
  const gridRef = React.useRef<HTMLDivElement>(null)

  const path = history.stack[history.index]!
  const trail = resolve(root, path)
  const folder = trail[trail.length - 1]!
  const items = (folder.children ?? []).filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()))
  const canBack = history.index > 0
  const canForward = history.index < history.stack.length - 1

  React.useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const measure = () => setColumns(view === "list" ? 1 : Math.max(1, getComputedStyle(el).gridTemplateColumns.split(" ").length))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [view, folder.id])

  const select = React.useCallback(
    (ids: string[]) => {
      setSelected(ids)
      onSelectionChange?.(ids)
    },
    [onSelectionChange]
  )

  function go(target: string[]) {
    setHistory((h) => ({ stack: [...h.stack.slice(0, h.index + 1), target], index: h.index + 1 }))
    setQuery("")
    select([])
    setActive(0)
  }
  function goBack() {
    if (!canBack) return
    setHistory((h) => ({ ...h, index: h.index - 1 }))
    select([])
  }
  function goForward() {
    if (!canForward) return
    setHistory((h) => ({ ...h, index: h.index + 1 }))
    select([])
  }
  function open(node: FinderNode) {
    if (node.kind === "file") onOpenFile?.(node)
    else go([...path, node.id])
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = items.length - 1
    if (last < 0) return
    const mod = event.metaKey || event.ctrlKey
    if (mod && event.key === "ArrowDown") {
      event.preventDefault()
      const node = items[active]
      if (node) open(node)
      return
    }
    if (mod && event.key === "ArrowUp") {
      event.preventDefault()
      if (path.length > 1) go(path.slice(0, -1))
      return
    }
    const step: Record<string, number> = { ArrowRight: view === "icons" ? 1 : 0, ArrowLeft: view === "icons" ? -1 : 0, ArrowDown: columns, ArrowUp: -columns }
    if (event.key in step && step[event.key] !== 0) {
      event.preventDefault()
      const next = Math.min(last, Math.max(0, active + step[event.key]!))
      setActive(next)
      const id = items[next]!.id
      if (event.shiftKey) {
        const from = items.findIndex((i) => i.id === (selected[0] ?? items[active]!.id))
        const [a, b] = [Math.min(from, next), Math.max(from, next)]
        select(items.slice(a, b + 1).map((i) => i.id))
      } else select([id])
    } else if (event.key === "Enter") {
      event.preventDefault()
      const node = items[active]
      if (node) open(node)
    } else if (event.key === "Escape") select([])
    else if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault()
      select(items.map((i) => i.id))
    }
  }

  function onItemClick(event: React.MouseEvent, index: number) {
    const id = items[index]!.id
    setActive(index)
    if (event.shiftKey && selected.length) {
      const from = items.findIndex((i) => i.id === selected[0])
      const [a, b] = [Math.min(from, index), Math.max(from, index)]
      select(items.slice(a, b + 1).map((i) => i.id))
    } else if (event.metaKey || event.ctrlKey) {
      select(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
    } else select([id])
  }

  const optionId = (i: number) => `${uid}-opt-${i}`
  const status = `${items.length} ${items.length === 1 ? "item" : "items"}${selected.length ? `, ${selected.length} selected` : ""}`

  return (
    <MacWindow className={cn("h-[28rem] w-full", className)} {...props}>
      <MacWindowSidebar className="max-sm:hidden">
        {sidebar?.map((section) => (
          <div key={section.title} className="px-2.5 pb-3">
            <p className="px-2 pb-1 text-[11px] font-semibold text-muted-foreground">{section.title}</p>
            {section.items.map((item) => (
              <MacWindowSidebarItem key={item.id} selected={folder.id === item.id} onClick={() => { const p = findPath(root, item.id); if (p) go(p) }}>
                {item.icon}
                <span className="truncate">{item.label}</span>
              </MacWindowSidebarItem>
            ))}
          </div>
        ))}
      </MacWindowSidebar>
      <MacWindowMain>
        <MacWindowTitleBar controls={false} title={undefined}>
          <span className="me-auto flex min-w-0 items-center gap-1">
            <MacWindowControls className="me-2 pointer-events-auto sm:hidden" />
            <MacWindowToolbarButton aria-label={msg("finder-window.back", "Back")} disabled={!canBack} onClick={goBack}>
              <ChevronLeft  className="rtl:rotate-180"/>
            </MacWindowToolbarButton>
            <MacWindowToolbarButton aria-label={msg("finder-window.forward", "Forward")} disabled={!canForward} onClick={goForward}>
              <ChevronRight  className="rtl:rotate-180"/>
            </MacWindowToolbarButton>
            <span className="ms-2 truncate text-[15px] font-semibold text-foreground">{folder.name}</span>
          </span>
          <span className="inline-flex items-center gap-px rounded-lg bg-foreground/[0.06] p-0.5" role="group" aria-label={msg("finder-window.view", "View")}>
            {([["icons", LayoutGrid, msg("finder-window.asIcons", "as Icons")], ["list", List, msg("finder-window.asList", "as List")]] as const).map(([v, Glyph, label]) => (
              <button
                key={v}
                type="button"
                aria-label={label}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className="inline-flex h-6 w-8 items-center justify-center rounded-md text-foreground/70 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-[0_0.5px_1.5px_rgb(0_0_0/0.25)] dark:aria-pressed:bg-foreground/[0.18]"
              >
                <Glyph aria-hidden="true" className="size-4" />
              </button>
            ))}
          </span>
          <input
            type="search"
            aria-label={msg("finder-window.searchThisFolder", "Search this folder")}
            placeholder={msg("finder-window.search", "Search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ms-1.5 h-7 w-24 rounded-md transition-[width] duration-200 focus-visible:w-36 sm:w-36 motion-reduce:transition-none border border-foreground/10 bg-foreground/[0.05] px-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </MacWindowTitleBar>

        <MacWindowContent className="relative" onClick={(e) => e.target === e.currentTarget && select([])}>
          {view === "list" && (
            <div aria-hidden="true" className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_7.5rem_5rem] gap-3 border-b border-foreground/[0.08] bg-card/90 px-4 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur @container">
              <span>{msg("finder-window.name", "Name")}</span>
              <span>{msg("finder-window.dateModified", "Date Modified")}</span>
              <span className="text-end">{msg("finder-window.size", "Size")}</span>
            </div>
          )}
          <div
            ref={gridRef}
            role="listbox"
            aria-label={`${folder.name}, ${status}`}
            aria-multiselectable="true"
            aria-activedescendant={items.length ? optionId(Math.min(active, items.length - 1)) : undefined}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={cn("outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50", view === "icons" ? "grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-1 p-3" : "px-2 py-1")}
          >
            {items.map((node, i) => {
              const isSel = selected.includes(node.id)
              return (
                <div
                  key={node.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSel}
                  aria-label={msg("finder-window.itemLabel", "{name}, {kind}", { name: node.name, kind: node.kind === "file" ? (node.ext ?? msg("finder-window.document", "document")) : node.kind })}
                  onClick={(e) => onItemClick(e, i)}
                  onDoubleClick={() => open(node)}
                  className={cn(
                    "cursor-default select-none",
                    view === "icons"
                      ? "flex flex-col items-center gap-1 rounded-lg p-1.5 text-center"
                      : cn("grid grid-cols-[minmax(0,1fr)_7.5rem_5rem] items-center gap-3 rounded-md px-2 py-[3px] text-[13px]", i % 2 === 1 && !isSel && "bg-foreground/[0.03]"),
                    isSel && view === "list" && "bg-[var(--mac-accent,oklch(0.53_0.2_258))] text-white",
                    active === i && "outline-2 -outline-offset-2 outline-transparent [[role=listbox]:focus-visible_&]:outline-ring/60"
                  )}
                >
                  {view === "icons" ? (
                    <>
                      <span className={cn("rounded-lg p-1", isSel && "bg-foreground/[0.1]")}>
                        <Icon node={node} size={56} />
                      </span>
                      <span className={cn("line-clamp-2 max-w-full rounded-[5px] px-1.5 text-[12px] leading-4 break-words", isSel && "bg-[var(--mac-accent,oklch(0.53_0.2_258))] text-white")} aria-hidden="true">
                        {node.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon node={node} size={18} />
                        <span className="truncate" aria-hidden="true">{node.name}</span>
                      </span>
                      <span aria-hidden="true" className={cn("truncate text-[12px]", isSel ? "text-white/80" : "text-muted-foreground")}>{node.modified ?? "—"}</span>
                      <span aria-hidden="true" className={cn("truncate text-end text-[12px] tabular-nums", isSel ? "text-white/80" : "text-muted-foreground")}>{node.size ?? "—"}</span>
                    </>
                  )}
                </div>
              )
            })}
            {items.length === 0 && <p className="col-span-full px-4 py-10 text-center text-[13px] text-muted-foreground">{query ? `No items match “${query}”.` : "This folder is empty."}</p>}
          </div>
        </MacWindowContent>

        <nav aria-label={msg("finder-window.path", "Path")} className="flex h-7 shrink-0 items-center gap-1 border-t border-foreground/[0.08] bg-foreground/[0.02] px-3 text-[11px] text-muted-foreground">
          <ol className="flex min-w-0 items-center gap-0.5">
            {trail.map((n, i) => (
              <li key={n.id} className="flex min-w-0 items-center gap-0.5">
                {i > 0 && <ChevronRight aria-hidden="true" className="size-3 shrink-0 opacity-60 rtl:rotate-180" />}
                <button
                  type="button"
                  aria-current={i === trail.length - 1 ? "location" : undefined}
                  onClick={() => i < trail.length - 1 && go(path.slice(0, i + 1))}
                  className="flex min-w-0 items-center gap-1 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=location]:text-foreground"
                >
                  <span aria-hidden="true" className="shrink-0"><Icon node={n} size={14} /></span>
                  <span className="truncate">{n.name}</span>
                </button>
              </li>
            ))}
          </ol>
          <span className="ms-auto shrink-0 tabular-nums max-sm:sr-only" role="status">{status}</span>
        </nav>
      </MacWindowMain>
    </MacWindow>
  )
}

export { FinderWindow, type FinderWindowProps, type FinderNode, type FinderSidebarSection }
