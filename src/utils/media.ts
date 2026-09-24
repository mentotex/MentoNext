import { WPFeaturedMedia } from '../types';

const DEFAULT_FALLBACK_ORDER = ['medium', 'medium_large', 'large', 'full'];

export function getMediaUrl(
  media: WPFeaturedMedia | null,
  preferredSize = 'medium',
  fallbackOrder: string[] = DEFAULT_FALLBACK_ORDER
): string | null {
  if (!media) return null;

  const sizes = media.sizes ?? {};
  if (sizes[preferredSize]) return sizes[preferredSize].source_url;

  for (const size of fallbackOrder) {
    if (sizes[size]) return sizes[size].source_url;
  }

  return media.source_url;
}

export function getMediaDimensions(
  media: WPFeaturedMedia | null,
  size = 'medium'
): { width: number; height: number } | null {
  if (!media) return null;
  const sizeData = media.sizes?.[size];
  return sizeData ? { width: sizeData.width, height: sizeData.height } : null;
}
