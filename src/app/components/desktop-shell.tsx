import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRightIcon,
  BellIcon,
  BookOpenIcon,
  BooksIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  DownloadSimpleIcon,
  FolderIcon,
  GearSixIcon,
  HouseIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  MoonStarsIcon,
  CopyIcon,
  NotePencilIcon,
  PlusIcon,
  SunIcon,
  SunHorizonIcon,
  TextAaIcon,
  TrashIcon,
  UploadSimpleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

import {
  ControlCenter,
  ControlCluster,
  ControlRow,
  ControlSlider,
  ControlTile,
} from "@/components/ballmac/control-center";
import {
  DesktopIcons,
  type DesktopItem,
} from "@/components/ballmac/desktop-icons";
import { Dock, DockItem } from "@/components/ballmac/dock";
import {
  DynamicIsland,
  DynamicIslandView,
} from "@/components/ballmac/dynamic-island";
import {
  FinderWindow,
  type FinderNode,
  type FinderSidebarSection,
} from "@/components/ballmac/finder-window";
import { Hud, type HudKind } from "@/components/ballmac/hud";
import { Launchpad, type LaunchpadApp } from "@/components/ballmac/launchpad";
import { AppIcon } from "@/components/ballmac/mac-icons";
import {
  MenuBar,
  MenuBarCheckboxItem,
  MenuBarClock,
  MenuBarContent,
  MenuBarItem,
  MenuBarMenu,
  MenuBarSeparator,
  MenuBarShortcut,
  MenuBarStatus,
  MenuBarStatusItem,
  MenuBarTrigger,
} from "@/components/ballmac/menu-bar";
import {
  Notification,
  NotificationStack,
} from "@/components/ballmac/notification-stack";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ballmac/segmented-control";
import {
  SpotlightSearchDialog,
  SpotlightSearchEmpty,
  SpotlightSearchFooter,
  SpotlightSearchGroup,
  SpotlightSearchInput,
  SpotlightSearchItem,
  SpotlightSearchList,
} from "@/components/ballmac/spotlight-search";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSpacer,
} from "@/components/ballmac/toolbar";
import {
  WindowManager,
  type ManagedWindow,
} from "@/components/ballmac/window-manager";
import type {
  Annotation,
  BookMeta,
  ReaderPreferences,
  ReaderTheme,
  Shelf,
} from "@/features/reader";
import {
  BookContextMenu,
  type BookActions,
} from "@/features/library/components/book-actions";
import {
  MacContextMenu,
  MacContextMenuContent,
  MacContextMenuItem,
  MacContextMenuSeparator,
  MacContextMenuTrigger,
} from "@/components/ballmac/mac-context-menu";
import { useMediaQuery } from "@/hooks/use-media-query";

export type View = "home" | "library";

export type AppNoticeType = "success" | "error" | "info";

export interface AppNotice {
  id: string;
  title: string;
  body: string;
  type: AppNoticeType;
}

interface DesktopShellProps {
  children: ReactNode;
  view: View;
  books: BookMeta[];
  shelves: Shelf[];
  annotations: Annotation[];
  currentBook: BookMeta | null;
  preferences: ReaderPreferences;
  notices: AppNotice[];
  dragging: boolean;
  importing: boolean;
  onNavigate(view: View): void;
  onAddBook(): void;
  onOpenBook(id: string): void;
  onOpenAnnotation(bookId: string, location: string): void;
  onOpenNotes(): void;
  onEditCurrent(): void;
  onOpenSettings(): void;
  onOpenCurrent(): void;
  onBackup(): void;
  onRestore(): void;
  onPreferencesChange(patch: Partial<ReaderPreferences>): void;
  onDismissNotice(id: string): void;
  onClearNotices(): void;
  bookActions: BookActions;
  onEditAnnotation(item: Annotation): void;
  onDeleteAnnotation(id: string): void;
  onCopyAnnotation(text: string): void;
}

type LibraryMode = "browse" | "organize";

const toPercent = (value: number, min: number, max: number) =>
  ((value - min) / (max - min)) * 100;

const fromPercent = (value: number, min: number, max: number, step: number) =>
  Math.round((min + (value / 100) * (max - min)) / step) * step;

function NoticeIcon({ type }: { type: AppNoticeType }) {
  if (type === "success") return <CheckCircleIcon weight="fill" />;
  if (type === "error") return <XCircleIcon weight="fill" />;
  return <InfoIcon weight="fill" />;
}

function ReadingControlCenter({
  currentBook,
  preferences,
  onAddBook,
  onOpenSettings,
  onOpenCurrent,
  onPreferencesChange,
  onHud,
  onClose,
}: Pick<
  DesktopShellProps,
  | "currentBook"
  | "preferences"
  | "onAddBook"
  | "onOpenSettings"
  | "onOpenCurrent"
  | "onPreferencesChange"
> & {
  onHud(kind: HudKind, value: number): void;
  onClose(): void;
}) {
  function chooseTheme(theme: ReaderTheme, pressed: boolean) {
    if (pressed) onPreferencesChange({ theme });
  }

  return (
    <ControlCenter label="Reading controls">
      <ControlCluster aria-label="Reading theme">
        <ControlRow
          icon={<SunIcon />}
          label="Paper"
          status={preferences.theme === "paper" ? "On" : "Off"}
          pressed={preferences.theme === "paper"}
          onPressedChange={(pressed) => chooseTheme("paper", pressed)}
        />
        <ControlRow
          icon={<SunHorizonIcon />}
          label="Sepia"
          status={preferences.theme === "sepia" ? "On" : "Off"}
          pressed={preferences.theme === "sepia"}
          onPressedChange={(pressed) => chooseTheme("sepia", pressed)}
        />
        <ControlRow
          icon={<MoonStarsIcon />}
          label="Night"
          status={preferences.theme === "night" ? "On" : "Off"}
          pressed={preferences.theme === "night"}
          onPressedChange={(pressed) => chooseTheme("night", pressed)}
        />
      </ControlCluster>

      <ControlTile
        stacked
        icon={currentBook ? <BookOpenIcon /> : <PlusIcon />}
        label={currentBook ? "Resume" : "Add book"}
        status={currentBook?.title ?? "PDF or EPUB"}
        pressed={false}
        onPressedChange={() => {
          if (currentBook) onOpenCurrent();
          else onAddBook();
          onClose();
        }}
      />
      <ControlTile
        stacked
        icon={<GearSixIcon />}
        label="Preferences"
        status="All controls"
        pressed={false}
        onPressedChange={() => {
          onOpenSettings();
          onClose();
        }}
      />

      <ControlSlider
        label={`Text size · ${preferences.fontSize}px`}
        icon={<TextAaIcon />}
        value={toPercent(preferences.fontSize, 14, 26)}
        onValueChange={(value) => {
          onPreferencesChange({
            fontSize: fromPercent(value, 14, 26, 1),
          });
          onHud("keyboard", value);
        }}
      />
      <ControlSlider
        label={`Page width · ${preferences.measure}px`}
        icon={<BookOpenIcon />}
        value={toPercent(preferences.measure, 480, 860)}
        onValueChange={(value) => {
          onPreferencesChange({
            measure: fromPercent(value, 480, 860, 20),
          });
          onHud("brightness", value);
        }}
      />
      <ControlSlider
        label={`Line spacing · ${preferences.lineHeight.toFixed(1)}`}
        icon={<TextAaIcon />}
        value={toPercent(preferences.lineHeight, 1.4, 2)}
        onValueChange={(value) => {
          onPreferencesChange({
            lineHeight: fromPercent(value, 1.4, 2, 0.1),
          });
          onHud("keyboard", value);
        }}
      />
    </ControlCenter>
  );
}

function formatOpened(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function bookFile(book: BookMeta): FinderNode {
  return {
    id: `book:${book.id}`,
    name: book.title,
    kind: "file",
    ext: book.format,
    tone: book.format === "pdf" ? "red" : "purple",
    size: `${Math.round(book.progress)}%`,
    modified: formatOpened(book.lastOpenedAt),
  };
}

function makeFinderData(books: BookMeta[], shelves: Shelf[]) {
  const folder = (
    id: string,
    name: string,
    matches: (book: BookMeta) => boolean,
    tone: FinderNode["tone"] = "blue",
  ): FinderNode => ({
    id,
    name,
    kind: "folder",
    tone,
    children: books.filter(matches).map(bookFile),
  });

  const all = folder("all-books", "All Books", () => true);
  const reading = folder(
    "reading-books",
    "Reading",
    (book) => book.progress > 0 && book.progress < 99.5,
    "green",
  );
  const finished = folder(
    "finished-books",
    "Finished",
    (book) => book.progress >= 99.5,
    "amber",
  );
  const unsorted = folder(
    "unsorted-books",
    "Unsorted",
    (book) => !book.shelfId,
    "graphite",
  );
  const shelfFolders = shelves.map((shelf, index) =>
    folder(
      `shelf:${shelf.id}`,
      shelf.name,
      (book) => book.shelfId === shelf.id,
      index % 2 ? "teal" : "blue",
    ),
  );

  const root: FinderNode = {
    id: "lege-library",
    name: "Lege Library",
    kind: "drive",
    children: [all, reading, finished, unsorted, ...shelfFolders],
  };
  const sidebar: FinderSidebarSection[] = [
    {
      title: "Favorites",
      items: [
        { id: all.id, label: all.name, icon: <BooksIcon weight="fill" /> },
        {
          id: reading.id,
          label: reading.name,
          icon: <BookOpenIcon weight="fill" />,
        },
        {
          id: finished.id,
          label: finished.name,
          icon: <CheckCircleIcon weight="fill" />,
        },
        { id: unsorted.id, label: unsorted.name, icon: <FolderIcon /> },
      ],
    },
    ...(shelfFolders.length
      ? [
          {
            title: "Shelves",
            items: shelfFolders.map((item) => ({
              id: item.id,
              label: item.name,
              icon: <FolderIcon />,
            })),
          },
        ]
      : []),
  ];
  return { root, sidebar };
}

export function DesktopShell({
  children,
  view,
  books,
  shelves,
  annotations,
  currentBook,
  preferences,
  notices,
  dragging,
  importing,
  onNavigate,
  onAddBook,
  onOpenBook,
  onOpenAnnotation,
  onOpenNotes,
  onEditCurrent,
  onOpenSettings,
  onOpenCurrent,
  onBackup,
  onRestore,
  onPreferencesChange,
  onDismissNotice,
  onClearNotices,
  bookActions,
  onEditAnnotation,
  onDeleteAnnotation,
  onCopyAnnotation,
}: DesktopShellProps) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [noticePreviewVisible, setNoticePreviewVisible] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [launchpadOpen, setLaunchpadOpen] = useState(false);
  const [mainOpen, setMainOpen] = useState(true);
  const [mainInstance, setMainInstance] = useState(0);
  const [notesWindowOpen, setNotesWindowOpen] = useState(false);
  const [notesInstance, setNotesInstance] = useState(0);
  const [desktopNotesMode, setDesktopNotesMode] = useState<
    "notes" | "highlights" | "bookmarks"
  >("notes");
  const [helpWindow, setHelpWindow] = useState<"about" | "shortcuts" | null>(
    null,
  );
  const [libraryMode, setLibraryMode] = useState<LibraryMode>("browse");
  const [finderFolder, setFinderFolder] = useState("all-books");
  const [hud, setHud] = useState<{ kind: HudKind; value: number }>({
    kind: "brightness",
    value: 50,
  });
  const [hudVisible, setHudVisible] = useState(false);
  const compact = useMediaQuery("(max-width: 639px)");
  const lastNotice = useRef<string | undefined>(undefined);
  const finder = useMemo(() => makeFinderData(books, shelves), [books, shelves]);

  useEffect(() => {
    if (compact && view === "library" && libraryMode === "browse")
      setLibraryMode("organize");
  }, [compact, libraryMode, view]);

  const desktopItems = useMemo<DesktopItem[]>(
    () => [
      {
        id: "library",
        name: "Lege Library",
        kind: "drive",
        col: 0,
        row: 0,
      },
      ...(currentBook
        ? [
            {
              id: "current",
              name: currentBook.title,
              kind: "app" as const,
              col: 0,
              row: 1,
              tone: "purple" as const,
              glyph: <BookOpenIcon weight="fill" />,
            },
          ]
        : []),
    ],
    [currentBook],
  );

  const launchpadApps = useMemo<LaunchpadApp[]>(
    () => [
      {
        id: "home",
        name: "Reading Desk",
        icon: (
          <AppIcon size={64} tone="blue">
            <HouseIcon weight="fill" />
          </AppIcon>
        ),
      },
      {
        id: "library",
        name: "Library",
        icon: (
          <AppIcon size={64} tone="purple">
            <BooksIcon weight="fill" />
          </AppIcon>
        ),
      },
      {
        id: "reader",
        name: "Reader",
        icon: (
          <AppIcon size={64} tone="amber">
            <BookOpenIcon weight="fill" />
          </AppIcon>
        ),
      },
      {
        id: "notes",
        name: "Notes",
        icon: (
          <AppIcon size={64} tone="orange">
            <NotePencilIcon weight="fill" />
          </AppIcon>
        ),
      },
      {
        id: "search",
        name: "Search",
        icon: (
          <AppIcon size={64} tone="graphite">
            <MagnifyingGlassIcon weight="bold" />
          </AppIcon>
        ),
      },
      {
        id: "settings",
        name: "Settings",
        icon: (
          <AppIcon size={64} tone="graphite">
            <GearSixIcon weight="fill" />
          </AppIcon>
        ),
      },
    ],
    [],
  );

  function showView(next: View, mode?: LibraryMode) {
    onNavigate(next);
    if (mode) setLibraryMode(mode);
    setMainOpen(true);
    setMainInstance((current) => current + 1);
    setLaunchpadOpen(false);
  }

  function showLibrary(folder = "all-books") {
    setFinderFolder(folder);
    showView("library", "browse");
  }

  function showNotesWindow() {
    setNotesWindowOpen(true);
    setNotesInstance((current) => current + 1);
    setLaunchpadOpen(false);
  }

  function showControls() {
    setControlsOpen((open) => !open);
    setNotificationsOpen(false);
    setNoticePreviewVisible(false);
  }

  function showNotifications() {
    if (!notices.length) return;
    setNotificationsOpen((open) => !open);
    setControlsOpen(false);
    setNoticePreviewVisible(false);
  }

  function runAndClose(action: () => void) {
    action();
    setSpotlightOpen(false);
    setLaunchpadOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setControlsOpen(false);
        setNotificationsOpen(false);
        setLaunchpadOpen(false);
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        onAddBook();
      } else if (event.key === ",") {
        event.preventDefault();
        onOpenSettings();
      } else if (event.key === "/") {
        event.preventDefault();
        setHelpWindow("shortcuts");
      } else if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (helpWindow) setHelpWindow(null);
        else if (notesWindowOpen) setNotesWindowOpen(false);
        else setMainOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpWindow, notesWindowOpen, onAddBook, onOpenSettings]);

  const newestNotice = notices[0]?.id;
  useEffect(() => {
    if (!newestNotice) {
      setNoticePreviewVisible(false);
      setNotificationsOpen(false);
      return;
    }
    if (lastNotice.current === newestNotice) return;
    lastNotice.current = newestNotice;
    setNoticePreviewVisible(true);
    const timer = window.setTimeout(() => setNoticePreviewVisible(false), 4800);
    return () => window.clearTimeout(timer);
  }, [newestNotice]);

  const islandView = dragging
    ? "drop"
    : importing
      ? "importing"
      : controlsOpen
        ? "controls"
        : notificationsOpen || noticePreviewVisible
          ? "notifications"
          : "ready";

  const showFinder =
    view === "library" && libraryMode === "browse" && mainOpen;
  const initialWindowWidth =
    typeof window === "undefined" ? 1160 : Math.max(700, window.innerWidth - 96);
  const initialWindowHeight =
    typeof window === "undefined" ? 740 : Math.max(520, window.innerHeight - 132);
  const visibleDesktopAnnotations = annotations
    .filter((item) => {
      if (desktopNotesMode === "bookmarks") return item.kind === "bookmark";
      if (desktopNotesMode === "highlights") return item.kind === "highlight";
      return item.kind === "note";
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  const managedWindows: ManagedWindow[] = [
    ...(mainOpen && !showFinder
      ? [
          {
            id: `lege-main-${mainInstance}`,
            title: view === "home" ? "Lege" : "Lege — Library",
            content: <div className="h-full min-h-0">{children}</div>,
            x: 48,
            y: 32,
            width: initialWindowWidth,
            height: initialWindowHeight,
            minWidth: 640,
            minHeight: 420,
          },
        ]
      : []),
    ...(notesWindowOpen
      ? [
          {
            id: `lege-notes-${notesInstance}`,
            title: "Lege — Notes",
            content: (
              <section className="flex h-full min-h-0 flex-col">
                <Toolbar
                  label="Notes tools"
                  title="Annotations"
                  subtitle={`${visibleDesktopAnnotations.length} saved`}
                >
                  <SegmentedControl
                    value={desktopNotesMode}
                    onValueChange={(value) =>
                      setDesktopNotesMode(
                        value as "notes" | "highlights" | "bookmarks",
                      )
                    }
                    size="sm"
                    aria-label="Annotation type"
                  >
                    <SegmentedControlItem value="notes">Notes</SegmentedControlItem>
                    <SegmentedControlItem value="highlights">Highlights</SegmentedControlItem>
                    <SegmentedControlItem value="bookmarks">Bookmarks</SegmentedControlItem>
                  </SegmentedControl>
                  <ToolbarSpacer />
                  <ToolbarButton
                    aria-label="Open current book notes"
                    icon={<BookOpenIcon />}
                    disabled={!currentBook}
                    onClick={onOpenNotes}
                  >
                    Reader
                  </ToolbarButton>
                </Toolbar>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                  {visibleDesktopAnnotations.length ? (
                    <ul className="divide-y divide-foreground/10">
                      {visibleDesktopAnnotations.map((item) => {
                        const book = books.find((entry) => entry.id === item.bookId);
                        const passage = item.quote || item.note;
                        return (
                          <li key={item.id}>
                            <MacContextMenu>
                              <MacContextMenuTrigger className="block">
                                <div className="flex items-start gap-2 px-2 py-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenAnnotation(item.bookId, item.location)
                                    }
                                    className="min-w-0 flex-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                  >
                                    <span className="block truncate text-sm font-medium">
                                      {item.note ||
                                        item.quote ||
                                        (book?.format === "pdf"
                                          ? `Bookmark on page ${item.location}`
                                          : "Saved bookmark")}
                                    </span>
                                    {item.quote && item.note && (
                                      <span className="mt-1 line-clamp-2 block font-reading text-sm italic text-foreground/70">
                                        “{item.quote}”
                                      </span>
                                    )}
                                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                                      {book?.title ?? "Book"}
                                    </span>
                                  </button>
                                  <div className="flex shrink-0 items-center">
                                    {passage && (
                                      <button
                                        type="button"
                                        aria-label="Copy passage"
                                        onClick={() => onCopyAnnotation(passage)}
                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                                      >
                                        <CopyIcon />
                                      </button>
                                    )}
                                    {item.kind !== "bookmark" && (
                                      <button
                                        type="button"
                                        aria-label={item.note ? "Edit note" : "Add note"}
                                        onClick={() => onEditAnnotation(item)}
                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                                      >
                                        <NotePencilIcon />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      aria-label="Delete"
                                      onClick={() => onDeleteAnnotation(item.id)}
                                      className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-destructive"
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </div>
                              </MacContextMenuTrigger>
                              <MacContextMenuContent>
                                <MacContextMenuItem
                                  icon={<ArrowRightIcon />}
                                  onSelect={() =>
                                    onOpenAnnotation(item.bookId, item.location)
                                  }
                                >
                                  Open in book
                                </MacContextMenuItem>
                                {passage && (
                                  <MacContextMenuItem
                                    icon={<CopyIcon />}
                                    onSelect={() => onCopyAnnotation(passage)}
                                  >
                                    Copy passage
                                  </MacContextMenuItem>
                                )}
                                {item.kind !== "bookmark" && (
                                  <MacContextMenuItem
                                    icon={<NotePencilIcon />}
                                    onSelect={() => onEditAnnotation(item)}
                                  >
                                    {item.note ? "Edit note" : "Add note"}
                                  </MacContextMenuItem>
                                )}
                                <MacContextMenuSeparator />
                                <MacContextMenuItem
                                  destructive
                                  icon={<TrashIcon />}
                                  onSelect={() => onDeleteAnnotation(item.id)}
                                >
                                  Delete
                                </MacContextMenuItem>
                              </MacContextMenuContent>
                            </MacContextMenu>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="grid h-full place-content-center px-6 text-center">
                      <p className="text-sm font-medium">
                        No {desktopNotesMode} yet
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Select text while reading, and the passage shows up here. Right-click a row to open, edit, or delete it.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ),
            x: 720,
            y: 90,
            width: 520,
            height: 610,
            minWidth: 390,
            minHeight: 360,
          },
        ]
      : []),
    ...(helpWindow
      ? [
          {
            id: "lege-help",
            title: helpWindow === "about" ? "About Lege" : "Keyboard Shortcuts",
            content:
              helpWindow === "about" ? (
                <section className="grid h-full place-content-center gap-3 p-8 text-center">
                  <AppIcon size={72} tone="purple" className="mx-auto">
                    <BookOpenIcon weight="fill" />
                  </AppIcon>
                  <div>
                    <h2 className="text-lg font-semibold">Lege</h2>
                    <p className="mt-1 max-w-72 text-sm text-muted-foreground">
                      A private reading desktop for PDF and EPUB books. Your
                      library stays on this device.
                    </p>
                  </div>
                </section>
              ) : (
                <section className="p-6">
                  <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
                  <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-8 gap-y-3 text-sm">
                    <dt>Spotlight search</dt>
                    <dd className="text-muted-foreground">⌘K</dd>
                    <dt>Add books</dt>
                    <dd className="text-muted-foreground">⌘O</dd>
                    <dt>Preferences</dt>
                    <dd className="text-muted-foreground">⌘,</dd>
                    <dt>Next / previous page</dt>
                    <dd className="text-muted-foreground">← →</dd>
                    <dt>Bookmark page</dt>
                    <dd className="text-muted-foreground">B</dd>
                    <dt>Close overlays</dt>
                    <dd className="text-muted-foreground">Esc</dd>
                  </dl>
                </section>
              ),
            x: 260,
            y: 110,
            width: 430,
            height: 340,
            minWidth: 340,
            minHeight: 260,
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted">
      <MenuBar>
        <MenuBarMenu>
          <MenuBarTrigger variant="app">Lege</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarItem onSelect={() => setLaunchpadOpen(true)}>
              Open Launchpad
            </MenuBarItem>
            <MenuBarSeparator />
            <MenuBarItem onSelect={onOpenSettings}>Preferences…</MenuBarItem>
            <MenuBarSeparator />
            <MenuBarItem onSelect={() => setMainOpen(false)} disabled={!mainOpen}>
              Close Window
              <MenuBarShortcut>⌘W</MenuBarShortcut>
            </MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarMenu>
          <MenuBarTrigger>File</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarItem onSelect={onAddBook}>
              Add Books…
              <MenuBarShortcut>⌘O</MenuBarShortcut>
            </MenuBarItem>
            <MenuBarSeparator />
            <MenuBarItem onSelect={onBackup}>Back Up Library…</MenuBarItem>
            <MenuBarItem onSelect={onRestore}>Restore Library…</MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarMenu>
          <MenuBarTrigger className="max-sm:hidden">Edit</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarItem disabled={!currentBook} onSelect={onEditCurrent}>
              Edit Current Book…
            </MenuBarItem>
            <MenuBarSeparator />
            <MenuBarItem onSelect={() => setSpotlightOpen(true)}>
              Find…
              <MenuBarShortcut>⌘K</MenuBarShortcut>
            </MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarMenu>
          <MenuBarTrigger className="max-sm:hidden">View</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarCheckboxItem
              checked={view === "home"}
              onSelect={() => showView("home")}
            >
              Reading Desk
            </MenuBarCheckboxItem>
            <MenuBarCheckboxItem
              checked={view === "library" && libraryMode === "browse"}
              onSelect={() => showLibrary()}
            >
              Browse Library
            </MenuBarCheckboxItem>
            <MenuBarCheckboxItem
              checked={view === "library" && libraryMode === "organize"}
              onSelect={() => showView("library", "organize")}
            >
              Organize Library
            </MenuBarCheckboxItem>
            <MenuBarSeparator />
            <MenuBarItem onSelect={() => setSpotlightOpen(true)}>
              Spotlight Search
              <MenuBarShortcut>⌘K</MenuBarShortcut>
            </MenuBarItem>
            <MenuBarItem onSelect={showControls}>Control Center</MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarMenu>
          <MenuBarTrigger className="max-sm:hidden">Reading</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarItem disabled={!currentBook} onSelect={onOpenCurrent}>
              Resume {currentBook?.title ?? "Book"}
            </MenuBarItem>
            <MenuBarItem disabled={!currentBook} onSelect={onOpenNotes}>
              Open Notes in Reader
            </MenuBarItem>
            <MenuBarItem disabled={!currentBook} onSelect={showNotesWindow}>
              Show Notes Window
            </MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarMenu>
          <MenuBarTrigger className="max-sm:hidden">Window</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarItem onSelect={() => setMainOpen(true)} disabled={mainOpen}>
              Reopen Main Window
            </MenuBarItem>
            <MenuBarItem onSelect={() => setLaunchpadOpen(true)}>
              Show Launchpad
            </MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarMenu>
          <MenuBarTrigger className="max-sm:hidden">Help</MenuBarTrigger>
          <MenuBarContent>
            <MenuBarItem onSelect={() => setHelpWindow("shortcuts")}>
              Keyboard Shortcuts
              <MenuBarShortcut>⌘/</MenuBarShortcut>
            </MenuBarItem>
            <MenuBarSeparator />
            <MenuBarItem onSelect={() => setHelpWindow("about")}>
              About Lege
            </MenuBarItem>
          </MenuBarContent>
        </MenuBarMenu>

        <MenuBarStatus>
          <MenuBarStatusItem
            aria-label="Search"
            onClick={() => setSpotlightOpen(true)}
          >
            <MagnifyingGlassIcon />
          </MenuBarStatusItem>
          <MenuBarStatusItem
            aria-label={
              notices.length
                ? `${notices.length} ${notices.length === 1 ? "notification" : "notifications"}`
                : "No notifications"
            }
            onClick={showNotifications}
            disabled={!notices.length}
            className="disabled:opacity-40"
          >
            <BellIcon weight={notices.length ? "fill" : "regular"} />
          </MenuBarStatusItem>
          <MenuBarStatusItem aria-label="Control Center" onClick={showControls}>
            <GearSixIcon />
          </MenuBarStatusItem>
          <MenuBarClock className="max-sm:hidden" />
        </MenuBarStatus>
      </MenuBar>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <WindowManager
          windows={managedWindows}
          onClose={(id) => {
            if (id === "lege-help") setHelpWindow(null);
            else if (id.startsWith("lege-notes")) setNotesWindowOpen(false);
            else if (id.startsWith("lege-main")) setMainOpen(false);
          }}
          className="absolute inset-0"
          label="Lege desktop"
        >
          <DesktopIcons
            items={desktopItems}
            className={`absolute inset-0 pb-24 max-sm:hidden ${mainOpen ? "invisible" : ""}`}
            onOpen={(item) => {
              if (item.id === "library") showLibrary();
              else if (item.id === "current") onOpenCurrent();
            }}
          />

          {showFinder && (
            <div className="absolute inset-x-3 top-5 bottom-24 mx-auto max-w-328 sm:inset-x-6">
              <FinderWindow
                key={`${finderFolder}:${shelves.length}:${books.length}:${compact ? "compact" : "wide"}`}
                root={finder.root}
                sidebar={finder.sidebar}
                defaultFolder={finderFolder}
                view={compact ? "icons" : "list"}
                className="h-full"
                onOpenFile={(file) => {
                  if (file.id.startsWith("book:"))
                    onOpenBook(file.id.slice("book:".length));
                }}
                wrapItem={(node, item) => {
                  if (!node.id.startsWith("book:")) return item;
                  const book = books.find(
                    (entry) => entry.id === node.id.slice("book:".length),
                  );
                  if (!book) return item;
                  return (
                    <BookContextMenu
                      book={book}
                      shelves={shelves}
                      actions={bookActions}
                      className="block min-w-0"
                    >
                      {item}
                    </BookContextMenu>
                  );
                }}
              />
            </div>
          )}
        </WindowManager>

        {islandView !== "ready" && islandView !== "notifications" && (
        <div className="pointer-events-none absolute top-2 left-1/2 z-30 hidden -translate-x-1/2 sm:block">
          <DynamicIsland view={islandView}>
            <DynamicIslandView
              value="ready"
              label={`${books.length} books in the library`}
              className="h-8 gap-2 px-4 text-xs"
            >
              <BookOpenIcon weight="fill" />
              <span>
                {books.length ? `${books.length} books` : "Ready to read"}
              </span>
            </DynamicIslandView>
            <DynamicIslandView
              value="controls"
              label="Reading controls open"
              className="h-9 gap-2 px-4 text-xs"
            >
              <GearSixIcon weight="fill" />
              <span>Reading controls</span>
            </DynamicIslandView>
            <DynamicIslandView
              value="importing"
              label="Importing books"
              className="h-9 gap-2 px-4 text-xs"
            >
              <CircleNotchIcon className="animate-spin" />
              <span>Importing books…</span>
            </DynamicIslandView>
            <DynamicIslandView
              value="notifications"
              label={`${notices.length} notifications`}
              className="h-9 gap-2 px-4 text-xs"
            >
              <BellIcon weight="fill" />
              <span>
                {notices.length === 1
                  ? "1 notification"
                  : `${notices.length} notifications`}
              </span>
            </DynamicIslandView>
            <DynamicIslandView
              value="drop"
              label="Drop files to add them"
              className="h-10 gap-2 px-5 text-xs"
            >
              <CircleNotchIcon className="animate-spin" />
              <span>Drop to add books</span>
            </DynamicIslandView>
          </DynamicIsland>
        </div>
        )}

        {controlsOpen && (
          <div className="absolute right-3 bottom-24 z-40 max-h-[calc(100%-7rem)] max-w-[calc(100%-1.5rem)] overflow-auto">
            <ReadingControlCenter
              currentBook={currentBook}
              preferences={preferences}
              onAddBook={onAddBook}
              onOpenSettings={onOpenSettings}
              onOpenCurrent={onOpenCurrent}
              onPreferencesChange={onPreferencesChange}
              onHud={(kind, value) => {
                setHud({ kind, value });
                setHudVisible(true);
              }}
              onClose={() => setControlsOpen(false)}
            />
          </div>
        )}

        {(notificationsOpen || noticePreviewVisible) && (
          <div className="absolute top-3 right-3 z-40 w-90 max-w-[calc(100%-1.5rem)]">
            {notices.length > 0 && (
              <NotificationStack
                expanded={notificationsOpen}
                onExpandedChange={(open) => {
                  setNotificationsOpen(open);
                  setNoticePreviewVisible(false);
                }}
                onClearAll={onClearNotices}
              >
                {notices.map((notice) => (
                  <Notification
                    key={notice.id}
                    icon={<NoticeIcon type={notice.type} />}
                    title={notice.title}
                    time="now"
                    onDismiss={() => onDismissNotice(notice.id)}
                  >
                    {notice.body}
                  </Notification>
                ))}
              </NotificationStack>
            )}
          </div>
        )}

        <Hud
          kind={hud.kind}
          value={hud.value}
          visible={hudVisible}
          onVisibleChange={setHudVisible}
          variant="pill"
        />

        <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
          <Dock size={40} magnification={60} distance={112}>
            <DockItem
              label="Reading desk"
              icon={<HouseIcon weight="fill" />}
              active={view === "home" && mainOpen}
              onClick={() => showView("home")}
            />
            <DockItem
              label="Library"
              icon={<BooksIcon weight="fill" />}
              active={view === "library" && mainOpen}
              onClick={() => showLibrary()}
            />
            <DockItem
              label="Reader"
              icon={<BookOpenIcon weight="fill" />}
              disabled={!currentBook}
              onClick={onOpenCurrent}
            />
            <DockItem
              label="Notes"
              icon={<NotePencilIcon weight="fill" />}
              containerClassName="max-sm:hidden"
              active={notesWindowOpen}
              disabled={!currentBook}
              onClick={showNotesWindow}
            />
            <DockItem
              label="Search"
              icon={<MagnifyingGlassIcon weight="bold" />}
              active={spotlightOpen}
              onClick={() => setSpotlightOpen(true)}
            />
            <DockItem
              label="Control Center"
              icon={<GearSixIcon weight="fill" />}
              active={controlsOpen}
              onClick={showControls}
            />
          </Dock>
        </div>

        <Launchpad
          apps={launchpadApps}
          open={launchpadOpen}
          onClose={() => setLaunchpadOpen(false)}
          onLaunch={(app) => {
            if (app.id === "home") showView("home");
            else if (app.id === "library") showLibrary();
            else if (app.id === "reader") runAndClose(onOpenCurrent);
            else if (app.id === "notes") showNotesWindow();
            else if (app.id === "search") {
              setLaunchpadOpen(false);
              setSpotlightOpen(true);
            } else if (app.id === "settings") {
              setLaunchpadOpen(false);
              setControlsOpen(true);
            }
          }}
        />

        <SpotlightSearchDialog
          open={spotlightOpen}
          onOpenChange={setSpotlightOpen}
        >
          <SpotlightSearchInput placeholder="Search books, shelves, and actions" />
          <SpotlightSearchList>
            <SpotlightSearchEmpty>No results found.</SpotlightSearchEmpty>
            <SpotlightSearchGroup heading="Actions">
              <SpotlightSearchItem
                value="reading desk home"
                icon={<HouseIcon weight="fill" />}
                detail="Application"
                onSelect={() => runAndClose(() => showView("home"))}
              >
                Reading Desk
              </SpotlightSearchItem>
              <SpotlightSearchItem
                value="library browse books"
                icon={<BooksIcon weight="fill" />}
                detail="Application"
                onSelect={() =>
                  runAndClose(() => showLibrary())
                }
              >
                Browse Library
              </SpotlightSearchItem>
              <SpotlightSearchItem
                value="organize manage shelves"
                icon={<FolderIcon weight="fill" />}
                detail="Application"
                onSelect={() =>
                  runAndClose(() => showView("library", "organize"))
                }
              >
                Organize Library
              </SpotlightSearchItem>
              <SpotlightSearchItem
                value="add import pdf epub"
                icon={<PlusIcon weight="bold" />}
                detail="Action"
                onSelect={() => runAndClose(onAddBook)}
              >
                Add Books…
              </SpotlightSearchItem>
              <SpotlightSearchItem
                value="backup export library"
                icon={<DownloadSimpleIcon />}
                detail="Action"
                onSelect={() => runAndClose(onBackup)}
              >
                Back Up Library
              </SpotlightSearchItem>
              <SpotlightSearchItem
                value="restore import backup"
                icon={<UploadSimpleIcon />}
                detail="Action"
                onSelect={() => runAndClose(onRestore)}
              >
                Restore Library
              </SpotlightSearchItem>
            </SpotlightSearchGroup>

            {books.length > 0 && (
              <SpotlightSearchGroup heading="Books">
                {books.map((book) => (
                  <SpotlightSearchItem
                    key={book.id}
                    value={`${book.title} ${book.author}`}
                    icon={<BookOpenIcon weight="fill" />}
                    detail={`${book.format.toUpperCase()} · ${Math.round(book.progress)}%`}
                    onSelect={() => runAndClose(() => onOpenBook(book.id))}
                  >
                    {book.title}
                  </SpotlightSearchItem>
                ))}
              </SpotlightSearchGroup>
            )}

            {annotations.some((item) => item.note || item.quote) && (
              <SpotlightSearchGroup heading="Notes & Highlights">
                {annotations
                  .filter((item) => item.note || item.quote)
                  .map((item) => {
                    const book = books.find((entry) => entry.id === item.bookId);
                    const label = item.note || item.quote;
                    return (
                      <SpotlightSearchItem
                        key={item.id}
                        value={`${label} ${book?.title ?? ""}`}
                        icon={
                          item.kind === "highlight" ? (
                            <TextAaIcon />
                          ) : (
                            <NotePencilIcon weight="fill" />
                          )
                        }
                        detail={book?.title ?? "Annotation"}
                        onSelect={() =>
                          runAndClose(() =>
                            onOpenAnnotation(item.bookId, item.location),
                          )
                        }
                      >
                        {label}
                      </SpotlightSearchItem>
                    );
                  })}
              </SpotlightSearchGroup>
            )}

            {shelves.length > 0 && (
              <SpotlightSearchGroup heading="Shelves">
                {shelves.map((shelf) => (
                  <SpotlightSearchItem
                    key={shelf.id}
                    value={`${shelf.name} shelf`}
                    icon={<FolderIcon weight="fill" />}
                    detail="Shelf"
                    onSelect={() =>
                      runAndClose(() => showLibrary(`shelf:${shelf.id}`))
                    }
                  >
                    {shelf.name}
                  </SpotlightSearchItem>
                ))}
              </SpotlightSearchGroup>
            )}
          </SpotlightSearchList>
          <SpotlightSearchFooter>
            <span>↵ Open</span>
            <span>↑↓ Navigate</span>
            <span className="ms-auto">Esc Close</span>
          </SpotlightSearchFooter>
        </SpotlightSearchDialog>
      </div>
    </div>
  );
}
