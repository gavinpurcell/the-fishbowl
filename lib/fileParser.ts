import type { FileContent } from '@/engine/types';

const SUPPORTED_EXTENSIONS = new Set(['md', 'txt', 'pdf']);

export interface ParseError {
  name: string;
  message: string;
}

export interface ParseResult {
  files: FileContent[];
  errors: ParseError[];
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // Skip the worker entirely. Multiple worker-source strategies (cdnjs URL,
  // bundler-resolved new URL(), jsdelivr CDN, /public static file) all
  // produced "Object.defineProperty called on non-object" during pdfjs's
  // internal worker init on this Next.js + webpack setup. Users upload short
  // PDFs (briefs, one-pagers), so synchronous main-thread parsing is fast
  // enough and bulletproof. If we ever need to parse big PDFs, revisit and
  // wire workerPort manually with new Worker('/pdf.worker.min.mjs').
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const buffer = await file.arrayBuffer();
  // disableWorker is a real pdfjs option but missing from their TS types.
  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    disableWorker: true,
  } as Parameters<typeof pdfjsLib.getDocument>[0] & { disableWorker: boolean }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    if (text.trim()) pages.push(text.trim());
  }

  return pages.join('\n\n');
}

export async function parseFiles(files: FileList | File[]): Promise<ParseResult> {
  const results: FileContent[] = [];
  const errors: ParseError[] = [];
  const fileArray = Array.from(files).slice(0, 3);

  for (const file of fileArray) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }

    try {
      const content = ext === 'pdf' ? await extractPdfText(file) : await file.text();
      if (content.trim()) {
        results.push({ name: file.name, content });
      } else {
        errors.push({ name: file.name, message: 'no readable text found' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'parse failed';
      errors.push({ name: file.name, message });
    }
  }

  return { files: results, errors };
}
