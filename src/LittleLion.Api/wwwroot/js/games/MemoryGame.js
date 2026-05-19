import { BaseGame } from './BaseGame.js';
import { el } from '../core/DomHelpers.js';
import { shuffled, pickRandom } from '../core/Random.js';
import { createVocabVisual } from '../screens/VocabVisual.js';

/**
 * Memory Match (concentration) game.
 *
 * Grid of face-down cards in pairs. Tap one to flip it and hear the word.
 * Tap a second to check for a match:
 *   - Match: both stay face-up, celebration, score++
 *   - Mismatch: both flip back after a brief delay so the child has time
 *     to memorize them for later
 *
 * Single-round game: one round == all pairs matched. Stars = pairs matched,
 * so a 3-pair Easy game caps at 3 stars, Medium 5, Hard 6.
 *
 * Deliberately does NOT call noteWrong() on mismatches - memory games
 * naturally produce many 'wrong' taps and that's the point, not a
 * failure signal. Leo stays neutral; only cheers on matches.
 */
export class MemoryGame extends BaseGame {
  get gameName()    { return 'memory'; }
  get totalRounds() { return 1; }

  get pairCount() {
    return { Easy: 3, Medium: 5, Hard: 6 }[this.difficulty] ?? 5;
  }

  /** How long mismatched cards stay visible before flipping back. */
  get flipBackMs() {
    return { Easy: 1500, Medium: 1200, Hard: 1000 }[this.difficulty] ?? 1200;
  }

  renderRound() {
    const { audio, media } = this.context.services;

    // Pick N distinct vocab items, create two cards per item
    const n = Math.min(this.pairCount, this.vocab.length);
    const items = pickRandom(this.vocab, n);

    // Build 2 cards per item, each tagged with the item's id + a unique
    // card-id so we can tell the two cards of the same pair apart.
    const cardDefs = items.flatMap(item => [
      { uid: `${item.id}-a`, item },
      { uid: `${item.id}-b`, item },
    ]);
    const deck = shuffled(cardDefs);
    const spokenItemIds = new Set();  // first-flip TTS; don't re-speak on re-flips
    const matchedItemIds = new Set();

    // Two-phase state machine: first pick, then second pick.
    // While resolving a mismatch (cards visible + waiting to flip back),
    // further taps are ignored via `locked`.
    let firstPick = null;   // { cardEl, item }
    let locked = false;

    const cardEls = deck.map((cardDef) => {
      const card = el('button', {
        class: 'relative w-full aspect-[3/4] cursor-pointer [perspective:1000px] transition-all duration-300',
        type: 'button',
        'aria-label': 'Hidden card',
        onclick: () => handleTap(card, cardDef),
      }, [
        el('div', { class: 'memory-card-inner relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]' }, [
          el('div', { class: 'absolute inset-0 w-full h-full rounded-3xl shadow-card [backface-visibility:hidden] flex flex-col items-center justify-center p-4 bg-brand-blue text-white text-6xl font-bold' }, ['?']),
          el('div', { class: 'absolute inset-0 w-full h-full rounded-3xl shadow-card [backface-visibility:hidden] flex flex-col items-center justify-center p-4 bg-white [transform:rotateY(180deg)] border-4 border-brand-yellow' }, [
            createVocabVisual(cardDef.item, media, { size: 'small' }),
          ]),
        ]),
      ]);
      return { el: card, def: cardDef };
    });

    const handleTap = (cardEl, cardDef) => {
      if (locked) return;
      if (matchedItemIds.has(cardDef.item.id)) return;
      if (cardEl.dataset.flipped) return;

      // Flip it open
      cardEl.dataset.flipped = 'true';
      cardEl.querySelector('.memory-card-inner').classList.add('[transform:rotateY(180deg)]');
      cardEl.setAttribute('aria-label', cardDef.item.word);

      // Speak the word on the FIRST reveal of each item (no spam on re-flips)
      if (!spokenItemIds.has(cardDef.item.id)) {
        spokenItemIds.add(cardDef.item.id);
        audio.speak(cardDef.item.word);
      } else {
        // Still play a soft tick so the tap feels responsive
        this.context.services.sfx.play('ding');
      }

      if (firstPick === null) {
        // First card of a pair - just remember it and wait for second tap
        firstPick = { cardEl, item: cardDef.item, uid: cardDef.uid };
        return;
      }

      // Second card of a pair - compare
      const first = firstPick;
      const second = { cardEl, item: cardDef.item, uid: cardDef.uid };
      firstPick = null;

      if (first.item.id === second.item.id && first.uid !== second.uid) {
        // MATCH
        this._onMatch(first, second);
        matchedItemIds.add(first.item.id);

        this.stars = matchedItemIds.size;
        this.topBar.update({
          progress: matchedItemIds.size / n,
          stars: this.stars,
        });

        if (matchedItemIds.size === n) {
          // All pairs done - short pause to let the last match celebrate
          setTimeout(() => {
            this.round = this.totalRounds;
            this.context.services.progress.recordSession(
              this.lessonId, this.stars, this.difficulty);
            this.context.router.navigate('win', {
              stars: this.stars,
              playedGame: 'memory',
              lessonId: this.lessonId,
              difficulty: this.difficulty,
            });
          }, 1000);
        }
      } else {
        // MISMATCH - flip both back after a delay so the child can study them
        locked = true;
        setTimeout(() => {
          delete first.cardEl.dataset.flipped;
          delete second.cardEl.dataset.flipped;
          first.cardEl.querySelector('.memory-card-inner').classList.remove('[transform:rotateY(180deg)]');
          second.cardEl.querySelector('.memory-card-inner').classList.remove('[transform:rotateY(180deg)]');
          first.cardEl.setAttribute('aria-label', 'Hidden card');
          second.cardEl.setAttribute('aria-label', 'Hidden card');
          locked = false;
        }, this.flipBackMs);
      }
    };

    // Grid sizing: build a grid CSS class based on pair count so 3/5/6 pairs
    // each get a visually-pleasing layout (2x3, 2x5, 3x4 respectively).
    let colsClass = 'grid-cols-2 md:grid-cols-3';
    if (n === 5) colsClass = 'grid-cols-2 md:grid-cols-5';
    if (n === 6) colsClass = 'grid-cols-3 md:grid-cols-4';
    
    const gridClass = `grid ${colsClass} gap-4 w-full max-w-4xl mx-auto mt-6 mb-8`;
    const gridEl = el('div', { class: gridClass }, cardEls.map(c => c.el));

    this.bodyContainer.append(
      el('p', { class: 'text-2xl md:text-3xl font-bold text-center text-brand-purple mb-6' }, ['Find the matching pairs']),
      gridEl,
    );
  }

  _onMatch(first, second) {
    [first, second].forEach(pick => {
      pick.cardEl.classList.add('opacity-50', 'pointer-events-none', 'scale-95');
    });
    this.context.services.sfx.play('ding');
    this.context.bus.emit('leo:cheer');
  }
}
