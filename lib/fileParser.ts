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
  // Worker shipped from /public — same-origin, no module-loader or CORS games.
  // Source-of-truth is node_modules/pdfjs-dist/build/pdf.worker.min.mjs; if
  // you bump the pdfjs-dist version, recopy this file.
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
