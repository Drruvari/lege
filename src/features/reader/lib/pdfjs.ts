import { pdfjs } from "react-pdf";

// Configure the copy of PDF.js that react-pdf uses; Vite can bundle a
// separate "pdfjs-dist" instance whose settings react-pdf would never see.
// The worker must match that version, and the query keeps browsers from
// reusing a cached worker of another version.
const workerUrl = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
);
workerUrl.searchParams.set("v", pdfjs.version);
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.toString();

export { pdfjs };
