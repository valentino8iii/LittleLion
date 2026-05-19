import { BaseGame } from './BaseGame.js';
import { el } from '../core/DomHelpers.js';
import { shuffled, pickRandom } from '../core/Random.js';
import { createVocabVisual } from '../screens/VocabVisual.js';

/**
 * Drag-to-match game. Drag a word chip onto its matching animal tile.
 * Uses pointer events for unified mouse + touch handling.
 *
 * Single-round game: one round == all pairs matched. Difficulty scales
 * the pair count: Easy 3, Medium 4 (legacy), Hard 5.
 */
export class DragGame extends BaseGame {
  get gameName()    { return 'drag'; }
  get totalRounds() { return 1; }

  /**
   * Match-It scales differently from Tap/Balloon. Pictures + word chips
   * on a phone screen stop being tappable past ~5-6 items, so Hard keeps
   * the same count as Medium. The 'hard' part is coming from there being
   * more possible target words (15-word lessons vs the old 6-8), not from
   * more tiles on screen. Shuffling a 5-pick from 15 makes every session
   * different even at the same difficulty.
   */
  get pairCount() {
    return { Easy: 3, Medium: 5, Hard: 5 }[this.difficulty] ?? 5;
  }

  renderRound() {
    const { audio } = this.context.services;

    const n = Math.min(this.pairCount, this.vocab.length);
    const items = pickRandom(this.vocab, n);
    const wordOrder = shuffled(items.map(i => i.id));
    const matched = new Set();

    // Map itemId -> tile + chip elements so we can update them after a match
    const tileById = new Map();
    const chipById = new Map();

    let draggingId = null;
    let ghost = null;
    let lastTrailAt = 0;

    const spawnTrail = (x, y) => {
      // Throttle so we don't spawn hundreds of particles per second
      const now = performance.now();
      if (now - lastTrailAt < 40) return;
      lastTrailAt = now;

      const item = items.find(i => i.id === draggingId);
      const dot = el('div', {
        class: 'fixed w-4 h-4 rounded-full pointer-events-none z-50 animate-fade-out',
        style: {
          left: `${x}px`,
          top: `${y}px`,
          background: item.color,
        },
      });
      document.body.appendChild(dot);
      // Auto-clean after the fade-out animation
      setTimeout(() => dot.remove(), 500);
    };

    const onPointerMove = (e) => {
      if (!ghost) return;
      ghost.style.left = `${e.clientX - 50}px`;
      ghost.style.top  = `${e.clientY - 25}px`;
      spawnTrail(e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (!draggingId) return;
      const underneath = document.elementFromPoint(e.clientX, e.clientY);
      const slot = underneath?.closest('[data-slot]');
      const slotId = slot?.dataset.slot;

      if (slotId && slotId === draggingId) {
        matched.add(slotId);
        const item = items.find(i => i.id === slotId);
        const slotTile = tileById.get(slotId);

        chipById.get(slotId).classList.add('opacity-50', '!bg-gray-200', '!text-gray-400', 'pointer-events-none', 'transform-none', 'shadow-none', 'word-chip--used');
        slotTile.appendChild(
          el('div', { class: 'absolute bottom-2 bg-white/90 px-4 py-1 rounded-full font-bold text-brand-purple text-sm animate-toast-enter' }, [item.word])
        );

        // Lock this slot in: mark it done, dim it, remove the data-slot
        // attribute so it can't be a drop target any more. The remaining
        // unmatched slots visually 'stand out' which helps the child focus.
        slotTile.classList.add('opacity-50', 'scale-95', 'pointer-events-none');
        slotTile.removeAttribute('data-slot');

        this.context.services.sfx.play('ding');
        audio.speak(item.word);
        this.context.bus.emit('leo:cheer');

        this.stars = matched.size;
        this.topBar.update({ progress: matched.size / items.length, stars: this.stars });

        if (matched.size === items.length) {
          setTimeout(() => {
            this.round = this.totalRounds;
            this.context.services.progress.recordSession(
              this.lessonId, this.stars, this.difficulty);
            this.context.router.navigate('win', {
              stars: this.stars,
              playedGame: 'drag',
              lessonId: this.lessonId,
              difficulty: this.difficulty,
            });
          }, 900);
        }
      } else if (slot) {
        slot.classList.add('animate-wiggle', 'ring-4', 'ring-red-400');
        this.context.services.sfx.play('buzz');
        this.context.bus.emit('leo:sad');
        this.noteWrong();
        setTimeout(() => slot.classList.remove('animate-wiggle', 'ring-4', 'ring-red-400'), 400);
      }

      ghost?.remove();
      ghost = null;
      draggingId = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    const startDrag = (e, wordId) => {
      if (matched.has(wordId)) return;
      // IMPORTANT: do NOT call e.preventDefault() here. The chip's
      // onclick handler depends on the browser synthesizing a click
      // after pointerup for tap-without-drag gestures - that's how
      // the speech-on-tap feature works. preventDefault on pointerdown
      // suppresses the click synthesis on iOS Safari.
      draggingId = wordId;
      const item = items.find(i => i.id === wordId);

      ghost = el('div', { class: 'fixed z-50 opacity-80 pointer-events-none scale-110 shadow-lg bg-white px-6 py-3 rounded-full font-bold text-xl text-brand-purple touch-none select-none' }, [item.word]);
      ghost.style.left = `${e.clientX - 50}px`;
      ghost.style.top  = `${e.clientY - 25}px`;
      document.body.appendChild(ghost);

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    // Tiles (drop targets)
    const { media } = this.context.services;
    const tilesWrapper = el('div', { class: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl mx-auto mt-6 mb-8' },
      items.map((item, idx) => {
        const tile = el('div', {
          class: 'relative w-full aspect-square rounded-3xl shadow-card bg-white flex flex-col items-center justify-center p-4 border-4 border-transparent transition-all animate-screen-enter overflow-hidden',
          style: {
            background: this.tileBackground(item),
            animationDelay: `${idx * 90}ms`,
          },
          dataset: { slot: item.id },
        }, [createVocabVisual(item, media, { size: 'medium' })]);
        tileById.set(item.id, tile);
        return tile;
      })
    );

    // Word chips
    // Each chip speaks its word on CLICK (not pointerdown). Speech
    // synthesis on touch devices is gated by a 'user activation' event,
    // and pointerdown at the start of a drag often does NOT count as
    // one - especially on iOS Safari. Click only fires on a clean
    // tap-and-release, which is always treated as user activation.
    //
    // Trade-off: speech does NOT fire during a drag-start. That's fine -
    // the child either taps to listen (click fires, speech plays) or
    // drags to match (pointerdown fires, drag works, no speech). Both
    // flows feel natural; trying to do both at once was the bug.
    const chipsWrapper = el('div', { class: 'flex flex-wrap justify-center gap-4 w-full max-w-3xl mx-auto mt-auto mb-4' },
      wordOrder.map(wordId => {
        const item = items.find(i => i.id === wordId);
        const chip = el('div', {
          class: 'bg-white px-6 py-3 rounded-full shadow-card font-bold text-xl text-brand-purple cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-transform touch-none select-none word-chip',
          onclick: () => {
            // Skip if already matched - re-tapping a green chip stays silent
            if (chip.classList.contains('word-chip--used')) return;
            audio.speak(item.word);
          },
          onpointerdown: (e) => startDrag(e, wordId),
        }, [item.word]);
        chipById.set(wordId, chip);
        return chip;
      })
    );

    this.bodyContainer.append(
      el('p', { class: 'text-2xl md:text-3xl font-bold text-center text-brand-purple mb-6' }, ['Tap the word to hear, then drag to the picture']),
      tilesWrapper,
      chipsWrapper,
    );

    // Cleanup safety
    this.onDispose(() => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      ghost?.remove();
    });
  }
}
