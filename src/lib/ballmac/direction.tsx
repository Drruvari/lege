"use client"

import * as React from "react"
import { Direction } from "radix-ui"

export type TextDirection = "ltr" | "rtl"

function subscribe(onChange: () => void) {
  if (typeof MutationObserver === "undefined") return () => {}
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] })
  return () => observer.disconnect()
}
const readDocument = (): TextDirection => (document.documentElement.dir === "rtl" ? "rtl" : "ltr")

/**
 * The reading direction for code that has to know it (arrow-key order, pointer maths, which way a chevron faces).
 * An explicit `dir` wins, then a surrounding `<Direction>` or Radix `DirectionProvider`, then `<html dir>`.
 * Server render and the first client render say "ltr", so markup matches, and it updates right after hydration.
 */
export function useDirection(dir?: TextDirection): TextDirection {
  const provided = Direction.useDirection(dir)
  const document_ = React.useSyncExternalStore(subscribe, readDocument, () => "ltr" as TextDirection)
  return dir ?? (provided === "rtl" ? "rtl" : document_)
}

/**
 * Sets the direction for a part of the page and tells every Radix-based component inside it, so keyboard arrows,
 * sliders, menus and tabs follow it. For the whole app, put it in the root layout next to `<html dir>`.
 */
export function DirectionProvider({ dir, children }: { dir: TextDirection; children: React.ReactNode }) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>
}

/** A box with its own direction (`display: contents`, so it adds no layout), for previews and mixed-language regions. */
export function Dir({ dir, children, ...props }: Omit<React.ComponentProps<"div">, "dir"> & { dir: TextDirection }) {
  return (
    <Direction.Provider dir={dir}>
      <div dir={dir} className="contents" {...props}>
        {children}
      </div>
    </Direction.Provider>
  )
}
