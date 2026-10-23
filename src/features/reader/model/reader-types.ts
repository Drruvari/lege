/** Shared domain types for the library and reading workspace. */
export type BookFormat = "epub" | "pdf";
export type ReaderTheme = "paper" | "sepia" | "night";

export interface BookMeta {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  addedAt: number;
  lastOpenedAt: number;
  location: string;
  progress: number;
  color: number;
  totalPages?: number;
  /** JPEG data URL, taken from the file or uploaded by the reader. */
  cover?: string;
  /** Set once cover and metadata extraction has been attempted. */
  detailsChecked?: boolean;
  /** Shelf this book belongs to. Missing means it sits in Unsorted. */
  shelfId?: string;
}

export interface Shelf {
  id: string;
  name: string;
  createdAt: number;
}

export type AnnotationKind = "note" | "highlight" | "bookmark";

/** A highlight box, measured as a fraction of the page so it survives zoom. */
export interface HighlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Annotation {
  id: string;
  bookId: string;
  kind: AnnotationKind;
  location: string;
  quote: string;
  note: string;
  createdAt: number;
  rects?: HighlightRect[];
}

export type ReaderTypeface = "literata" | "charter" | "figtree";

export interface ReaderPreferences {
  theme: ReaderTheme;
  typeface: ReaderTypeface;
  fontSize: number;
  lineHeight: number;
  measure: number;
  pdfZoom: number;
  sourceLang: string;
  targetLang: string;
}

export interface TocEntry {
  label: string;
  href: string;
  depth: number;
  kind?: "chapter" | "page";
  /** Where the entry starts, as a percentage of the whole book. */
  at?: number;
}

export interface CapturedSelection {
  text: string;
  location: string;
  cfi?: string;
  x: number;
  y: number;
  rects?: HighlightRect[];
}

export interface ReaderHandle {
  next(): void;
  prev(): void;
  goTo(location: string): void;
  getLocation(): string;
}

export const DEFAULT_PREFS: ReaderPreferences = {
  theme: "paper",
  typeface: "literata",
  fontSize: 18,
  lineHeight: 1.7,
  measure: 680,
  pdfZoom: 100,
  sourceLang: "en",
  targetLang: "sq",
};

export const PLACEHOLDER_AUTHOR = "Unknown author";

/** Fired on window when the reader taps the page itself, not a control. */
export const PAGE_TAP_EVENT = "lege:page-tap";
