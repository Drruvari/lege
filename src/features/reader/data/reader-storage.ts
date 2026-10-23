import { openDB, type DBSchema } from "idb";
import type {
  Annotation,
  BookMeta,
  ReaderPreferences,
  Shelf,
} from "../model/reader-types";

interface LegeDB extends DBSchema {
  books: { key: string; value: BookMeta };
  files: { key: string; value: Blob };
  annotations: { key: string; value: Annotation[] };
  settings: { key: string; value: ReaderPreferences };
  shelves: { key: string; value: Shelf };
  covers: { key: string; value: string };
}

const DATABASE_NAME = "lege-reader";
const LEGACY_DATABASE_NAME = "margin-reader";
const DEMO_BOOK_ID = "lege-guide";
const LEGACY_DEMO_BOOK_ID = "margin-guide";
const STORES = [
  "books",
  "files",
  "annotations",
  "settings",
  "shelves",
  "covers",
] as const;

function migrateBookKey(key: IDBValidKey) {
  return String(key) === LEGACY_DEMO_BOOK_ID ? DEMO_BOOK_ID : String(key);
}

function openReaderDatabase(name: string) {
  return openDB<LegeDB>(name, 2, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    },
  });
}

async function migrateLegacyLibrary(
  db: Awaited<ReturnType<typeof openReaderDatabase>>,
) {
  try {
    if (!indexedDB.databases) return;
    const knownDatabases = await indexedDB.databases();
    if (!knownDatabases.some((item) => item.name === LEGACY_DATABASE_NAME))
      return;

    const hasLegeData = (
      await Promise.all([
        db.count("books"),
        db.count("files"),
        db.count("annotations"),
        db.count("settings"),
      ])
    ).some(Boolean);
    if (hasLegeData) return;

    const legacy = await openReaderDatabase(LEGACY_DATABASE_NAME);
    const [
      bookKeys,
      books,
      fileKeys,
      files,
      annotationKeys,
      annotations,
      settingKeys,
      settings,
    ] = await Promise.all([
      legacy.getAllKeys("books"),
      legacy.getAll("books"),
      legacy.getAllKeys("files"),
      legacy.getAll("files"),
      legacy.getAllKeys("annotations"),
      legacy.getAll("annotations"),
      legacy.getAllKeys("settings"),
      legacy.getAll("settings"),
    ]);
    const tx = db.transaction(
      ["books", "files", "annotations", "settings"],
      "readwrite",
    );
    await Promise.all([
      ...books.map((value, index) => {
        const key = migrateBookKey(bookKeys[index]);
        return tx
          .objectStore("books")
          .put(
            value.id === LEGACY_DEMO_BOOK_ID
              ? { ...value, id: DEMO_BOOK_ID }
              : value,
            key,
          );
      }),
      ...files.map((value, index) =>
        tx.objectStore("files").put(value, migrateBookKey(fileKeys[index])),
      ),
      ...annotations.map((value, index) =>
        tx.objectStore("annotations").put(
          value.map((item) =>
            item.bookId === LEGACY_DEMO_BOOK_ID
              ? { ...item, bookId: DEMO_BOOK_ID }
              : item,
          ),
          migrateBookKey(annotationKeys[index]),
        ),
      ),
      ...settings.map((value, index) =>
        tx.objectStore("settings").put(value, settingKeys[index] as string),
      ),
    ]);
    await tx.done;
    legacy.close();
  } catch {
    // A rename must never prevent the reader from opening in browsers without database enumeration.
  }
}

const database = (async () => {
  const db = await openReaderDatabase(DATABASE_NAME);
  await migrateLegacyLibrary(db);
  await separateCovers(db);
  return db;
})();

/** Covers live beside the book record, so a progress save stays small and
 *  cannot fail just because the cover image is large. */
async function separateCovers(
  db: Awaited<ReturnType<typeof openReaderDatabase>>,
) {
  const books = await db.getAll("books");
  const embedded = books.filter((book) => book.cover);
  if (!embedded.length) return;
  const tx = db.transaction(["books", "covers"], "readwrite");
  await Promise.all(
    embedded.flatMap((book) => {
      const { cover, ...rest } = book;
      return [
        tx.objectStore("covers").put(cover as string, book.id),
        tx.objectStore("books").put(rest, book.id),
      ];
    }),
  );
  await tx.done;
}

async function withCovers(books: BookMeta[]) {
  const db = await database;
  const [keys, covers] = await Promise.all([
    db.getAllKeys("covers"),
    db.getAll("covers"),
  ]);
  const byId = new Map(keys.map((key, index) => [String(key), covers[index]]));
  return books.map((book) => {
    const cover = byId.get(book.id) ?? book.cover;
    return cover ? { ...book, cover } : book;
  });
}

function withoutCover(book: BookMeta) {
  const rest = { ...book };
  delete rest.cover;
  return rest;
}

const RETIRED_SAMPLE_IDS = new Set([DEMO_BOOK_ID, LEGACY_DEMO_BOOK_ID]);

export async function listBooks() {
  const db = await database;
  const books = await db.getAll("books");
  const retired = books.filter(
    (book) =>
      RETIRED_SAMPLE_IDS.has(book.id) || (book.format as string) === "sample",
  );
  if (retired.length) {
    const tx = db.transaction(["books", "annotations"], "readwrite");
    await Promise.all(
      retired.flatMap((book) => [
        tx.objectStore("books").delete(book.id),
        tx.objectStore("annotations").delete(book.id),
      ]),
    );
    await tx.done;
  }
  return withCovers(books.filter((book) => !retired.includes(book)));
}

export async function addBook(meta: BookMeta, file: Blob) {
  const db = await database;
  const tx = db.transaction(["books", "files", "covers"], "readwrite");
  await Promise.all([
    tx.objectStore("books").put(withoutCover(meta), meta.id),
    tx.objectStore("files").put(file, meta.id),
    meta.cover
      ? tx.objectStore("covers").put(meta.cover, meta.id)
      : Promise.resolve(),
  ]);
  await tx.done;
}

export async function saveBook(meta: BookMeta) {
  const db = await database;
  // The book record is saved before the cover, so reading progress survives
  // even when the cover image cannot be stored.
  await db.put("books", withoutCover(meta), meta.id);
  if (meta.cover) await db.put("covers", meta.cover, meta.id);
  else await db.delete("covers", meta.id);
}

export async function getFile(id: string) {
  const db = await database;
  return db.get("files", id);
}

export async function deleteBook(id: string) {
  const db = await database;
  const tx = db.transaction(
    ["books", "files", "annotations", "covers"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("books").delete(id),
    tx.objectStore("files").delete(id),
    tx.objectStore("annotations").delete(id),
    tx.objectStore("covers").delete(id),
  ]);
  await tx.done;
}

export async function listShelves() {
  const db = await database;
  const shelves = await db.getAll("shelves");
  return shelves.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveShelf(shelf: Shelf) {
  const db = await database;
  await db.put("shelves", shelf, shelf.id);
}

/** Removes the shelf only. Every book that was on it stays in the library. */
export async function deleteShelf(id: string) {
  const db = await database;
  const books = await db.getAll("books");
  const tx = db.transaction(["books", "shelves"], "readwrite");
  await Promise.all([
    ...books
      .filter((book) => book.shelfId === id)
      .map((book) => {
        const next = { ...book };
        delete next.shelfId;
        return tx.objectStore("books").put(next, book.id);
      }),
    tx.objectStore("shelves").delete(id),
  ]);
  await tx.done;
}

export async function listAllAnnotations() {
  const db = await database;
  const [keys, groups] = await Promise.all([
    db.getAllKeys("annotations"),
    db.getAll("annotations"),
  ]);
  return keys.map((key, index) => ({
    bookId: String(key),
    items: groups[index] ?? [],
  }));
}

export async function listAnnotations(bookId: string) {
  const db = await database;
  return (await db.get("annotations", bookId)) ?? [];
}

export async function saveAnnotations(bookId: string, items: Annotation[]) {
  const db = await database;
  await db.put("annotations", items, bookId);
}

export async function getPreferences() {
  const db = await database;
  return db.get("settings", "reader");
}

export async function savePreferences(preferences: ReaderPreferences) {
  const db = await database;
  await db.put("settings", preferences, "reader");
}

/** Asks the browser not to delete this library when storage runs low. */
export async function keepLibraryStored() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
