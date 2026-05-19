import { Component } from '../core/Component.js';
import { el } from '../core/DomHelpers.js';
import { Leo } from './Leo.js';

const CONFETTI_COLORS = ['#FFB84C', '#FF6B9D', '#4ECDC4', '#FFD93D', '#A78BFA', '#FF8C42'];

export class WinScreen extends Component {
  constructor(context, params) {
    super(context);
    this.stars      = params.stars ?? 0;
    this.playedGame = params.playedGame ?? 'tap';
    this.lessonId   = params.lessonId ?? 'animals';
    this.difficulty = params.difficulty ?? 'Medium';
  }

  render() {
    this._leo = new Leo(this.context.bus, { size: 'large' });
    this.onDispose(() => this._leo.destroy());

    const starRow = el('div', { class: 'text-4xl flex gap-2 justify-center mb-12' },
      Array.from({ length: Math.min(this.stars, 5) }).map(() => el('span', {}, ['⭐']))
    );

    const root = el('div', { class: 'screen absolute inset-0 flex flex-col p-4 sm:p-6 overflow-y-auto items-center justify-center text-center' }, [
      this._renderConfetti(),
      el('div', { class: 'text-8xl mb-8 animate-bounce-soft' }, [this._leo.element]),
      el('h2', { class: 'text-5xl sm:text-6xl font-display font-bold text-brand-blue text-shadow-strong mb-2' }, ['Great Job!']),
      el('p',  { class: 'text-2xl text-ink-soft font-medium mb-8' }, [`You earned ${this.stars} star${this.stars === 1 ? '' : 's'}!`]),
      starRow,
      el('div', { class: 'flex gap-4 flex-wrap justify-center' }, [
        el('button', {
          class: 'px-8 py-4 rounded-full font-bold text-xl shadow-btn hover:-translate-y-1 active:translate-y-1 transition-all outline-none focus:ring-4 border-4 bg-white/80 text-brand-blue border-white hover:bg-white',
          onclick: () => this.context.router.navigate('home'),
        }, ['Home']),
        el('button', {
          class: 'px-8 py-4 rounded-full font-bold text-xl shadow-btn hover:-translate-y-1 active:translate-y-1 transition-all outline-none focus:ring-4 border-4 bg-brand-green text-white border-green-400 hover:bg-green-500',
          onclick: () => this.context.router.navigate(this.playedGame, {
            lessonId: this.lessonId,
            difficulty: this.difficulty,
          }),
        }, ['Play again →']),
      ]),
    ]);

    return root;
  }

  onMount() {
    this.context.services.sfx.play('fanfare');
    this.context.services.audio.speak('Great job!');
    // Trigger Leo's big celebration after the DOM settles
    setTimeout(() => this.context.bus.emit('leo:celebrate'), 150);
  }

  _renderConfetti() {
    const container = el('div', { class: 'absolute inset-0 pointer-events-none overflow-hidden z-50' });
    for (let i = 0; i < 28; i++) {
      const piece = el('div', {
        class: 'absolute -top-4 w-4 h-8 opacity-0 animate-fall rounded-full',
        style: {
          left: `${Math.random() * 100}%`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${Math.random() * 0.3}s`,
          animationDuration: `${1.2 + Math.random() * 0.8}s`,
        },
      });
      container.appendChild(piece);
    }
    return container;
  }
}
