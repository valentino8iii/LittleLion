import { Component } from '../core/Component.js';
import { el } from '../core/DomHelpers.js';

/**
 * Sticker Book: shows every reward in the catalog, grouped by category.
 * Unlocked items are colorful, locked items are greyed out and show
 * their unlock rule as a hint ('Finish Animals', 'Play 3 days in a row').
 */
const CATEGORY_ORDER = ['Sticker', 'Badge', 'Costume'];
const CATEGORY_LABELS = {
  Sticker: 'Stickers',
  Badge:   'Badges',
  Costume: 'Costumes',
};

export class StickerBookScreen extends Component {
  render() {
    const backBtn = el('button', {
      class: 'flex items-center justify-center gap-3 bg-brand-primary text-white rounded-full px-8 py-4 shadow-card font-bold text-xl hover:-translate-y-1 active:translate-y-1 transition-all outline-none focus:ring-4 focus:ring-brand-primary/50',
      'aria-label': 'Back',
      onclick: () => this.context.router.navigate('home'),
    }, [
      el('span', { class: 'text-2xl' }, ['←']),
      el('span', {}, ['Back to Home']),
    ]);

    const bottomNav = el('div', {
      class: 'shrink-0 p-4 sm:p-6 bg-white/90 backdrop-blur-md border-t-4 border-gray-100 flex justify-center z-10 relative',
    }, [backBtn]);

    this._content = el('div', { class: 'flex flex-col gap-8' });

    return el('div', { class: 'screen absolute inset-0 flex flex-col overflow-hidden' }, [
      el('div', { class: 'flex-1 overflow-y-auto p-4 sm:p-6 pb-8' }, [
        el('div', { class: 'mb-8 text-center' }, [
          el('h1', { class: 'text-4xl sm:text-5xl font-display font-bold text-brand-primary text-shadow-strong' }, ['Sticker Book']),
          el('p',  { class: 'text-xl text-ink-soft font-medium mt-2 summary-subtitle' }, [this._summaryLine()]),
        ]),
        this._content,
      ]),
      bottomNav,
    ]);
  }

  async onMount() {
    const { rewards, progress } = this.context.services;
    if (rewards.all.length === 0) await rewards.refresh();
    if (!progress.isLoaded) await progress.refresh();
    this._renderSections();
  }

  _summaryLine() {
    const { rewards, progress } = this.context.services;
    const total = rewards.all.length;
    if (total === 0) return 'Loading...';

    // Only count unlocks that still exist in the current catalog,
    // so the total and numerator can never disagree.
    const catalogIds = new Set(rewards.all.map(r => r.id));
    const unlocked = progress.unlockedItems.filter(u => catalogIds.has(u.id)).length;
    return `${unlocked} of ${total} collected`;
  }

  _renderSections() {
    const { rewards, progress } = this.context.services;
    this._content.innerHTML = '';

    for (const category of CATEGORY_ORDER) {
      const items = rewards.byCategory(category);
      if (items.length === 0) continue;

      this._content.appendChild(
        el('h2', { class: 'text-2xl font-bold text-brand-secondary mb-4 border-b-2 border-brand-secondary/20 pb-2' }, [CATEGORY_LABELS[category]])
      );

      const grid = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' });
      items.forEach((reward, i) => {
        const unlocked = progress.hasUnlocked(reward.id);
        grid.appendChild(this._renderCard(reward, unlocked, i));
      });
      this._content.appendChild(grid);
    }

    // Update header summary now that we have real counts
    const subtitle = this._content.parentElement?.querySelector('.summary-subtitle');
    if (subtitle) subtitle.textContent = this._summaryLine();
  }

  _renderCard(reward, unlocked, index) {
    const baseClass = 'p-4 rounded-3xl flex flex-col items-center text-center transition-transform hover:-translate-y-1';
    const unlockedClass = 'bg-white/90 shadow-card';
    const lockedClass = 'opacity-60 grayscale bg-gray-100 shadow-soft';

    return el('div', {
      class: `${baseClass} ${unlocked ? unlockedClass : lockedClass}`,
      style: { animationDelay: `${index * 40}ms` },
      title: unlocked ? reward.name : this._lockHint(reward),
    }, [
      el('div', { class: 'text-5xl mb-3 bg-gray-50 rounded-2xl w-20 h-20 flex items-center justify-center shadow-inner' }, [unlocked ? reward.emoji : '🔒']),
      el('div', { class: 'font-bold text-ink' }, [reward.name]),
      el('div', { class: 'text-sm text-ink-soft mt-1' },
        unlocked ? ['Unlocked!'] : [this._lockHint(reward)]),
    ]);
  }

  _lockHint(reward) {
    if (reward.category === 'Sticker' && reward.lessonId)
      return `Play ${this._humanLesson(reward.lessonId)}`;
    if (reward.category === 'Badge' && reward.lessonId && reward.requiredBestStars > 0)
      return `Get ${reward.requiredBestStars}⭐ on ${this._humanLesson(reward.lessonId)}`;
    if (reward.category === 'Costume' && reward.streakDays > 0)
      return `${reward.streakDays}-day streak`;
    return 'Keep playing';
  }

  _humanLesson(id) {
    const map = {
      animals: 'Animals', colors: 'Colors', fruits: 'Fruits',
      vehicles: 'Vehicles', body: 'My Body', clothes: 'Clothes', weather: 'Weather',
    };
    return map[id] ?? id;
  }
}
