import type { ReactElement, ReactNode } from "react";
import {
  ArrowCounterClockwiseIcon,
  BookOpenIcon,
  BooksIcon,
  CheckIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  ImageSquareIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import { Button } from "@/components/ballmac/button";
import {
  MacContextMenu,
  MacContextMenuContent,
  MacContextMenuItem,
  MacContextMenuRadioGroup,
  MacContextMenuRadioItem,
  MacContextMenuSeparator,
  MacContextMenuSub,
  MacContextMenuSubContent,
  MacContextMenuSubTrigger,
  MacContextMenuTrigger,
} from "@/components/ballmac/mac-context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BookMeta, Shelf } from "@/features/reader";

export interface BookActions {
  open(book: BookMeta): void;
  edit(book: BookMeta): void;
  changeCover(book: BookMeta): void;
  toggleFinished(book: BookMeta): void;
  moveToShelf(book: BookMeta, shelfId: string | null): void;
  download(book: BookMeta): void;
  remove(book: BookMeta): void;
}

export const isFinished = (book: BookMeta) => book.progress >= 99.5;

interface BookMenuProps {
  book: BookMeta;
  actions: BookActions;
  shelves: Shelf[];
  showOpen?: boolean;
}

function BookMenuItems({
  book,
  actions,
  shelves,
  showOpen = true,
}: BookMenuProps) {
  const finished = isFinished(book);
  return (
    <>
      {showOpen && (
        <>
          <DropdownMenuItem onClick={() => actions.open(book)}>
            <BookOpenIcon />
            {book.progress > 0 ? "Continue reading" : "Start reading"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem onClick={() => actions.edit(book)}>
        <PencilSimpleIcon /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => actions.changeCover(book)}>
        <ImageSquareIcon /> Change cover
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <BooksIcon /> Move to shelf
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-40">
          <DropdownMenuItem onClick={() => actions.moveToShelf(book, null)}>
            <CheckIcon className={book.shelfId ? "invisible" : ""} />
            Unsorted
          </DropdownMenuItem>
          {shelves.map((shelf) => (
            <DropdownMenuItem
              key={shelf.id}
              onClick={() => actions.moveToShelf(book, shelf.id)}
            >
              <CheckIcon className={book.shelfId === shelf.id ? "" : "invisible"} />
              {shelf.name}
            </DropdownMenuItem>
          ))}
          {shelves.length === 0 && (
            <DropdownMenuItem disabled>
              Create a shelf in Library first
            </DropdownMenuItem>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem onClick={() => actions.toggleFinished(book)}>
        {finished ? <ArrowCounterClockwiseIcon /> : <CheckCircleIcon />}
        {finished ? "Mark as unread" : "Mark as finished"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => actions.download(book)}>
        <DownloadSimpleIcon /> Download file
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onClick={() => actions.remove(book)}
      >
        <TrashIcon /> Delete book
      </DropdownMenuItem>
    </>
  );
}

function BookMacMenuItems({
  book,
  actions,
  shelves,
  showOpen = true,
}: BookMenuProps) {
  const finished = isFinished(book);
  return (
    <>
      {showOpen && (
        <>
          <MacContextMenuItem
            icon={<BookOpenIcon />}
            shortcut="↵"
            onSelect={() => actions.open(book)}
          >
            {book.progress > 0 ? "Continue reading" : "Start reading"}
          </MacContextMenuItem>
          <MacContextMenuSeparator />
        </>
      )}
      <MacContextMenuItem
        icon={<PencilSimpleIcon />}
        onSelect={() => actions.edit(book)}
      >
        Rename
      </MacContextMenuItem>
      <MacContextMenuItem
        icon={<ImageSquareIcon />}
        onSelect={() => actions.changeCover(book)}
      >
        Change cover
      </MacContextMenuItem>
      <MacContextMenuSub>
        <MacContextMenuSubTrigger icon={<BooksIcon />}>
          Move to shelf
        </MacContextMenuSubTrigger>
        <MacContextMenuSubContent>
          <MacContextMenuRadioGroup
            value={book.shelfId ?? "unsorted"}
            onValueChange={(value) =>
              actions.moveToShelf(
                book,
                value === "unsorted" ? null : value,
              )
            }
          >
            <MacContextMenuRadioItem value="unsorted">
              Unsorted
            </MacContextMenuRadioItem>
            {shelves.map((shelf) => (
              <MacContextMenuRadioItem key={shelf.id} value={shelf.id}>
                {shelf.name}
              </MacContextMenuRadioItem>
            ))}
          </MacContextMenuRadioGroup>
        </MacContextMenuSubContent>
      </MacContextMenuSub>
      <MacContextMenuItem
        icon={finished ? <ArrowCounterClockwiseIcon /> : <CheckCircleIcon />}
        onSelect={() => actions.toggleFinished(book)}
      >
        {finished ? "Mark as unread" : "Mark as finished"}
      </MacContextMenuItem>
      <MacContextMenuItem
        icon={<DownloadSimpleIcon />}
        onSelect={() => actions.download(book)}
      >
        Download file
      </MacContextMenuItem>
      <MacContextMenuSeparator />
      <MacContextMenuItem
        destructive
        icon={<TrashIcon />}
        onSelect={() => actions.remove(book)}
      >
        Delete book
      </MacContextMenuItem>
    </>
  );
}

export function BookActionsMenu({
  trigger,
  align = "end",
  className,
  ...props
}: BookMenuProps & {
  trigger?: ReactElement;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${props.book.title}`}
              className={className ?? "text-muted-foreground"}
            />
          )
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <BookMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Right-click (or long-press) anywhere on `children` for the book menu. */
export function BookContextMenu({
  children,
  className,
  ...props
}: BookMenuProps & { children: ReactNode; className?: string }) {
  return (
    <MacContextMenu>
      <MacContextMenuTrigger className={className}>
        {children}
      </MacContextMenuTrigger>
      <MacContextMenuContent>
        <BookMacMenuItems {...props} />
      </MacContextMenuContent>
    </MacContextMenu>
  );
}
