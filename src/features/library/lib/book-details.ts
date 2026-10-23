import type { BookFormat } from "@/features/reader/model/reader-types";

export interface BookDetails {
  title?: string;
  author?: string;
  cover?: string;
}

const COVER_WIDTH = 400;

export function titleFromFileName(name: string) {
  const base = name
    .replace(/\.(epub|pdf)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) return "Untitled";
  const small = new Set(["a", "an", "and", "of", "on", "the", "in", "to"]);
  return base
    .split(" ")
    .map((word, index) =>
      index > 0 && small.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 2 || text.length > 200) return undefined;
  if (/^(untitled|unknown|anonymous)$/i.test(text)) return undefined;
  if (/\.(pdf|docx?|indd|tex|rtf|txt)$/i.test(text)) return undefined;
  if (/^microsoft (word|powerpoint)/i.test(text)) return undefined;
  return text;
}

function canvasToCover(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.84);
}

async function imageToCover(source: Blob) {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, COVER_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToCover(canvas);
}

/** Resizes an uploaded image into a cover the library can store. */
export function coverFromImage(file: Blob) {
  return imageToCover(file);
}

async function pdfDetails(file: Blob): Promise<BookDetails> {
  const { pdfjs } = await import("@/features/reader/lib/pdfjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const doc = await task.promise;
  try {
    const details: BookDetails = {};
    try {
      const { info } = (await doc.getMetadata()) as unknown as {
        info?: Record<string, unknown>;
      };
      details.title = cleanText(info?.Title);
      details.author = cleanText(info?.Author);
    } catch {
      /* metadata is optional */
    }
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(4, COVER_WIDTH / Math.max(1, base.width)),
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    details.cover = canvasToCover(canvas);
    return details;
  } finally {
    void task.destroy();
  }
}

async function epubDetails(file: Blob): Promise<BookDetails> {
  const { default: ePub } = await import("epubjs");
  const book = ePub(await file.arrayBuffer());
  try {
    await book.ready;
    const metadata = (await book.loaded.metadata) as {
      title?: string;
      creator?: string;
    };
    const details: BookDetails = {
      title: cleanText(metadata.title),
      author: cleanText(metadata.creator),
    };
    try {
      const url = await book.coverUrl();
      if (url)
        details.cover = await imageToCover(await (await fetch(url)).blob());
    } catch {
      /* some EPUBs have no cover image */
    }
    return details;
  } finally {
    book.destroy();
  }
}

/** Reads title, author and a cover image from the book file itself. */
export async function readBookDetails(
  file: Blob,
  format: BookFormat,
): Promise<BookDetails> {
  try {
    return format === "pdf" ? await pdfDetails(file) : await epubDetails(file);
  } catch {
    return {};
  }
}
