import { BaseGame } from './BaseGame.js';
import { el } from '../core/DomHelpers.js';
import { pickRandom, pickOne } from '../core/Random.js';
import { createVocabVisual } from '../screens/VocabVisual.js';

export class TapGame extends BaseGame {
  get gameName() { return 'tap'; }

  // Easy: 3 rounds of 3 options. Medium: 5 of 5. Hard: 7 of 8.
  get roundsByDifficulty() { return { Easy: 3, Medium: 5, Hard: 7 }; }
  get optionCount() {
    return { Easy: 3, Medium: 5, Hard: 8 }[this.difficulty] ?? 5;
  }

  /**
   * Pick the options to show for this round. Default is a random
   * sample plus a random target. Exposed as a hook so subclasses
   * can implement smarter distractor selection if needed.
   *
   * Returns { options: VocabItem[], target: VocabItem }.
   */
  pickOptions(n) {
    const options = pickRandom(this.vocab, n);
    const target = pickOne(options);
    return { options, target };
  }

  /** Prompt text shown above the tile grid. Subclasses may override. */
  get promptText() { return 'Listen and tap'; }

  renderRound() {
    const { audio, media } = this.context.services;
    // Cap options at vocab length in case a lesson has fewer items than Hard wants
    const n = Math.min(this.optionCount, this.vocab.length);
    const { options, target } = this.pickOptions(n);
    let locked = false;

    const playSound = () => audio.speak(target.word);

    let correctTile = null;
    const tiles = options.map((item, idx) => {
      const tile = el('button', {
        class: 'relative w-full aspect-square rounded-3xl shadow-card bg-white flex flex-col items-center justify-center p-4 border-4 border-transparent hover:-translate-y-1 active:translate-y-1 transition-all animate-screen-enter overflow-hidden',
        style: {
          background: this.tileBackground(item),
          animationDelay: `${idx * 90}ms`,
        },
        'aria-label': item.word,
        onclick: () => {
          if (locked) return;
          if (item.id === target.id) {
            locked = true;
            tile.classList.add('!border-brand-green', '!bg-green-50', 'scale-105');
            this.context.services.sfx.play('ding');
            audio.speak(item.word);
            this.context.bus.emit('leo:cheer');
            this._showPraise(target.word);
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
      if (item.id === target.id) correctTile = tile;
      return tile;
    });

    const gridClass = n >= 7 
      ? 'grid grid-cols-3 gap-4 w-full max-w-md mx-auto mt-6' 
      : 'grid grid-cols-2 gap-6 w-full max-w-md mx-auto mt-6';

    this.bodyContainer.append(
      el('p', { class: 'text-2xl md:text-3xl font-bold text-center text-brand-purple mb-6' }, [this.promptText]),
      el('button', {
        class: 'flex items-center justify-center gap-3 bg-brand-yellow text-ink font-bold text-xl px-8 py-4 rounded-full shadow-card hover:-translate-y-1 active:translate-y-1 transition-all mx-auto w-fit mb-4',
        onclick: playSound,
      }, [
        el('span', { class: 'text-2xl' }, ['🔊']),
        el('span', {}, ['Play sound']),
      ]),
      el('div', { class: gridClass }, tiles),
    );

    setTimeout(playSound, 400);

    this.startRoundWatch(correctTile);
  }

  _showPraise(word) {
    const banner = el('div', { class: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-8 py-4 rounded-full shadow-card text-2xl font-bold text-brand-green animate-toast-enter z-50 whitespace-nowrap' }, [`Yes! ${word}! 🎉`]);
    this.bodyContainer.appendChild(banner);
  }
}
