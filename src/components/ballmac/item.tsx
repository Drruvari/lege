import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

type ItemGroupProps = React.ComponentProps<"div">;
/** A vertical stack of items. Pass `role="list"` here and `role="listitem"` on each non-link item when the rows are a real list. */
function ItemGroup({ className, ...props }: ItemGroupProps) {
  return (
    <div
      data-slot="item-group"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    />
  );
}

type ItemSeparatorProps = React.ComponentProps<"div">;
function ItemSeparator({ className, ...props }: ItemSeparatorProps) {
  return (
    <div
      data-slot="item-separator"
      aria-hidden="true"
      className={cn("h-px w-full bg-border", className)}
      {...props}
    />
  );
}

const itemVariants = cva(
  "group/item flex w-full flex-wrap items-center rounded-lg border text-sm outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 [a&]:hover:bg-accent/60 [button&]:hover:bg-accent/60 [a&]:cursor-pointer [button&]:cursor-pointer [button&]:text-start",
  {
    variants: {
      variant: {
        default: "border-transparent",
        outline: "border-border bg-card",
        muted: "border-transparent bg-muted/50",
      },
      size: {
        default: "gap-4 p-4",
        sm: "gap-3 px-3 py-2.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ItemProps = React.ComponentProps<"div"> &
  VariantProps<typeof itemVariants> & {
    /** Render the child (a link or button) with item styles and behavior. */
    asChild?: boolean;
  };
function Item({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ItemProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size }), className)}
      {...props}
    />
  );
}

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-9 rounded-lg border bg-muted [&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-lg [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type ItemMediaProps = React.ComponentProps<"div"> &
  VariantProps<typeof itemMediaVariants>;
function ItemMedia({ className, variant = "default", ...props }: ItemMediaProps) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant }), className)}
      {...props}
    />
  );
}

type ItemContentProps = React.ComponentProps<"div">;
function ItemContent({ className, ...props }: ItemContentProps) {
  return (
    <div
      data-slot="item-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

type ItemTitleProps = React.ComponentProps<"div">;
function ItemTitle({ className, ...props }: ItemTitleProps) {
  return (
    <div
      data-slot="item-title"
      className={cn("flex w-fit max-w-full items-center gap-2 text-sm leading-snug font-medium", className)}
      {...props}
    />
  );
}

type ItemDescriptionProps = React.ComponentProps<"p">;
function ItemDescription({ className, ...props }: ItemDescriptionProps) {
  return (
    <p
      data-slot="item-description"
      className={cn("line-clamp-2 text-sm leading-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

type ItemActionsProps = React.ComponentProps<"div">;
function ItemActions({ className, ...props }: ItemActionsProps) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

type ItemHeaderProps = React.ComponentProps<"div">;
function ItemHeader({ className, ...props }: ItemHeaderProps) {
  return (
    <div
      data-slot="item-header"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

type ItemFooterProps = React.ComponentProps<"div">;
function ItemFooter({ className, ...props }: ItemFooterProps) {
  return (
    <div
      data-slot="item-footer"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
  itemVariants,
  type ItemProps,
  type ItemGroupProps,
  type ItemSeparatorProps,
  type ItemMediaProps,
  type ItemContentProps,
  type ItemTitleProps,
  type ItemDescriptionProps,
  type ItemActionsProps,
  type ItemHeaderProps,
  type ItemFooterProps,
};
