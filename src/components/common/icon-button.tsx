import type { ComponentProps, ReactNode } from "react";
import { IconContext } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IconButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "children"
> {
  label: string;
  shortcut?: string;
  active?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}

const regular = { weight: "regular" } as const;
const filled = { weight: "fill" } as const;

export function IconButton({
  label,
  shortcut,
  active,
  side = "bottom",
  variant = "ghost",
  size = "icon",
  children,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size={size}
            aria-label={label}
            aria-pressed={active}
            {...props}
          />
        }
      >
        <IconContext.Provider value={active ? filled : regular}>
          {children}
        </IconContext.Provider>
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}
