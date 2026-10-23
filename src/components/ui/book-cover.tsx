import * as React from "react";
import { cn } from "cn";

/** A flat, bookcloth-inspired cover with a typographic fallback. */
function BookCover({
  title,
  author,
  src,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  title: string;
  author?: string;
  src?: string;
}) {
  return (
    <div
      data-slot="book-cover"
      className={cn(
        "@container/book relative aspect-2/3 w-36 shrink-0",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden rounded-r-md rounded-l-[2px] border-l-[5px] border-black/18 bg-primary text-primary-foreground shadow-[4px_7px_12px_-8px_oklch(0.2_0.04_45/0.7)]">
        {src ? (
          <img
            src={src}
            alt={`Cover of ${title}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col px-[12%] py-[14%] @max-[6rem]/book:p-2">
            <span
              className="block h-px w-8 bg-brass/80 @max-[6rem]/book:w-4"
              aria-hidden="true"
            />
            <div className="my-auto">
              <div className="line-clamp-5 font-heading text-base leading-[1.05] font-semibold text-balance @[11rem]/book:text-xl @[15rem]/book:text-2xl">
                {title}
              </div>
              {author && (
                <div className="mt-3 line-clamp-2 text-[0.58rem] leading-tight tracking-[0.1em] text-primary-foreground/72 uppercase @[11rem]/book:text-[0.65rem]">
                  {author}
                </div>
              )}
            </div>
            <span className="font-heading text-[0.55rem] italic text-brass">
              Lege
            </span>
          </div>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1 w-px bg-black/22"
        />
      </div>
      <span
        aria-hidden="true"
        className="absolute top-1 -right-0.5 bottom-1 -z-10 w-1 rounded-r-sm bg-page ring-1 ring-border"
      />
    </div>
  );
}

export { BookCover };
