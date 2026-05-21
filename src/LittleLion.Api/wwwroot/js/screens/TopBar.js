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
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-brand-primary animate-bounce-soft"><path d="M3 15h18v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2z" fill="#93C5FD" stroke="currentColor" /><path d="M7 10l3-4h4l3 4z" fill="white" stroke="currentColor" /><path d="M17 10h4v-3h-4z" fill="#60A5FA" stroke="currentColor" /><circle cx="7.5" cy="16.5" r="2" fill="#4B5563" stroke="currentColor" /><circle cx="7.5" cy="16.5" r="0.5" fill="white" /><circle cx="16.5" cy="16.5" r="2" fill="#4B5563" stroke="currentColor" /><circle cx="16.5" cy="16.5" r="0.5" fill="white" /></svg>`;
    } else {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-brand-primary animate-bounce-soft"><path d="M9 13c0-3.5-1.5-6.5-1.5-6.5S7 4 8 3s2.5.5 2.5 2c0 2 .5 5.5 1.5 8" fill="white" stroke="currentColor"/><path d="M15 13c0-3.5 1.5-6.5 1.5-6.5s.5-2.5-.5-3.5-2.5.5-2.5 2c0 2-.5 5.5-1.5 8" fill="white" stroke="currentColor"/><path d="M5 17c0-2.5 2.5-3.5 7-3.5s7 1 7 3.5-2.5 3.5-7 3.5-7-1-7-3.5z" fill="white" stroke="currentColor"/><path d="M8.5 10c0-1.5-.7-3.5-.7-3.5s-.2-1 .2-1.5.8-.2.8.5-.2 2.5.2 4.5" fill="#FCA5A5"/><path d="M15.5 10c0-1.5.7-3.5.7-3.5s.2-1-.2-1.5-.8-.2-.8.5.2 2.5-.2 4.5" fill="#FCA5A5"/><circle cx="9.5" cy="16" r="0.8" fill="currentColor"/><circle cx="14.5" cy="16" r="0.8" fill="currentColor"/><polygon points="12,17 11,16 13,16" fill="#F87171" stroke="#F87171" stroke-width="0.5"/><path d="M11 18c.3.3.7.3 1 0s.7-.3 1 0" /></svg>`;
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
