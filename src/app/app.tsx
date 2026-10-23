import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

import {
  addBook,
  deleteBook,
  deleteShelf,
  getFile,
  getPreferences,
  keepLibraryStored,
  listAnnotations,
  listBooks,
  listShelves,
  saveAnnotations,
  saveBook,
  savePreferences,
  saveShelf,
  translateText,
  DEFAULT_PREFS,
  PLACEHOLDER_AUTHOR,
  type Annotation,
  type BookMeta,
  type CapturedSelection,
  type ReaderHandle,
  type ReaderPreferences,
  type Shelf,
  type TocEntry,
} from "@/features/reader";
import {
  ReaderView,
  type NotesTab,
} from "@/features/reader/components/reader-view";
import {
  NoteDialog,
  SettingsDialog,
  TranslateDialog,
  type NoteDraft,
  type TranslationState,
} from "@/features/reader/components/reader-dialogs";
import { SelectionToolbar } from "@/features/reader/components/selection-toolbar";
import {
  BookActionsMenu,
  isFinished,
  type BookActions,
} from "@/features/library/components/book-actions";
import { BOOK_COVER_THEME_COUNT } from "@/features/library/components/book-cover";
import {
  EditBookDialog,
  type BookEdits,
} from "@/features/library/components/edit-book-dialog";
import { HomeView } from "@/features/library/components/home-view";
import {
  coverFromImage,
  readBookDetails,
  titleFromFileName,
} from "@/features/library/lib/book-details";
import {
  createLibraryBackup,
  restoreLibraryBackup,
} from "@/features/library/lib/library-backup";
import { LibraryView } from "@/features/library/components/library-view";
import {
  DesktopShell,
  type AppNotice,
  type AppNoticeType,
  type View,
} from "@/app/components/desktop-shell";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

const EpubReader = lazy(() =>
  import("@/features/reader/components/epub-reader").then((module) => ({
    default: module.EpubReader,
  })),
);
const PdfReader = lazy(() =>
  import("@/features/reader/components/pdf-reader").then((module) => ({
    default: module.PdfReader,
  })),
);

const LEGACY_AUTHOR = "Your collection";

const wideScreen = () =>
  typeof window !== "undefined" && window.innerWidth >= 1024;
const extraWideScreen = () =>
  typeof window !== "undefined" && window.innerWidth >= 1440;

function ReaderStatus({ children }: { children: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
      <Spinner /> {children}
    </div>
  );
}

export default function App() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [booksLoaded, setBooksLoaded] = useState(false);
  const [editing, setEditing] = useState<BookMeta | null>(null);
  const [pendingShelf, setPendingShelf] = useState<Shelf | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const coverTargetRef = useRef<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [libraryAnnotations, setLibraryAnnotations] = useState<Annotation[]>([]);
  const annotationsRef = useRef<Annotation[]>([]);
  const [preferences, setPreferences] =
    useState<ReaderPreferences>(DEFAULT_PREFS);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [pagesLeft, setPagesLeft] = useState<number>();
  const [contentsOpen, setContentsOpen] = useState(wideScreen);
  const [notesOpen, setNotesOpen] = useState(extraWideScreen);
  const [tab, setTab] = useState<NotesTab>("notes");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selection, setSelection] = useState<CapturedSelection | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const [translation, setTranslation] = useState<TranslationState | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<BookMeta | null>(null);
  const [readingReady, setReadingReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const noticeTimersRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<ReaderHandle>(null);
  const readingShellRef = useRef<HTMLDivElement>(null);

  function notify(title: string, type: AppNoticeType = "success") {
    const id = crypto.randomUUID();
    const body =
      type === "error"
        ? "Try again or check this browser's storage permissions."
        : type === "info"
          ? "Your library stays on this device."
          : "Saved on this device.";
    setNotices((current) =>
      [{ id, title, body, type }, ...current].slice(0, 4),
    );
    noticeTimersRef.current.push(
      window.setTimeout(
        () =>
          setNotices((current) =>
            current.filter((notice) => notice.id !== id),
          ),
        type === "error" ? 14_000 : 8_000,
      ),
    );
  }

  function acknowledge(title: string, type: "success" | "info" = "success") {
    toast.add({ title, type, timeout: 2800 });
  }

  const active = books.find((b) => b.id === activeId) ?? null;
  const currentLocation = active?.location;
  const bookmarked = annotations.some(
    (a) => a.kind === "bookmark" && a.location === currentLocation,
  );
  const savedNotes = annotations
    .filter((a) => a.kind === "note")
    .sort((a, b) => b.createdAt - a.createdAt);
  const savedHighlights = annotations
    .filter((a) => a.kind === "highlight")
    .sort((a, b) => b.createdAt - a.createdAt);
  const savedBookmarks = annotations
    .filter((a) => a.kind === "bookmark")
    .sort((a, b) => b.createdAt - a.createdAt);
  const bookIdsKey = books
    .map((book) => book.id)
    .sort()
    .join("|");

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      try {
        const [stored, storedShelves, prefs] = await Promise.all([
          listBooks(),
          listShelves(),
          getPreferences(),
        ]);
        if (!mounted) return;
        setBooks(stored.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt));
        setShelves(storedShelves);
        setBooksLoaded(true);
        if (prefs) setPreferences({ ...DEFAULT_PREFS, ...prefs });
        void keepLibraryStored();
      } catch {
        if (mounted)
          notify(
            "Storage is unavailable. Changes may not survive reloads.",
            "error",
          );
      } finally {
        if (mounted) setPreferencesLoaded(true);
      }
    }
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(
    () => () => {
      noticeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  useEffect(() => {
    if (preferencesLoaded)
      void savePreferences(preferences).catch(() =>
        notify("Could not save reading preferences.", "error"),
      );
  }, [preferences, preferencesLoaded]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-sepia", preferences.theme === "sepia");
    root.classList.toggle("dark", preferences.theme === "night");
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) {
      icon.href =
        preferences.theme === "night"
          ? "/favicon-night.png"
          : preferences.theme === "sepia"
            ? "/favicon-sepia.png"
            : "/favicon-paper.png";
    }
    return () => root.classList.remove("theme-sepia", "dark");
  }, [preferences.theme]);

  useEffect(() => {
    let alive = true;
    setFile(null);
    setToc([]);
    setPagesLeft(undefined);
    setSelection(null);
    setReadingReady(false);
    if (!activeId) return;
    const bookId = activeId;
    async function load() {
      try {
        const [blob, notes] = await Promise.all([
          getFile(bookId),
          listAnnotations(bookId),
        ]);
        if (!alive) return;
        setFile(blob ?? null);
        setAnnotations(notes);
        setReadingReady(true);
        if (!blob) notify("Book file was not found in this browser.", "error");
      } catch {
        if (alive)
          notify("Could not load this book from local storage.", "error");
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [activeId]);

  useEffect(() => {
    if (!booksLoaded || activeId) return;
    let alive = true;
    void Promise.all(books.map((book) => listAnnotations(book.id)))
      .then((groups) => {
        if (alive) setLibraryAnnotations(groups.flat());
      })
      .catch(() => {
        if (alive) setLibraryAnnotations([]);
      });
    return () => {
      alive = false;
    };
  }, [activeId, bookIdsKey, booksLoaded]);

  useEffect(() => {
    function onKeys(event: KeyboardEvent) {
      if (
        !activeId ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        settingsOpen ||
        noteDraft ||
        translation
      )
        return;
      if (window.getSelection()?.toString()) return;
      if (
        event.key === " " &&
        !target?.closest("button, a, [role]") &&
        active?.format !== "pdf"
      ) {
        event.preventDefault();
        readerRef.current?.next();
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        readerRef.current?.next();
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        readerRef.current?.prev();
      }
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleBookmark();
      }
      if (event.key === "Escape") setSelection(null);
    }
    window.addEventListener("keydown", onKeys);
    return () => window.removeEventListener("keydown", onKeys);
  });

  useEffect(() => {
    if (!selection) window.getSelection()?.removeAllRanges();
  }, [selection]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  function patchBook(id: string, changes: Partial<BookMeta>) {
    const stored = books.find((book) => book.id === id);
    if (!stored) return;
    const next = { ...stored, ...changes };
    if ("shelfId" in changes && !changes.shelfId) delete next.shelfId;
    setBooks((current) =>
      current.map((book) => {
        if (book.id !== id) return book;
        const updated = { ...book, ...changes };
        if ("shelfId" in changes && !changes.shelfId) delete updated.shelfId;
        return updated;
      }),
    );
    void saveBook(next).catch(() =>
      notify("Could not save this book.", "error"),
    );
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setImporting(true);
    const added: BookMeta[] = [];
    try {
      for (const item of Array.from(files)) {
        if (!/\.(epub|pdf)$/i.test(item.name)) {
          notify(`Unsupported file: ${item.name}`, "error");
          continue;
        }
        const format = item.name.toLowerCase().endsWith(".epub")
          ? "epub"
          : "pdf";
        const details = await readBookDetails(item, format);
        const now = Date.now();
        const meta: BookMeta = {
          id: crypto.randomUUID(),
          title: details.title ?? titleFromFileName(item.name),
          author: details.author ?? PLACEHOLDER_AUTHOR,
          format,
          addedAt: now,
          lastOpenedAt: now,
          location: format === "pdf" ? "1" : "",
          progress: 0,
          color: Math.floor(Math.random() * BOOK_COVER_THEME_COUNT),
          cover: details.cover,
          detailsChecked: true,
        };
        await addBook(meta, item);
        added.push(meta);
      }
      if (added.length) {
        setBooks((current) => [...added, ...current]);
        openBook(added[0].id);
        notify(
          `${added.length} book${added.length > 1 ? "s" : ""} added to your library`,
        );
      }
    } catch {
      notify(
        "Import failed. Try a smaller file or check available browser storage.",
        "error",
      );
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Books added before covers existed: read their cover and metadata once.
  useEffect(() => {
    if (!booksLoaded) return;
    const pending = books.filter((book) => !book.detailsChecked);
    if (!pending.length) return;
    let cancelled = false;
    void (async () => {
      for (const book of pending) {
        if (cancelled) return;
        const blob = await getFile(book.id).catch(() => undefined);
        const details = blob ? await readBookDetails(blob, book.format) : {};
        if (cancelled) return;
        const untouched = book.author === LEGACY_AUTHOR || !book.author;
        patchBook(book.id, {
          detailsChecked: true,
          cover: book.cover ?? details.cover,
          ...(untouched
            ? {
                title: details.title ?? titleFromFileName(book.title),
                author: details.author ?? PLACEHOLDER_AUTHOR,
              }
            : {}),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booksLoaded]); // Intentional: run once after the shelf loads.

  async function readFileCover(book: BookMeta) {
    const blob = await getFile(book.id).catch(() => undefined);
    if (!blob) return undefined;
    return (await readBookDetails(blob, book.format)).cover;
  }

  async function downloadBook(book: BookMeta) {
    const blob = await getFile(book.id).catch(() => undefined);
    if (!blob) {
      notify("The file is not available in this browser.", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${book.title.replace(/[\\/:*?"<>|]+/g, "").trim() || "book"}.${book.format}`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function applyCover(file: File | undefined) {
    const id = coverTargetRef.current;
    coverTargetRef.current = null;
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file || !id) return;
    try {
      patchBook(id, { cover: await coverFromImage(file) });
      acknowledge("Cover updated");
    } catch {
      notify("That image could not be used. Try a JPG or PNG.", "error");
    }
  }

  function saveEdits(book: BookMeta, edits: BookEdits) {
    patchBook(book.id, {
      title: edits.title,
      author: edits.author || PLACEHOLDER_AUTHOR,
      cover: edits.cover,
    });
    setEditing(null);
    acknowledge("Book details saved");
  }

  const bookActions: BookActions = {
    open: (book) => openBook(book.id),
    edit: (book) => setEditing(book),
    changeCover: (book) => {
      coverTargetRef.current = book.id;
      coverInputRef.current?.click();
    },
    toggleFinished: (book) => {
      if (isFinished(book)) {
        patchBook(book.id, {
          progress: 0,
          location: book.format === "pdf" ? "1" : "",
        });
        acknowledge("Marked as unread", "info");
      } else {
        patchBook(book.id, {
          progress: 100,
          ...(book.format === "pdf" && book.totalPages
            ? { location: String(book.totalPages) }
            : {}),
        });
        acknowledge("Marked as finished");
      }
    },
    download: (book) => void downloadBook(book),
    moveToShelf: (book, shelfId) => {
      patchBook(book.id, { shelfId: shelfId ?? undefined });
      const name = shelves.find((shelf) => shelf.id === shelfId)?.name;
      acknowledge(name ? `Moved to ${name}` : "Moved to Unsorted", "info");
    },
    remove: (book) => setPendingRemoval(book),
  };

  async function createShelf(name: string) {
    const shelf: Shelf = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    };
    try {
      await saveShelf(shelf);
      setShelves((current) => [...current, shelf]);
    } catch {
      notify("Could not create the shelf.", "error");
    }
  }

  async function renameShelf(id: string, name: string) {
    const shelf = shelves.find((item) => item.id === id);
    if (!shelf) return;
    const next = { ...shelf, name };
    try {
      await saveShelf(next);
      setShelves((current) =>
        current.map((item) => (item.id === id ? next : item)),
      );
    } catch {
      notify("Could not rename the shelf.", "error");
    }
  }

  async function confirmShelfRemoval() {
    const shelf = pendingShelf;
    setPendingShelf(null);
    if (!shelf) return;
    try {
      await deleteShelf(shelf.id);
      setShelves((current) => current.filter((item) => item.id !== shelf.id));
      setBooks((current) =>
        current.map((book) => {
          if (book.shelfId !== shelf.id) return book;
          const next = { ...book };
          delete next.shelfId;
          return next;
        }),
      );
      notify(`Deleted “${shelf.name}”. The books are still in your library.`);
    } catch {
      notify("Could not delete the shelf.", "error");
    }
  }

  async function backupLibrary() {
    try {
      notify("Preparing your backup…", "info");
      const blob = await createLibraryBackup();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lege-library-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Backup downloaded. Keep that file somewhere safe.");
    } catch {
      notify("Could not create the backup.", "error");
    }
  }

  async function restoreLibrary(file: File | undefined) {
    if (restoreInputRef.current) restoreInputRef.current.value = "";
    if (!file) return;
    try {
      const result = await restoreLibraryBackup(file);
      const [stored, storedShelves] = await Promise.all([
        listBooks(),
        listShelves(),
      ]);
      setBooks(stored.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt));
      setShelves(storedShelves);
      notify(
        result.added
          ? `Restored ${result.added} book${result.added === 1 ? "" : "s"}${result.skipped ? `, skipped ${result.skipped} already here` : ""}.`
          : "Nothing new to restore. Those books are already in your library.",
        result.added ? "success" : "info",
      );
    } catch {
      notify("That file could not be restored.", "error");
    }
  }

  function openBook(id: string) {
    setActiveId(id);
    setContentsOpen(wideScreen());
    setNotesOpen(extraWideScreen());
    setSelection(null);
    patchBook(id, { lastOpenedAt: Date.now() });
  }

  function closeBook() {
    if (document.fullscreenElement) void document.exitFullscreen();
    setActiveId(null);
    setSelection(null);
  }

  async function confirmRemoval() {
    const book = pendingRemoval;
    setPendingRemoval(null);
    if (!book) return;
    try {
      await deleteBook(book.id);
      setBooks((current) => current.filter((b) => b.id !== book.id));
      if (activeId === book.id) setActiveId(null);
      notify(`Removed “${book.title}”`);
    } catch {
      notify("Could not remove the book.", "error");
    }
  }

  function mutateAnnotations(modify: (previous: Annotation[]) => Annotation[]) {
    if (!activeId) return;
    const next = modify(annotationsRef.current);
    annotationsRef.current = next;
    setAnnotations(next);
    void saveAnnotations(activeId, next).catch(() =>
      notify("Could not save your annotation.", "error"),
    );
  }

  function removeAnnotation(id: string) {
    const removed = annotationsRef.current.find((item) => item.id === id);
    if (!removed) return;
    mutateAnnotations((items) => items.filter((item) => item.id !== id));
    const toastId = toast.add({
      title: removed.kind === "bookmark" ? "Bookmark removed" : "Annotation removed",
      type: "info",
      timeout: 5000,
      actionProps: {
        children: "Undo",
        onClick: () => {
          mutateAnnotations((items) =>
            items.some((item) => item.id === removed.id)
              ? items
              : [...items, removed],
          );
          toast.close(toastId);
        },
      },
    });
  }

  function addAnnotation(
    kind: Annotation["kind"],
    quote: string,
    location: string,
    note = "",
    rects?: CapturedSelection["rects"],
  ) {
    if (!activeId) return;
    const item: Annotation = {
      id: crypto.randomUUID(),
      bookId: activeId,
      kind,
      quote,
      location,
      note,
      createdAt: Date.now(),
      ...(rects?.length ? { rects } : {}),
    };
    mutateAnnotations((previous) => [...previous, item]);
  }

  function toggleBookmark() {
    const location = readerRef.current?.getLocation() ?? active?.location;
    if (!location) return;
    if (
      annotationsRef.current.some(
        (a) => a.kind === "bookmark" && a.location === location,
      )
    ) {
      mutateAnnotations((previous) =>
        previous.filter(
          (a) => !(a.kind === "bookmark" && a.location === location),
        ),
      );
      acknowledge("Bookmark removed", "info");
    } else {
      addAnnotation("bookmark", "", location);
      acknowledge("Page bookmarked");
    }
  }

  function openNote(selectionData?: CapturedSelection) {
    setNoteDraft({
      quote: selectionData?.text || "",
      location:
        selectionData?.location ||
        readerRef.current?.getLocation() ||
        active?.location ||
        "0",
      value: "",
      rects: selectionData?.rects,
    });
    setSelection(null);
  }

  function saveNote() {
    if (!noteDraft) return;
    const value = noteDraft.value.trim();
    if (!value && !noteDraft.quote) return;
    if (noteDraft.id) {
      mutateAnnotations((previous) =>
        previous.map((a) =>
          a.id === noteDraft.id
            ? { ...a, note: value, kind: value ? "note" : a.kind }
            : a,
        ),
      );
    } else {
      addAnnotation(
        "note",
        noteDraft.quote,
        noteDraft.location,
        value,
        noteDraft.rects,
      );
    }
    setNoteDraft(null);
    setNotesOpen(true);
    setTab("notes");
    acknowledge("Note saved");
  }

  async function startTranslation(text: string) {
    setSelection(null);
    setTranslation({ text, result: "", provider: "", error: "", busy: true });
    try {
      const response = await translateText(
        text,
        preferences.sourceLang,
        preferences.targetLang,
      );
      setTranslation((current) =>
        current?.text === text
          ? {
              ...current,
              result: response.value,
              provider: response.provider,
              busy: false,
            }
          : current,
      );
    } catch (error) {
      setTranslation((current) =>
        current?.text === text
          ? {
              ...current,
              error:
                error instanceof Error ? error.message : "Translation failed.",
              busy: false,
            }
          : current,
      );
    }
  }

  function exportNotes() {
    if (!active) return;
    const payload = JSON.stringify(
      {
        format: "lege-notes",
        version: 1,
        book: { title: active.title, id: active.id, format: active.format },
        exportedAt: new Date().toISOString(),
        annotations,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${active.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-notes.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    acknowledge("Notes exported as JSON");
  }

  function jumpTo(location: string) {
    readerRef.current?.goTo(location);
    setSelection(null);
  }

  function updatePrefs(patch: Partial<ReaderPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await readingShellRef.current?.requestFullscreen();
    } catch {
      notify("Fullscreen is unavailable in this browser.", "error");
    }
  }

  function onDragOver(event: DragEvent) {
    if (activeId || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDragging(true);
  }

  function onDrop(event: DragEvent) {
    if (activeId) return;
    event.preventDefault();
    setDragging(false);
    void importFiles(event.dataTransfer.files);
  }

  const activeReader =
    active && readingReady && file ? (
      active.format === "pdf" ? (
        <PdfReader
          ref={readerRef}
          file={file}
          initialLocation={active.location}
          preferences={preferences}
          annotations={annotations}
          selection={selection}
          onProgress={(location, progress, totalPages) =>
            patchBook(active.id, { location, progress, totalPages })
          }
          onToc={setToc}
          onSelection={setSelection}
          onDismissSelection={() => setSelection(null)}
        />
      ) : (
        <EpubReader
          ref={readerRef}
          file={file}
          initialLocation={active.location}
          preferences={preferences}
          annotations={annotations}
          onProgress={(location, progress) =>
            patchBook(active.id, { location, progress })
          }
          onToc={setToc}
          onSelection={setSelection}
          onPagesLeft={setPagesLeft}
        />
      )
    ) : readingReady ? (
      <p className="flex flex-1 items-center justify-center p-12 text-sm text-muted-foreground">
        This file is not available in browser storage.
      </p>
    ) : (
      <ReaderStatus>Opening your book…</ReaderStatus>
    );

  const currentBook =
    [...books].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)[0] ?? null;

  return (
    <div
      className="h-dvh bg-background text-foreground"
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.relatedTarget) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        multiple
        hidden
        onChange={(e) => void importFiles(e.target.files)}
      />
      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void restoreLibrary(e.target.files?.[0])}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void applyCover(e.target.files?.[0])}
      />

      {active ? (
        <ReaderView
          book={active}
          bookMenu={
            <BookActionsMenu
              book={active}
              shelves={shelves}
              actions={bookActions}
              showOpen={false}
            />
          }
          reader={
            <Suspense
              fallback={<ReaderStatus>Preparing the reader…</ReaderStatus>}
            >
              {activeReader}
            </Suspense>
          }
          shellRef={readingShellRef}
          toc={toc}
          notes={savedNotes}
          highlights={savedHighlights}
          bookmarks={savedBookmarks}
          bookmarked={bookmarked}
          translationBusy={translation?.busy ?? false}
          contentsOpen={contentsOpen}
          notesOpen={notesOpen}
          tab={tab}
          preferences={preferences}
          pagesLeft={pagesLeft}
          onPreferencesChange={updatePrefs}
          onContentsOpenChange={setContentsOpen}
          onNotesOpenChange={setNotesOpen}
          onTabChange={setTab}
          onBack={closeBook}
          onToggleBookmark={toggleBookmark}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleFullscreen={() => void toggleFullscreen()}
          onPrev={() => readerRef.current?.prev()}
          onNext={() => readerRef.current?.next()}
          onJump={jumpTo}
          onNewNote={() => openNote()}
          onEditNote={(note) =>
            setNoteDraft({
              id: note.id,
              quote: note.quote,
              location: note.location,
              value: note.note,
            })
          }
          onDelete={removeAnnotation}
          onExport={exportNotes}
        />
      ) : (
        <DesktopShell
          view={view}
          books={books}
          shelves={shelves}
          annotations={libraryAnnotations}
          currentBook={currentBook}
          preferences={preferences}
          notices={notices}
          dragging={dragging}
          importing={importing}
          onNavigate={setView}
          onAddBook={() => inputRef.current?.click()}
          onOpenBook={openBook}
          onOpenAnnotation={(bookId, location) => {
            patchBook(bookId, { location });
            openBook(bookId);
            setNotesOpen(true);
            setTab("notes");
          }}
          onOpenNotes={() => {
            if (!currentBook) return;
            openBook(currentBook.id);
            setNotesOpen(true);
            setTab("notes");
          }}
          onEditCurrent={() => currentBook && setEditing(currentBook)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenCurrent={() => currentBook && openBook(currentBook.id)}
          onBackup={() => void backupLibrary()}
          onRestore={() => restoreInputRef.current?.click()}
          onPreferencesChange={updatePrefs}
          onDismissNotice={(id) =>
            setNotices((current) => current.filter((notice) => notice.id !== id))
          }
          onClearNotices={() => setNotices([])}
        >
          {view === "home" ? (
            <HomeView
              books={books}
              shelves={shelves}
              actions={bookActions}
              onAddBook={() => inputRef.current?.click()}
              onViewLibrary={() => setView("library")}
            />
          ) : (
            <LibraryView
              books={books}
              shelves={shelves}
              actions={bookActions}
              onAddBook={() => inputRef.current?.click()}
              onCreateShelf={(name) => void createShelf(name)}
              onRenameShelf={(id, name) => void renameShelf(id, name)}
              onDeleteShelf={setPendingShelf}
            />
          )}
        </DesktopShell>
      )}

      {selection && active && (
        <SelectionToolbar
          selection={selection}
          onHighlight={() => {
            addAnnotation(
              "highlight",
              selection.text,
              selection.location,
              "",
              selection.rects,
            );
            setSelection(null);
            acknowledge("Passage highlighted");
          }}
          onNote={() => openNote(selection)}
          onTranslate={() => void startTranslation(selection.text)}
          onCopy={() => {
            void navigator.clipboard.writeText(selection.text);
            setSelection(null);
            acknowledge("Copied to clipboard");
          }}
          onDismiss={() => setSelection(null)}
        />
      )}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        preferences={preferences}
        onChange={updatePrefs}
      />
      <NoteDialog
        draft={noteDraft}
        onDraftChange={setNoteDraft}
        onSave={saveNote}
      />
      <TranslateDialog
        translation={translation}
        preferences={preferences}
        onChange={updatePrefs}
        onClose={() => setTranslation(null)}
        onTranslate={(text) => void startTranslation(text)}
      />

      <EditBookDialog
        book={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={saveEdits}
        onReadFileCover={readFileCover}
      />

      <SheetDialog
        open={pendingShelf !== null}
        onOpenChange={(open) => {
          if (!open) setPendingShelf(null);
        }}
      >
        <SheetDialogContent>
          <SheetDialogHeader>
            <div>
              <SheetDialogTitle>Delete this shelf?</SheetDialogTitle>
              <SheetDialogDescription>
              “{pendingShelf?.name}” goes away. The books on it stay in your
              library, under Unsorted.
              </SheetDialogDescription>
            </div>
          </SheetDialogHeader>
          <SheetDialogFooter>
            <SheetDialogClose asChild>
              <SheetDialogButton>Keep it</SheetDialogButton>
            </SheetDialogClose>
            <SheetDialogButton
              primary
              destructive
              onClick={() => void confirmShelfRemoval()}
            >
              Delete shelf
            </SheetDialogButton>
          </SheetDialogFooter>
        </SheetDialogContent>
      </SheetDialog>

      <SheetDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <SheetDialogContent>
          <SheetDialogHeader>
            <div>
              <SheetDialogTitle>Delete this book?</SheetDialogTitle>
              <SheetDialogDescription>
              “{pendingRemoval?.title}” and all of its notes will be deleted
              from this browser. This can’t be undone.
              </SheetDialogDescription>
            </div>
          </SheetDialogHeader>
          <SheetDialogFooter>
            <SheetDialogClose asChild>
              <SheetDialogButton>Keep it</SheetDialogButton>
            </SheetDialogClose>
            <SheetDialogButton
              primary
              destructive
              onClick={() => void confirmRemoval()}
            >
              Delete book
            </SheetDialogButton>
          </SheetDialogFooter>
        </SheetDialogContent>
      </SheetDialog>

    </div>
  );
}
