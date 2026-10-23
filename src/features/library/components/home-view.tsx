import { ArrowRight, BookOpen, Books, Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ballmac/button";
import { EmptyState } from "@/components/ballmac/empty-state";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ballmac/item";
import { Progress } from "@/components/ballmac/progress";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSpacer,
} from "@/components/ballmac/toolbar";
import { PhosphorNotebookIcon } from "@/components/ui/phosphor-notebook";
import type { BookMeta, Shelf } from "@/features/reader";
import {
  BookActionsMenu,
  BookContextMenu,
  isFinished,
  type BookActions,
} from "./book-actions";
import { BookMetaCover } from "./book-cover";

interface HomeViewProps {
  books: BookMeta[];
  shelves: Shelf[];
  actions: BookActions;
  onAddBook(): void;
  onViewLibrary(): void;
}

function pickCurrent(books: BookMeta[]) {
  const recent = [...books].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  return (
    recent.find((book) => book.progress > 0 && !isFinished(book)) ?? recent[0]
  );
}

function progressLine(book: BookMeta) {
  const percent = Math.round(book.progress);
  if (isFinished(book)) return "Finished";
  if (book.format === "pdf" && book.totalPages) {
    const page = Math.max(1, Number(book.location) || 1);
    return `Page ${page} of ${book.totalPages}`;
  }
  return percent > 0 ? `${percent}% read` : "Not started";
}

function lastOpened(timestamp: number) {
  const opened = new Date(timestamp);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const openedDay = new Date(
    opened.getFullYear(),
    opened.getMonth(),
    opened.getDate(),
  );
  const days = Math.round((start.getTime() - openedDay.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(opened);
}

export function HomeView({
  books,
  shelves,
  actions,
  onAddBook,
  onViewLibrary,
}: HomeViewProps) {
  const current = pickCurrent(books);
  const recent = [...books]
    .filter((book) => book.id !== current?.id)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, 4);

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden">
      <Toolbar
        label="Reading desk tools"
        title="Reading Desk"
        subtitle={
          books.length
            ? `${books.length} ${books.length === 1 ? "book" : "books"} on this device`
            : "Your private reading space"
        }
      >
        <ToolbarSpacer />
        {books.length > 0 && (
          <>
            <ToolbarButton
              aria-label="Open library"
              icon={<Books weight="fill" />}
              onClick={onViewLibrary}
            >
              <span className="hidden sm:inline">Library</span>
            </ToolbarButton>
            <ToolbarButton
              aria-label="Add books"
              icon={<Plus />}
              onClick={onAddBook}
            >
              <span className="hidden sm:inline">Add</span>
            </ToolbarButton>
          </>
        )}
      </Toolbar>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto min-h-full w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">

        {current ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="continue-heading">
              <h2
                id="continue-heading"
                className="mb-3 text-sm font-semibold"
              >
                Continue reading
              </h2>
              <article className="border-y border-foreground/10 py-5 sm:py-6">
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-7">
                  <BookContextMenu
                    book={current}
                    shelves={shelves}
                    actions={actions}
                    showOpen={false}
                    className="self-start"
                  >
                    <button
                      type="button"
                      onClick={() => actions.open(current)}
                      aria-label={`Open ${current.title}`}
                      className="block w-full rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <BookMetaCover book={current} />
                    </button>
                  </BookContextMenu>

                  <div className="flex min-w-0 flex-col">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {current.format} · Opened {lastOpened(current.lastOpenedAt)}
                      </p>
                      <h2 className="mt-2 line-clamp-3 font-heading text-2xl leading-tight font-semibold sm:text-3xl">
                        {current.title}
                      </h2>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {current.author}
                      </p>
                    </div>

                    <div className="mt-auto pt-6">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {progressLine(current)}
                        </span>
                        <span className="font-medium tabular-nums">
                          {Math.round(current.progress)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.round(current.progress)}
                        aria-label={`${current.title} reading progress`}
                      />
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Button onClick={() => actions.open(current)}>
                          <BookOpen weight="fill" aria-hidden="true" />
                          {current.progress > 0 ? "Resume" : "Start reading"}
                        </Button>
                        <BookActionsMenu
                          book={current}
                          shelves={shelves}
                          actions={actions}
                          showOpen={false}
                          align="start"
                          trigger={
                            <Button variant="outline">Book options</Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <aside aria-labelledby="recent-heading">
              <div className="mb-3 flex h-8 items-center justify-between">
                <h2 id="recent-heading" className="text-sm font-semibold">
                  Recently opened
                </h2>
                <Button variant="ghost" size="sm" onClick={onViewLibrary}>
                  See all
                </Button>
              </div>
              {recent.length ? (
                <ItemGroup role="list" className="gap-0 border-y border-foreground/10">
                  {recent.map((book, index) => (
                    <div key={book.id} role="listitem">
                    {index > 0 && <div className="ms-14 h-px bg-border" />}
                    <BookContextMenu
                      book={book}
                      shelves={shelves}
                      actions={actions}
                    >
                      <Item
                        asChild
                        size="sm"
                        className="rounded-none border-0"
                      >
                        <button
                          type="button"
                          onClick={() => actions.open(book)}
                        >
                          <ItemMedia>
                            <BookMetaCover book={book} className="w-10" />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle className="block w-full truncate">
                              {book.title}
                            </ItemTitle>
                            <ItemDescription className="line-clamp-1 text-xs">
                              {book.author} · {progressLine(book)}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <ArrowRight
                              className="size-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </ItemActions>
                        </button>
                      </Item>
                    </BookContextMenu>
                    </div>
                  ))}
                </ItemGroup>
              ) : (
                <Item variant="muted" size="sm">
                  <ItemContent>
                    <ItemTitle>No other books yet</ItemTitle>
                    <ItemDescription>
                      Add another PDF or EPUB when you are ready.
                    </ItemDescription>
                  </ItemContent>
                </Item>
              )}
            </aside>
          </div>
        ) : (
          <EmptyState
            className="min-h-[28rem] border-0 bg-transparent"
            title="Add your first book"
            description="Choose a PDF or EPUB from this device. Your library, progress, and notes stay in this browser."
            icon={<PhosphorNotebookIcon size={26} />}
            action={
              <Button onClick={onAddBook}>
                <Plus />
                Choose files
              </Button>
            }
          />
        )}
      </div>
      </div>
    </main>
  );
}
