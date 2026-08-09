import { describe, it, expect } from 'vitest';
import { extractFromText, extractFromFile, slideNumber, UnsupportedFileError } from './extract';
import { ContentType } from '../types';

describe('extractFromText', () => {
  it('returns the text as both input and original content', () => {
    const result = extractFromText('some notes');
    expect(result.input).toEqual({ kind: 'text', text: 'some notes' });
    expect(result.originalText).toBe('some notes');
    expect(result.contentType).toBe(ContentType.TEXT);
  });
});

describe('slideNumber', () => {
  it('reads the slide index out of a pptx entry path', () => {
    expect(slideNumber('ppt/slides/slide7.xml')).toBe(7);
  });

  it('orders slide 10 after slide 9, not after slide 1', () => {
    const paths = ['ppt/slides/slide10.xml', 'ppt/slides/slide2.xml', 'ppt/slides/slide1.xml'];
    const sorted = [...paths].sort((a, b) => slideNumber(a) - slideNumber(b));
    expect(sorted).toEqual([
      'ppt/slides/slide1.xml',
      'ppt/slides/slide2.xml',
      'ppt/slides/slide10.xml',
    ]);
  });

  it('returns zero for a path with no slide number', () => {
    expect(slideNumber('ppt/slides/notes.xml')).toBe(0);
  });
});

describe('extractFromFile', () => {
  it('rejects an unsupported file type by name', async () => {
    const file = new File(['x'], 'archive.zip', { type: 'application/zip' });
    await expect(extractFromFile(file)).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it('names the offending file in the error', async () => {
    const file = new File(['x'], 'archive.zip', { type: 'application/zip' });
    await expect(extractFromFile(file)).rejects.toMatchObject({ fileName: 'archive.zip' });
  });

  it('routes audio to inline data as an AUDIO set', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'lecture.mp3', { type: 'audio/mpeg' });
    const result = await extractFromFile(file);
    expect(result.contentType).toBe(ContentType.AUDIO);
    expect(result.input.kind).toBe('inline');
    if (result.input.kind === 'inline') expect(result.input.mimeType).toBe('audio/mpeg');
    expect(result.originalText).toBeNull();
  });

  it('routes a PDF to inline data as a DOCUMENT set', async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], 'slides.pdf', {
      type: 'application/pdf',
    });
    const result = await extractFromFile(file);
    expect(result.contentType).toBe(ContentType.DOCUMENT);
    if (result.input.kind === 'inline') expect(result.input.mimeType).toBe('application/pdf');
  });

  it('recognises a PDF by extension when the browser reports no MIME type', async () => {
    const file = new File([new Uint8Array([37])], 'slides.pdf', { type: '' });
    await expect(extractFromFile(file)).resolves.toMatchObject({
      contentType: ContentType.DOCUMENT,
    });
  });

  it('base64-encodes the file contents rather than passing raw bytes', async () => {
    const file = new File([new TextEncoder().encode('hi')], 'clip.mp3', { type: 'audio/mpeg' });
    const result = await extractFromFile(file);
    if (result.input.kind !== 'inline') throw new Error('expected inline input');
    expect(result.input.data).toBe('aGk=');
  });
});
