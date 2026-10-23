import * as React from "react"

import { cn } from "@/lib/utils"
import { isMediaImage, type MediaImage } from "@/lib/ballmac/media-image"

/** What a slot accepts: an image URL, an image with its alt text, or your own element (a next/image, a video, a component). */
export type MediaSource = string | MediaImage | React.ReactElement

const ASPECTS = { square: "1 / 1", video: "16 / 9", photo: "4 / 3", wide: "21 / 9", portrait: "3 / 4", cinema: "2 / 1" } as const
export type MediaAspect = "auto" | keyof typeof ASPECTS | `${number}/${number}` | `${number} / ${number}`

type MediaProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The picture, or your own element. Leave it out to show `fallback`. */
  media?: MediaSource | null
  /** Describes a picture passed as a plain URL. Required for informative images; use "" for decoration. */
  alt?: string
  /** What shows when there is no `media` or the file fails to load. Usually the block's built-in artwork. */
  fallback?: React.ReactNode
  /** Reserves the box before the image loads, so the page does not jump. `auto` keeps the image's own proportions. */
  aspect?: MediaAspect
  /** `cover` fills and crops, `contain` shows all of it, `fill` stretches. */
  fit?: "cover" | "contain" | "fill"
  /** Above the fold: load now and with high priority instead of lazily. */
  priority?: boolean
  /** Fill a parent that has its own size (an absolutely positioned panel) instead of reserving space by aspect ratio. */
  fill?: boolean
  /** A card frame (rounded corners, border, soft shadow) around a real image or element. The built-in artwork keeps its own. */
  frame?: boolean
  /** Called when the file fails to load (the fallback is shown). */
  onImageError?: () => void
}

const FIT = { cover: "object-cover", contain: "object-contain", fill: "object-fill" } as const

function normalize(media: MediaProps["media"], alt: string | undefined): MediaImage | null {
  if (typeof media === "string") {
    if (alt === undefined && process.env.NODE_ENV !== "production") {
      console.warn(`Media: "${media}" has no alt text. Pass alt="…" to describe it, or alt="" if it is decoration.`)
    }
    return { src: media, alt: alt ?? "" }
  }
  if (media && typeof media === "object" && "src" in media) return alt === undefined ? media : { ...media, alt }
  return null
}

/**
 * A picture slot: it holds the space, loads lazily, falls back to the artwork if there is no image or it fails,
 * and takes a plain URL, an image with alt text (and an optional dark-mode file), or any element.
 */
function Media({ media, alt, fallback, aspect = "auto", fit = "cover", priority = false, frame = false, fill: fillParent = false, onImageError, className, style, ...props }: MediaProps) {
  const [failed, setFailed] = React.useState(false)
  const image = normalize(media, alt)
  const custom = !image && React.isValidElement(media) ? media : null
  const failedKey = image ? `${image.src}|${image.srcDark ?? ""}` : ""
  const [lastKey, setLastKey] = React.useState(failedKey)
  if (failedKey !== lastKey) {
    // A new file gets another chance.
    setLastKey(failedKey)
    setFailed(false)
  }
  const ratio = aspect === "auto" ? undefined : aspect in ASPECTS ? ASPECTS[aspect as keyof typeof ASPECTS] : aspect.replace(/\s*\/\s*/, " / ")
  const fill = ratio !== undefined || fillParent
  const showImage = image && !failed
  const handleError = () => {
    setFailed(true)
    onImageError?.()
  }
  // Images that failed before React attached its handlers never fire onError again.
  const check = React.useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth === 0 && node.currentSrc) {
      setFailed(true)
      onImageError?.()
    }
  }, [onImageError])
  const img = (src: string, extra?: string) => (
    <img
      ref={check}
      src={src}
      alt={image!.alt}
      srcSet={src === image!.src ? image!.srcSet : undefined}
      sizes={image!.sizes}
      width={image!.width}
      height={image!.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={handleError}
      style={image!.position ? { objectPosition: image!.position } : undefined}
      className={cn(fill ? "absolute inset-0 size-full" : "block h-auto w-full", FIT[fit], extra)}
    />
  )
  return (
    <div
      data-slot="media"
      data-state={showImage ? "image" : custom ? "custom" : "fallback"}
      className={cn(
        "relative overflow-hidden data-[state=fallback]:overflow-visible",
        fill && "bg-muted/40 data-[state=fallback]:bg-transparent",
        frame && "data-[state=custom]:rounded-2xl data-[state=custom]:border data-[state=custom]:shadow-[0_30px_80px_-40px_rgb(0_0_0/0.35)] data-[state=image]:rounded-2xl data-[state=image]:border data-[state=image]:shadow-[0_30px_80px_-40px_rgb(0_0_0/0.35)]",
        custom && "[&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover",
        className
      )}
      style={{ ...(ratio ? { aspectRatio: ratio } : {}), ...style }}
      {...props}
    >
      {showImage ? (
        image.srcDark ? (
          <>
            {img(image.src, "dark:hidden")}
            {img(image.srcDark, "hidden dark:block")}
          </>
        ) : (
          img(image.src)
        )
      ) : custom ? (
        custom
      ) : (
        fallback ?? null
      )}
    </div>
  )
}

// isMediaImage lives in lib/media-image so server components can call it; it stays exported here for code that imported it from this file.
export { Media, isMediaImage, type MediaImage, type MediaProps }
