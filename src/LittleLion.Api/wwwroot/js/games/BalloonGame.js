import { BaseGame } from './BaseGame.js';
import { el } from '../core/DomHelpers.js';
import { pickRandom, pickOne } from '../core/Random.js';
import { createVocabVisual } from '../screens/VocabVisual.js';

export class BalloonGame extends BaseGame {
  get gameName() { return 'balloon'; }

  // Balloon rounds take longer than tap rounds, so fewer per session.
  get roundsByDifficulty() { return { Easy: 3, Medium: 5, Hard: 6 }; }
  get balloonCount() {
    return { Easy: 3, Medium: 5, Hard: 8 }[this.difficulty] ?? 5;
  }
  /** Seconds for a balloon to rise across the screen - lower = faster = harder */
  get baseRiseSeconds() {
    return { Easy: 7.5, Medium: 5.5, Hard: 4 }[this.difficulty] ?? 5.5;
  }

  render() {
    const root = super.render();

    // Swap the default body for our balloon-specific layout class.
    // The scene background from BaseGame already covers the sky, so we
    // don't need the old balloon-sky layer any more.
    this.bodyContainer.className = 'flex-1 relative z-10 w-full overflow-hidden flex flex-col pt-8';

    return root;
  }

  renderRound() {
    const { audio } = this.context.services;

    const n = Math.min(this.balloonCount, this.vocab.length);
    const choices = pickRandom(this.vocab, n);
    const target  = pickOne(choices);
    let locked = false;

    const promptBtn = el('button', {
      class: 'flex items-center justify-center gap-3 bg-brand-accent text-ink font-bold text-xl px-8 py-4 rounded-full shadow-card hover:-translate-y-1 active:translate-y-1 transition-all mx-auto w-fit mb-4',
      style: { marginBottom: '12px', position: 'relative', zIndex: '50' },
      onclick: () => audio.speak(target.word),
    }, [
      el('span', { class: 'text-2xl', style: { background: 'var(--color-pink)' } }, ['🔊']),
      el('span', {}, [`Pop the ${target.word.toLowerCase()}!`]),
    ]);

    // Crowded mode shrinks balloon bodies ~20% when we have 7+ on screen
    // so they don't overlap horribly on narrow phones.
    const field = el('div', { class: 'relative flex-1 w-full h-full pointer-events-none' });
    const { media } = this.context.services;

    let correctBalloon = null;
    // Distribute horizontal positions proportionally to the balloon count
    // so 3 balloons spread wide, 8 balloons pack closer, none go off-screen.
    const span = 84; // percent of field width to occupy (leave 8% edges)
    const slotWidth = n > 1 ? span / (n - 1) : 0;
    choices.forEach((item, idx) => {
      // Rise speed derived from difficulty; small jitter so balloons don't sync
      const duration = this.baseRiseSeconds + Math.random() * 2;
      const swayName = `balloon-sway-${idx % 3}`;
      const leftBase = n === 1 ? 50 : 8 + idx * slotWidth;

      const balloon = el('button', {
        class: 'absolute bottom-[-150px] w-[120px] h-[160px] pointer-events-auto cursor-pointer focus:outline-none flex flex-col items-center justify-start group transition-all duration-300',
        style: {
          left: `${leftBase + Math.random() * 2}%`,
          animationName: `balloon-rise, ${swayName}`,
          animationDuration: `${duration}s, ${2.1 + Math.random()}s`,
          animationTimingFunction: 'linear, ease-in-out',
          animationIterationCount: 'infinite, infinite',
          animationDelay: `${idx * 0.25}s, 0s`,
        },
        'aria-label': item.word,
        onclick: () => {
          if (locked) return;
          if (item.id === target.id) {
            locked = true;
            this._spawnPartyBurst(balloon, field, item);
            balloon.classList.add('scale-150', 'opacity-0', 'pointer-events-none');
            this.context.services.sfx.play('pop');
            audio.speak(item.word);
            this.context.bus.emit('leo:cheer');
            const praise = el('div', { class: 'absolute top-4 left-1/2 -translate-x-1/2 bg-white px-8 py-4 rounded-full shadow-card text-2xl font-bold text-brand-purple animate-toast-enter z-[150] whitespace-nowrap' }, [`POP! ${target.word}! ✨`]);
            field.appendChild(praise);
            this.completeRound();
          } else {
            balloon.classList.add('animate-wiggle', 'scale-90', 'opacity-50');
            this.context.services.sfx.play('buzz');
            this.context.bus.emit('leo:sad');
            this.noteWrong();
            setTimeout(() => balloon.classList.remove('animate-wiggle', 'scale-90', 'opacity-50'), 400);
          }
        },
      }, [
        el('div', {
          class: 'w-[110px] h-[130px] rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.1),inset_10px_10px_20px_rgba(255,255,255,0.4)] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95',
          style: {
            background: `radial-gradient(circle at 30% 30%, ${this.tileBackground(item)}dd, ${this.tileBackground(item)})`,
            color: item.color,
          },
        }, [createVocabVisual(item, media, { size: 'small' })]),
        el('div', { class: 'w-0 h-0 border-l-[10px] border-r-[10px] border-b-[15px] border-l-transparent border-r-transparent border-b-current -mt-[5px]', style: { color: this.tileBackground(item) } }),
        el('div', { class: 'w-[2px] h-[80px] bg-white/50 -mt-[2px]' }),
      ]);
      if (item.id === target.id) correctBalloon = balloon;
      field.appendChild(balloon);
    });

    this.bodyContainer.append(promptBtn, field);

    setTimeout(() => audio.speak(target.word), 500);
    this.startRoundWatch(correctBalloon);
  }

  /**
   * Layered party-burst effect for a correct pop. Total duration ~1.2s.
   *
   * Timeline:
   *   0ms    balloon starts scaling (balloon--burst keyframe)
   *   0ms    flash appears - bright radial gradient at pop center
   *   0ms    shockwave ring starts expanding outward
   *   20ms   streamers launch (mix of circles + stars + sparkles)
   *   0ms    emoji detaches from balloon and floats upward with wiggle
   *   1200ms all pieces removed from DOM
   *
   * The flash is the peak moment - it reads as "POP". Everything else
   * is celebratory afterglow.
   */
  _spawnPartyBurst(balloonEl, fieldEl, item) {
    const balloonRect = balloonEl.getBoundingClientRect();
    const fieldRect = fieldEl.getBoundingClientRect();

    // Center of the balloon body - measure the body, not the whole balloon
    // (which includes the string, pulling the "center" downward).
    const body = balloonEl.querySelector('.balloon__body');
    const bodyRect = (body ?? balloonEl).getBoundingClientRect();
    const cx = (bodyRect.left - fieldRect.left) + bodyRect.width / 2;
    const cy = (bodyRect.top  - fieldRect.top)  + bodyRect.height / 2;

    // 1. Flash - bright white radial burst, the "pop" moment
    const flash = el('div', {
      class: 'absolute w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,white_0%,transparent_60%)] z-[100] animate-flash pointer-events-none',
      style: { left: `${cx}px`, top: `${cy}px` },
    });
    fieldEl.appendChild(flash);
    setTimeout(() => flash.remove(), 450);

    // 2. Shockwave ring in the balloon's color - expands outward, fades
    const ring = el('div', {
      class: 'absolute w-[80px] h-[80px] -translate-x-1/2 -translate-y-1/2 border-4 rounded-full z-[99] animate-ring-expand pointer-events-none',
      style: {
        left: `${cx}px`,
        top:  `${cy}px`,
        borderColor: item.color,
      },
    });
    fieldEl.appendChild(ring);
    setTimeout(() => ring.remove(), 700);

    // 3. Emoji float-up - the pedagogical bit. The word's emoji floats
    // out of the balloon, wiggles slightly, then fades. Visually links
    // the pop action with the thing the child just learned.
    const emojiFloat = el('div', {
      class: 'absolute text-5xl -translate-x-1/2 -translate-y-1/2 z-[101] animate-float-up pointer-events-none drop-shadow-md',
      style: { left: `${cx}px`, top: `${cy}px` },
    }, [item.emoji ?? '✨']);
    fieldEl.appendChild(emojiFloat);
    setTimeout(() => emojiFloat.remove(), 1500);

    // 4. Streamer particles - mix of shapes for visual richness
    this._spawnStreamers(fieldEl, cx, cy, item.color);
  }

  _spawnStreamers(fieldEl, cx, cy, balloonColor) {
    const colors = ['#FFB84C', '#FF6B9D', '#4ECDC4', '#FFD93D', '#A78BFA', '#FF8C42', balloonColor];
    const SHAPES = ['circle', 'star', 'sparkle', 'rect'];
    const PIECES = 14;

    for (let i = 0; i < PIECES; i++) {
      const angle = (i / PIECES) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const distance = 80 + Math.random() * 60;   // 80-140px outward
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const rotate = (Math.random() - 0.5) * 720;
      const shape = SHAPES[i % SHAPES.length];

      const shapeClasses = shape === 'circle' ? 'rounded-full bg-current' :
                           shape === 'rect' ? 'w-2 h-6 bg-current' :
                           shape === 'star' ? 'text-2xl font-bold flex items-center justify-center' :
                           'text-xl font-bold flex items-center justify-center';

      const piece = el('div', {
        class: `absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 z-[98] opacity-0 animate-[streamer_1.2s_cubic-bezier(0.1,1,0.2,1)_forwards] pointer-events-none ${shapeClasses}`,
        style: {
          left: `${cx}px`,
          top:  `${cy}px`,
          color: colors[i % colors.length],
          '--dx': `${dx}px`,
          '--dy': `${dy}px`,
          '--rot': `${rotate}deg`,
          animationDelay: `${20 + i * 8}ms`,
        },
      }, shape === 'star' ? ['★'] : shape === 'sparkle' ? ['✦'] : []);
      fieldEl.appendChild(piece);

      setTimeout(() => piece.remove(), 1300);
    }
  }
}
