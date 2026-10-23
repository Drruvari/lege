import { useEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  UploadSimple,
} from "@phosphor-icons/react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { BookMeta } from "@/features/reader";
import { coverFromImage } from "../lib/book-details";
import { BookMetaCover } from "./book-cover";

export interface BookEdits {
  title: string;
  author: string;
  cover?: string;
}

export function EditBookDialog({
  book,
  onOpenChange,
  onSave,
  onReadFileCover,
}: {
  book: BookMeta | null;
  onOpenChange(open: boolean): void;
  onSave(book: BookMeta, edits: BookEdits): void;
  onReadFileCover(book: BookMeta): Promise<string | undefined>;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [cover, setCover] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!book) return;
    setTitle(book.title);
    setAuthor(book.author);
    setCover(book.cover);
    setError("");
  }, [book]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setCover(await coverFromImage(file));
    } catch {
      setError("That image could not be used. Try a JPG or PNG.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function restore() {
    if (!book) return;
    setBusy(true);
    setError("");
    const found = await onReadFileCover(book);
    setBusy(false);
    if (found) setCover(found);
    else setError("This file has no cover image.");
  }

  const preview = book
    ? { ...book, title: title || book.title, author, cover }
    : null;

  return (
    <SheetDialog open={book !== null} onOpenChange={onOpenChange}>
      <SheetDialogContent className="w-[min(36rem,calc(100%-2rem))]">
        <SheetDialogHeader>
          <div>
            <SheetDialogTitle>Edit book</SheetDialogTitle>
            <SheetDialogDescription>
              Change how this book appears in your library.
            </SheetDialogDescription>
          </div>
        </SheetDialogHeader>

        <form
          id="edit-book"
          className="grid gap-6 sm:grid-cols-[9rem_1fr]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!book || !title.trim()) return;
            onSave(book, {
              title: title.trim(),
              author: author.trim(),
              cover,
            });
          }}
        >
          <div className="flex flex-col items-center gap-3 sm:items-stretch">
            {preview && (
              <BookMetaCover book={preview} className="w-32 sm:w-full" />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="book-title">Title</Label>
              <Input
                id="book-title"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="book-author">Author</Label>
              <Input
                id="book-author"
                value={author}
                placeholder="Unknown author"
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Cover</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadSimple data-icon="inline-start" /> Upload image
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void restore()}
                >
                  <ArrowCounterClockwise data-icon="inline-start" /> Use
                  original
                </Button>
                {cover && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setCover(undefined)}
                  >
                    Remove
                  </Button>
                )}
                {busy && <Spinner className="self-center" />}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        </form>

        <SheetDialogFooter>
          <SheetDialogClose asChild>
            <SheetDialogButton>Cancel</SheetDialogButton>
          </SheetDialogClose>
          <SheetDialogButton
            primary
            type="submit"
            form="edit-book"
            disabled={!title.trim() || busy}
          >
            Save changes
          </SheetDialogButton>
        </SheetDialogFooter>
      </SheetDialogContent>
    </SheetDialog>
  );
}
