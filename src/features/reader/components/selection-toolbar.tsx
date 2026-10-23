import {
  Copy,
  Highlighter,
  NotePencil,
  Translate,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CapturedSelection } from "../model/reader-types";

interface SelectionToolbarProps {
  selection: CapturedSelection;
  onHighlight(): void;
  onNote(): void;
  onTranslate(): void;
  onCopy(): void;
  onDismiss(): void;
}

const toolClass =
  "text-background/85 hover:bg-background/10 hover:text-background";

export function SelectionToolbar({
  selection,
  onHighlight,
  onNote,
  onTranslate,
  onCopy,
  onDismiss,
}: SelectionToolbarProps) {
  const width = typeof window === "undefined" ? 1200 : window.innerWidth;
  const left = Math.max(170, Math.min(selection.x, width - 170));
  const top = Math.max(64, selection.y - 56);

  return (
    <div
      role="toolbar"
      aria-label="Selected text actions"
      style={{ left, top }}
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-0.5 rounded-md bg-foreground p-1 text-background shadow-xl animate-in fade-in-0 zoom-in-95 max-sm:top-auto! max-sm:bottom-4 max-sm:left-1/2!"
    >
      <Button
        variant="ghost"
        size="sm"
        className={toolClass}
        onClick={onHighlight}
      >
        <Highlighter data-icon="inline-start" /> Highlight
      </Button>
      <Button variant="ghost" size="sm" className={toolClass} onClick={onNote}>
        <NotePencil data-icon="inline-start" /> Note
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={toolClass}
        onClick={onTranslate}
      >
        <Translate data-icon="inline-start" /> Translate
      </Button>
      <Separator
        orientation="vertical"
        className="mx-0.5 my-2 bg-background/20"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Copy text"
        onClick={onCopy}
      >
        <Copy />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  );
}
