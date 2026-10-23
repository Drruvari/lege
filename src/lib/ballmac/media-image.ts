import * as React from "react"

/** An image with the text that describes it. `alt` is required: use "" only when the picture is pure decoration. */
export type MediaImage = {
  src: string
  alt: string
  /** Shown instead of `src` in dark mode (when an ancestor has the `dark` class). */
  srcDark?: string
  srcSet?: string
  sizes?: string
  /** Intrinsic size, so the browser can reserve space before the file arrives. */
  width?: number
  height?: number
  /** CSS object-position, for example "top" or "50% 20%". */
  position?: string
}

/**
 * True for an image URL or a `{ src, alt }` object, false for an element or nothing: lets a slot that used to take any element accept pictures too.
 * It lives here, not in media.tsx, because media.tsx is a client file and a server component cannot call a function exported from one.
 */
export function isMediaImage(value: unknown): value is string | MediaImage {
  return typeof value === "string" || (typeof value === "object" && value !== null && !React.isValidElement(value) && "src" in value)
}
