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
  const fill = el('div', { class: 'h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-500' });
  const starsLabel = el('span', { class: 'font-bold text-lg text-ink' }, ['0']);

  const getThemeIcon = (theme) => {
    if (theme === 'boy') {
      // Rocket SVG (Light Blue/Cyan)
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-brand-primary animate-bounce-soft"><path d="M4.5 16.5c-1.5 1.26-2 3.5-2 3.5s2.24-.5 3.5-2M15 9l-9 9m16-12c-2.5 0-5.5 1.5-7.5 3.5L5 13.5c-1.5 1.5-1.5 4 0 5.5s4 1.5 5.5 0L14 15.5c2-2 3.5-5 3.5-7.5m4.5-4.5c.5.5.5 1.5 0 2s-1.5 0-2 0m-3-1s.5.5.5 1.5"/></svg>`;
    } else {
      // Heart SVG (Pink)
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-brand-primary animate-bounce-soft"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    }
  };

  const themeToggle = el('button', {
    class: 'w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-soft hover:bg-white active:scale-95 transition-all shrink-0 group',
    'aria-label': 'Toggle Theme',
    title: 'Toggle Theme',
    onclick: () => {
      window.toggleTheme();
      window.littleLionSfx?.play('pop');
    }
  });

  const updateToggleIcon = (theme) => {
    themeToggle.innerHTML = getThemeIcon(theme);
  };

  // Initial update
  updateToggleIcon(window.getCurrentTheme?.() || 'girl');

  // Handle global theme change events (so all instances synchronize immediately)
  const onThemeChanged = (e) => {
    updateToggleIcon(e.detail);
  };
  window.addEventListener('themechanged', onThemeChanged);

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
    themeToggle,
    el('div', { class: 'flex-1 mx-3 h-3 bg-white/40 border border-brand-primary/10 rounded-full overflow-hidden shadow-inner transition-colors duration-500' }, [fill]),
    el('div', { class: 'flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full shadow-soft shrink-0' }, ['⭐', starsLabel]),
  );

  const element = el('div', {
    class: 'sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-white/50 shrink-0',
  }, children);

  function update({ progress, stars }) {
    if (progress != null) fill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    if (stars != null) starsLabel.textContent = String(stars);
  }

  function destroy() {
    window.removeEventListener('themechanged', onThemeChanged);
  }

  return { element, update, destroy };
}
