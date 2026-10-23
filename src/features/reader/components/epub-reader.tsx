import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import ePub from "epubjs";
import { Spinner } from "@/components/ui/spinner";
import { markFill } from "../model/mark-colors";
import {
  DISMISS_SELECTION_EVENT,
  PAGE_TAP_EVENT,
  type Annotation,
  type CapturedSelection,
  type ReaderHandle,
  type ReaderPreferences,
  type TocEntry,
} from "../model/reader-types";

interface Props {
  file: Blob;
  initialLocation: string;
  preferences: ReaderPreferences;
  annotations: Annotation[];
  onProgress(location: string, progress: number): void;
  onToc(items: TocEntry[]): void;
  onSelection(selection: CapturedSelection): void;
  onOpenMark?(id: string, x: number, y: number): void;
  onPagesLeft?(pages: number): void;
}

type EpubRendition = ReturnType<ReturnType<typeof ePub>["renderTo"]>;

// The book renders inside an iframe, which can't see the app's fonts.
const BOOK_FONTS =
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap";

const TYPEFACES = {
  literata: '"Literata", Georgia, serif',
  charter:
    'Charter, "Bitstream Charter", "Iowan Old Style", "Sitka Text", Cambria, Georgia, serif',
  figtree: '"Figtree", ui-sans-serif, system-ui, sans-serif',
} as const;

export const EpubReader = forwardRef<ReaderHandle, Props>(function EpubReader(
  {
    file,
    initialLocation,
    preferences,
    annotations,
    onProgress,
    onToc,
    onSelection,
    onOpenMark,
    onPagesLeft,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<EpubRendition | null>(null);
  const locationRef = useRef(initialLocation);
  const annotationsRef = useRef(annotations);
  const progressRef = useRef(onProgress);
  const tocRef = useRef(onToc);
  const selectionRef = useRef(onSelection);
  const markRef = useRef(onOpenMark);
  const pagesLeftRef = useRef(onPagesLeft);
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    annotationsRef.current = annotations;
    progressRef.current = onProgress;
    tocRef.current = onToc;
    selectionRef.current = onSelection;
    markRef.current = onOpenMark;
    pagesLeftRef.current = onPagesLeft;
  }, [annotations, onOpenMark, onPagesLeft, onProgress, onSelection, onToc]);

  useImperativeHandle(
    ref,
    () => ({
      next: () => {
        void renditionRef.current?.next();
      },
      prev: () => {
        void renditionRef.current?.prev();
      },
      goTo: (location: string) => {
        void renditionRef.current?.display(location);
      },
      getLocation: () => locationRef.current,
    }),
    [],
  );

  useEffect(() => {
    let disposed = false;
    let book: ReturnType<typeof ePub> | null = null;
    let rendition: EpubRendition | null = null;
    setReady(false);
    setLoadError("");

    async function start() {
      try {
        const buffer = await file.arrayBuffer();
        if (disposed || !hostRef.current) return;
        book = ePub(buffer);
        await book.ready;
        if (disposed || !hostRef.current) return;
        rendition = book.renderTo(hostRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        rendition.hooks.content.register(
          (contents: {
            addStylesheet(url: string): Promise<unknown>;
            document: Document;
          }) => {
            void contents.addStylesheet(BOOK_FONTS);
            contents.document.addEventListener("contextmenu", (event) => {
              const point = framePoint(event, contents.document);
              const id = highlightIdAt(rendition, point.x, point.y);
              if (!id) return;
              event.preventDefault();
              markRef.current?.(id, point.x, point.y);
            });
            contents.document.addEventListener("mousedown", (event) => {
              const point = framePoint(event, contents.document);
              if (highlightIdAt(rendition, point.x, point.y)) return;
              const existing = contents.document.defaultView?.getSelection();
              if (!existing?.toString()) return;
              existing.removeAllRanges();
              window.dispatchEvent(new Event(DISMISS_SELECTION_EVENT));
            });
          },
        );

        rendition.on(
          "click",
          (event: MouseEvent, contents: { window: Window; document: Document }) => {
            if (contents.window.getSelection()?.toString()) return;
            const point = framePoint(event, contents.document);
            if (highlightIdAt(rendition, point.x, point.y)) return;
            window.dispatchEvent(new Event(PAGE_TAP_EVENT));
          },
        );

        rendition.on(
          "relocated",
          (pos: {
            atEnd?: boolean;
            start: {
              cfi: string;
              index: number;
              displayed?: { page: number; total: number };
            };
          }) => {
            locationRef.current = pos.start.cfi;
            const spineLength = Math.max(
              1,
              book?.packaging?.spine?.length || 1,
            );
            const fraction = pos.start.displayed
              ? (pos.start.displayed.page - 1) /
                Math.max(1, pos.start.displayed.total)
              : 0;
            const progress = pos.atEnd
              ? 100
              : Math.min(
                  99.8,
                  Math.max(
                    0,
                    ((pos.start.index + fraction) / spineLength) * 100,
                  ),
                );
            progressRef.current(pos.start.cfi, progress);
            if (pos.start.displayed)
              pagesLeftRef.current?.(
                Math.max(
                  0,
                  pos.start.displayed.total - pos.start.displayed.page,
                ),
              );
          },
        );

        rendition.on(
          "selected",
          (cfi: string, contents: { window: Window; document: Document }) => {
            const selection = contents.window.getSelection();
            const text = selection?.toString().trim();
            if (!text || !selection?.rangeCount) return;
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            const frameRect =
              contents.document.defaultView?.frameElement?.getBoundingClientRect();
            selectionRef.current({
              text: text.slice(0, 3000),
              location: cfi,
              cfi,
              x: rect.left + (frameRect?.left || 0) + rect.width / 2,
              y: rect.top + (frameRect?.top || 0),
            });
          },
        );

        // Epub navigation uses stable hrefs; notes use precise EPUB CFIs.
        const nav = await book.loaded.navigation;
        const spineLength = Math.max(1, book.packaging?.spine?.length || 1);
        const startOf = (href: string) => {
          const index = book?.spine.get(href.split("#")[0])?.index;
          return typeof index === "number"
            ? (index / spineLength) * 100
            : undefined;
        };
        const flatten = (
          items: Array<{ label: string; href: string; subitems?: unknown[] }>,
          depth = 0,
        ): TocEntry[] =>
          items.flatMap((item) => [
            {
              label: item.label.trim() || "Untitled section",
              href: item.href,
              depth,
              at: startOf(item.href),
            },
            ...flatten((item.subitems || []) as typeof items, depth + 1),
          ]);
        tocRef.current(
          flatten((nav.toc || []) as Parameters<typeof flatten>[0]),
        );
        await rendition.display(
          initialLocation.startsWith("epubcfi(") ? initialLocation : undefined,
        );
        if (!disposed) setReady(true);
      } catch (error) {
        if (!disposed)
          setLoadError(
            error instanceof Error
              ? error.message
              : "This EPUB could not be opened.",
          );
      }
    }

    void start();
    return () => {
      disposed = true;
      renditionRef.current = null;
      try {
        rendition?.destroy();
      } catch {
        /* ignore renderer cleanup errors */
      }
      try {
        book?.destroy();
      } catch {
        /* ignore book cleanup errors */
      }
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [file]);

  // epub.js measures its frame once. Re-measure when panels open or the
  // window changes, or the text runs past the right edge of the page.
  useEffect(() => {
    const host = hostRef.current;
    if (!ready || !host) return;
    let timer = 0;
    let last = "";
    const observer = new ResizeObserver(([record]) => {
      const { width, height } = record.contentRect;
      const size = `${Math.floor(width)}x${Math.floor(height)}`;
      if (!width || !height || size === last) return;
      const first = !last;
      last = size;
      if (first) return;
      window.clearTimeout(timer);
      // No sizes: epub.js re-reads its "100%" container instead of pinning
      // fixed pixels.
      timer = window.setTimeout(() => {
        const rendition = renditionRef.current as {
          resize(width?: number, height?: number): void;
          views(): unknown;
        } | null;
        rendition?.resize();
        window.setTimeout(() => redrawEpubHighlights(rendition), 40);
      }, 120);
    });
    observer.observe(host);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !renditionRef.current) return;
    const r = renditionRef.current;
    const foreground =
      preferences.theme === "night"
        ? "oklch(0.84 0.012 80)"
        : preferences.theme === "sepia"
          ? "oklch(0.33 0.04 62)"
          : "oklch(0.235 0.012 60)";
    r.themes.register("lege-reading", {
      html: { background: "transparent !important" },
      body: {
        color: `${foreground} !important`,
        background: "transparent !important",
        "font-family": `${TYPEFACES[preferences.typeface] ?? TYPEFACES.literata} !important`,
        "line-height": `${preferences.lineHeight} !important`,
        "text-rendering": "optimizeLegibility",
        "-webkit-font-smoothing": "antialiased",
      },
      "p, li, blockquote, dd, dt": { "font-family": "inherit !important" },
      "img, svg, video, table, pre": { "max-width": "100% !important" },
      pre: { "white-space": "pre-wrap !important" },
      p: {
        "line-height": `${preferences.lineHeight} !important`,
        "text-align": "start",
        hyphens: "auto",
      },
      img: { height: "auto !important" },
      a: {
        color:
          preferences.theme === "night"
            ? "oklch(0.78 0.085 75)"
            : preferences.theme === "sepia"
              ? "oklch(0.47 0.085 50)"
              : "oklch(0.44 0.12 28)",
      },
      "::selection": { background: "rgba(96, 140, 196, 0.34)" },
    });
    r.themes.select("lege-reading");
    r.themes.fontSize(`${Math.round((preferences.fontSize / 18) * 100)}%`);
    return scheduleHighlightRedraw(r);
  }, [preferences, ready]);

  // Keep EPUB highlights anchored on the underlying content as the reader moves.
  useEffect(() => {
    if (!ready || !renditionRef.current) return;
    const rendition = renditionRef.current;
    for (const item of annotations.filter(
      (a) => a.location.startsWith("epubcfi(") && a.kind !== "bookmark",
    )) {
      rendition.annotations.highlight(
        item.location,
        { id: item.id },
        (event: Event) => {
          const mark = event.currentTarget;
          if (!(mark instanceof Element)) return;
          const box = mark.getBoundingClientRect();
          const frame =
            mark.ownerDocument.defaultView?.frameElement?.getBoundingClientRect();
          markRef.current?.(
            item.id,
            box.left + (frame?.left ?? 0) + box.width / 2,
            box.top + (frame?.top ?? 0),
          );
        },
        "lege-highlight",
        { fill: markFill(item.color, "brass"), "fill-opacity": "0.45" },
      );
    }
    const cancelRedraw = scheduleHighlightRedraw(rendition);
    return () => {
      cancelRedraw();
      for (const item of annotations.filter(
        (a) => a.location.startsWith("epubcfi(") && a.kind !== "bookmark",
      )) {
        try {
          rendition.annotations.remove(item.location, "highlight");
        } catch {
          /* ignore */
        }
      }
    };
  }, [annotations, ready]);

  return (
    <div className="relative flex min-h-0 w-full flex-1 overflow-hidden px-6 py-8 sm:px-12 sm:py-10">
      {!ready && !loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-page text-sm text-muted-foreground">
          <Spinner /> Opening your book…
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-page p-8 text-center text-sm text-destructive">
          {loadError}
        </div>
      )}
      <div ref={hostRef} className="epub-host h-full w-full overflow-hidden" />
    </div>
  );
});

type EpubView = {
  pane?: { render(): void };
  highlights?: Record<
    string,
    {
      element?: HTMLElement;
      mark?: { getClientRects(): DOMRect[] };
    }
  >;
};

function epubViews(rendition: { views(): unknown }) {
  const views = rendition.views() as { all?: () => EpubView[] };
  return typeof views?.all === "function" ? views.all() : [];
}

function redrawEpubHighlights(rendition: { views(): unknown } | null) {
  if (!rendition) return;
  try {
    for (const view of epubViews(rendition)) view.pane?.render();
  } catch {
    /* The rendition can close while a redraw is still queued. */
  }
}

function scheduleHighlightRedraw(rendition: { views(): unknown }) {
  const timers = [0, 60, 360].map((delay) =>
    window.setTimeout(() => redrawEpubHighlights(rendition), delay),
  );
  return () => {
    for (const timer of timers) window.clearTimeout(timer);
  };
}

function framePoint(event: MouseEvent, doc: Document) {
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  return {
    x: event.clientX + (frame?.left ?? 0),
    y: event.clientY + (frame?.top ?? 0),
  };
}

function highlightIdAt(
  rendition: { views(): unknown } | null,
  x: number,
  y: number,
) {
  if (!rendition) return null;
  for (const view of epubViews(rendition)) {
    for (const item of Object.values(view.highlights ?? {})) {
      const rects = item.mark?.getClientRects() ?? [];
      const hit = rects.some(
        (rect) =>
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
      );
      if (!hit) continue;
      return item.element?.dataset.id ?? null;
    }
  }
  return null;
}
