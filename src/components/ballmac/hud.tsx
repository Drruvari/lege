"use client"

import * as React from "react"
import { KeyboardIcon, SunIcon, SunMediumIcon, VolumeIcon, Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

type HudKind = "volume" | "brightness" | "keyboard"

type HudProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** What is being adjusted. Chooses the icon and the spoken name. */
  kind?: HudKind
  /** Level from 0 to 100. */
  value: number
  /** Show a muted speaker instead of the level (volume only). */
  muted?: boolean
  /** Whether the HUD is on screen. */
  visible: boolean
  /** Called with false when the HUD times out. */
  onVisibleChange?: (visible: boolean) => void
  /** How long the HUD stays after the last change, in milliseconds. */
  duration?: number
  /** "mac" is the dark square with a segmented bar; "pill" is a slim capsule with a smooth bar. */
  variant?: "mac" | "pill"
}

const NAMES: Record<HudKind, string> = { volume: "Volume", brightness: "Brightness", keyboard: "Keyboard brightness" }

function HudIcon({ kind, value, muted }: { kind: HudKind; value: number; muted?: boolean }) {
  if (kind === "brightness") return value > 50 ? <SunIcon aria-hidden="true" /> : <SunMediumIcon aria-hidden="true" />
  if (kind === "keyboard") return <KeyboardIcon aria-hidden="true" />
  if (muted || value === 0) return <VolumeXIcon aria-hidden="true" />
  if (value < 34) return <VolumeIcon aria-hidden="true" />
  if (value < 67) return <Volume1Icon aria-hidden="true" />
  return <Volume2Icon aria-hidden="true" />
}

/**
 * The macOS volume and brightness HUD. It sits at the bottom center of its positioned parent (a capsule sits at the top),
 * pops in, restarts its timer whenever `value` changes, and fades out. Screen readers hear the new level.
 */
function Hud({ kind = "volume", value, muted = false, visible, onVisibleChange, duration = 1800, variant = "mac", className, ...props }: HudProps) {
  const reduce = useReducedMotion()
  const level = Math.max(0, Math.min(100, Math.round(value)))
  const shown = muted && kind === "volume" ? 0 : level
  const name = NAMES[kind]

  React.useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => onVisibleChange?.(false), duration)
    return () => clearTimeout(timer)
  }, [visible, level, muted, duration, onVisibleChange])

  const filled = Math.round((shown / 100) * 16)
  const pill = variant === "pill"
  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : pill
      ? { initial: { opacity: 0, y: -14, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8, scale: 0.98 } }
      : { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } }

  return (
    <>
      <p role="status" className="sr-only">
        {visible ? (muted && kind === "volume" ? "Volume muted" : `${name} ${level} percent`) : ""}
      </p>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="hud"
            data-slot="hud"
            data-variant={variant}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-1/2 z-[60] -translate-x-1/2 text-white",
              pill
                ? "top-4 flex h-11 w-[min(18rem,calc(100%-2rem))] items-center gap-3 rounded-full border border-white/15 bg-neutral-900/75 px-4 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.55)] backdrop-blur-2xl backdrop-saturate-150"
                : "bottom-[8%] flex aspect-square w-[11.5rem] max-w-[60%] flex-col items-center justify-between rounded-[26px] border border-white/10 bg-neutral-900/70 px-[1.1rem] pt-[1.5rem] pb-[1.4rem] shadow-[0_20px_50px_-10px_rgb(0_0_0/0.6)] backdrop-blur-3xl backdrop-saturate-150",
              className
            )}
            transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
            {...(motionProps as object)}
            {...(props as object)}
          >
            {pill ? (
              <>
                <span className="flex size-6 shrink-0 items-center justify-center [&_svg]:size-5">
                  <HudIcon kind={kind} value={shown} muted={muted} />
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <span className="block h-full rounded-full bg-white transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${shown}%` }} />
                </span>
                <span className="w-9 text-end text-sm font-medium tabular-nums">{shown}%</span>
              </>
            ) : (
              <>
                <span className="flex flex-1 items-center justify-center [&_svg]:size-[4.4rem] [&_svg]:stroke-[1.4]">
                  <HudIcon kind={kind} value={shown} muted={muted} />
                </span>
                <span className="flex w-full justify-between gap-[3px]">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span
                      key={i}
                      className={cn("h-[9px] flex-1 rounded-[1.5px] transition-colors duration-100 motion-reduce:transition-none", i < filled ? "bg-white" : "bg-white/30")}
                    />
                  ))}
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** State for a HUD: `show()` makes it visible; the HUD hides itself after its `duration`, and a new `value` restarts that timer. */
function useTransientHud() {
  const [visible, setVisible] = React.useState(false)
  const show = React.useCallback(() => setVisible(true), [])
  const hide = React.useCallback(() => setVisible(false), [])
  return { visible, show, hide, onVisibleChange: setVisible }
}

export { Hud, useTransientHud, type HudProps, type HudKind }
