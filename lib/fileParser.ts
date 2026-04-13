import type { FileContent } from '@/engine/types';

const SUPPORTED_EXTENSIONS = new Set(['md', 'txt', 'pdf']);

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

export async function parseFiles(files: FileList | File[]): Promise<FileContent[]> {
  const results: FileContent[] = [];
  const fileArray = Array.from(files).slice(0, 3);

  for (const file of fileArray) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_EXTENSIONS.has(ext)) {
      console.warn(`Skipping unsupported file type: ${file.name}`);
      continue;
    }

    let content: string;
    if (ext === 'pdf') {
      content = await extractPdfText(file);
    } else {
      content = await file.text();
    }

    if (content.trim()) {
      results.push({ name: file.name, content });
    }
  }

  return results;
}
