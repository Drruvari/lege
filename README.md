# Lege — local-first PDF & EPUB reader

A focused personal reading workspace. **Lege** is the Latin imperative of *legere*: “Read!”

## Quick start

Requires Node.js 22.13+ and npm. The toolchain also supports Node.js 20.19+.

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite and import a `.pdf` or `.epub` using **Add a book**. Two test documents are bundled under `samples/`: `sample-reading-pages.pdf` and `sample-reading-pages.epub`.

Build for hosting:

```bash
npm run build
npm run preview
```

Static output is in `dist/` and can be deployed to any static host. HTTPS is recommended for browser translation support.

Useful checks:

```bash
npm run typecheck
npm run build
npm audit
```

## What works

- Import multiple PDF/EPUB books; file blobs and reading metadata are persisted in browser IndexedDB.
- PDF rendering, selectable text, page navigation, jump-to-page, zoom.
- EPUB rendering, chapter list, paginated navigation, anchored CFI positions, typography controls.
- Select text → highlight, write a note, copy, or translate a short selection.
- EPUB highlights are anchored to CFIs. PDF highlights are stored as page-relative overlays, with quote recovery for older annotations when a text layer is available.
- Notes and bookmarks are local, navigable, removable, and exportable as JSON per book.
- Paper, sepia, and night reading themes (night mode inverts PDF page colors, which may distort photographs). Font-size, spacing, column width, and PDF zoom preferences.
- Keyboard: left/right arrows or PageUp/PageDown navigate, `B` bookmarks current location.
- Fullscreen reader, library search/filter, responsive layout.
- Two sample documents under `samples/` can be imported to exercise the PDF and EPUB workflows.

## Technology

React 19, TypeScript 7, Vite 8, Tailwind CSS 4, the complete current shadcn/ui component set in the Lyra style, Base UI primitives, Phosphor icons, React-PDF/PDF.js, EPUB.js, and `idb`.

The reading surface uses the Lege editorial design system: Figtree for UI, Fraunces for display typography, and Literata for long-form reading. Paper, sepia, and night themes share an oxblood-and-brass palette and bookcloth-inspired covers. The desktop shell, Dock, Dynamic Island, Notification Stack, Control Center, Mac Context Menu, Mac Window, Segmented Control, Toolbar, and supporting primitives are installed directly from the Ballmac UI registry and retain their native behavior. The brief is documented in `docs/art-direction.md`.

This is **not a cloud document service**. No authentication, uploads, paid APIs, or backend are required to read.

### Free translation, with honest limits

When a browser implements the experimental Translator API for the chosen language pair, Lege attempts on-device translation. Otherwise it requests `api.mymemory.translated.net` **only on user action**. That free public API has daily quotas and a 500-byte request limit, and selected text is sent to an external service. Source defaults to English; target defaults to Albanian. You can change both in Settings or in the translation dialog.

For unlimited and private translation on any browser, a future release could support self-hosted LibreTranslate/Argos Translate, but running that server can have hardware/hosting costs.

## Important limitations / next steps

- EPUB.js supports common EPUBs, but DRM-protected EPUBs are unsupported.
- Scanned PDFs without an OCR text layer cannot be selected or translated (OCR is not bundled).
- PDF table-of-contents initially shows a page list (first 60 pages), rather than a recursively resolved outline.
- No cross-device sync, user accounts, annotation re-import, or cloud backups yet. Clearing browser site storage deletes local books/annotations. Consider implementing JSON export/import and backups before depending on this for important notes.
- For production, test unusual EPUB3 content, multilingual PDFs, password-protected PDF flows, accessibility, and large files.
- For public deployment, validate and limit file sizes, review CSP and EPUB isolation, and consider additional security hardening.

## Costs and licenses

All required app dependencies are available without license fees. Hosting may have free tiers, but domains/hosting/bandwidth and translation infrastructure can involve costs. Always review individual dependency licenses and the public translation API terms before deploying commercially.

## Project layout

- `src/app/` — application composition and top-level state.
- `src/features/library/` — library-specific presentation components.
- `src/features/reader/components/` — PDF, EPUB, and demo reader adapters.
- `src/features/reader/data/` — IndexedDB persistence.
- `src/features/reader/lib/` — reader services such as translation.
- `src/features/reader/model/` — reader domain types and defaults.
- `src/components/common/` — shared application components.
- `src/components/ui/` — shadcn Lyra/Base UI primitives.
- `src/styles/globals.css` — design tokens, themes, layout, and responsive styles.

Project-owned file and directory names use kebab-case. Framework-standard filenames such as `README.md`, `package.json`, and `vite.config.ts` retain their conventional names; React component and TypeScript identifiers retain idiomatic PascalCase/camelCase.
