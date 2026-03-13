import type { FileContent } from '@/engine/types';

export async function parseFiles(files: FileList | File[]): Promise<FileContent[]> {
  const results: FileContent[] = [];
  const fileArray = Array.from(files).slice(0, 3);

  for (const file of fileArray) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'md' && ext !== 'txt') {
      console.warn(`Skipping unsupported file type: ${file.name}`);
      continue;
    }

    const content = await file.text();
    results.push({ name: file.name, content });
  }

  return results;
}
