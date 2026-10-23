import type { CSSProperties } from "react";
import { cn } from "cn";

import { BookCover as LegeBookCover } from "@/components/ui/book-cover";
import type { BookMeta } from "@/features/reader/model/reader-types";

const bookCoverThemes = [
  ["oklch(0.42 0.12 25)", "oklch(0.78 0.11 80)", "oklch(0.96 0.02 85)"],
  ["oklch(0.36 0.06 160)", "oklch(0.8 0.09 95)", "oklch(0.95 0.02 120)"],
  ["oklch(0.34 0.07 255)", "oklch(0.8 0.08 85)", "oklch(0.95 0.015 250)"],
  ["oklch(0.55 0.1 60)", "oklch(0.9 0.07 90)", "oklch(0.98 0.02 85)"],
  ["oklch(0.32 0.05 300)", "oklch(0.78 0.09 75)", "oklch(0.95 0.02 300)"],
  ["oklch(0.4 0.07 200)", "oklch(0.82 0.08 90)", "oklch(0.96 0.02 200)"],
] as const;

export const BOOK_COVER_THEME_COUNT = bookCoverThemes.length;

interface BookCoverProps {
  title: string;
  author?: string;
  color: number;
  src?: string;
  className?: string;
}

export function BookCover({
  title,
  author,
  color,
  src,
  className,
}: BookCoverProps) {
  const [primary, brass, foreground] =
    bookCoverThemes[color % bookCoverThemes.length];
  const style = {
    "--primary": primary,
    "--brass": brass,
    "--primary-foreground": foreground,
  } as CSSProperties;
  return (
    <LegeBookCover
      title={title}
      author={author}
      src={src}
      className={cn("w-full", className)}
      style={style}
    />
  );
}

export function BookMetaCover({
  book,
  className,
}: {
  book: Pick<BookMeta, "title" | "author" | "color" | "cover">;
  className?: string;
}) {
  return (
    <BookCover
      title={book.title}
      author={book.author}
      color={book.color}
      src={book.cover}
      className={className}
    />
  );
}
