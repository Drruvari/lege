import {
  forwardRef,
  type ComponentProps,
  type CSSProperties,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Document, Page } from "react-pdf";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { markFill, markWash, type MarkColor } from "../model/mark-colors";
import type {
  Annotation,
  CapturedSelection,
  HighlightRect,
  ReaderHandle,
  ReaderPreferences,
  TocEntry,
} from "../model/reader-types";
import { pdfjs } from "../lib/pdfjs";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

const IMAGE_OPS = new Set([
  pdfjs.OPS.paintImageXObject,
  pdfjs.OPS.paintImageXObjectRepeat,
  pdfjs.OPS.paintInlineImageXObject,
  pdfjs.OPS.paintInlineImageXObjectGroup,
]);

/** True when painted images cover most of the page, as on a cover. */
async function pageIsMostlyPicture(pdfPage: {
  getViewport(params: { scale: number }): { width: number; height: number };
  getOperatorList(): Promise<{ fnArray: number[]; argsArray: unknown[] }>;
}) {
  const view = pdfPage.getViewport({ scale: 1 });
  const pageArea = view.width * view.height;
  if (pageArea <= 0) return false;
  const ops = await pdfPage.getOperatorList();
  const stack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  let imageArea = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === pdfjs.OPS.save) stack.push(ctm.slice());
    else if (fn === pdfjs.OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === pdfjs.OPS.transform && Array.isArray(args)) {
      const m = args.length === 6 ? (args as number[]) : (args[0] as number[]);
      if (!Array.isArray(m) || m.length < 6) continue;
      const [a, b, c, d, e, f] = ctm;
      ctm = [
        a * m[0] + c * m[1],
        b * m[0] + d * m[1],
        a * m[2] + c * m[3],
        b * m[2] + d * m[3],
        a * m[4] + c * m[5] + e,
        b * m[4] + d * m[5] + f,
      ];
    } else if (IMAGE_OPS.has(fn)) {
      imageArea += Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
    }
  }
  const share = imageArea / pageArea;
  return share > 0.45 && share < 4;
}

interface Props {
  file: Blob;
  initialLocation: string;
  preferences: ReaderPreferences;
  annotations: Annotation[];
  onProgress(location: string, progress: number, totalPages?: number): void;
  onToc(items: TocEntry[]): void;
  onSelection(selection: CapturedSelection): void;
  onOpenMark?(id: string, x: number, y: number): void;
  onDismissSelection(): void;
}

export const PdfReader = forwardRef<ReaderHandle, Props>(function PdfReader(
  {
    file,
    initialLocation,
    preferences,
    annotations,
    onProgress,
    onToc,
    onSelection,
    onOpenMark,
    onDismissSelection,
  },
  ref,
) {
  const [page, setPage] = useState(Math.max(1, Number(initialLocation) || 1));
  const [count, setCount] = useState(0);
  const [aspect, setAspect] = useState(1.55);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [entry, setEntry] = useState("");
  const [data, setData] = useState<Uint8Array | null>(null);
  const [loadError, setLoadError] = useState("");
  const [picture, setPicture] = useState(false);
  const [recovered, setRecovered] = useState<Record<string, HighlightRect[]>>(
    {},
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pageShellRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(page);
  const countRef = useRef(count);
  const annotationsRef = useRef(annotations);
  const progressRef = useRef(onProgress);
  const onSelectionRef = useRef(onSelection);
  const markRef = useRef(onOpenMark);
  const dismissRef = useRef(onDismissSelection);

  useEffect(() => {
    pageRef.current = page;
    countRef.current = count;
    annotationsRef.current = annotations;
    progressRef.current = onProgress;
    onSelectionRef.current = onSelection;
    markRef.current = onOpenMark;
    dismissRef.current = onDismissSelection;
  }, [annotations, count, onDismissSelection, onOpenMark, onProgress, onSelection, page]);

  // Read the bytes once. A blob URL is revoked by React StrictMode's setup
  // cleanup before PDF.js can fetch it, which looks like a damaged file.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoadError("");
    file.arrayBuffer().then(
      (buffer) => {
        if (!cancelled) setData(new Uint8Array(buffer));
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not read this file.",
          );
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [file]);

  const documentFile = useMemo(() => (data ? { data } : null), [data]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([record]) => {
      const next = {
        width: Math.round(record.contentRect.width),
        height: Math.round(record.contentRect.height),
      };
      setFrame((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      next: () => setPage((p) => Math.min(countRef.current || p + 1, p + 1)),
      prev: () => setPage((p) => Math.max(1, p - 1)),
      goTo: (location: string) =>
        setPage(
          Math.min(
            countRef.current || Infinity,
            Math.max(1, Number(location) || 1),
          ),
        ),
      getLocation: () => String(pageRef.current),
    }),
    [],
  );

  useEffect(() => {
    if (!count) return;
    progressRef.current(
      String(page),
      count === 1 ? 100 : ((page - 1) / (count - 1)) * 100,
      count,
    );
  }, [page, count]);

  // PDF.js drops the `selecting` class on mouseup, which can shrink the range
  // to a single word. Read it on the way down, before that happens.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const capture = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, input, textarea, a, form, .pdf-highlight")
      )
        return;
      const next = readSelection(pageShellRef.current, pageRef.current);
      if (next) onSelectionRef.current(next);
      else dismissRef.current();
    };
    node.addEventListener("pointerup", capture, true);
    return () => node.removeEventListener("pointerup", capture, true);
  }, []);

  const onTextLayer = useCallback(() => {
    const shell = pageShellRef.current;
    if (!shell) return;
    const next: Record<string, HighlightRect[]> = {};
    for (const item of annotationsRef.current) {
      if (item.kind === "bookmark" || !item.quote) continue;
      if (item.location !== String(pageRef.current)) continue;
      const rects = rectsForQuote(shell, item.quote);
      if (rects.length) next[item.id] = rects;
    }
    setRecovered((current) => (sameMarks(current, next) ? current : next));
  }, []);

  const previousPage = useRef(page);
  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    dismissRef.current();
  }, [page]);

  useEffect(() => {
    onTextLayer();
  }, [annotations, onTextLayer, page]);

  const zoom = preferences.pdfZoom / 100;
  const fit =
    frame.width > 0 && frame.height > 0
      ? Math.min(frame.width, frame.height / aspect)
      : 0;
  const pageWidth =
    fit > 0 ? Math.max(240, Math.round((fit * zoom) / 4) * 4) : 0;

  const marks = marksForPage(annotations, recovered, page);

  const move = (direction: number) =>
    setPage((current) =>
      Math.max(1, Math.min(count || current, current + direction)),
    );

  const status = (text: string) => (
    <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner /> {text}
    </div>
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      ref={containerRef}
    >
      <div
        ref={stageRef}
        className="flex min-h-0 flex-1 justify-center overflow-auto px-4 pt-6 pb-16 sm:px-6 sm:pt-8"
      >
        <div className="pdf-page-wrap my-auto flex w-full justify-center">
          {loadError ? (
            <div className="flex min-h-80 max-w-md flex-col items-center justify-center gap-2 px-6 text-center text-sm text-destructive">
              <p>Could not open this PDF.</p>
              <p className="text-muted-foreground">{loadError}</p>
            </div>
          ) : (
            documentFile &&
            pageWidth > 0 && (
              <Document
                file={documentFile}
                suspense={false}
                loading={status("Opening your PDF…")}
                onLoadError={(error) => setLoadError(error.message)}
                onLoadSuccess={(pdf) => {
                  const pages = pageEntries(pdf.numPages);
                  setCount(pdf.numPages);
                  onToc(pages);
                  setPage((p) => Math.min(p, pdf.numPages));
                  void outlineEntries(pdf).then((chapters) => {
                    if (chapters.length) onToc([...chapters, ...pages]);
                  });
                }}
              >
                <div
                  ref={pageShellRef}
                  className={
                    picture ? "pdf-picture relative w-fit" : "relative w-fit"
                  }
                >
                  <Page
                    pageNumber={page}
                    width={pageWidth}
                    devicePixelRatio={Math.min(2, window.devicePixelRatio || 1)}
                    loading={status("Rendering page…")}
                    onLoadSuccess={(pdfPage) => {
                      const viewport = pdfPage.getViewport({ scale: 1 });
                      if (viewport.width <= 0) return;
                      const next = viewport.height / viewport.width;
                      setAspect((current) =>
                        Math.abs(current - next) < 0.01 ? current : next,
                      );
                      const shown = pdfPage.pageNumber;
                      setPicture(false);
                      void pageIsMostlyPicture(pdfPage).then(
                        (mostlyPicture) => {
                          if (pageRef.current === shown)
                            setPicture(mostlyPicture);
                        },
                        () => {},
                      );
                    }}
                    onRenderTextLayerSuccess={onTextLayer}
                    onRenderError={(error) => setLoadError(error.message)}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                  <HighlightLayer
                    marks={marks}
                    onOpen={(id, x, y) => markRef.current?.(id, x, y)}
                  />
                </div>
              </Document>
            )
          )}
          {!documentFile && !loadError && status("Opening your PDF…")}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-md border border-foreground/12 bg-card p-1 text-sm text-muted-foreground shadow-(--shadow-page) sm:gap-2 sm:p-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            onClick={() => move(-1)}
            disabled={page <= 1}
          >
            <CaretLeftIcon />
          </Button>
          <form
            className="flex items-center gap-1.5 sm:gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const target = Number(entry);
              if (Number.isInteger(target) && target >= 1 && target <= count)
                setPage(target);
              setEntry("");
            }}
          >
            <span className="hidden sm:inline">Page</span>
            <Input
              aria-label="Jump to page"
              inputMode="numeric"
              className="h-8 w-12 px-1 text-center not-italic placeholder:not-italic placeholder:text-foreground sm:w-14 sm:px-2"
              value={entry}
              placeholder={String(page)}
              onChange={(e) => setEntry(e.target.value.replace(/\D/g, ""))}
            />
            <span className="tabular-nums">of {count || "—"}</span>
          </form>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            onClick={() => move(1)}
            disabled={page >= count}
          >
            <CaretRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
});

type PdfDocument = Parameters<
  NonNullable<ComponentProps<typeof Document>["onLoadSuccess"]>
>[0];
type OutlineNode = Awaited<ReturnType<PdfDocument["getOutline"]>>[number];

function pageEntries(count: number): TocEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    label: `Page ${i + 1}`,
    href: String(i + 1),
    depth: 0,
    kind: "page",
  }));
}

async function outlineEntries(pdf: PdfDocument): Promise<TocEntry[]> {
  try {
    const outline = await pdf.getOutline();
    if (!outline?.length) return [];
    const entries: TocEntry[] = [];
    const visit = async (nodes: OutlineNode[], depth: number) => {
      for (const node of nodes) {
        const page = await outlinePage(pdf, node.dest);
        if (page) {
          entries.push({
            label: node.title.trim() || `Page ${page}`,
            href: String(page),
            depth,
            kind: "chapter",
          });
        }
        if (node.items?.length) await visit(node.items, depth + 1);
      }
    };
    await visit(outline, 0);
    return entries;
  } catch {
    return [];
  }
}

async function outlinePage(pdf: PdfDocument, dest: OutlineNode["dest"]) {
  try {
    const explicit =
      typeof dest === "string" ? await pdf.getDestination(dest) : dest;
    const target = explicit?.[0];
    if (target == null) return null;
    const index =
      typeof target === "number"
        ? target
        : await pdf.getPageIndex(
            target as Parameters<PdfDocument["getPageIndex"]>[0],
          );
    return index + 1;
  } catch {
    return null;
  }
}

function HighlightLayer({
  marks,
  onOpen,
}: {
  marks: PageMark[];
  onOpen(id: string, x: number, y: number): void;
}) {
  if (!marks.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {marks.map((mark) =>
        mark.rects.map((rect, index) =>
          mark.id ? (
            <button
              key={`${mark.id}-${index}`}
              type="button"
              className="pdf-highlight"
              aria-label="Highlight actions"
              style={markStyle(rect, mark.color)}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(mark.id!, event.clientX, event.clientY);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpen(mark.id!, event.clientX, event.clientY);
              }}
            />
          ) : null,
        ),
      )}
    </div>
  );
}

function markStyle(rect: HighlightRect, color?: MarkColor): CSSProperties {
  const fill = markFill(color, "brass");
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
    background: markWash(color, "brass"),
    boxShadow: `inset 0 -1px 0 color-mix(in srgb, ${fill} 72%, transparent)`,
  };
}

type PageMark = { id?: string; rects: HighlightRect[]; color?: MarkColor };

function marksForPage(
  annotations: Annotation[],
  recovered: Record<string, HighlightRect[]>,
  page: number,
) {
  const location = String(page);
  return annotations.flatMap((item) => {
    if (item.kind === "bookmark" || item.location !== location) return [];
    const rects = recovered[item.id]?.length
      ? recovered[item.id]
      : (item.rects ?? []);
    return rects.length ? [{ id: item.id, rects, color: item.color }] : [];
  });
}

function readSelection(
  shell: HTMLElement | null,
  page: number,
): CapturedSelection | null {
  const selection = window.getSelection();
  const text = selection?.toString().replace(/\s+/g, " ").trim();
  if (!text || !selection?.rangeCount || !shell?.contains(selection.anchorNode))
    return null;
  const pageBox = shell.getBoundingClientRect();
  if (pageBox.width < 1 || pageBox.height < 1) return null;
  const rects = mergeLineRects(
    [...selection.getRangeAt(0).getClientRects()]
      .filter(
        (rect) =>
          rect.width > 1 &&
          rect.height > 1 &&
          rect.height < pageBox.height * 0.4,
      )
      .map((rect) => ({
        x: (rect.left - pageBox.left) / pageBox.width,
        y: (rect.top - pageBox.top) / pageBox.height,
        w: rect.width / pageBox.width,
        h: rect.height / pageBox.height,
      })),
  );
  const bounds = selection.getRangeAt(0).getBoundingClientRect();
  return {
    text: text.slice(0, 3000),
    location: String(page),
    x: bounds.left + bounds.width / 2,
    y: bounds.top,
    rects,
  };
}

function rectsForQuote(shell: HTMLElement, quote: string) {
  const needle = quote.replace(/\s+/g, " ").trim().toLowerCase();
  if (needle.length < 2) return [];
  const page = shell.querySelector<HTMLElement>(".react-pdf__Page") ?? shell;
  const box = shell.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return [];
  const chars: { span: HTMLElement; index: number }[] = [];
  let flat = "";
  const spans = page.querySelectorAll<HTMLElement>(".textLayer span");
  spans.forEach((span, spanIndex) => {
    const text = span.textContent ?? "";
    if (
      spanIndex > 0 &&
      flat &&
      !flat.endsWith(" ") &&
      text &&
      !/^\s/.test(text)
    ) {
      flat += " ";
      chars.push({ span, index: 0 });
    }
    for (let index = 0; index < text.length; index += 1) {
      if (/\s/.test(text[index])) {
        if (!flat.endsWith(" ")) {
          flat += " ";
          chars.push({ span, index });
        }
        continue;
      }
      flat += text[index].toLowerCase();
      chars.push({ span, index });
    }
  });
  const at = flat.indexOf(needle);
  if (at < 0) return [];
  const groups: { span: HTMLElement; start: number; end: number }[] = [];
  for (const item of chars.slice(at, at + needle.length)) {
    const last = groups.at(-1);
    if (last?.span === item.span) last.end = Math.max(last.end, item.index + 1);
    else
      groups.push({ span: item.span, start: item.index, end: item.index + 1 });
  }
  const rects: HighlightRect[] = [];
  for (const group of groups) {
    const text = group.span.textContent ?? "";
    const spanBox = group.span.getBoundingClientRect();
    if (spanBox.width < 1 || !text.length) continue;
    const left = spanBox.left + (spanBox.width * group.start) / text.length;
    const right = spanBox.left + (spanBox.width * group.end) / text.length;
    rects.push({
      x: (left - box.left) / box.width,
      y: (spanBox.top - box.top) / box.height,
      w: Math.max(0.004, (right - left) / box.width),
      h: spanBox.height / box.height,
    });
  }
  return mergeLineRects(rects);
}

function mergeLineRects(rects: HighlightRect[]) {
  const sorted = rects
    .filter(
      (rect) => rect.w > 0.002 && rect.h > 0.002 && rect.y < 1 && rect.x < 1,
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: HighlightRect[] = [];
  for (const rect of sorted) {
    const last = merged.at(-1);
    const sameLine =
      last &&
      Math.abs(last.y - rect.y) < Math.max(last.h, rect.h) * 0.6 &&
      rect.x <= last.x + last.w + 0.015;
    if (last && sameLine) {
      const right = Math.max(last.x + last.w, rect.x + rect.w);
      const bottom = Math.max(last.y + last.h, rect.y + rect.h);
      last.x = Math.min(last.x, rect.x);
      last.y = Math.min(last.y, rect.y);
      last.w = right - last.x;
      last.h = bottom - last.y;
    } else {
      merged.push({ ...rect });
    }
  }
  return merged.map((rect) => ({
    x: round(rect.x),
    y: round(rect.y),
    w: round(rect.w),
    h: round(rect.h),
  }));
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function sameMarks(
  current: Record<string, HighlightRect[]>,
  next: Record<string, HighlightRect[]>,
) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) return false;
  return nextKeys.every(
    (key) => JSON.stringify(current[key]) === JSON.stringify(next[key]),
  );
}
