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
  // Import the minified build directly. The package's main entry
  // (build/pdf.mjs) has a webpack-generated CommonJS shim that calls
  // Object.defineProperty(exports, ...) where `exports` is undefined in true
  // ESM contexts, throwing "Object.defineProperty called on non-object".
  // build/pdf.min.mjs is built clean and works. The deep import path has no
  // TS types shipped, so we cast to the public surface we need.
  // @ts-expect-error — deep path has no types; we cast to the public surface.
  const pdfjsLib: typeof import('pdfjs-dist') = await import('pdfjs-dist/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

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
