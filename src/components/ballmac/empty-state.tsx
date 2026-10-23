import * as React from "react"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ballmac/empty"

type EmptyStateProps = Omit<React.ComponentProps<typeof Empty>, "children"> & {
  /** Plain-language explanation of what is missing. */
  title: string
  /** Next-step guidance. */
  description: string
  /** Decorative icon; defaults to an inbox. */
  icon?: React.ReactNode
  /** Primary action, usually a link or button. */
  action?: React.ReactNode
  /** Optional secondary action. */
  secondaryAction?: React.ReactNode
}

function EmptyState({
  className,
  title,
  description,
  icon,
  action,
  secondaryAction,
  ...props
}: EmptyStateProps) {
  return (
    <Empty
      data-slot="empty-state"
      className={cn("bg-card/70", className)}
      {...props}
    >
      <EmptyMedia>{icon ?? <Inbox aria-hidden="true" />}</EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
      {(action || secondaryAction) && (
        <EmptyAction>
          {action}
          {secondaryAction}
        </EmptyAction>
      )}
    </Empty>
  )
}

export { EmptyState, type EmptyStateProps }
