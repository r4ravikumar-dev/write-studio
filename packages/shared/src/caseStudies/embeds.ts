/**
 * Embeds a case study can hold, from a pasted URL. Only these hosts are ever
 * framed, and the embed address is always rebuilt from the parsed ID, never
 * taken from the pasted text, so a document can't frame anything else.
 */
export type EmbedProvider = 'figma' | 'youtube' | 'vimeo' | 'loom';

export type ParsedEmbed = {provider: EmbedProvider; embedUrl: string};

export const EMBED_LABELS: Record<EmbedProvider, string> = {
  figma: 'Figma',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  loom: 'Loom',
};

export function parseEmbed(raw: string): ParsedEmbed | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');

  // Figma: files, designs, prototypes, boards, slides and sites.
  if (host === 'figma.com' && /^\/(file|design|proto|board|slides|deck|site)\//.test(url.pathname)) {
    return {
      provider: 'figma',
      embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url.toString())}`,
    };
  }

  // YouTube: watch?v=, youtu.be/, /shorts/ and /embed/.
  const youtubeId =
    host === 'youtu.be'
      ? url.pathname.slice(1)
      : host === 'youtube.com' || host === 'm.youtube.com'
        ? (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1] ?? '')
        : '';
  if (youtubeId && /^[\w-]{6,20}$/.test(youtubeId)) {
    return {provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`};
  }

  // Vimeo: vimeo.com/123456 (and player.vimeo.com/video/123456).
  const vimeoId =
    host === 'vimeo.com'
      ? url.pathname.match(/^\/(\d+)/)?.[1]
      : host === 'player.vimeo.com'
        ? url.pathname.match(/^\/video\/(\d+)/)?.[1]
        : undefined;
  if (vimeoId) return {provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}`};

  // Loom: loom.com/share/<id> (and /embed/<id>).
  const loomId = host === 'loom.com' ? url.pathname.match(/^\/(?:share|embed)\/([a-f0-9]+)/)?.[1] : undefined;
  if (loomId) return {provider: 'loom', embedUrl: `https://www.loom.com/embed/${loomId}`};

  return null;
}

export type FileKind = 'pdf' | 'slides' | 'doc' | 'other';

export function fileKind(mime: string, name = ''): FileKind {
  const lower = name.toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mime.includes('presentation') || mime.includes('powerpoint') || /\.(pptx?|key)$/.test(lower)) return 'slides';
  if (mime.includes('word') || /\.(docx?)$/.test(lower)) return 'doc';
  return 'other';
}

export function formatBytes(bytes: number) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
