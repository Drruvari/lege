import {
  addBook,
  getFile,
  listAllAnnotations,
  listBooks,
  listShelves,
  saveAnnotations,
  saveShelf,
  type Annotation,
  type BookMeta,
  type Shelf,
} from "@/features/reader";

interface LibraryBackup {
  format: "lege-library";
  version: 1;
  exportedAt: string;
  shelves: Shelf[];
  books: BookMeta[];
  annotations: { bookId: string; items: Annotation[] }[];
  files: { id: string; type: string; data: string }[];
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.slice(value.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data: string, type: string) {
  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type });
}

/** A copy of the whole library, including the book files, that can be restored later. */
export async function createLibraryBackup() {
  const [books, shelves, annotations] = await Promise.all([
    listBooks(),
    listShelves(),
    listAllAnnotations(),
  ]);
  const files = (
    await Promise.all(
      books.map(async (book) => {
        const file = await getFile(book.id);
        if (!file) return null;
        return { id: book.id, type: file.type, data: await blobToBase64(file) };
      }),
    )
  ).filter((file) => file !== null);

  const backup: LibraryBackup = {
    format: "lege-library",
    version: 1,
    exportedAt: new Date().toISOString(),
    shelves,
    books,
    annotations,
    files,
  };
  return new Blob([JSON.stringify(backup)], { type: "application/json" });
}

export interface RestoreResult {
  added: number;
  skipped: number;
}

/**
 * Restores a backup without replacing anything already in the library.
 * A book that is already here keeps its file, notes and place.
 */
export async function restoreLibraryBackup(file: Blob): Promise<RestoreResult> {
  const parsed = JSON.parse(await file.text()) as Partial<LibraryBackup>;
  if (parsed.format !== "lege-library" || !Array.isArray(parsed.books)) {
    throw new Error("This file is not a Lege library backup.");
  }
  const existing = new Set((await listBooks()).map((book) => book.id));
  const knownShelves = new Set((await listShelves()).map((shelf) => shelf.id));

  for (const shelf of parsed.shelves ?? []) {
    if (shelf?.id && shelf.name && !knownShelves.has(shelf.id)) {
      await saveShelf(shelf);
    }
  }

  const files = new Map((parsed.files ?? []).map((item) => [item.id, item]));
  let added = 0;
  let skipped = 0;
  for (const book of parsed.books) {
    if (!book?.id || existing.has(book.id)) {
      skipped += 1;
      continue;
    }
    const stored = files.get(book.id);
    if (!stored?.data) {
      skipped += 1;
      continue;
    }
    await addBook(book, base64ToBlob(stored.data, stored.type || ""));
    const notes = (parsed.annotations ?? []).find(
      (group) => group.bookId === book.id,
    );
    if (notes?.items?.length) await saveAnnotations(book.id, notes.items);
    added += 1;
  }
  return { added, skipped };
}
