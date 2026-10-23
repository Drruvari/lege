import { ArrowRightIcon, CloudSlashIcon } from "@phosphor-icons/react";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ballmac/segmented-control";
import {
  SheetDialog,
  SheetDialogButton,
  SheetDialogClose,
  SheetDialogContent,
  SheetDialogDescription,
  SheetDialogFooter,
  SheetDialogHeader,
  SheetDialogTitle,
} from "@/components/ballmac/sheet-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "../lib/translation";
import {
  DEFAULT_PREFS,
  type HighlightRect,
  type ReaderPreferences,
  type ReaderTheme,
} from "../model/reader-types";
import { MarkColorPicker } from "./selection-toolbar";

export const themes: { value: ReaderTheme; label: string }[] = [
  { value: "paper", label: "Paper" },
  { value: "sepia", label: "Sepia" },
  { value: "night", label: "Night" },
];

function LanguagePair({
  preferences,
  onChange,
}: {
  preferences: ReaderPreferences;
  onChange(patch: Partial<ReaderPreferences>): void;
}) {
  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label="From language"
        className="flex-1"
        value={preferences.sourceLang}
        onChange={(e) => onChange({ sourceLang: e.target.value })}
      >
        {LANGUAGES.map((l) => (
          <NativeSelectOption key={l.code} value={l.code}>
            {l.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <ArrowRightIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <NativeSelect
        aria-label="To language"
        className="flex-1"
        value={preferences.targetLang}
        onChange={(e) => onChange({ targetLang: e.target.value })}
      >
        {LANGUAGES.map((l) => (
          <NativeSelectOption key={l.code} value={l.code}>
            {l.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function SliderField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {display}
        </span>
      </div>
      <Slider
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next as number)}
      />
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  preferences,
  onChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  preferences: ReaderPreferences;
  onChange(patch: Partial<ReaderPreferences>): void;
}) {
  return (
    <SheetDialog open={open} onOpenChange={onOpenChange}>
      <SheetDialogContent className="max-h-[calc(100dvh-1rem)] w-[min(30rem,calc(100%-2rem))] overflow-y-auto">
        <SheetDialogHeader>
          <div>
            <SheetDialogTitle>Reading preferences</SheetDialogTitle>
            <SheetDialogDescription>
              Tune the page until it feels right.
            </SheetDialogDescription>
          </div>
        </SheetDialogHeader>

        <div className="grid gap-3">
          <Label>Theme</Label>
          <SegmentedControl
            value={preferences.theme}
            onValueChange={(value) =>
              onChange({ theme: value as ReaderTheme })
            }
            fullWidth
            aria-label="Reading theme"
          >
            {themes.map((theme) => (
              <SegmentedControlItem
                key={theme.value}
                value={theme.value}
              >
                {theme.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>

        <Separator />

        <div className="grid gap-6">
          <SliderField
            label="Font size"
            value={preferences.fontSize}
            display={`${preferences.fontSize}px`}
            min={14}
            max={26}
            step={1}
            onChange={(fontSize) => onChange({ fontSize })}
          />
          <SliderField
            label="Line spacing"
            value={preferences.lineHeight}
            display={`${preferences.lineHeight.toFixed(1)}×`}
            min={1.3}
            max={2.1}
            step={0.1}
            onChange={(lineHeight) => onChange({ lineHeight })}
          />
          <SliderField
            label="Column width"
            value={preferences.measure}
            display={`${preferences.measure}px`}
            min={480}
            max={860}
            step={20}
            onChange={(measure) => onChange({ measure })}
          />
          <SliderField
            label="PDF zoom"
            value={preferences.pdfZoom}
            display={`${preferences.pdfZoom}%`}
            min={70}
            max={140}
            step={10}
            onChange={(pdfZoom) => onChange({ pdfZoom })}
          />
        </div>

        <Separator />

        <div className="grid gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label>Highlight color</Label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The ink for the next passage you mark.
              </p>
            </div>
            <MarkColorPicker
              value={preferences.highlightColor}
              onChange={(highlightColor) => onChange({ highlightColor })}
              label="Default highlight color"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label>Bookmark color</Label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The ribbon for pages you want to find again.
              </p>
            </div>
            <MarkColorPicker
              value={preferences.bookmarkColor}
              onChange={(bookmarkColor) => onChange({ bookmarkColor })}
              label="Default bookmark color"
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-3">
          <Label>Translate</Label>
          <LanguagePair preferences={preferences} onChange={onChange} />
          <p className="text-xs/relaxed text-muted-foreground">
            Runs in your browser when supported. Otherwise only the selected
            passage is sent to MyMemory.
          </p>
        </div>

        <SheetDialogFooter className="justify-between">
          <SheetDialogButton onClick={() => onChange(DEFAULT_PREFS)}>
            Reset to defaults
          </SheetDialogButton>
          <SheetDialogClose asChild>
            <SheetDialogButton primary>Done</SheetDialogButton>
          </SheetDialogClose>
        </SheetDialogFooter>
      </SheetDialogContent>
    </SheetDialog>
  );
}

export interface NoteDraft {
  id?: string;
  bookId?: string;
  quote: string;
  location: string;
  value: string;
  rects?: HighlightRect[];
}

export function NoteDialog({
  draft,
  onDraftChange,
  onSave,
}: {
  draft: NoteDraft | null;
  onDraftChange(draft: NoteDraft | null): void;
  onSave(): void;
}) {
  return (
    <SheetDialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onDraftChange(null);
      }}
    >
      <SheetDialogContent className="w-[min(32rem,calc(100%-2rem))]">
        <SheetDialogHeader>
          <div>
            <SheetDialogTitle>
              {draft?.id ? "Edit note" : "New note"}
            </SheetDialogTitle>
            <SheetDialogDescription>
              Keep the thought you want to come back to.
            </SheetDialogDescription>
          </div>
        </SheetDialogHeader>
        {draft?.quote && (
          <blockquote className="line-clamp-5 border-l-2 border-brass pl-4 font-reading text-base leading-relaxed text-foreground/75 italic">
            “{draft.quote}”
          </blockquote>
        )}
        <Textarea
          aria-label="Note"
          placeholder="What did this make you think of?"
          className="min-h-32"
          autoFocus
          value={draft?.value ?? ""}
          onChange={(e) =>
            draft && onDraftChange({ ...draft, value: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave();
          }}
        />
        <SheetDialogFooter>
          <SheetDialogClose asChild>
            <SheetDialogButton>Cancel</SheetDialogButton>
          </SheetDialogClose>
          <SheetDialogButton
            primary
            onClick={onSave}
            disabled={!draft?.value.trim() && !draft?.quote}
          >
            Save note
          </SheetDialogButton>
        </SheetDialogFooter>
      </SheetDialogContent>
    </SheetDialog>
  );
}

export interface TranslationState {
  text: string;
  result: string;
  provider: string;
  error: string;
  busy: boolean;
}

export function TranslateDialog({
  translation,
  preferences,
  onChange,
  onClose,
  onTranslate,
}: {
  translation: TranslationState | null;
  preferences: ReaderPreferences;
  onChange(patch: Partial<ReaderPreferences>): void;
  onClose(): void;
  onTranslate(text: string): void;
}) {
  return (
    <SheetDialog
      open={translation !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetDialogContent className="max-h-[calc(100dvh-1rem)] w-[min(32rem,calc(100%-2rem))] overflow-y-auto">
        <SheetDialogHeader>
          <div>
            <SheetDialogTitle>Translate</SheetDialogTitle>
            <SheetDialogDescription>
              Understand a passage without losing your place.
            </SheetDialogDescription>
          </div>
        </SheetDialogHeader>
        <p className="max-h-36 overflow-y-auto rounded-md bg-muted px-4 py-3 font-reading text-base leading-relaxed">
          {translation?.text}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <LanguagePair preferences={preferences} onChange={onChange} />
          </div>
          <Button
            variant="outline"
            className="h-10"
            disabled={translation?.busy}
            onClick={() => translation && onTranslate(translation.text)}
          >
            {translation?.busy ? <Spinner data-icon="inline-start" /> : null}
            {translation?.busy ? "Translating" : "Translate again"}
          </Button>
        </div>
        <div aria-live="polite" className="min-h-20 rounded-md border p-4">
          {translation?.busy && (
            <p className="text-sm text-muted-foreground">
              Translating your selection…
            </p>
          )}
          {translation?.result && (
            <>
              <p className="font-reading text-lg leading-relaxed">
                {translation.result}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                via {translation.provider}
              </p>
            </>
          )}
          {translation?.error && (
            <p className="text-sm text-destructive">{translation.error}</p>
          )}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CloudSlashIcon className="size-4 shrink-0" /> Only the selected passage
          is ever shared.
        </p>
        <SheetDialogFooter>
          <SheetDialogClose asChild>
            <SheetDialogButton primary>Done</SheetDialogButton>
          </SheetDialogClose>
        </SheetDialogFooter>
      </SheetDialogContent>
    </SheetDialog>
  );
}
