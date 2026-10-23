import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpenIcon,
  BooksIcon,
  CheckCircleIcon,
  FolderIcon,
  FolderOpenIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ballmac/button";
import { EmptyState } from "@/components/ballmac/empty-state";
import {
  MacContextMenu,
  MacContextMenuContent,
  MacContextMenuItem,
  MacContextMenuSeparator,
  MacContextMenuTrigger,
} from "@/components/ballmac/mac-context-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ballmac/item";
import {
  MacWindowSidebar,
  MacWindowSidebarItem,
} from "@/components/ballmac/mac-window";
import { Progress } from "@/components/ballmac/progress";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ballmac/segmented-control";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSearch,
  ToolbarSpacer,
} from "@/components/ballmac/toolbar";
import { PhosphorNotebookIcon } from "@/components/ui/phosphor-notebook";
import type { BookMeta, Shelf } from "@/features/reader";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  BookActionsMenu,
  BookContextMenu,
  isFinished,
  type BookActions,
} from "./book-actions";
import { BookMetaCover } from "./book-cover";

type Scope =
  | "all"
  | "reading"
  | "finished"
  | "unsorted"
  | `shelf:${string}`;
type Sort = "recent" | "title" | "progress";

interface LibraryViewProps {
  books: BookMeta[];
  shelves: Shelf[];
  actions: BookActions;
  onAddBook(): void;
  onCreateShelf(name: string): void;
  onRenameShelf(id: string, name: string): void;
  onDeleteShelf(shelf: Shelf): void;
}

const isReading = (book: BookMeta) => book.progress > 0 && !isFinished(book);

export function LibraryView({
  books,
  shelves,
  actions,
  onAddBook,
  onCreateShelf,
  onRenameShelf,
  onDeleteShelf,
}: LibraryViewProps) {
  const [scope, setScope] = useState<Scope>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const compact = useMediaQuery("(max-width: 767px)");

  const shelfId = scope.startsWith("shelf:") ? scope.slice(6) : null;
  const currentShelf = shelves.find((shelf) => shelf.id === shelfId);
  const counts = useMemo(
    () => ({
      all: books.length,
      reading: books.filter(isReading).length,
      finished: books.filter(isFinished).length,
      unsorted: books.filter((book) => !book.shelfId).length,
    }),
    [books],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return books
      .filter((book) => {
        if (scope === "reading") return isReading(book);
        if (scope === "finished") return isFinished(book);
        if (scope === "unsorted") return !book.shelfId;
        if (scope.startsWith("shelf:")) return book.shelfId === shelfId;
        return true;
      })
      .filter((book) =>
        `${book.title} ${book.author}`.toLocaleLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "progress") return b.progress - a.progress;
        return b.lastOpenedAt - a.lastOpenedAt;
      });
  }, [books, scope, shelfId, search, sort]);

  const scopeName =
    scope === "all"
      ? "All Books"
      : scope === "reading"
        ? "Reading"
        : scope === "finished"
          ? "Finished"
          : scope === "unsorted"
            ? "Unsorted"
            : (currentShelf?.name ?? "Shelf");

  function submitShelf() {
    const name = draft.trim();
    if (name) onCreateShelf(name);
    setDraft("");
    setCreating(false);
  }

  function startRename(shelf: Shelf) {
    setRenaming(shelf.id);
    setRenameValue(shelf.name);
  }

  function submitRename(shelf: Shelf) {
    const name = renameValue.trim();
    if (name && name !== shelf.name) onRenameShelf(shelf.id, name);
    setRenaming(null);
  }

  function deleteShelf(shelf: Shelf) {
    if (shelfId === shelf.id) setScope("all");
    onDeleteShelf(shelf);
  }

  const empty = getEmptyCopy(scope, Boolean(search));

  return (
    <main className="flex h-full min-h-0 overflow-hidden bg-card">
      <MacWindowSidebar
        controls={false}
        aria-label="Library sources"
        className="hidden w-52 pt-3 md:flex"
      >
        <SidebarLabel>Library</SidebarLabel>
        <div className="px-2">
          <SourceItem
            selected={scope === "all"}
            icon={<BooksIcon weight="fill" />}
            label="All Books"
            count={counts.all}
            onClick={() => setScope("all")}
          />
          <SourceItem
            selected={scope === "reading"}
            icon={<BookOpenIcon weight="fill" />}
            label="Reading"
            count={counts.reading}
            onClick={() => setScope("reading")}
          />
          <SourceItem
            selected={scope === "finished"}
            icon={<CheckCircleIcon weight="fill" />}
            label="Finished"
            count={counts.finished}
            onClick={() => setScope("finished")}
          />
          <SourceItem
            selected={scope === "unsorted"}
            icon={<FolderOpenIcon weight="fill" />}
            label="Unsorted"
            count={counts.unsorted}
            onClick={() => setScope("unsorted")}
          />
        </div>

        <div className="mt-5 flex items-center justify-between px-4 pb-1">
          <SidebarLabel className="px-0 pb-0">Shelves</SidebarLabel>
          <button
            type="button"
            aria-label="New shelf"
            title="New shelf"
            onClick={() => setCreating(true)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/6 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {shelves.map((shelf) =>
            renaming === shelf.id && !compact ? (
              <ShelfInput
                key={shelf.id}
                label="Shelf name"
                value={renameValue}
                onChange={setRenameValue}
                onCancel={() => setRenaming(null)}
                onSubmit={() => submitRename(shelf)}
              />
            ) : (
              <MacContextMenu key={shelf.id}>
                <MacContextMenuTrigger className="block">
                  <SourceItem
                    selected={scope === `shelf:${shelf.id}`}
                    icon={<FolderIcon weight="fill" />}
                    label={shelf.name}
                    count={
                      books.filter((book) => book.shelfId === shelf.id).length
                    }
                    onClick={() => setScope(`shelf:${shelf.id}`)}
                  />
                </MacContextMenuTrigger>
                <MacContextMenuContent>
                  <MacContextMenuItem
                    icon={<PencilSimpleIcon />}
                    onSelect={() => startRename(shelf)}
                  >
                    Rename shelf
                  </MacContextMenuItem>
                  <MacContextMenuSeparator />
                  <MacContextMenuItem
                    destructive
                    icon={<TrashIcon />}
                    onSelect={() => deleteShelf(shelf)}
                  >
                    Delete shelf
                  </MacContextMenuItem>
                </MacContextMenuContent>
              </MacContextMenu>
            ),
          )}
          {creating && !compact && (
            <ShelfInput
              label="New shelf name"
              placeholder="New shelf"
              value={draft}
              onChange={setDraft}
              onCancel={() => {
                setDraft("");
                setCreating(false);
              }}
              onSubmit={submitShelf}
            />
          )}
          {!shelves.length && !creating && (
            <p className="px-2 py-1 text-xs leading-relaxed text-muted-foreground">
              Create a shelf to group books.
            </p>
          )}
        </div>
      </MacWindowSidebar>

      <section className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          label="Library tools"
          title={scopeName}
          subtitle={`${visible.length} ${visible.length === 1 ? "book" : "books"}`}
          className="bg-background/70"
        >
          <ToolbarSpacer />
          <SegmentedControl
            value={sort}
            onValueChange={(value) => setSort(value as Sort)}
            aria-label="Sort books"
            size="sm"
            className="hidden lg:flex"
          >
            <SegmentedControlItem value="recent">Recent</SegmentedControlItem>
            <SegmentedControlItem value="title">Title</SegmentedControlItem>
            <SegmentedControlItem value="progress">
              Progress
            </SegmentedControlItem>
          </SegmentedControl>
          <ToolbarButton
            aria-label="Add books"
            icon={<PlusIcon />}
            onClick={onAddBook}
          >
            <span className="hidden sm:inline">Add</span>
          </ToolbarButton>
          <ToolbarSearch
            aria-label="Search books"
            placeholder="Search books"
            collapsedWidth="7.5rem"
            expandedWidth="14rem"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
          />
        </Toolbar>

        <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
          <MobileScope
            selected={scope === "all"}
            onClick={() => setScope("all")}
          >
            All {counts.all}
          </MobileScope>
          <MobileScope
            selected={scope === "reading"}
            onClick={() => setScope("reading")}
          >
            Reading {counts.reading}
          </MobileScope>
          <MobileScope
            selected={scope === "finished"}
            onClick={() => setScope("finished")}
          >
            Finished {counts.finished}
          </MobileScope>
          <MobileScope
            selected={scope === "unsorted"}
            onClick={() => setScope("unsorted")}
          >
            Unsorted {counts.unsorted}
          </MobileScope>
          {shelves.map((shelf) => (
            <MacContextMenu key={shelf.id}>
              <MacContextMenuTrigger className="block shrink-0">
                <MobileScope
                  selected={scope === `shelf:${shelf.id}`}
                  onClick={() => setScope(`shelf:${shelf.id}`)}
                >
                  {shelf.name}
                </MobileScope>
              </MacContextMenuTrigger>
              <MacContextMenuContent>
                <MacContextMenuItem
                  icon={<PencilSimpleIcon />}
                  onSelect={() => startRename(shelf)}
                >
                  Rename shelf
                </MacContextMenuItem>
                <MacContextMenuSeparator />
                <MacContextMenuItem
                  destructive
                  icon={<TrashIcon />}
                  onSelect={() => deleteShelf(shelf)}
                >
                  Delete shelf
                </MacContextMenuItem>
              </MacContextMenuContent>
            </MacContextMenu>
          ))}
          <MobileScope selected={false} onClick={() => setCreating(true)}>
            <PlusIcon /> New shelf
          </MobileScope>
        </div>

        {compact && creating && (
          <div className="border-b px-3 py-2">
            <ShelfInput
              label="New shelf name"
              placeholder="New shelf"
              value={draft}
              onChange={setDraft}
              onCancel={() => {
                setDraft("");
                setCreating(false);
              }}
              onSubmit={submitShelf}
            />
          </div>
        )}
        {compact && renaming && shelves.find((shelf) => shelf.id === renaming) && (
          <div className="border-b px-3 py-2">
            <ShelfInput
              label="Shelf name"
              value={renameValue}
              onChange={setRenameValue}
              onCancel={() => setRenaming(null)}
              onSubmit={() => {
                const shelf = shelves.find((item) => item.id === renaming);
                if (shelf) submitRename(shelf);
              }}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {books.length === 0 ? (
            <EmptyState
              className="min-h-full border-0 bg-transparent"
              title="Your library is empty"
              description="Add a PDF or EPUB, or drop files anywhere in this window."
              icon={<PhosphorNotebookIcon size={26} />}
              action={
                <Button onClick={onAddBook}>
                  <PlusIcon /> Add books
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              compact
              className="min-h-full border-0 bg-transparent"
              title={empty.title}
              description={empty.body}
              icon={
                scope === "reading" ? (
                  <BookOpenIcon />
                ) : scope === "finished" ? (
                  <CheckCircleIcon />
                ) : (
                  <PhosphorNotebookIcon size={26} />
                )
              }
              action={
                search ? (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ItemGroup role="list" className="gap-0">
              {visible.map((book, index) => (
                <div key={book.id} role="listitem">
                  {index > 0 && <ItemSeparator className="ms-18 w-auto" />}
                  <BookRow
                    book={book}
                    shelf={shelves.find((item) => item.id === book.shelfId)}
                    showShelf={scope !== `shelf:${book.shelfId}`}
                    shelves={shelves}
                    actions={actions}
                  />
                </div>
              ))}
            </ItemGroup>
          )}
        </div>
      </section>
    </main>
  );
}

function SidebarLabel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2
      className={`px-4 pb-1 text-[11px] font-semibold text-muted-foreground ${className}`}
    >
      {children}
    </h2>
  );
}

function SourceItem({
  selected,
  icon,
  label,
  count,
  onClick,
}: {
  selected: boolean;
  icon: ReactNode;
  label: string;
  count: number;
  onClick(): void;
}) {
  return (
    <MacWindowSidebarItem selected={selected} onClick={onClick}>
      <span className="text-primary">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {count}
      </span>
    </MacWindowSidebarItem>
  );
}

function ShelfInput({
  label,
  placeholder,
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange(value: string): void;
  onCancel(): void;
  onSubmit(): void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="px-1 py-0.5"
    >
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        autoFocus
        onFocus={(event) => event.target.select()}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.dataset.cancelled = "true";
            onCancel();
            event.currentTarget.blur();
          }
        }}
        onBlur={(event) => {
          if (event.currentTarget.dataset.cancelled) return;
          onSubmit();
        }}
        className="h-7 w-full rounded-md border bg-background px-2 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </form>
  );
}

function MobileScope({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      aria-current={selected ? "page" : undefined}
      className="shrink-0"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function BookRow({
  book,
  shelf,
  showShelf,
  shelves,
  actions,
}: {
  book: BookMeta;
  shelf?: Shelf;
  showShelf: boolean;
  shelves: Shelf[];
  actions: BookActions;
}) {
  const progress = Math.round(book.progress);
  return (
    <BookContextMenu book={book} shelves={shelves} actions={actions}>
      <Item className="rounded-none border-0 px-4 py-3 transition-colors hover:bg-foreground/2.5 focus-within:bg-foreground/2.5 sm:px-5">
        <ItemMedia>
          <button
            type="button"
            onClick={() => actions.open(book)}
            className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`Open ${book.title}`}
          >
            <BookMetaCover book={book} className="w-10 sm:w-11" />
          </button>
        </ItemMedia>
        <ItemContent>
          <button
            type="button"
            onClick={() => actions.open(book)}
            className="min-w-0 text-left outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ItemTitle className="block w-full truncate font-heading text-base">
              {book.title}
            </ItemTitle>
            <ItemDescription className="line-clamp-1 text-xs">
              {book.author} · {book.format.toUpperCase()}
              {showShelf ? ` · ${shelf?.name ?? "Unsorted"}` : ""}
            </ItemDescription>
          </button>
        </ItemContent>
        <ItemActions className="ml-auto">
          <div className="hidden w-28 sm:block">
            <Progress
              value={progress}
              aria-label={`${book.title} reading progress`}
            />
          </div>
          <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
            {isFinished(book)
              ? "Finished"
              : progress > 0
                ? `${progress}%`
                : "Unread"}
          </span>
          <BookActionsMenu
            book={book}
            shelves={shelves}
            actions={actions}
            className="text-muted-foreground"
          />
        </ItemActions>
      </Item>
    </BookContextMenu>
  );
}

function getEmptyCopy(scope: Scope, searching: boolean) {
  if (searching)
    return { title: "No matches", body: "Try another title or author." };
  if (scope === "reading")
    return {
      title: "Nothing in progress",
      body: "Books appear here after you start reading.",
    };
  if (scope === "finished")
    return {
      title: "Nothing finished yet",
      body: "Completed books appear here automatically.",
    };
  if (scope === "unsorted")
    return {
      title: "No unsorted books",
      body: "Every book is already on a shelf.",
    };
  return {
    title: "Nothing on this shelf",
    body: "Move a book here from its options menu.",
  };
}
