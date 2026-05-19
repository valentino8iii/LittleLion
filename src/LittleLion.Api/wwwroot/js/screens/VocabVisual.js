import { el } from '../core/DomHelpers.js';

/**
 * Renders the visual for a vocabulary item. Prefers a Fluent 3D emoji image;
 * falls back to the Unicode emoji text if the image fails (or no fluentName).
 *
 * Usage:
 *   const visual = createVocabVisual(item, mediaService);
 *   tileElement.appendChild(visual);
 */

const SIZE_CLASSES = {
  small:  'w-16 h-16 text-4xl',
  medium: 'w-24 h-24 text-5xl',
  large:  'w-32 h-32 text-6xl',
};

export function createVocabVisual(item, mediaService, { size = 'medium' } = {}) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.medium;
  const wrapper = el('span', {
    class: `flex items-center justify-center ${sizeClass} select-none`,
  });

  const imageUrl = mediaService.getImageUrl(item);
  if (!imageUrl) {
    wrapper.textContent = item.emoji;
    return wrapper;
  }

  // Show emoji immediately (so there's no blank tile while the image loads),
  // then swap to the image once it's ready. If the image 404s, we keep the
  // emoji fallback visible.
  wrapper.textContent = item.emoji;

  const img = el('img', {
    class: 'w-full h-full object-contain',
    src: imageUrl,
    alt: item.word,
    loading: 'eager',
    draggable: 'false',
    decoding: 'async',
  });

  img.addEventListener('load', () => {
    wrapper.textContent = '';
    wrapper.appendChild(img);
  });
  img.addEventListener('error', () => {
    // Leave the emoji fallback visible - nothing to do.
  });

  return wrapper;
}
