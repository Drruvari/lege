import { useState } from "react";
import { MinusIcon, PlusIcon, TextAaIcon } from "@phosphor-icons/react";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ballmac/segmented-control";
import { IconButton } from "@/components/common/icon-button";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type {
  BookFormat,
  ReaderPreferences,
  ReaderTheme,
  ReaderTypeface,
} from "../model/reader-types";
import { themes } from "./reader-dialogs";

const typefaces: { value: ReaderTypeface; label: string; font: string }[] = [
  { value: "literata", label: "Literata", font: "font-reading" },
  {
    value: "charter",
    label: "Charter",
    font: "font-[Charter,'Iowan_Old_Style',Georgia,serif]",
  },
  { value: "figtree", label: "Figtree", font: "font-sans" },
];

const spacings = [
  { value: 1.5, label: "Snug" },
  { value: 1.7, label: "Even" },
  { value: 1.9, label: "Airy" },
];

const widths = [
  { value: 560, label: "Narrow" },
  { value: 680, label: "Medium" },
  { value: 800, label: "Wide" },
];

function nearest(options: { value: number }[], value: number) {
  return options.reduce((best, option) =>
    Math.abs(option.value - value) < Math.abs(best.value - value)
      ? option
      : best,
  ).value;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; className?: string }[];
  onChange(value: T): void;
}) {
  return (
    <SegmentedControl
      aria-label={label}
      value={String(value)}
      onValueChange={(next) => {
        const match = options.find((o) => String(o.value) === next);
        if (match) onChange(match.value);
      }}
      fullWidth
      size="sm"
    >
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={String(option.value)}
          className={option.className}
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}

/** Quick page controls with a live preview: the book updates as you tap. */
export function ReadingControls({
  format,
  preferences,
  onChange,
  onMore,
}: {
  format: BookFormat;
  preferences: ReaderPreferences;
  onChange(patch: Partial<ReaderPreferences>): void;
  onMore(): void;
}) {
  const [open, setOpen] = useState(false);
  const pdf = format === "pdf";
  const size = pdf ? preferences.pdfZoom : preferences.fontSize;
  const [min, max, step] = pdf ? [70, 140, 10] : [14, 26, 1];
  const setSize = (next: number) => {
    const value = Math.min(max, Math.max(min, next));
    onChange(pdf ? { pdfZoom: value } : { fontSize: value });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <IconButton label="Text and page">
            <TextAaIcon />
          </IconButton>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-76 gap-4 rounded-md p-4 text-sm select-none"
      >
        <PopoverTitle className="sr-only">Text and page</PopoverTitle>

        <Segmented
          label="Reading theme"
          value={preferences.theme}
          options={themes}
          onChange={(theme) => onChange({ theme: theme as ReaderTheme })}
        />

        <Separator />

        <Row label={pdf ? "Zoom" : "Text size"}>
          <div className="flex items-center justify-between rounded-lg bg-muted p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={pdf ? "Zoom out" : "Smaller text"}
              disabled={size <= min}
              onClick={() => setSize(size - step)}
              className="hover:bg-background"
            >
              {pdf ? (
                <MinusIcon />
              ) : (
                <span className="font-reading text-xs">A</span>
              )}
            </Button>
            <span className="text-[0.8125rem] tabular-nums">
              {pdf ? `${size}%` : `${size}px`}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={pdf ? "Zoom in" : "Larger text"}
              disabled={size >= max}
              onClick={() => setSize(size + step)}
              className="hover:bg-background"
            >
              {pdf ? <PlusIcon /> : <span className="font-reading text-lg">A</span>}
            </Button>
          </div>
        </Row>

        {!pdf && (
          <>
            <Row label="Typeface">
              <Segmented
                label="Typeface"
                value={preferences.typeface}
                options={typefaces.map((t) => ({
                  value: t.value,
                  label: t.label,
                  className: t.font,
                }))}
                onChange={(typeface) => onChange({ typeface })}
              />
            </Row>
            <Row label="Line spacing">
              <Segmented
                label="Line spacing"
                value={nearest(spacings, preferences.lineHeight)}
                options={spacings}
                onChange={(lineHeight) => onChange({ lineHeight })}
              />
            </Row>
            <Row label="Page width">
              <Segmented
                label="Page width"
                value={nearest(widths, preferences.measure)}
                options={widths}
                onChange={(measure) => onChange({ measure })}
              />
            </Row>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="-mx-1 -mb-1 justify-center text-muted-foreground"
          onClick={() => {
            setOpen(false);
            onMore();
          }}
        >
          More settings
        </Button>
      </PopoverContent>
    </Popover>
  );
}
