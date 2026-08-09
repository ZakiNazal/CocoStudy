import JSZip from 'jszip';
import mammoth from 'mammoth';
import { ContentType } from '../types';

export type ExtractedInput =
  | { kind: 'text'; text: string }
  | { kind: 'inline'; data: string; mimeType: string };

export interface ExtractResult {
  input: ExtractedInput;
  contentType: ContentType;
  /** Plain text for the tutor's context, when the format yields any. */
  originalText: string | null;
}

export class UnsupportedFileError extends Error {
  constructor(public readonly fileName: string) {
    super(`CocoStudy can't read ${fileName}. Try a PDF, Word, PowerPoint, or audio file.`);
    this.name = 'UnsupportedFileError';
  }
}

const BASE64_CHUNK = 0x8000;

/** Base64-encodes a Blob without FileReader, so this module runs under Node. */
export async function fileToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

export function slideNumber(path: string): number {
  const match = /slide(\d+)\.xml$/.exec(path);
  return match ? Number(match[1]) : 0;
}

export function extractFromText(text: string): ExtractResult {
  return {
    input: { kind: 'text', text },
    contentType: ContentType.TEXT,
    originalText: text,
  };
}

async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractPptx(file: File): Promise<string> {
  const zip = await new JSZip().loadAsync(file);
  const slides = Object.keys(zip.files)
    .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const parser = new DOMParser();
  let out = '';

  for (const path of slides) {
    const xml = await zip.files[path].async('string');
    const doc = parser.parseFromString(xml, 'text/xml');
    const nodes = doc.getElementsByTagName('a:t');
    let text = '';
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent) text += `${nodes[i].textContent} `;
    }
    if (text.trim()) out += `[Slide ${slideNumber(path)}]\n${text.trim()}\n\n`;
  }

  return out.trim() || 'No text found in slides.';
}

export async function extractFromFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith('audio/') || type.startsWith('video/')) {
    return {
      input: { kind: 'inline', data: await fileToBase64(file), mimeType: type },
      contentType: ContentType.AUDIO,
      originalText: null,
    };
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return {
      input: { kind: 'inline', data: await fileToBase64(file), mimeType: 'application/pdf' },
      contentType: ContentType.DOCUMENT,
      originalText: null,
    };
  }

  if (name.endsWith('.docx')) {
    const text = await extractDocx(file);
    return {
      input: { kind: 'text', text },
      contentType: ContentType.DOCUMENT,
      originalText: text,
    };
  }

  if (name.endsWith('.pptx')) {
    const text = await extractPptx(file);
    return {
      input: { kind: 'text', text },
      contentType: ContentType.DOCUMENT,
      originalText: text,
    };
  }

  throw new UnsupportedFileError(file.name);
}
