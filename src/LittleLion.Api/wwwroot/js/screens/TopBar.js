import { el } from '../core/DomHelpers.js';

/**
 * Reusable top bar (back + home + progress + stars).
 *
 * Layout: [← back?] [🏠 home] ----progress---- [⭐ 0]
 *
 * The back button is optional - pass { onBack } to show it, omit to
 * hide. Home is always shown. Game screens pass onBack so the child
 * can return to the Game Picker for the same lesson without bouncing
 * all the way to home. Other screens (Home, Sticker Book) only pass
 * onHome or their own navigation.
 *
 * Returns { element, update } so consumers can refresh progress/stars
 * without rebuilding the DOM.
 */
export function createTopBar({ onBack, onHome }) {
  const fill = el('div', { class: 'h-full bg-brand-yellow rounded-full transition-all duration-500' });
  const starsLabel = el('span', { class: 'font-bold text-lg text-ink' }, ['0']);

  const children = [];

  if (onBack) {
    children.push(el('button', {
      class: 'w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-soft text-xl font-bold hover:bg-white active:scale-95 transition-all shrink-0',
      'aria-label': 'Back to game picker',
      onclick: onBack,
    }, ['←']));
  }

  children.push(
    el('button', {
      class: 'w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-soft text-xl hover:bg-white active:scale-95 transition-all shrink-0',
      'aria-label': 'Home',
      onclick: onHome,
    }, ['🏠']),
    el('div', { class: 'flex-1 mx-3 h-3 bg-white/60 rounded-full overflow-hidden shadow-inner' }, [fill]),
    el('div', { class: 'flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full shadow-soft shrink-0' }, ['⭐', starsLabel]),
  );

  const element = el('div', {
    class: 'sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-white/50 shrink-0',
  }, children);

  function update({ progress, stars }) {
    if (progress != null) fill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    if (stars != null) starsLabel.textContent = String(stars);
  }

  return { element, update };
}
