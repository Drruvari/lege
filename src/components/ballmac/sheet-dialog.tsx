import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type Container = HTMLElement | null | React.RefObject<HTMLElement | null>

type SheetContextValue = { open: boolean; container?: Container }
const SheetContext = React.createContext<SheetContextValue>({ open: false })

type SheetDialogProps = {
  children: React.ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the sheet opens or closes. */
  onOpenChange?: (open: boolean) => void
  /**
   * The window the sheet attaches to: an element or a ref to one (it should be `relative` and `overflow-hidden`).
   * Without it the sheet attaches to the whole page.
   */
  container?: Container
}

/** A macOS sheet: a panel that drops from the top of its window and dims only that window. */
function SheetDialog({ children, open: openProp, defaultOpen = false, onOpenChange, container }: SheetDialogProps) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const value = React.useMemo(() => ({ open, container }), [open, container])
  return (
    <SheetContext.Provider value={value}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpenState(next)
          onOpenChange?.(next)
        }}
      >
        {children}
      </DialogPrimitive.Root>
    </SheetContext.Provider>
  )
}

function SheetDialogTrigger({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-dialog-trigger" className={className} {...props} />
}

function SheetDialogClose({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-dialog-close" className={className} {...props} />
}

type SheetDialogContentProps = Omit<React.ComponentProps<"div">, "ref" | "title">

function SheetDialogContent({ className, children, ...props }: SheetDialogContentProps) {
  const { open, container } = React.useContext(SheetContext)
  const reduce = useReducedMotion()
  const host = container && "current" in container ? container.current : container
  return (
    <DialogPrimitive.Portal forceMount container={host ?? undefined}>
      <AnimatePresence>
        {open && (
          <>
            {React.createElement(
              DialogPrimitive.Overlay,
              { forceMount: true, asChild: true },
              <motion.div
                data-slot="sheet-dialog-overlay"
                className={cn("z-50 bg-black/25 dark:bg-black/45", host ? "absolute inset-0" : "fixed inset-0")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              />
            )}
            {React.createElement(
              DialogPrimitive.Content,
              { forceMount: true, asChild: true },
              <motion.div
                data-slot="sheet-dialog-content"
                className={cn(
                  "z-50 flex w-[min(28rem,calc(100%-2rem))] flex-col gap-4 rounded-b-[12px] border border-t-0 border-foreground/10 bg-popover/90 p-5 text-popover-foreground shadow-[0_18px_50px_-10px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-150 outline-none [--mac-accent:oklch(0.53_0.2_258)]",
                  host ? "absolute top-0 left-1/2" : "fixed top-0 left-1/2",
                  className
                )}
                style={{ x: "-50%" }}
                initial={reduce ? { opacity: 0 } : { y: "-102%" }}
                animate={reduce ? { opacity: 1 } : { y: 0 }}
                exit={reduce ? { opacity: 0 } : { y: "-102%" }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
                {...(props as object)}
              >
                {children}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  )
}

function SheetDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-dialog-header" className={cn("flex items-start gap-4", className)} {...props} />
}

function SheetDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="sheet-dialog-title" className={cn("text-[15px] leading-5 font-semibold", className)} {...props} />
}

function SheetDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="sheet-dialog-description" className={cn("mt-1 text-[13px] leading-5 text-muted-foreground", className)} {...props} />
}

function SheetDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-dialog-footer" className={cn("flex items-center justify-end gap-2", className)} {...props} />
}

type SheetDialogButtonProps = React.ComponentProps<"button"> & {
  /** The default button: filled with the accent color, and the one Return activates inside a form. */
  primary?: boolean
  /** Destructive default buttons use red. */
  destructive?: boolean
}

/** A macOS push button for sheets. */
function SheetDialogButton({ primary = false, destructive = false, className, type = "button", ...props }: SheetDialogButtonProps) {
  return (
    <button
      type={type}
      data-slot="sheet-dialog-button"
      className={cn(
        "inline-flex h-[22px] min-w-[4.25rem] items-center justify-center rounded-[6px] px-3 text-[13px] outline-none transition-[background-color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
        primary
          ? cn("text-white shadow-[0_0.5px_1px_rgb(0_0_0/0.3),inset_0_0.5px_0_rgb(255_255_255/0.3)] hover:brightness-110", destructive ? "bg-destructive" : "bg-(--mac-accent)")
          : "border border-foreground/10 bg-background/80 shadow-[0_0.5px_1px_rgb(0_0_0/0.15)] hover:bg-background dark:bg-foreground/12 dark:hover:bg-foreground/18",
        className
      )}
      {...props}
    />
  )
}

export {
  SheetDialog,
  SheetDialogTrigger,
  SheetDialogContent,
  SheetDialogHeader,
  SheetDialogTitle,
  SheetDialogDescription,
  SheetDialogFooter,
  SheetDialogClose,
  SheetDialogButton,
  type SheetDialogProps,
  type SheetDialogContentProps,
  type SheetDialogButtonProps,
}
