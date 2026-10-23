import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"

/** Marks which child of a `Slot` is the element to render, when the slot adds siblings around it (a badge's dot, a button's icon). */
export function Slottable({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const isSlottable = (child: React.ReactNode): child is React.ReactElement<{ children: React.ReactNode }> => React.isValidElement(child) && child.type === Slottable

type SlotProps = React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode; ref?: React.Ref<HTMLElement> }

const setRef = (ref: React.Ref<unknown> | undefined, value: unknown) => {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as React.RefObject<unknown>).current = value
}

/**
 * Renders its one child element with its own props added to it: classes joined, styles merged, event handlers all called. It is how `asChild` works
 * without Radix UI. Base UI's own parts take a `render` prop for the same job.
 */
export function Slot({ children, ref, ...slotProps }: SlotProps) {
  const list = React.Children.toArray(children)
  const slottable = list.find(isSlottable)
  const element = slottable ? React.Children.toArray(slottable.props.children)[0] : list[0]
  if (!React.isValidElement<Record<string, unknown> & { ref?: React.Ref<unknown> }>(element)) return null
  const childRef = element.props.ref
  const merged = mergeProps(slotProps as Record<string, unknown>, element.props) as Record<string, unknown>
  const content = slottable ? list.map((c) => (c === slottable ? (element.props.children as React.ReactNode) : c)) : (element.props.children as React.ReactNode)
  return React.cloneElement(element, { ...merged, ref: (node: unknown) => (setRef(ref as React.Ref<unknown>, node), setRef(childRef, node)) } as never, content as never)
}
