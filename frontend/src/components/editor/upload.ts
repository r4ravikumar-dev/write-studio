'use client';

/**
 * Browser-side file helpers for the editor and the Studio uploader
 * (lib/storage/studio-storage.ts). Uploads themselves only ever go to the
 * private Studio bucket.
 */
export type MediaKind = 'image' | 'video' | 'file';

/** Reads an image's or video's pixel size before upload (for layout without shifts). */
export async function measure(file: File, kind: MediaKind): Promise<{width: number | null; height: number | null}> {
  const url = URL.createObjectURL(file);
  try {
    if (kind === 'image') {
      const image = new Image();
      image.src = url;
      await image.decode();
      return {width: image.naturalWidth || null, height: image.naturalHeight || null};
    }
    if (kind === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Unreadable video'));
      });
      return {width: video.videoWidth || null, height: video.videoHeight || null};
    }
  } catch {
    // Unknown size: the page still lays it out, just without a reserved ratio.
  } finally {
    URL.revokeObjectURL(url);
  }
  return {width: null, height: null};
}

/** Opens the file picker and resolves with the chosen file (or null). */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
