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
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-brand-primary"><path d="M3 15h18v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2z" fill="#93C5FD" stroke="currentColor" /><path d="M7 10l3-4h4l3 4z" fill="white" stroke="currentColor" /><path d="M17 10h4v-3h-4z" fill="#60A5FA" stroke="currentColor" /><circle cx="7.5" cy="16.5" r="2" fill="#4B5563" stroke="currentColor" /><circle cx="7.5" cy="16.5" r="0.5" fill="white" /><circle cx="16.5" cy="16.5" r="2" fill="#4B5563" stroke="currentColor" /><circle cx="16.5" cy="16.5" r="0.5" fill="white" /></svg>`;
      } else {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5000 5000" class="w-5 h-5 text-brand-primary"><path fill-rule="evenodd" fill="currentColor" fill-opacity="1" d="M 2923.03125 2060.421875 C 2850.449219 2038.480469 2775.421875 2032.410156 2709.300781 2033.46875 C 2659.859375 2034.269531 2615.738281 2039.101562 2582.351562 2043.660156 C 2557.621094 1955.5 2508.640625 1859.359375 2432 1772.449219 C 2380.949219 1714.558594 2317.390625 1661.128906 2242.289062 1616.210938 C 2095.171875 1528.21875 1902.371094 1472.519531 1662.488281 1488.550781 C 1437.019531 1502.738281 1241.328125 1632.898438 1102.800781 1778.109375 C 1030.589844 1853.808594 971.335938 1931.058594 940.039062 2013.828125 C 912.464844 2086.769531 905.1875 2161.230469 923.632812 2229.75 C 958.140625 2357.96875 1081.070312 2466.230469 1308.488281 2501.371094 C 1506.300781 2531.53125 1666.378906 2514.671875 1794.421875 2473.800781 C 1582.101562 2773.210938 1573.171875 3152.628906 1731.148438 3466.410156 C 1787.320312 3577.988281 1865.28125 3681.339844 1963.71875 3768.941406 C 2161.070312 3944.558594 2440.179688 4056.453125 2782.671875 4059.871094 C 3305.230469 4062.324219 3670.738281 3829.601562 3840.460938 3497.519531 C 4006.71875 3172.210938 3986.761719 2746.390625 3730.890625 2343.511719 C 3738.210938 2333.46875 3746.890625 2321.851562 3753.910156 2309.960938 C 3852.078125 2143.96875 4072.671875 1778.191406 4085.890625 1470.421875 C 4091.460938 1340.820312 4062.328125 1220.878906 3979.5 1125.589844 C 3914.5 1050.820312 3816.140625 989.71875 3670.96875 954.738281 C 3596.359375 936.289062 3529.289062 936.25 3468.660156 949.261719 C 3320.929688 980.960938 3209.828125 1095.019531 3129.011719 1246.988281 C 2989.339844 1509.628906 2939.589844 1882.941406 2923.53125 2054.75 Z M 2493.421875 3427.101562 L 2953.828125 3461.820312 C 2953.828125 3461.820312 2939.160156 3766.921875 2701.699219 3765.730469 C 2444.089844 3764.441406 2493.421875 3427.101562 2493.421875 3427.101562 Z M 2115.511719 3169.570312 C 2115.511719 3169.570312 2098.128906 3075.910156 2114.519531 2980.78125 C 2128.960938 2896.96875 2170.988281 2809.671875 2290.078125 2804.5 C 2354.660156 2801.691406 2403.820312 2813.011719 2440.828125 2834.488281 C 2497.929688 2867.609375 2524.28125 2924.21875 2536.839844 2979.230469 C 2557.519531 3069.789062 2541.121094 3158.449219 2541.121094 3158.449219 C 2536.460938 3183.578125 2553.078125 3207.78125 2578.210938 3212.441406 C 2603.339844 3217.109375 2627.539062 3200.488281 2632.199219 3175.359375 C 2632.199219 3175.359375 2652.160156 3068.128906 2627.148438 2958.609375 C 2609.261719 2880.21875 2568.691406 2801.570312 2487.320312 2754.359375 C 2437.789062 2725.628906 2372.46875 2708.191406 2286.050781 2711.949219 C 2111.398438 2719.539062 2044.398438 2842.140625 2023.230469 2965.050781 C 2004.011719 3076.628906 2024.441406 3186.488281 2024.441406 3186.488281 C 2029.109375 3211.621094 2053.308594 3228.238281 2078.441406 3223.570312 C 2103.570312 3218.898438 2120.191406 3194.699219 2115.511719 3169.570312 Z M 2989.871094 3140.371094 C 2989.871094 3140.371094 2972.488281 3046.710938 2988.878906 2951.578125 C 3003.308594 2867.769531 3045.339844 2780.46875 3164.429688 2775.300781 C 3229.011719 2772.488281 3278.179688 2783.808594 3315.191406 2805.289062 C 3372.289062 2838.410156 3398.640625 2895.019531 3411.199219 2950.03125 C 3431.878906 3040.589844 3415.480469 3129.25 3415.480469 3129.25 C 3410.808594 3154.378906 3427.429688 3178.578125 3452.570312 3183.238281 C 3477.699219 3187.910156 3501.890625 3171.289062 3506.558594 3146.160156 C 3506.558594 3146.160156 3526.519531 3038.929688 3501.511719 2929.410156 C 3483.609375 2851.019531 3443.050781 2772.371094 3361.679688 2725.160156 C 3312.148438 2696.421875 3246.828125 2678.988281 3160.410156 2682.75 C 2985.75 2690.339844 2918.761719 2812.941406 2897.589844 2935.851562 C 2878.359375 3047.429688 2898.800781 3157.289062 2898.800781 3157.289062 C 2903.46875 3182.421875 2927.660156 3199.039062 2952.800781 3194.371094 C 2977.929688 3189.691406 2994.539062 3165.5 2989.871094 3140.371094 Z M 3262.980469 2226.269531 C 3262.980469 2226.269531 3457.460938 2037.71875 3614.808594 1831.238281 C 3772.148438 1624.761719 3892.351562 1400.351562 3743.78125 1328.628906 C 3314.878906 1121.578125 3262.980469 2226.269531 3262.980469 2226.269531 "/></svg>`;
      }
    };

    const themeBtn = el('button', {
      class: 'relative flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-brand-primary group shrink-0 border-l border-ink/20 pl-1 h-5 sm:h-6 outline-none focus:outline-none',
      title: 'Toggle Theme',
      onclick: () => {
        window.toggleTheme();
        window.littleLionSfx?.play('pop');
      }
    });

    const updateToggleIcon = (theme) => {
      themeBtn.innerHTML = getThemeIcon(theme);
    };

    updateToggleIcon(window.getCurrentTheme?.() || 'girl');

    const onThemeChanged = (e) => {
      updateToggleIcon(e.detail);
    };
    window.addEventListener('themechanged', onThemeChanged);
    this.onDispose(() => {
      window.removeEventListener('themechanged', onThemeChanged);
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
          class: 'flex relative items-center gap-1 text-brand-primary hover:scale-110 active:scale-95 transition-all shrink-0',
          title: 'Sticker Book',
          onclick: () => this.context.router.navigate('stickerBook'),
        }, [
          (() => {
            const span = el('span', { class: 'w-4 h-4 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center' });
            span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" id="Award-Ribbon-Star-1--Streamline-Ultimate" class="w-full h-full">
  <desc>
    Award Ribbon Star 1 Streamline Icon: https://streamlinehq.com
  </desc>
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M4.807 13.042 0.75 18l3.75 0.75 1.5 4.5 3.944 -6.258" stroke-width="1.5"></path>
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M19.193 13.042 23.25 18l-3.75 0.75 -1.5 4.5 -3.944 -6.258" stroke-width="1.5"></path>
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M3.75 9c0 2.188 0.86919 4.2865 2.41637 5.8336C7.71354 16.3808 9.81196 17.25 12 17.25c2.188 0 4.2865 -0.8692 5.8336 -2.4164C19.3808 13.2865 20.25 11.188 20.25 9c0 -2.18804 -0.8692 -4.28646 -2.4164 -5.83363C16.2865 1.61919 14.188 0.75 12 0.75c-2.18804 0 -4.28646 0.86919 -5.83363 2.41637C4.61919 4.71354 3.75 6.81196 3.75 9Z" stroke-width="1.5"></path>
  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m12.531 4.29186 1.248 2.45801h2.127c0.1171 -0.00286 0.2323 0.02967 0.3306 0.09335s0.1751 0.15553 0.2204 0.26356c0.0453 0.10803 0.0569 0.2272 0.0333 0.34193 -0.0235 0.11473 -0.0811 0.21969 -0.1653 0.30116l-1.953 1.918 1.082 2.48503c0.0477 0.1138 0.0585 0.2397 0.0307 0.3599 -0.0277 0.1203 -0.0925 0.2288 -0.1852 0.3102 -0.0927 0.0815 -0.2087 0.1317 -0.3315 0.1437 -0.1228 0.012 -0.2463 -0.0149 -0.353 -0.0768L12 11.4189l-2.61499 1.471c-0.10671 0.0619 -0.23019 0.0888 -0.35301 0.0768 -0.12282 -0.012 -0.23876 -0.0622 -0.33147 -0.1437 -0.09272 -0.0814 -0.15751 -0.1899 -0.18523 -0.3102 -0.02772 -0.1202 -0.01698 -0.2461 0.03071 -0.3599l1.082 -2.48503 -1.953 -1.92201c-0.08415 -0.08146 -0.14177 -0.18642 -0.16532 -0.30115 -0.02355 -0.11474 -0.01193 -0.23391 0.03333 -0.34193 0.04526 -0.10803 0.12207 -0.19988 0.22037 -0.26356 0.0983 -0.06368 0.21353 -0.09621 0.33062 -0.09336H10.221l1.249 -2.454c0.051 -0.09649 0.1273 -0.17726 0.2208 -0.23359 0.0935 -0.05633 0.2006 -0.0861 0.3097 -0.0861 0.1092 0 0.2162 0.02977 0.3097 0.0861 0.0935 0.05633 0.1698 0.1371 0.2208 0.23359Z" stroke-width="1.5"></path>
</svg>`;
            return span;
          })(),
          this._stickerCount,
        ]),
        themeBtn,
      ]),
    ]);
  }

  _buildHeroBanner() {
    this._leo = new Leo(this.context.bus, { size: 'medium' });
    this.onDispose(() => this._leo.destroy());

    return el('div', { class: 'bg-white/90 rounded-3xl p-6 mb-8 shadow-card flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left shrink-0 ring-2 ring-brand-primary/50' }, [
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
      const baseClass = 'px-6 py-2 border-2 rounded-full font-bold transition-all outline-none focus:ring-2 focus:ring-brand-primary/50';
      const activeClass = 'bg-white shadow-soft text-brand-primary border-brand-primary';
      const inactiveClass = 'text-gray-500 hover:bg-gray-200/50 border-transparent';

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
