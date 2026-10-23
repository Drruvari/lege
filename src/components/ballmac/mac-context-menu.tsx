"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon } from "lucide-react"
import { ContextMenu as Primitive } from "radix-ui"

import { cn } from "@/lib/utils"

const content =
  "z-50 min-w-[13.5rem] overflow-hidden rounded-[10px] border border-foreground/10 bg-popover/80 p-1.5 text-[13px] text-popover-foreground shadow-[0_12px_40px_-8px_rgb(0_0_0/0.35),0_2px_8px_rgb(0_0_0/0.12)] backdrop-blur-2xl backdrop-saturate-150 outline-none dark:bg-popover/70 [--mac-accent:oklch(0.53_0.2_258)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none"

const item =
  "relative flex h-[22px] cursor-default items-center gap-2 rounded-[5px] pe-2.5 ps-[22px] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:text-foreground/35 data-[highlighted]:bg-(--mac-accent) data-[highlighted]:text-white [&_svg]:size-3.5 [&_svg]:shrink-0"

function MacContextMenu(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />
}

function MacContextMenuTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="mac-context-menu-trigger" className={className} {...props} />
}

function MacContextMenuContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content data-slot="mac-context-menu-content" collisionPadding={8} className={cn(content, className)} {...props} />
    </Primitive.Portal>
  )
}

type MacContextMenuItemProps = React.ComponentProps<typeof Primitive.Item> & {
  /** Leading icon, drawn in the left gutter. */
  icon?: React.ReactNode
  /** Key equivalent shown at the right, such as ⌘C. */
  shortcut?: string
  /** Destructive items turn red until highlighted. */
  destructive?: boolean
}

function MacContextMenuItem({ icon, shortcut, destructive, className, children, ...props }: MacContextMenuItemProps) {
  return (
    <Primitive.Item data-slot="mac-context-menu-item" data-destructive={destructive ? "" : undefined} className={cn(item, icon && "ps-[30px]", destructive && "text-destructive data-[highlighted]:text-white", className)} {...props}>
      {icon && <span aria-hidden="true" className="absolute start-2 flex items-center">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <MacContextMenuShortcut>{shortcut}</MacContextMenuShortcut>}
    </Primitive.Item>
  )
}

function MacContextMenuCheckboxItem({ className, children, shortcut, ...props }: React.ComponentProps<typeof Primitive.CheckboxItem> & { shortcut?: string }) {
  return (
    <Primitive.CheckboxItem data-slot="mac-context-menu-checkbox-item" className={cn(item, className)} {...props}>
      <Primitive.ItemIndicator className="absolute start-1.5 flex items-center">
        <CheckIcon aria-hidden="true" strokeWidth={3} />
      </Primitive.ItemIndicator>
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <MacContextMenuShortcut>{shortcut}</MacContextMenuShortcut>}
    </Primitive.CheckboxItem>
  )
}

function MacContextMenuRadioGroup(props: React.ComponentProps<typeof Primitive.RadioGroup>) {
  return <Primitive.RadioGroup {...props} />
}

function MacContextMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem data-slot="mac-context-menu-radio-item" className={cn(item, className)} {...props}>
      <Primitive.ItemIndicator className="absolute start-1.5 flex items-center">
        <CheckIcon aria-hidden="true" strokeWidth={3} />
      </Primitive.ItemIndicator>
      <span className="flex-1 truncate">{children}</span>
    </Primitive.RadioItem>
  )
}

function MacContextMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label data-slot="mac-context-menu-label" className={cn("px-[22px] pt-1 pb-0.5 text-[11px] font-semibold text-muted-foreground", className)} {...props} />
}

function MacContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator data-slot="mac-context-menu-separator" className={cn("mx-2.5 my-1 h-px bg-foreground/12", className)} {...props} />
}

function MacContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="mac-context-menu-shortcut" aria-hidden="true" className={cn("ms-6 text-[12px] tracking-wide text-muted-foreground group-data-[highlighted]:text-white/80 [[data-highlighted]_&]:text-white/80", className)} {...props} />
}

function MacContextMenuSub(props: React.ComponentProps<typeof Primitive.Sub>) {
  return <Primitive.Sub {...props} />
}

function MacContextMenuSubTrigger({ className, children, icon, ...props }: React.ComponentProps<typeof Primitive.SubTrigger> & { icon?: React.ReactNode }) {
  return (
    <Primitive.SubTrigger data-slot="mac-context-menu-sub-trigger" className={cn(item, icon && "ps-[30px]", "data-[state=open]:bg-foreground/10", className)} {...props}>
      {icon && <span aria-hidden="true" className="absolute start-2 flex items-center">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      <ChevronRightIcon aria-hidden="true" className="ms-4 -me-1 rtl:rotate-180" strokeWidth={2.5} />
    </Primitive.SubTrigger>
  )
}

function MacContextMenuSubContent({ className, ...props }: React.ComponentProps<typeof Primitive.SubContent>) {
  return (
    <Primitive.Portal>
      <Primitive.SubContent data-slot="mac-context-menu-sub-content" collisionPadding={8} className={cn(content, "shadow-lg", className)} {...props} />
    </Primitive.Portal>
  )
}

export {
  MacContextMenu,
  MacContextMenuTrigger,
  MacContextMenuContent,
  MacContextMenuItem,
  MacContextMenuCheckboxItem,
  MacContextMenuRadioGroup,
  MacContextMenuRadioItem,
  MacContextMenuLabel,
  MacContextMenuSeparator,
  MacContextMenuShortcut,
  MacContextMenuSub,
  MacContextMenuSubTrigger,
  MacContextMenuSubContent,
  type MacContextMenuItemProps,
}
