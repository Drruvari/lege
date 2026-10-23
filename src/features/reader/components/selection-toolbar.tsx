import {
  CopyIcon,
  HighlighterIcon,
  NotePencilIcon,
  TranslateIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MARK_COLORS,
  MARK_COLOR_ORDER,
  type MarkColor,
} from "../model/mark-colors";
import type { CapturedSelection } from "../model/reader-types";

interface SelectionToolbarProps {
  selection: CapturedSelection;
  color: MarkColor;
  onColor(color: MarkColor): void;
  onHighlight(): void;
  onNote(): void;
  onTranslate(): void;
  onCopy(): void;
  onDismiss(): void;
}

const toolClass =
  "text-background/85 hover:bg-background/10 hover:text-background";

export function MarkColorPicker({
  value,
  onChange,
  label,
  className,
}: {
  value: MarkColor;
  onChange(color: MarkColor): void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex items-center gap-1.5", className)}
    >
      {MARK_COLOR_ORDER.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={MARK_COLORS[color].label}
            onClick={() => onChange(color)}
            className={cn(
              "size-4 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
              selected && "ring-2 ring-current",
            )}
            style={{ background: MARK_COLORS[color].fill }}
          />
        );
      })}
    </div>
  );
}

export function AnnotationMenu({
  x,
  y,
  hasNote,
  color,
  onColor,
  onNote,
  onCopy,
  onTranslate,
  onDelete,
  onDismiss,
}: {
  x: number;
  y: number;
  hasNote: boolean;
  color: MarkColor;
  onColor(color: MarkColor): void;
  onNote(): void;
  onCopy(): void;
  onTranslate(): void;
  onDelete(): void;
  onDismiss(): void;
}) {
  const width = typeof window === "undefined" ? 1200 : window.innerWidth;
  const left = Math.max(180, Math.min(x, width - 180));
  const below = y < 112;

  return (
    <div
      role="menu"
      aria-label="Highlight actions"
      data-annotation-menu=""
      style={{ left, top: below ? y + 12 : y - 8 }}
      onMouseDown={(event) => event.preventDefault()}
      className={`fixed z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-md bg-foreground p-1.5 text-background shadow-xl ${below ? "" : "-translate-y-full"}`}
    >
      <MarkColorPicker
        value={color}
        onChange={onColor}
        label="Highlight color"
        className="px-1"
      />
      <Separator orientation="vertical" className="mx-0.5 my-1 bg-background/20" />
      <Button variant="ghost" size="sm" className={toolClass} onClick={onNote}>
        <NotePencilIcon data-icon="inline-start" /> {hasNote ? "Edit note" : "Add note"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={toolClass}
        onClick={onTranslate}
      >
        <TranslateIcon data-icon="inline-start" /> Translate
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Copy passage"
        onClick={onCopy}
      >
        <CopyIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Remove highlight"
        onClick={onDelete}
      >
        <TrashIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Close"
        onClick={onDismiss}
      >
        <XIcon />
      </Button>
    </div>
  );
}

export function SelectionToolbar({
  selection,
  color,
  onColor,
  onHighlight,
  onNote,
  onTranslate,
  onCopy,
  onDismiss,
}: SelectionToolbarProps) {
  const width = typeof window === "undefined" ? 1200 : window.innerWidth;
  const left = Math.max(190, Math.min(selection.x, width - 190));
  const top = Math.max(72, selection.y - 64);

  return (
    <div
      role="toolbar"
      aria-label="Selected text actions"
      data-selection-toolbar=""
      style={{ left, top }}
      onMouseDown={(event) => event.preventDefault()}
      className="fixed z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-md bg-foreground p-1.5 text-background shadow-xl animate-in fade-in-0 zoom-in-95 max-sm:top-auto! max-sm:bottom-4 max-sm:left-1/2!"
    >
      <MarkColorPicker
        value={color}
        onChange={onColor}
        label="Highlight color"
        className="px-1"
      />
      <Separator orientation="vertical" className="mx-0.5 my-1 bg-background/20" />
      <Button
        variant="ghost"
        size="sm"
        className={toolClass}
        onClick={onHighlight}
      >
        <HighlighterIcon data-icon="inline-start" /> Highlight
      </Button>
      <Button variant="ghost" size="sm" className={toolClass} onClick={onNote}>
        <NotePencilIcon data-icon="inline-start" /> Note
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={toolClass}
        onClick={onTranslate}
      >
        <TranslateIcon data-icon="inline-start" /> Translate
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Copy text"
        onClick={onCopy}
      >
        <CopyIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={toolClass}
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <XIcon />
      </Button>
    </div>
  );
}
