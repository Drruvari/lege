"use client"

import * as React from "react"
import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useMessages } from "@/lib/ballmac/i18n"
import { Media, type MediaSource } from "@/components/ballmac/media"
import { isMediaImage } from "@/lib/ballmac/media-image"

/** Pressed state that works controlled or not. */
function usePressed(pressed: boolean | undefined, defaultPressed: boolean, onChange?: (pressed: boolean) => void) {
  const [state, setState] = React.useState(defaultPressed)
  const value = pressed ?? state
  return [
    value,
    () => {
      setState(!value)
      onChange?.(!value)
    },
  ] as const
}

type ControlCenterProps = React.ComponentProps<"section"> & {
  /** Accessible name of the panel. */
  label?: string
}

/** The Control Center panel: frosted glass holding a grid of tiles, sliders and a media player. */
function ControlCenter({ label, className, ...props }: ControlCenterProps) {
  const msg = useMessages()
  label ??= msg("control-center.label", "Control Center")
  return (
    <section
      data-slot="control-center"
      aria-label={label}
      className={cn(
        "grid w-[22.5rem] max-w-full grid-cols-2 gap-2.5 rounded-[26px] border border-white/20 bg-background/55 p-3 text-foreground shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.25)] backdrop-blur-3xl backdrop-saturate-200 [--mac-accent:oklch(0.53_0.2_258)] dark:bg-neutral-900/60",
        className
      )}
      {...props}
    />
  )
}

const tile = "rounded-[18px] bg-foreground/[0.07] dark:bg-white/[0.09]"

type ControlTileProps = Omit<React.ComponentProps<"button">, "onChange"> & {
  /** Icon in the round badge. */
  icon: React.ReactNode
  /** Name of the control. */
  label: string
  /** Second line, such as the current state. */
  status?: string
  /** Controlled on state. */
  pressed?: boolean
  /** Initial on state when uncontrolled. */
  defaultPressed?: boolean
  /** Called with the new on state. */
  onPressedChange?: (pressed: boolean) => void
  /** Stack the badge over the label (a square tile) instead of beside it. */
  stacked?: boolean
}

/** A toggle tile: a round icon badge that fills with the accent color when on. It is a real toggle button. */
function ControlTile({ icon, label, status, pressed, defaultPressed = false, onPressedChange, stacked, className, onClick, ...props }: ControlTileProps) {
  const [on, toggle] = usePressed(pressed, defaultPressed, onPressedChange)
  return (
    <button
      type="button"
      data-slot="control-tile"
      aria-pressed={on}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) toggle()
      }}
      className={cn(
        tile,
        "group flex min-h-[4.25rem] items-center gap-2.5 p-2.5 text-start outline-none transition-[background-color,transform] duration-150 hover:bg-foreground/[0.11] focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        stacked && "flex-col items-start justify-between",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/15 text-foreground transition-colors duration-200 group-aria-pressed:bg-(--mac-accent) group-aria-pressed:text-white motion-reduce:transition-none [&_svg]:size-[1.1rem]"
      >
        {icon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold">{label}</span>
        {status && <span className="block truncate text-xs text-muted-foreground">{status}</span>}
      </span>
    </button>
  )
}

/** A tile that groups related toggle rows, such as Wi-Fi, Bluetooth and AirDrop. Place it first in the grid; it spans two rows. */
function ControlCluster({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="control-cluster" role="group" className={cn(tile, "row-span-2 flex flex-col justify-around gap-1 p-2.5", className)} {...props} />
}

type ControlRowProps = Omit<ControlTileProps, "stacked">

/** One row inside a cluster: round badge plus name and state. */
function ControlRow({ icon, label, status, pressed, defaultPressed = false, onPressedChange, className, onClick, ...props }: ControlRowProps) {
  const [on, toggle] = usePressed(pressed, defaultPressed, onPressedChange)
  return (
    <button
      type="button"
      data-slot="control-row"
      aria-pressed={on}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) toggle()
      }}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl p-1 text-start outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/60 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground/15 transition-colors duration-200 group-aria-pressed:bg-(--mac-accent) group-aria-pressed:text-white motion-reduce:transition-none [&_svg]:size-[1.1rem]"
      >
        {icon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold">{label}</span>
        {status && <span className="block truncate text-xs text-muted-foreground">{status}</span>}
      </span>
    </button>
  )
}

type ControlSliderProps = Omit<React.ComponentProps<typeof SliderPrimitive.Root>, "value" | "defaultValue" | "onValueChange" | "min" | "max"> & {
  /** Name shown above the slider and used as its accessible name. */
  label: string
  /** Icon drawn in the thumb's track (left side). */
  icon?: React.ReactNode
  /** Controlled value from 0 to 100. */
  value?: number
  /** Initial value when uncontrolled. */
  defaultValue?: number
  /** Called with the new value. */
  onValueChange?: (value: number) => void
}

/** A full-width pill slider with the icon inside the track and a white thumb, like Display and Sound in Control Center. */
function ControlSlider({ label, icon, value, defaultValue = 50, onValueChange, className, ...props }: ControlSliderProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  return (
    <div data-slot="control-slider" className={cn(tile, "col-span-2 px-3 pt-2 pb-2.5", className)}>
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      <SliderPrimitive.Root
        value={[current]}
        min={0}
        max={100}
        step={1}
        onValueChange={([v]) => {
          setInner(v!)
          onValueChange?.(v!)
        }}
        className="group relative flex h-7 w-full touch-none items-center select-none"
        {...props}
      >
        <SliderPrimitive.Track className="relative h-full grow overflow-hidden rounded-full bg-foreground/15 shadow-[inset_0_1px_2px_rgb(0_0_0/0.15)]">
          <SliderPrimitive.Range className="absolute h-full bg-foreground/85 dark:bg-white/90" />
          {icon && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-2 flex items-center text-background mix-blend-normal dark:text-neutral-800 [&_svg]:size-4">
              {icon}
            </span>
          )}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label={label} className="block size-7 rounded-full border border-black/10 bg-white shadow-[0_1px_4px_rgb(0_0_0/0.3)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70" />
      </SliderPrimitive.Root>
    </div>
  )
}

type ControlNowPlayingProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Track title. */
  title: string
  /** Artist or show. */
  artist: string
  /** Artwork: an image URL, an object with alt text and a dark-mode file, or any element. Decorative: the title and artist carry the meaning. */
  artwork?: MediaSource
  /** Whether it is playing (controlled). */
  playing?: boolean
  /** Initial state when uncontrolled. */
  defaultPlaying?: boolean
  /** Called with the new playing state. */
  onPlayingChange?: (playing: boolean) => void
  /** Called for the previous button. */
  onPrevious?: () => void
  /** Called for the next button. */
  onNext?: () => void
}

/** A media tile with artwork, title, artist and previous, play or pause, next buttons. */
function ControlNowPlaying({ title, artist, artwork, playing, defaultPlaying = false, onPlayingChange, onPrevious, onNext, className, ...props }: ControlNowPlayingProps) {
  const msg = useMessages()
  const [on, toggle] = usePressed(playing, defaultPlaying, onPlayingChange)
  const btn =
    "flex size-9 items-center justify-center rounded-full outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring/60 motion-reduce:transition-none [&_svg]:size-[1.15rem] [&_svg]:fill-current"
  return (
    <div data-slot="control-now-playing" className={cn(tile, "col-span-2 flex items-center gap-3 p-2.5", className)} {...props}>
      <div aria-hidden="true" className="size-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-chart-4 to-chart-5 shadow-md [&>img]:size-full [&>img]:object-cover">
        {isMediaImage(artwork) ? <Media media={artwork} alt="" fill className="size-full" /> : artwork}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{artist}</p>
        <div className="-ms-2 mt-1 flex items-center">
          <button type="button" aria-label={msg("control-center.previousTrack", "Previous track")} onClick={onPrevious} className={btn}>
            <SkipBack aria-hidden="true" />
          </button>
          <button type="button" aria-label={on ? msg("control-center.pause", "Pause") : msg("control-center.play", "Play")} onClick={toggle} className={btn}>
            {on ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button type="button" aria-label={msg("control-center.nextTrack", "Next track")} onClick={onNext} className={btn}>
            <SkipForward aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export {
  ControlCenter,
  ControlTile,
  ControlCluster,
  ControlRow,
  ControlSlider,
  ControlNowPlaying,
  type ControlCenterProps,
  type ControlTileProps,
  type ControlSliderProps,
  type ControlNowPlayingProps,
}
