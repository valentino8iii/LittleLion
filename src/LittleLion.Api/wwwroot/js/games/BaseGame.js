import { Component } from '../core/Component.js';
import { el } from '../core/DomHelpers.js';
import { createTopBar } from '../screens/TopBar.js';
import { Leo } from '../screens/Leo.js';
import { createSceneBackground } from '../screens/SceneBackground.js';

/**
 * Base class for all games. Handles the boring shared parts:
 *   - loading the active lesson
 *   - top bar with progress + stars
 *   - Leo the Lion watching from a corner, reacting to events
 *   - win condition and star crediting
 *   - character moments: hint-pointing after 8s of hesitation,
 *     comfort shrug + voice line after 3 wrong answers in a row
 *
 * Subclasses implement:
 *   - totalRounds  (how many rounds for this game)
 *   - renderRound()
 *
 * Subclasses should call:
 *   - this.startRoundWatch(correctTileElement) at the top of renderRound
 *   - this.noteWrong() on wrong answers
 *   - this.noteCorrect() on correct answers (cancels hint timers)
 */
const HINT_AFTER_MS = 8000;
const COMFORT_AFTER_WRONG = 3;

/**
 * Default round count per difficulty. Subclasses can override
 * roundsByDifficulty for game-specific tuning (e.g. Balloon wants
 * fewer rounds since each round is longer).
 */
const DEFAULT_ROUNDS_BY_DIFFICULTY = { Easy: 3, Medium: 5, Hard: 7 };

export class BaseGame extends Component {
  constructor(context, params = {}) {
    super(context);
    this.lessonId = params.lessonId ?? 'animals';
    this.difficulty = params.difficulty ?? 'Medium';
    this.stars = 0;
    this.round = 0;
    this.vocab = [];
    this.topBar = null;
    this.bodyContainer = null;
    this.leo = null;

    // Character-moment state
    this._wrongStreak = 0;
    this._hintTimer = null;
    this._hintTargetTile = null;
  }

  /** Subclasses override to change the round schedule per difficulty. */
  get roundsByDifficulty() { return DEFAULT_ROUNDS_BY_DIFFICULTY; }

  get totalRounds() {
    return this.roundsByDifficulty[this.difficulty]
      ?? this.roundsByDifficulty.Medium
      ?? 5;
  }

  get gameName() { return 'base'; }

  /**
   * Background color to use for a tile or balloon for a given vocab item.
   *
   * Defaults to item.color. For the Colors lesson on Hard, we return a
   * neutral cream so the tile color doesn't give away the answer - the
   * child has to rely on the object (apple, banana, leaf...) and the
   * spoken word, not on matching tile-color to card-color.
   *
   * Easy and Medium keep the colorful tiles as training wheels.
   */
  tileBackground(item) {
    if (this.lessonId === 'colors' && this.difficulty === 'Hard') {
      return '#FEF3C7'; // soft cream, same as hero banner on home
    }
    return item.color;
  }

  render() {
    this.topBar = createTopBar({
      onBack: () => this.context.router.navigate('gamePicker', {
        lessonId:   this.lessonId,
        difficulty: this.difficulty,
      }),
      onHome: () => this.context.router.navigate('home'),
    });
    this.onDispose(() => this.topBar.destroy());

    this.bodyContainer = el('div', { class: 'flex-1 relative z-10 p-6 flex flex-col items-center justify-center overflow-y-auto w-full' });

    // Leo watches from the bottom-left corner while the child plays
    this.leo = new Leo(this.context.bus, { size: 'small' });
    this.onDispose(() => this.leo.destroy());
    const leoCorner = el('div', { class: 'absolute bottom-4 left-4 z-20 pointer-events-none' }, [this.leo.element]);

    // Scene placeholder - actual theme injected in onMount once lesson loads
    this.sceneContainer = el('div', { class: 'absolute inset-0 z-0' });

    return el('div', { class: 'screen flex flex-col' }, [
      this.sceneContainer,
      this.topBar.element,
      this.bodyContainer,
      leoCorner,
    ]);
  }

  async onMount() {
    try {
      const lesson = await this.context.services.lessons.getLesson(this.lessonId);
      this.vocab = lesson.items;
      this.lessonTitle = lesson.title;
      this.sceneContainer.appendChild(createSceneBackground(lesson.theme));
      this._updateTopBar();
      this._renderRound();
    } catch (err) {
      console.error('Failed to load lesson', err);
      this.bodyContainer.textContent = 'Oops, could not load the lesson.';
    }
  }

  onUnmount() {
    this._clearHintTimer();
  }

  /** Subclasses override to render a single round's UI inside `this.bodyContainer`. */
  renderRound() {
    throw new Error(`${this.constructor.name} must implement renderRound().`);
  }

  /**
   * Called by subclasses at the start of each round. Arms the hint timer
   * so Leo will point at the correct tile if the child hesitates too long.
   */
  startRoundWatch(correctTileElement) {
    this._clearHintTimer();
    this._hintTargetTile = correctTileElement;
    this._hintTimer = setTimeout(() => this._triggerHint(), HINT_AFTER_MS);
  }

  noteCorrect() {
    this._wrongStreak = 0;
    this._clearHintTimer();
  }

  noteWrong() {
    this._wrongStreak += 1;
    if (this._wrongStreak >= COMFORT_AFTER_WRONG) {
      this._wrongStreak = 0;
      this._triggerComfort();
    }
  }

  /** Subclasses call this to award a star and advance. */
  completeRound() {
    this.stars += 1;
    this.round += 1;
    this.noteCorrect();
    this._updateTopBar();

    setTimeout(() => {
      if (this.round >= this.totalRounds) {
        this._finish();
      } else {
        this._renderRound();
      }
    }, 1100);
  }

  _renderRound() {
    this.bodyContainer.innerHTML = '';
    this.renderRound();
  }

  _updateTopBar() {
    this.topBar.update({
      progress: this.round / this.totalRounds,
      stars: this.stars,
    });
  }

  _clearHintTimer() {
    if (this._hintTimer) {
      clearTimeout(this._hintTimer);
      this._hintTimer = null;
    }
    if (this._hintTargetTile) {
      this._hintTargetTile.classList.remove('ring-8', 'ring-brand-accent/50');
      this._hintTargetTile = null;
    }
  }

  _triggerHint() {
    if (!this._hintTargetTile) return;

    // Glow the correct tile + Leo points at it. Direction picked from
    // whether the tile is on the left or right half of the viewport.
    const tile = this._hintTargetTile;
    tile.classList.add('ring-8', 'ring-brand-accent/50');

    const rect = tile.getBoundingClientRect();
    const midX = window.innerWidth / 2;
    const direction = rect.left + rect.width / 2 < midX ? 'left' : 'right';
    this.context.bus.emit('leo:point', { direction });
  }

  _triggerComfort() {
    this.context.bus.emit('leo:shrug');
    // Small encouraging voice line - kids this age respond to warm tones
    this.context.services.audio.speak(`It's OK, let's try again!`, 0.9);
  }

  _finish() {
    this._clearHintTimer();
    // Fire-and-forget - the Win screen doesn't block on the server response.
    this.context.services.progress.recordSession(
      this.lessonId, this.stars, this.difficulty);
    this.context.router.navigate('win', {
      stars: this.stars,
      playedGame: this.gameName,
      lessonId: this.lessonId,
      difficulty: this.difficulty,
    });
  }
}
