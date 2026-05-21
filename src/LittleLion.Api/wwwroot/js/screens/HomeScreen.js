import { Component } from '../core/Component.js';
import { el, clear } from '../core/DomHelpers.js';
import { Leo } from './Leo.js';

/**
 * Home screen: lists all available lessons so the child (or parent)
 * can pick what to learn. Each card shows best-stars for that lesson,
 * so the child sees their progress at a glance.
 */
export class HomeScreen extends Component {
  render() {
    const { progress } = this.context.services;

    this._starsLabel = el('span', {}, [String(progress.totalStars)]);
    this._streakLabel = this._buildStreak(progress.streakDays);
    this._stickerCount = el('span', {}, [String(this._countValidUnlocks())]);
    this._lessonGrid = el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24' });
    this._scorePillByLesson = new Map();

    // Refresh on either progress OR rewards changing (rewards refresh is async)
    this.listen('progress:changed', () => this._refreshHeader());

    const root = el('div', { class: 'screen absolute inset-0 flex flex-col p-4 sm:p-6 overflow-y-auto' }, [
      this._buildHeader(),
      this._buildHeroBanner(),
      this._lessonGrid,
      // el('div', { class: 'fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50' }, [
      //   el('button', {
      //     class: 'pointer-events-auto bg-brand-pink text-white px-8 py-4 rounded-full font-bold text-xl shadow-btn active:shadow-none active:translate-y-1 transition-all flex items-center gap-3 border-4 border-white',
      //     onclick: () => this.context.router.navigate('stickerBook'),
      //   }, [
      //     '📖',
      //     'Sticker Book',
      //     this._stickerCount,
      //   ]),
      // ]),
    ]);

    return root;
  }

  async onMount() {
    // Leo waves hello - delayed slightly so it runs after the screen
    // finishes entering, not during the transition
    setTimeout(() => this.context.bus.emit('leo:wave'), 350);

    try {
      const lessons = await this.context.services.lessons.getAllSummaries();
      this._renderLessons(lessons);
    } catch (err) {
      console.error('Failed to load lessons', err);
      this._lessonGrid.textContent = 'Oops, could not load lessons.';
    }

    // If the reward catalog / progress hadn't loaded yet when we rendered,
    // once they finish loading the header listener below will refresh
    // everything including the costume. Do it now too in case they were
    // already loaded.
    this._refreshHeader();
  }

  _renderLessons(lessons) {
    clear(this._lessonGrid);
    this._cardByLesson = new Map();
    this._scorePillByLesson = new Map();

    lessons.forEach((lesson, i) => {
      const meta = LESSON_META[lesson.id] ?? DEFAULT_META;
      const card = this._buildLessonCard(lesson, meta, i);
      this._cardByLesson.set(lesson.id, card);
      this._lessonGrid.appendChild(card);
    });
  }

  _buildLessonCard(lesson, meta, index) {
    const { progress, difficulty } = this.context.services;
    const currentDifficulty = difficulty.get();
    const best = progress.getBestStars(lesson.id, currentDifficulty);

    // Score pill - updates when global difficulty changes
    const scorePill = el('div', { class: 'absolute top-3 right-3 bg-white/90 text-ink px-3 py-1 rounded-full text-sm font-bold shadow-sm' },
      best > 0 ? [`⭐ ${best}`] : ['✨']);

    const card = el('button', {
      class: 'relative p-6 rounded-3xl shadow-card transition-transform hover:-translate-y-1 active:translate-y-1 flex items-center gap-4 text-left group overflow-hidden outline-none focus:ring-4 focus:ring-white/50',
      style: {
        background: meta.color,
        animationDelay: `${index * 0.05}s`,
      },
      onclick: () => {
        this.context.router.navigate('gamePicker', {
          lessonId: lesson.id,
          difficulty: difficulty.get(),
        });
      },
    }, [
      el('div', { class: 'text-5xl bg-white/30 p-3 rounded-2xl flex-shrink-0' }, [meta.emoji]),
      el('div', { class: 'flex-1' }, [
        el('div', { class: 'text-2xl font-bold text-white text-shadow-strong' }, [lesson.title]),
        el('div', { class: 'text-white/90 font-medium' }, [`${lesson.itemCount} words`]),
      ]),
      scorePill,
    ]);

    // Remember this card's score pill so the global picker can refresh it
    // when difficulty changes (each lesson has its own best-stars per difficulty)
    this._scorePillByLesson.set(lesson.id, scorePill);

    return card;
  }

  _buildHeader() {
    const getThemeIcon = (theme) => {
      if (theme === 'boy') {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-brand-primary animate-bounce-soft"><path d="M4.5 16.5c-1.5 1.26-2 3.5-2 3.5s2.24-.5 3.5-2M15 9l-9 9m16-12c-2.5 0-5.5 1.5-7.5 3.5L5 13.5c-1.5 1.5-1.5 4 0 5.5s4 1.5 5.5 0L14 15.5c2-2 3.5-5 3.5-7.5m4.5-4.5c.5.5.5 1.5 0 2s-1.5 0-2 0m-3-1s.5.5.5 1.5"/></svg>`;
      } else {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-brand-primary animate-bounce-soft"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      }
    };

    const themeBtn = el('button', {
      class: 'relative flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-brand-primary group',
      title: 'Toggle Theme',
      onclick: () => {
        window.toggleTheme();
        window.littleLionSfx?.play('pop');
      }
    });

    const dropdownThemeBtn = el('button', {
      class: 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-left font-bold text-base text-brand-primary active:scale-95 transition-all outline-none',
      onclick: (e) => {
        e.stopPropagation();
        window.toggleTheme();
        window.littleLionSfx?.play('pop');
      }
    });

    const updateToggleIcon = (theme) => {
      themeBtn.innerHTML = getThemeIcon(theme);
      dropdownThemeBtn.innerHTML = `${getThemeIcon(theme)} <span class="text-ink ml-1 font-display">Theme</span>`;
    };

    updateToggleIcon(window.getCurrentTheme?.() || 'girl');

    const onThemeChanged = (e) => {
      updateToggleIcon(e.detail);
    };
    window.addEventListener('themechanged', onThemeChanged);
    this.onDispose(() => {
      window.removeEventListener('themechanged', onThemeChanged);
    });

    const dropdownStickerBtn = el('button', {
      class: 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 text-left font-bold text-base text-brand-primary active:scale-95 transition-all outline-none',
      onclick: (e) => {
        e.stopPropagation();
        this.context.router.navigate('stickerBook');
      }
    }, [
      el('span', { class: 'text-xl' }, ['🌟']),
      el('span', { class: 'font-display' }, ['Stickers']),
      el('span', { class: 'ml-auto text-sm bg-brand-primary/10 px-2 py-0.5 rounded-full text-brand-primary dropdown-sticker-badge font-display' }, [this._stickerCount.textContent || String(this._countValidUnlocks())])
    ]);

    const dropdown = el('div', {
      class: 'absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-card border-2 border-gray-100 p-2 flex flex-col gap-1 min-w-[160px] hidden z-50 transition-all duration-300 transform origin-top-right scale-95 opacity-0 pointer-events-none',
    }, [
      dropdownStickerBtn,
      dropdownThemeBtn,
    ]);

    const moreBtn = el('button', {
      class: 'flex sm:hidden w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all text-ink/70 shrink-0 relative outline-none',
      title: 'More options',
      onclick: (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
          dropdown.classList.remove('hidden');
          dropdown.offsetHeight;
          dropdown.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
          dropdown.classList.add('scale-100', 'opacity-100');
        } else {
          dropdown.classList.add('scale-95', 'opacity-0');
          dropdown.classList.remove('scale-100', 'opacity-100');
          setTimeout(() => {
            dropdown.classList.add('hidden', 'pointer-events-none');
          }, 150);
        }
      }
    }, [
      el('span', { class: 'text-xl font-bold leading-none select-none pb-1.5' }, ['···']),
      dropdown,
    ]);

    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && !moreBtn.contains(e.target)) {
        dropdown.classList.add('scale-95', 'opacity-0');
        dropdown.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => {
          dropdown.classList.add('hidden', 'pointer-events-none');
        }, 150);
      }
    };
    window.addEventListener('click', closeDropdown);
    this.onDispose(() => {
      window.removeEventListener('click', closeDropdown);
    });

    return el('div', { class: 'flex justify-between items-center gap-3 mb-6 shrink-0 relative' }, [
      el('div', { class: 'min-w-0 flex-1 sm:flex-initial' }, [
        el('h1', { class: 'text-2xl sm:text-5xl font-display font-bold text-brand-primary text-shadow-strong truncate sm:overflow-visible' }, ['Little Lion']),
        el('p', { class: 'text-xs sm:text-xl text-ink-soft font-medium mt-0.5 truncate sm:overflow-visible' }, [`Let's learn English! 🦁`]),
      ]),
      el('div', { class: 'flex gap-2.5 sm:gap-3 items-center bg-white/80 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-soft font-bold text-sm sm:text-lg shrink-0' }, [
        this._streakLabel,
        el('div', { class: 'flex items-center gap-1 shrink-0' }, ['⭐', this._starsLabel]),
        el('button', {
          class: 'hidden sm:flex relative items-center gap-1 text-brand-primary hover:scale-110 active:scale-95 transition-all mr-1 shrink-0',
          title: 'Sticker Book',
          onclick: () => this.context.router.navigate('stickerBook'),
        }, [
          el('span', { class: 'text-xl' }, ['🌟']),
          this._stickerCount,
        ]),
        el('div', { class: 'hidden sm:block w-px h-5 bg-ink/20 mx-1 shrink-0' }),
        el('div', { class: 'hidden sm:flex shrink-0' }, [themeBtn]),
        moreBtn,
      ]),
    ]);
  }

  _buildHeroBanner() {
    this._leo = new Leo(this.context.bus, { size: 'medium' });
    this.onDispose(() => this._leo.destroy());

    return el('div', { class: 'bg-white/90 rounded-3xl p-6 mb-8 shadow-card flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left shrink-0' }, [
      el('div', { class: 'text-6xl animate-float' }, [this._leo.element]),
      el('div', { class: 'flex-1 text-2xl text-ink' }, [
        el('strong', { class: 'block text-3xl mb-1 text-brand-purple' }, [`Hi friend!`]),
        el('span', { class: 'text-ink-soft' }, ['Pick a topic below to start']),
      ]),
      this._buildGlobalDifficultyPicker(),
    ]);
  }

  /**
   * Global difficulty picker - three pill buttons in the hero banner.
   * Replaces the per-lesson dots that used to sit on every card.
   * Tapping a pill updates DifficultyService globally and refreshes
   * every card's score pill to reflect the new level's best-stars.
   */
  _buildGlobalDifficultyPicker() {
    const { difficulty, progress } = this.context.services;
    const current = difficulty.get();

    const row = el('div', {
      class: 'flex bg-gray-100 p-1.5 rounded-full shadow-inner',
      role: 'radiogroup',
      'aria-label': 'Difficulty',
    });

    ['Easy', 'Medium', 'Hard'].forEach(level => {
      const isActive = level === current;
      const baseClass = 'px-6 py-2 rounded-full font-bold transition-colors outline-none focus:ring-2 focus:ring-brand-primary/50';
      const activeClass = 'bg-white shadow-soft text-brand-primary';
      const inactiveClass = 'text-gray-500 hover:bg-gray-200/50';

      const pill = el('button', {
        class: `${baseClass} ${isActive ? activeClass : inactiveClass}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(isActive),
        onclick: (e) => {
          e.stopPropagation();
          difficulty.set(level);

          // Update pill visual state
          row.querySelectorAll('button').forEach(p => {
            p.className = `${baseClass} ${inactiveClass}`;
          });
          pill.className = `${baseClass} ${activeClass}`;

          // Refresh every lesson card's score pill for the new level
          this._scorePillByLesson.forEach((scorePill, lessonId) => {
            const newBest = progress.getBestStars(lessonId, level);
            scorePill.textContent = newBest > 0 ? `⭐ ${newBest}` : '✨';
          });
        },
      }, [level]);
      row.appendChild(pill);
    });

    return row;
  }

  _buildStreak(days) {
    return el('div', { class: 'flex items-center gap-1 text-brand-orange' }, [
      days > 0 ? `🔥 ${days}` : '🔥 0',
    ]);
  }

  _refreshHeader() {
    const { progress } = this.context.services;
    this._starsLabel.textContent = String(progress.totalStars);
    this._streakLabel.textContent = progress.streakDays > 0
      ? `🔥 ${progress.streakDays}`
      : '🔥 0';
    if (this._stickerCount) {
      this._stickerCount.textContent = String(this._countValidUnlocks());
    }
    const dbBadge = document.querySelector('.dropdown-sticker-badge');
    if (dbBadge) {
      dbBadge.textContent = String(this._countValidUnlocks());
    }
    this._applyCostumeToLeo();
  }

  /**
   * Pick the highest-tier costume the player has unlocked and put it
   * on Leo. Order is by streak-days descending - throne beats crown
   * beats cape beats scarf beats hat.
   */
  _applyCostumeToLeo() {
    if (!this._leo) return;
    const { rewards, progress } = this.context.services;
    if (!rewards.all || rewards.all.length === 0) {
      this.context.bus.emit('leo:costume', { emoji: null });
      return;
    }

    const costumes = rewards.byCategory('Costume')
      .filter(r => progress.hasUnlocked(r.id))
      .sort((a, b) => (b.streakDays ?? 0) - (a.streakDays ?? 0));

    const best = costumes[0];
    this.context.bus.emit('leo:costume', { emoji: best?.emoji ?? null });
  }

  /**
   * How many currently-valid rewards the player has unlocked.
   *
   * We cross-reference against the current catalog rather than just
   * counting progress.unlockedItems, because the catalog can shrink
   * between releases (e.g. we removed badges and costumes in commit
   * b23550b). Previously-earned unlocks remain in the player's
   * progress.json but should not inflate the sticker book count once
   * their catalog entries are gone.
   *
   * If the catalog hasn't loaded yet, fall back to the raw count so
   * the number isn't confusingly zero.
   */
  _countValidUnlocks() {
    const { progress, rewards } = this.context.services;
    const unlocked = progress.unlockedItems ?? [];

    if (!rewards.all || rewards.all.length === 0) {
      return unlocked.length;
    }

    const catalogIds = new Set(rewards.all.map(r => r.id));
    return unlocked.filter(u => catalogIds.has(u.id)).length;
  }
}

// Visual styling per lesson id - cover emoji and background color on
// the home-screen card. Falls back to DEFAULT_META for unknown lessons.
//
// NOTE: this is hardcoded here rather than loaded from lessons.json
// which makes adding a new lesson a two-file change. It's the pragmatic
// option for now - a future refactor should promote coverEmoji and
// coverColor into the lesson JSON + DTO so content owns its own cover.
const LESSON_META = {
  // Original 7
  animals: { emoji: '🦁', color: '#FFB84C' },
  colors: { emoji: '🎨', color: '#FF6B9D' },
  fruits: { emoji: '🍎', color: '#FF8C42' },
  vehicles: { emoji: '🚗', color: '#4ECDC4' },
  body: { emoji: '👶', color: '#FFB3D9' },
  clothes: { emoji: '👕', color: '#5B9EFF' },
  weather: { emoji: '☀️', color: '#A78BFA' },

  // 10 new lessons (colors chosen to avoid clashing with adjacent cards
  // on the home screen - the 2-column grid pairs odd/even positions
  // so we alternate warm/cool/neutral hues down the list)
  family: { emoji: '👨‍👩‍👧', color: '#06B6D4' },  // teal - warmth via emoji, calm via color
  food: { emoji: '🍕', color: '#EF4444' },  // classic pizza red
  numbers: { emoji: '🔢', color: '#8B5CF6' },  // violet - stands apart from rainbow
  toys: { emoji: '🧸', color: '#FB923C' },  // teddy orange
  actions: { emoji: '🏃', color: '#14B8A6' },  // teal - action/energy vibe
  feelings: { emoji: '💖', color: '#EC4899' },  // pink heart
  house: { emoji: '🏠', color: '#6366F1' },  // indigo like blueprints
  nature: { emoji: '🌳', color: '#16A34A' },  // forest green
  bugs: { emoji: '🐞', color: '#84CC16' },  // lime green
  sea: { emoji: '🐋', color: '#0284C7' },  // ocean deep blue
};

const DEFAULT_META = { emoji: '📚', color: '#A78BFA' };
