import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowRight,
  BookmarkSimple,
  BookOpen,
  CaretLeft,
  CaretRight,
  CircleNotch,
  DownloadSimple,
  Highlighter,
  ListBullets,
  MagnifyingGlass,
  NotePencil,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { cn } from "cn";

import {
  DynamicIsland,
  DynamicIslandView,
} from "@/components/ballmac/dynamic-island";
import {
  MacContextMenu,
  MacContextMenuContent,
  MacContextMenuItem,
  MacContextMenuSeparator,
  MacContextMenuTrigger,
} from "@/components/ballmac/mac-context-menu";
import {
  MacWindow,
  MacWindowContent,
  MacWindowTitleBar,
} from "@/components/ballmac/mac-window";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ballmac/segmented-control";
import { IconButton } from "@/components/common/icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  PAGE_TAP_EVENT,
  type Annotation,
  type BookMeta,
  type ReaderPreferences,
  type TocEntry,
} from "../model/reader-types";
import { ReadingControls } from "./reading-controls";

export type NotesTab = "notes" | "highlights" | "bookmarks";

interface ReaderViewProps {
  book: BookMeta;
  reader: ReactNode;
  bookMenu?: ReactNode;
  shellRef: RefObject<HTMLDivElement | null>;
  toc: TocEntry[];
  notes: Annotation[];
  highlights: Annotation[];
  bookmarks: Annotation[];
  bookmarked: boolean;
  translationBusy: boolean;
  contentsOpen: boolean;
  notesOpen: boolean;
  tab: NotesTab;
  preferences: ReaderPreferences;
  pagesLeft?: number;
  onPreferencesChange(patch: Partial<ReaderPreferences>): void;
  onContentsOpenChange(open: boolean): void;
  onNotesOpenChange(open: boolean): void;
  onTabChange(tab: NotesTab): void;
  onBack(): void;
  onToggleBookmark(): void;
  onOpenSettings(): void;
  onToggleFullscreen(): void;
  onPrev(): void;
  onNext(): void;
  onJump(location: string): void;
  onNewNote(): void;
  onEditNote(note: Annotation): void;
  onDelete(id: string): void;
  onExport(): void;
}

function when(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function ReaderView(props: ReaderViewProps) {
  const {
    book,
    contentsOpen,
    notesOpen,
    onContentsOpenChange,
    onNotesOpenChange,
  } = props;
  const wide = useMediaQuery("(min-width: 1024px)");
  const extraWide = useMediaQuery("(min-width: 1440px)");
  const progress = Math.round(book.progress);
  const pdf = book.format === "pdf";
  const calm = useCalmChrome(contentsOpen || notesOpen);
  const sheetRef = useRef<HTMLDivElement>(null);
  const lastProgress = useRef(book.progress);

  // A short slide in the direction of travel, so a page turn feels like one.
  useEffect(() => {
    const previous = lastProgress.current;
    lastProgress.current = book.progress;
    const sheet = sheetRef.current;
    if (
      pdf ||
      !sheet ||
      previous === book.progress ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const from = book.progress > previous ? 10 : -10;
    sheet.animate(
      [
        { opacity: 0.35, transform: `translateX(${from}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [book.progress, pdf]);

  const chromeClass = cn(
    "transition-opacity duration-500 hover:opacity-100 has-focus-visible:opacity-100 has-data-popup-open:opacity-100",
    calm && "opacity-0",
  );

  const contents = (
    <ContentsPanel
      toc={props.toc}
      current={book.location}
      onClose={!wide ? () => onContentsOpenChange(false) : undefined}
      onJump={(location) => {
        props.onJump(location);
        if (!wide) onContentsOpenChange(false);
      }}
    />
  );
  const notes = (
    <NotesPanel
      {...props}
      onClose={!extraWide ? () => onNotesOpenChange(false) : undefined}
      onJump={(location) => {
        props.onJump(location);
        if (!extraWide) onNotesOpenChange(false);
      }}
    />
  );

  const readingPane = (
    <main className="relative flex h-full min-w-0 flex-1 flex-col">
      {pdf ? (
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-page"
          key={book.id}
        >
          {props.reader}
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 justify-center sm:px-2 sm:pt-1 sm:pb-2">
          <PageTurn direction="prev" onClick={props.onPrev} />
          <div
            ref={sheetRef}
            key={book.id}
            style={{
              maxWidth: `calc(${props.preferences.measure}px + 7rem)`,
            }}
            className="page relative flex w-full min-w-0 flex-initial flex-col bg-page sm:rounded-md"
          >
            {props.reader}
          </div>
          <PageTurn direction="next" onClick={props.onNext} />
        </div>
      )}
      {!pdf && (
        <footer
          className={cn(
            "grid shrink-0 grid-cols-2 items-center gap-x-4 gap-y-1.5 border-t border-foreground/8 px-4 pt-2 pb-3 select-none sm:h-12 sm:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)] sm:py-0",
            chromeClass,
          )}
        >
          <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <ChapterRiver
              toc={props.toc}
              progress={book.progress}
              onJump={props.onJump}
            />
          </div>
          <p className="truncate text-xs text-muted-foreground sm:col-start-1 sm:row-start-1">
            {currentChapter(props.toc, book.progress)?.label ?? book.title}
          </p>
          <p className="truncate text-right text-xs text-muted-foreground tabular-nums sm:col-start-3 sm:row-start-1">
            {pagesLeftLabel(props.pagesLeft)}
            {progress}%
          </p>
        </footer>
      )}
    </main>
  );

  return (
    <div
      ref={props.shellRef}
      className="h-dvh overflow-hidden bg-muted p-0 sm:p-2 fullscreen:p-0"
    >
      <MacWindow
        className="h-full w-full rounded-none sm:rounded-[14px] fullscreen:rounded-none"
        onClose={props.onBack}
        onZoom={props.onToggleFullscreen}
      >
        <MacWindowTitleBar
          className={cn(
            "[&_[data-slot=mac-window-title]]:absolute [&_[data-slot=mac-window-title]]:left-1/2 [&_[data-slot=mac-window-title]]:-translate-x-1/2",
            chromeClass,
          )}
          title={
            <DynamicIsland
              view={props.translationBusy ? "translating" : "reading"}
              className="max-sm:hidden"
            >
              <DynamicIslandView
                value="reading"
                label={`Reading ${book.title}, ${progress}% complete`}
                className="h-9 w-[clamp(8rem,28vw,18rem)] gap-2 px-3 text-xs"
              >
                <BookOpen weight="fill" className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{book.title}</span>
                <span className="tabular-nums text-white/65">{progress}%</span>
              </DynamicIslandView>
              <DynamicIslandView
                value="translating"
                label="Translating selected text"
                className="h-9 gap-2 px-4 text-xs"
              >
                <CircleNotch className="animate-spin" />
                <span>Translating…</span>
              </DynamicIslandView>
            </DynamicIsland>
          }
        >
          <IconButton
            label="Contents"
            active={contentsOpen}
            onClick={() => onContentsOpenChange(!contentsOpen)}
          >
            <ListBullets />
          </IconButton>
          <IconButton
            label={props.bookmarked ? "Remove bookmark" : "Bookmark this page"}
            shortcut="B"
            active={props.bookmarked}
            onClick={props.onToggleBookmark}
          >
            <BookmarkSimple />
          </IconButton>
          <ReadingControls
            format={book.format}
            preferences={props.preferences}
            onChange={props.onPreferencesChange}
            onMore={props.onOpenSettings}
          />
          {props.bookMenu}
          <IconButton
            label="Notes and bookmarks"
            active={notesOpen}
            onClick={() => onNotesOpenChange(!notesOpen)}
          >
            <NotePencil />
          </IconButton>
        </MacWindowTitleBar>

        <MacWindowContent className="flex min-h-0 flex-1 overflow-hidden">
          {wide ? (
            <ResizablePanelGroup orientation="horizontal">
              {contentsOpen && (
                <>
                  <ResizablePanel
                    id="reader-contents"
                    defaultSize={240}
                    minSize={200}
                    maxSize={320}
                  >
                    <aside
                      aria-label="Contents"
                      className="flex h-full min-w-0 flex-col bg-sidebar select-none"
                    >
                      {contents}
                    </aside>
                  </ResizablePanel>
                  <ResizableHandle />
                </>
              )}

              <ResizablePanel id="reader-page" minSize={480}>
                {readingPane}
              </ResizablePanel>

              {extraWide && notesOpen && (
                <>
                  <ResizableHandle />
                  <ResizablePanel
                    id="reader-notes"
                    defaultSize={300}
                    minSize={260}
                    maxSize={380}
                  >
                    <aside
                      aria-label="Notes"
                      className="flex h-full min-w-0 flex-col bg-sidebar select-none"
                    >
                      {notes}
                    </aside>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          ) : (
            readingPane
          )}
        </MacWindowContent>

        {!wide && (
          <Sheet open={contentsOpen} onOpenChange={onContentsOpenChange}>
            <SheetContent
              side="left"
              className="w-[min(85vw,20rem)] bg-sidebar p-0"
              style={{ width: "min(85vw, 20rem)" }}
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">Contents</SheetTitle>
              <SheetDescription className="sr-only">
                Jump to a chapter
              </SheetDescription>
              {contents}
            </SheetContent>
          </Sheet>
        )}
        {!extraWide && (
          <Sheet open={notesOpen} onOpenChange={onNotesOpenChange}>
            <SheetContent
              side="right"
              className="w-[min(90vw,22rem)] bg-sidebar p-0"
              style={{ width: "min(90vw, 22rem)" }}
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">Notes and bookmarks</SheetTitle>
              <SheetDescription className="sr-only">
                Your notes, highlights and bookmarks for this book
              </SheetDescription>
              {notes}
            </SheetContent>
          </Sheet>
        )}
      </MacWindow>
    </div>
  );
}

const CALM_AFTER = 2600;
const EDGE = 96;

/** Bars fade out while you read and return when the pointer nears an edge. */
function useCalmChrome(pinned: boolean) {
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    if (pinned) {
      setCalm(false);
      return;
    }
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCalm(true), CALM_AFTER);
    };
    const wake = () => {
      setCalm(false);
      settle();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (event.clientY < EDGE || event.clientY > window.innerHeight - EDGE)
        wake();
    };
    const onTap = () =>
      setCalm((current) => {
        if (current) settle();
        return !current;
      });
    settle();
    window.addEventListener("pointermove", onMove);
    window.addEventListener(PAGE_TAP_EVENT, onTap);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener(PAGE_TAP_EVENT, onTap);
    };
  }, [pinned]);

  return calm;
}

function PageTurn({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick(): void;
}) {
  const next = direction === "next";
  return (
    <button
      type="button"
      aria-label={next ? "Next page" : "Previous page"}
      onClick={onClick}
      className={cn(
        "group/turn absolute inset-y-0 z-10 flex w-8 items-center justify-center outline-none select-none sm:static sm:w-auto sm:min-w-14 sm:flex-1 sm:basis-0",
        next
          ? "right-0 sm:justify-start sm:pl-3"
          : "left-0 sm:justify-end sm:pr-3",
      )}
    >
      <span className="hidden size-10 items-center justify-center rounded-full text-muted-foreground opacity-0 transition group-hover/turn:bg-foreground/5 group-hover/turn:opacity-100 group-focus-visible/turn:opacity-100 group-focus-visible/turn:ring-2 group-focus-visible/turn:ring-ring sm:flex">
        {next ? <CaretRight /> : <CaretLeft />}
      </span>
    </button>
  );
}

function chapterMarks(toc: TocEntry[]) {
  const placed = toc.filter((entry) => entry.at !== undefined);
  const top = placed.filter((entry) => entry.depth === 0);
  const source = top.length > 1 ? top : placed;
  const seen = new Set<number>();
  return source
    .filter((entry) => !seen.has(entry.at!) && seen.add(entry.at!))
    .sort((a, b) => a.at! - b.at!);
}

function currentChapter(toc: TocEntry[], progress: number) {
  let found: TocEntry | undefined;
  for (const entry of toc)
    if (entry.at !== undefined && entry.at <= progress + 0.001)
      if (!found || entry.at >= found.at!) found = entry;
  return found;
}

function pagesLeftLabel(pages?: number) {
  if (pages === undefined) return "";
  if (pages === 0) return "Last page in chapter · ";
  return `${pages} ${pages === 1 ? "page" : "pages"} left in chapter · `;
}

/** Progress drawn as one segment per chapter: the shape of the book. */
function ChapterRiver({
  toc,
  progress,
  onJump,
}: {
  toc: TocEntry[];
  progress: number;
  onJump(location: string): void;
}) {
  const marks = useMemo(() => chapterMarks(toc), [toc]);

  if (marks.length < 2)
    return (
      <Progress
        value={progress}
        className="h-1 w-full"
        aria-label="Book progress"
      />
    );

  return (
    <nav aria-label="Chapters" className="flex h-5 w-full items-center gap-0.5">
      {marks.map((entry, index) => {
        const start = index === 0 ? 0 : entry.at!;
        const end = marks[index + 1]?.at ?? 100;
        const span = Math.max(end - start, 0.01);
        const fill = Math.min(
          100,
          Math.max(0, ((progress - start) / span) * 100),
        );
        const here = progress >= start && progress < end;
        return (
          <Tooltip key={`${entry.href}-${index}`}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`Go to ${entry.label}`}
                  aria-current={here ? "location" : undefined}
                  onClick={() => onJump(entry.href)}
                  style={{ flexGrow: span }}
                  className="group/seg flex h-5 min-w-1 basis-0 items-center outline-none"
                />
              }
            >
              <span
                className={cn(
                  "block h-1 w-full overflow-hidden rounded-full bg-foreground/10 transition-[height] group-hover/seg:h-2 group-focus-visible/seg:ring-2 group-focus-visible/seg:ring-ring",
                  here && "h-1.5",
                )}
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${fill}%` }}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{entry.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function PanelHeader({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function ContentsPanel({
  toc,
  current,
  onJump,
  onClose,
}: {
  toc: TocEntry[];
  current: string;
  onJump(location: string): void;
  onClose?(): void;
}) {
  const [query, setQuery] = useState("");
  const chapters = useMemo(
    () => toc.filter((entry) => entry.kind !== "page"),
    [toc],
  );
  const pages = useMemo(
    () => toc.filter((entry) => entry.kind === "page"),
    [toc],
  );
  const [preferred, setPreferred] = useState<"chapters" | "pages">("chapters");
  const mode = !chapters.length
    ? "pages"
    : !pages.length
      ? "chapters"
      : preferred;
  const listRef = useRef<HTMLDivElement>(null);

  const term = query.trim().toLowerCase();
  const visibleChapters = term
    ? chapters.filter((entry) => entry.label.toLowerCase().includes(term))
    : chapters;
  const visiblePages = term
    ? pages.filter((entry) => entry.href.startsWith(term.replace(/\D/g, "")))
    : pages;

  const currentPage = Number(current);
  const activeChapter = useMemo(() => {
    if (!Number.isFinite(currentPage) || currentPage < 1)
      return chapters.findIndex((entry) => entry.href === current);
    let index = -1;
    chapters.forEach((entry, i) => {
      if (Number(entry.href) <= currentPage) index = i;
    });
    return index;
  }, [chapters, current, currentPage]);

  useEffect(() => {
    listRef.current
      ?.querySelector("[aria-current]")
      ?.scrollIntoView({ block: "nearest" });
  }, [current, mode, toc.length]);

  const total = mode === "pages" ? pages.length : chapters.length;

  return (
    <>
      <PanelHeader title="Contents" count={total}>
        {onClose && (
          <IconButton label="Close contents" size="icon-sm" onClick={onClose}>
            <X />
          </IconButton>
        )}
      </PanelHeader>
      {chapters.length > 0 && pages.length > 0 && (
        <div className="px-3 pb-2">
          <SegmentedControl
            value={mode}
            onValueChange={(value) => {
              if (value === "chapters" || value === "pages") setPreferred(value);
            }}
            fullWidth
            size="sm"
            aria-label="Contents view"
          >
            <SegmentedControlItem value="chapters">Chapters</SegmentedControlItem>
            <SegmentedControlItem value="pages">Pages</SegmentedControlItem>
          </SegmentedControl>
        </div>
      )}
      {total > 8 && (
        <div className="px-3 pb-2">
          <InputGroup className="h-9">
            <InputGroupAddon>
              <MagnifyingGlass />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={mode === "pages" ? "Find a page" : "Find a chapter"}
              placeholder={mode === "pages" ? "Page number" : "Find a chapter"}
              inputMode={mode === "pages" ? "numeric" : undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div ref={listRef} className="px-2 pb-4">
          {mode === "chapters" ? (
            <nav className="flex flex-col gap-0.5">
              {visibleChapters.map((entry) => {
                const index = chapters.indexOf(entry);
                return (
                  <Button
                    key={`${entry.href}-${index}`}
                    variant="ghost"
                    aria-current={
                      index === activeChapter ? "location" : undefined
                    }
                    onClick={() => onJump(entry.href)}
                    style={{
                      paddingLeft: `${0.75 + Math.min(entry.depth, 2) * 0.875}rem`,
                    }}
                    className="h-auto justify-between gap-3 py-1.5 text-left text-[0.8125rem] leading-snug font-normal whitespace-normal text-muted-foreground [content-visibility:auto] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=location]:bg-primary/10 aria-[current=location]:font-medium aria-[current=location]:text-primary"
                  >
                    <span className="min-w-0">{entry.label}</span>
                    {pages.length > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {entry.href}
                      </span>
                    )}
                  </Button>
                );
              })}
            </nav>
          ) : (
            <nav className="grid grid-cols-4 gap-1">
              {visiblePages.map((entry) => (
                <Button
                  key={entry.href}
                  variant="ghost"
                  size="sm"
                  aria-label={entry.label}
                  aria-current={entry.href === current ? "location" : undefined}
                  onClick={() => onJump(entry.href)}
                  className="font-normal text-sidebar-foreground/80 tabular-nums [content-visibility:auto] [contain-intrinsic-size:auto_2rem] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=location]:bg-primary aria-[current=location]:font-medium aria-[current=location]:text-primary-foreground"
                >
                  {entry.href}
                </Button>
              ))}
            </nav>
          )}
          {toc.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Chapters appear here once the book has loaded.
            </p>
          )}
          {toc.length > 0 &&
            (mode === "pages" ? visiblePages : visibleChapters).length ===
              0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Nothing matches “{query}”.
              </p>
            )}
        </div>
      </ScrollArea>
    </>
  );
}

function AnnotationContextMenu({
  item,
  bookmark = false,
  onJump,
  onEdit,
  onDelete,
  children,
}: {
  item: Annotation;
  bookmark?: boolean;
  onJump(): void;
  onEdit?(): void;
  onDelete(): void;
  children: ReactNode;
}) {
  return (
    <MacContextMenu>
      <MacContextMenuTrigger className="block">
        {children}
      </MacContextMenuTrigger>
      <MacContextMenuContent>
        <MacContextMenuItem icon={<ArrowRight />} onSelect={onJump}>
          Go to {bookmark ? "bookmark" : "passage"}
        </MacContextMenuItem>
        {onEdit && (
          <MacContextMenuItem icon={<NotePencil />} onSelect={onEdit}>
            {item.note ? "Edit note" : "Add note"}
          </MacContextMenuItem>
        )}
        <MacContextMenuSeparator />
        <MacContextMenuItem destructive icon={<Trash />} onSelect={onDelete}>
          Delete {bookmark ? "bookmark" : "annotation"}
        </MacContextMenuItem>
      </MacContextMenuContent>
    </MacContextMenu>
  );
}

function NotesPanel({
  book,
  notes,
  highlights,
  bookmarks,
  tab,
  onTabChange,
  onJump,
  onNewNote,
  onEditNote,
  onDelete,
  onExport,
  onToggleBookmark,
  onClose,
}: ReaderViewProps & { onClose?(): void }) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as NotesTab)}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <div className="shrink-0 border-b border-foreground/8 px-3 py-2">
        <div className="mb-2 flex h-7 items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Annotations</h2>
          <div className="flex items-center">
            <IconButton
              label="Export annotations"
              size="icon-sm"
              onClick={onExport}
              disabled={notes.length + highlights.length + bookmarks.length === 0}
            >
              <DownloadSimple />
            </IconButton>
            <IconButton label="New note" size="icon-sm" onClick={onNewNote}>
              <Plus />
            </IconButton>
            {onClose && (
              <IconButton
                label="Close annotations"
                size="icon-sm"
                onClick={onClose}
              >
                <X />
              </IconButton>
            )}
          </div>
        </div>
        <SegmentedControl
          value={tab}
          onValueChange={(value) => onTabChange(value as NotesTab)}
          size="sm"
          fullWidth
          aria-label="Annotations view"
        >
          <SegmentedControlItem value="notes" className="px-2">
            Notes
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {notes.length}
            </span>
          </SegmentedControlItem>
          <SegmentedControlItem value="highlights" className="px-2">
            Highlights
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {highlights.length}
            </span>
          </SegmentedControlItem>
          <SegmentedControlItem value="bookmarks" className="px-2">
            Bookmarks
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {bookmarks.length}
            </span>
          </SegmentedControlItem>
        </SegmentedControl>
      </div>

      <TabsContent value="notes" className="min-h-0 animate-none">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-3 px-3 pb-4">
            {notes.length === 0 ? (
              <PanelEmpty
                icon={<Highlighter />}
                title="No notes yet"
                description="Select text in the book to highlight it or add a note."
                action={
                  <Button variant="outline" size="sm" onClick={onNewNote}>
                    Write a note
                  </Button>
                }
              />
            ) : (
              notes.map((item) => (
                <AnnotationContextMenu
                  key={item.id}
                  item={item}
                  onJump={() => onJump(item.location)}
                  onEdit={() => onEditNote(item)}
                  onDelete={() => onDelete(item.id)}
                >
                <article
                  className="group/note border-t border-foreground/10 py-4 text-sm first:border-t-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        item.kind === "highlight" ? "brass" : "secondary"
                      }
                      className="h-5 px-2 text-[0.7rem]"
                    >
                      {item.kind === "highlight" ? "Highlight" : "Note"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {when(item.createdAt)}
                    </span>
                  </div>
                  {item.quote && (
                    <button
                      type="button"
                      onClick={() => onJump(item.location)}
                      className="mt-2.5 line-clamp-4 w-full text-left font-reading text-[0.95rem] leading-relaxed italic hover:text-primary"
                    >
                      “{item.quote}”
                    </button>
                  )}
                  {item.note && (
                    <p className="mt-2 leading-relaxed text-foreground/75">
                      {item.note}
                    </p>
                  )}
                  <div className="mt-2 -mb-1 flex items-center justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/note:opacity-100 lg:group-focus-within/note:opacity-100">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onJump(item.location)}
                    >
                      Go to passage <ArrowRight data-icon="inline-end" />
                    </Button>
                    <IconButton
                      label={item.note ? "Edit note" : "Add a note"}
                      size="icon-xs"
                      onClick={() => onEditNote(item)}
                    >
                      <NotePencil />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      size="icon-xs"
                      className="hover:text-destructive"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash />
                    </IconButton>
                  </div>
                </article>
                </AnnotationContextMenu>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="highlights" className="min-h-0 animate-none">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-3 px-3 pb-4">
            {highlights.length === 0 ? (
              <PanelEmpty
                icon={<Highlighter />}
                title="No highlights yet"
                description="Select text in the book to save an important passage."
                action={
                  <Button variant="outline" size="sm" onClick={onNewNote}>
                    Write a note
                  </Button>
                }
              />
            ) : (
              highlights.map((item) => (
                <AnnotationContextMenu
                  key={item.id}
                  item={item}
                  onJump={() => onJump(item.location)}
                  onEdit={() => onEditNote(item)}
                  onDelete={() => onDelete(item.id)}
                >
                  <article className="group/note border-t border-foreground/10 py-4 text-sm first:border-t-0">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="brass"
                        className="h-5 px-2 text-[0.7rem]"
                      >
                        Highlight
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {when(item.createdAt)}
                      </span>
                    </div>
                    {item.quote && (
                      <button
                        type="button"
                        onClick={() => onJump(item.location)}
                        className="mt-2.5 line-clamp-5 w-full text-left font-reading text-[0.95rem] leading-relaxed italic hover:text-primary"
                      >
                        “{item.quote}”
                      </button>
                    )}
                    {item.note && (
                      <p className="mt-2 leading-relaxed text-foreground/75">
                        {item.note}
                      </p>
                    )}
                    <div className="mt-2 -mb-1 flex items-center justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/note:opacity-100 lg:group-focus-within/note:opacity-100">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onJump(item.location)}
                      >
                        Go to passage <ArrowRight data-icon="inline-end" />
                      </Button>
                      <IconButton
                        label={item.note ? "Edit note" : "Add a note"}
                        size="icon-xs"
                        onClick={() => onEditNote(item)}
                      >
                        <NotePencil />
                      </IconButton>
                      <IconButton
                        label="Delete"
                        size="icon-xs"
                        className="hover:text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  </article>
                </AnnotationContextMenu>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="bookmarks" className="min-h-0 animate-none">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 px-3 pb-4">
            {bookmarks.length === 0 ? (
              <PanelEmpty
                icon={<BookmarkSimple />}
                title="No bookmarks yet"
                description="Bookmark a page to come back to it later. Press B anytime."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleBookmark}
                  >
                    Bookmark this page
                  </Button>
                }
              />
            ) : (
              bookmarks.map((item) => (
                <AnnotationContextMenu
                  key={item.id}
                  item={item}
                  bookmark
                  onJump={() => onJump(item.location)}
                  onDelete={() => onDelete(item.id)}
                >
                <div
                  className="flex items-center gap-1 border-t border-foreground/10 py-2 pl-1 first:border-t-0"
                >
                  <BookmarkSimple
                    weight="fill"
                    className="size-4 shrink-0 text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => onJump(item.location)}
                    className="min-w-0 flex-1 px-2 py-1.5 text-left text-sm"
                  >
                    <span className="block truncate font-medium">
                      {book.format === "pdf"
                        ? `Page ${item.location}`
                        : "Saved position"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {when(item.createdAt)}
                    </span>
                  </button>
                  <IconButton
                    label="Remove bookmark"
                    size="icon-sm"
                    onClick={() => onDelete(item.id)}
                  >
                    <X />
                  </IconButton>
                </div>
                </AnnotationContextMenu>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

function PanelEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Empty className="mt-6 gap-4 p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="font-sans text-sm font-semibold">
          {title}
        </EmptyTitle>
        <EmptyDescription className="font-sans text-sm not-italic">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  );
}
