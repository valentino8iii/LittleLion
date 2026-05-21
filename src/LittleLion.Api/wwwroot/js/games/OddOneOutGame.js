import { BaseGame } from './BaseGame.js';
import { el } from '../core/DomHelpers.js';
import { pickRandom, pickOne } from '../core/Random.js';
import { createVocabVisual } from '../screens/VocabVisual.js';

/** CSS class suffixes for tile patterns used in the Colors-lesson mode. */
const PATTERNS = ['solid', 'dots', 'stripes', 'checkered'];

/**
 * Odd One Out.
 *
 * Shows N tiles where (N-1) are from the current lesson and 1 is an
 * "intruder" from a different lesson. The child taps the intruder.
 *
 * Unlike Tap/Balloon which test "hear word -> find image", Odd One
 * Out tests *categorization*: "which of these doesn't belong to this
 * topic?" - a semantic judgement, not a lexical recall. Filling the
 * categorization gap is why I recommended this as the second new game.
 *
 * Needs access to OTHER lessons' vocab to pull an intruder - gets
 * that via the lesson service (loaded all summaries + contents on
 * demand).
 */
export class OddOneOutGame extends BaseGame {
  get gameName() { return 'odd'; }

  get roundsByDifficulty() { return { Easy: 3, Medium: 5, Hard: 7 }; }

  /** Total tiles per round - (N-1) correct + 1 intruder. */
  get tileCount() {
    return { Easy: 3, Medium: 4, Hard: 5 }[this.difficulty] ?? 4;
  }

  // onMount: load all lesson summaries + their item pools so we can
  // draw intruders from any other lesson. We extend the BaseGame
  // onMount rather than replacing it - super loads the current lesson
  // content, we then load others.
  async onMount() {
    await super.onMount();
    await this._loadIntruderPool();
    // super.onMount already rendered the first round with an empty
    // intruder pool if loading was slow - re-render so the first
    // round has a proper intruder.
    if (this._intruderPool.length > 0 && this.round === 0) {
      this._renderRound();
    }
  }

  async _loadIntruderPool() {
    const { lessons } = this.context.services;
    try {
      const summaries = await lessons.getAllSummaries();
      const otherIds = summaries
        .map(s => s.id)
        .filter(id => id !== this.lessonId);

      // Load each OTHER lesson's items in parallel
      const others = await Promise.all(
        otherIds.map(id => lessons.getLesson(id).catch(() => null))
      );

      // Flatten to a single pool; tag each item with its lessonId so
      // we don't accidentally pick an item from the player's current
      // lesson even if another lesson happens to share an id (unlikely
      // but defensive).
      this._intruderPool = others
        .filter(l => l && Array.isArray(l.items))
        .flatMap(l => l.items.filter(item =>
          !this.vocab.some(v => v.id === item.id)));
    } catch (err) {
      console.error('Odd One Out: failed to load intruder pool', err);
      this._intruderPool = [];
    }
  }

  renderRound() {
    // The Colors lesson is unique - it teaches a visual attribute,
    // not a noun category. A cross-lesson intruder ("which of these
    // isn't a color?") doesn't match what the lesson teaches. For
    // Colors specifically we show N swatches of one color + 1 swatch
    // of a different color, with random patterns for visual variety.
    if (this.lessonId === 'colors') {
      this._renderColorsRound();
      return;
    }
    this._renderCategoryRound();
  }

  /** Default behavior for all non-Colors lessons: cross-lesson intruder. */
  _renderCategoryRound() {
    const { audio, media } = this.context.services;

    const correctCount = Math.max(2, this.tileCount - 1);
    const n = Math.min(correctCount, this.vocab.length);

    const correctItems = pickRandom(this.vocab, n);

    // Pick an intruder from the cross-lesson pool. If the pool isn't
    // loaded yet (first render on slow devices), skip and show only
    // lesson items - _loadIntruderPool will re-render once loaded.
    const pool = this._intruderPool ?? [];
    if (pool.length === 0) {
      this.bodyContainer.append(
        el('p', { class: 'text-xl text-center text-brand-purple font-bold' }, ['Loading...']),
      );
      return;
    }

    const intruder = pickOne(pool);
    const options = [...correctItems, intruder];
    options.sort(() => Math.random() - 0.5);

    let locked = false;
    let intruderTile = null;

    const tiles = options.map((item, idx) => {
      const isIntruder = item.id === intruder.id;
      const tile = el('button', {
        class: 'relative w-full aspect-square rounded-3xl shadow-card bg-white flex flex-col items-center justify-center p-4 border-4 border-transparent hover:-translate-y-1 active:translate-y-1 transition-all animate-screen-enter overflow-hidden',
        style: {
          background: this.tileBackground(item),
          animationDelay: `${idx * 90}ms`,
        },
        'aria-label': item.word,
        onclick: () => {
          if (locked) return;
          if (isIntruder) {
            locked = true;
            tile.classList.add('!border-brand-green', '!bg-green-50', 'scale-105');
            this.context.services.sfx.play('ding');
            audio.speak(item.word);
            this.context.bus.emit('leo:cheer');
            this._showPraise(item.word);
            this.completeRound();
          } else {
            tile.classList.add('animate-wiggle', '!bg-red-50');
            this.context.services.sfx.play('buzz');
            this.context.bus.emit('leo:sad');
            this.noteWrong();
            setTimeout(() => tile.classList.remove('animate-wiggle', '!bg-red-50'), 500);
          }
        },
      }, [createVocabVisual(item, media, { size: 'medium' })]);
      if (isIntruder) intruderTile = tile;
      return tile;
    });

    this._finishRender(tiles, options.length, intruderTile);
  }

  /**
   * Colors-specific round. Builds tiles from Colors vocab directly
   * (not from cross-lesson intruder pool) - (N-1) tiles of one color,
   * 1 tile of a different color. Each tile gets a randomly-picked
   * pattern from PATTERNS so the tile grid looks visually rich
   * rather than 5 identical squares. The child must still solve by
   * COLOR though - pattern is decorative, not the gameplay variable.
   */
  _renderColorsRound() {
    const { audio } = this.context.services;

    if (this.vocab.length < 2) return; // Defensive; Colors has 12 items.

    // Pick two distinct colors from the Colors vocab: one for the
    // N-1 "same" tiles, one for the intruder.
    const [mainColor, intruderColor] = pickRandom(this.vocab, 2);

    // Repeat mainColor (N-1) times + add intruder, shuffle order.
    const correctCount = Math.max(2, this.tileCount - 1);
    const options = [
      ...Array.from({ length: correctCount }, () => mainColor),
      intruderColor,
    ];
    options.sort(() => Math.random() - 0.5);

    let locked = false;
    let intruderTile = null;

    const tiles = options.map((item, idx) => {
      const isIntruder = item.id === intruderColor.id;
      const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];

      const tile = el('button', {
        class: `relative w-full aspect-square rounded-3xl shadow-card flex flex-col items-center justify-center p-4 border-4 border-white/50 hover:-translate-y-1 active:translate-y-1 transition-all animate-screen-enter overflow-hidden color-swatch color-swatch--${pattern}`,
        style: {
          // Use the raw color directly - we explicitly want to bypass
          // tileBackground()'s Colors+Hard neutral rule here. The
          // whole point of this mode is that color IS the signal.
          '--swatch-color': item.color,
          background: item.color,
          animationDelay: `${idx * 90}ms`,
        },
        'aria-label': item.word,
        onclick: () => {
          if (locked) return;
          if (isIntruder) {
            locked = true;
            tile.classList.add('!border-white', 'scale-105');
            this.context.services.sfx.play('ding');
            audio.speak(item.word);
            this.context.bus.emit('leo:cheer');
            this._showPraise(item.word);
            this.completeRound();
          } else {
            tile.classList.add('animate-wiggle');
            this.context.services.sfx.play('buzz');
            this.context.bus.emit('leo:sad');
            this.noteWrong();
            setTimeout(() => tile.classList.remove('animate-wiggle'), 500);
          }
        },
      });
      // Note: no vocab-visual on Colors tiles - the tile IS the content.
      // Putting an emoji inside would re-introduce the object-as-signal
      // confusion that the user's screenshot flagged.
      if (isIntruder && !intruderTile) intruderTile = tile;
      return tile;
    });

    this._finishRender(tiles, options.length, intruderTile);
  }

  /** Common tail for both rendering paths: prompt, grid, auto-speak. */
  _finishRender(tiles, tileCount, intruderTile) {
    const { audio } = this.context.services;

    const gridClass = tileCount >= 5 
      ? 'grid grid-cols-3 gap-4 w-full max-w-md mx-auto mt-6' 
      : 'grid grid-cols-2 gap-6 w-full max-w-md mx-auto mt-6';

    const promptSpoken = `${this.lessonTitle}. Which one doesn't belong?`;
    const playPrompt = () => audio.speak(promptSpoken);

    this.bodyContainer.append(
      el('p', { class: 'text-2xl md:text-3xl font-bold text-center text-brand-purple mb-6' }, [`Which one doesn't belong?`]),
      el('button', {
        class: 'flex items-center justify-center gap-3 bg-brand-accent text-ink font-bold text-xl px-8 py-4 rounded-full shadow-card hover:-translate-y-1 active:translate-y-1 transition-all mx-auto w-fit mb-4',
        onclick: playPrompt,
      }, [
        el('span', { class: 'text-2xl' }, ['🔊']),
        el('span', {}, ['Play sound']),
      ]),
      el('div', { class: gridClass }, tiles),
    );

    setTimeout(playPrompt, 500);
    this.startRoundWatch(intruderTile);
  }

  _showPraise(word) {
    const banner = el('div', { class: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-4 rounded-full shadow-card text-2xl font-bold text-brand-green animate-toast-enter z-50 whitespace-nowrap' }, [`Yes! ${word} is different! 🎉`]);
    this.bodyContainer.appendChild(banner);
  }
}
