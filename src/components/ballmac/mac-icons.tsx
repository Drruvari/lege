import * as React from "react"

import { cn } from "@/lib/utils"

type IconTone = "blue" | "teal" | "green" | "amber" | "orange" | "red" | "purple" | "graphite"

const TONES: Record<IconTone, { top: string; bottom: string }> = {
  blue: { top: "color-mix(in oklab, var(--chart-1) 70%, white)", bottom: "var(--chart-1)" },
  teal: { top: "color-mix(in oklab, var(--chart-2) 65%, white)", bottom: "var(--chart-2)" },
  green: { top: "color-mix(in oklab, var(--chart-2) 55%, oklch(0.87 0.17 150))", bottom: "color-mix(in oklab, var(--chart-2) 80%, oklch(0.6 0.17 150))" },
  amber: { top: "color-mix(in oklab, var(--chart-3) 65%, white)", bottom: "var(--chart-3)" },
  orange: { top: "color-mix(in oklab, var(--chart-5) 65%, white)", bottom: "var(--chart-5)" },
  red: { top: "color-mix(in oklab, var(--destructive) 70%, white)", bottom: "var(--destructive)" },
  purple: { top: "color-mix(in oklab, var(--chart-4) 65%, white)", bottom: "var(--chart-4)" },
  graphite: { top: "oklch(0.64 0.01 260)", bottom: "oklch(0.42 0.012 260)" },
}

type IconProps = Omit<React.ComponentProps<"svg">, "children"> & {
  /** Size in pixels. */
  size?: number
  /** Color of the icon. */
  tone?: IconTone
}

/** A macOS-style folder with a tab, front flap and soft highlight. Decorative: put the name in text beside it. */
function FolderIcon({ size = 64, tone = "blue", className, ...props }: IconProps) {
  const id = React.useId().replace(/:/g, "")
  const t = TONES[tone]
  return (
    <svg data-slot="folder-icon" aria-hidden="true" viewBox="0 0 64 64" width={size} height={size} className={cn("shrink-0", className)} {...props}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.top} />
          <stop offset="1" stopColor={t.bottom} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.top} />
          <stop offset="1" stopColor={t.bottom} />
        </linearGradient>
      </defs>
      <path d="M6 14.5C6 11.5 8.5 9 11.5 9h12.6c1.5 0 2.8.6 3.8 1.6l2.4 2.4H52.5C55.5 13 58 15.5 58 18.5V48c0 3-2.5 5.5-5.5 5.5h-41C8.5 53.5 6 51 6 48V14.5Z" fill={`url(#${id}b)`} opacity="0.78" />
      <path d="M6 22.5C6 19.5 8.5 17 11.5 17h41c3 0 5.5 2.5 5.5 5.5V48c0 3-2.5 5.5-5.5 5.5h-41C8.5 53.5 6 51 6 48V22.5Z" fill={`url(#${id}f)`} />
      <path d="M11.5 17.5h41c2.7 0 5 2.2 5 5v.5c-.6-2.3-2.7-4-5-4h-41c-2.3 0-4.4 1.7-5 4v-.5c0-2.8 2.3-5 5-5Z" fill="white" opacity="0.5" />
      <path d="M6 48c0 3 2.5 5.5 5.5 5.5h41c3 0 5.5-2.5 5.5-5.5v-1.5c0 3-2.5 5-5.5 5h-41C8.5 51.5 6 49.5 6 46.5V48Z" fill="black" opacity="0.14" />
    </svg>
  )
}

type FileIconProps = IconProps & {
  /** Extension label drawn on the page, such as "PDF". */
  label?: string
}

/** A sheet of paper with a folded corner and an extension badge. */
function FileIcon({ size = 64, tone = "graphite", label, className, ...props }: FileIconProps) {
  const t = TONES[tone]
  return (
    <svg data-slot="file-icon" aria-hidden="true" viewBox="0 0 64 64" width={size} height={size} className={cn("shrink-0", className)} {...props}>
      <path d="M14 6.5C14 5 15 4 16.5 4H38l12 12v41.5c0 1.5-1 2.5-2.5 2.5h-31C15 60 14 59 14 57.5V6.5Z" className="fill-white dark:fill-neutral-200" />
      <path d="M14 6.5C14 5 15 4 16.5 4H38l12 12v41.5c0 1.5-1 2.5-2.5 2.5h-31C15 60 14 59 14 57.5V6.5Z" fill="none" stroke="black" strokeOpacity="0.2" strokeWidth="1" />
      <path d="M38 4v9c0 1.7 1.3 3 3 3h9L38 4Z" fill="black" fillOpacity="0.12" />
      {label ? (
        <g>
          <rect x="9" y="36" width="34" height="14" rx="3" fill={t.bottom} />
          <text x="26" y="46.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white" fontFamily="ui-sans-serif, system-ui, sans-serif" letterSpacing="0.3">
            {label.slice(0, 4).toUpperCase()}
          </text>
        </g>
      ) : (
        <g stroke="black" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round">
          <path d="M21 28h22M21 35h22M21 42h14" />
        </g>
      )}
    </svg>
  )
}

/** A drive or disk: a slim slab with an indicator light. */
function DriveIcon({ size = 64, className, ...props }: Omit<IconProps, "tone">) {
  const id = React.useId().replace(/:/g, "")
  return (
    <svg data-slot="drive-icon" aria-hidden="true" viewBox="0 0 64 64" width={size} height={size} className={cn("shrink-0", className)} {...props}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.97 0 0)" />
          <stop offset="1" stopColor="oklch(0.71 0.01 286)" />
        </linearGradient>
      </defs>
      <rect x="5" y="22" width="54" height="26" rx="7" fill={`url(#${id})`} />
      <rect x="5" y="22" width="54" height="26" rx="7" fill="none" stroke="black" strokeOpacity="0.22" />
      <rect x="11" y="39" width="26" height="3" rx="1.5" fill="black" fillOpacity="0.18" />
      <circle cx="50" cy="40.5" r="2.5" fill="var(--chart-2)" />
      <path d="M8 26h48" stroke="white" strokeOpacity="0.7" />
    </svg>
  )
}

type AppIconProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Size in pixels. */
  size?: number
  /** Background color. */
  tone?: IconTone
  /** The glyph: an icon, letter or short text, drawn in white. */
  children?: React.ReactNode
}

/** A macOS app icon: a rounded square with a gradient, inner highlight and drop shadow. */
function AppIcon({ size = 64, tone = "blue", className, style, children, ...props }: AppIconProps) {
  const t = TONES[tone]
  return (
    <span
      data-slot="app-icon"
      aria-hidden="true"
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22.4%] text-white shadow-[0_0.06em_0.18em_rgb(0_0_0/0.35),inset_0_0.04em_0_rgb(255_255_255/0.45),inset_0_-0.04em_0_rgb(0_0_0/0.18)] [&_svg]:size-full", className)}
      style={{ width: size, height: size, fontSize: size, background: `linear-gradient(to bottom, ${t.top}, ${t.bottom})`, ...style }}
      {...props}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
      <span className="relative flex items-center justify-center font-semibold" style={{ width: size * 0.5, height: size * 0.5, fontSize: size * 0.42, lineHeight: 1 }}>
        {children}
      </span>
    </span>
  )
}

export { FolderIcon, FileIcon, DriveIcon, AppIcon, type IconTone, type IconProps, type FileIconProps, type AppIconProps }
