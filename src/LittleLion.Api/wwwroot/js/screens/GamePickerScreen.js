import { Component } from '../core/Component.js';
import { el } from '../core/DomHelpers.js';

/**
 * Game picker: shown after choosing a lesson. Lists the available game
 * modes, all scoped to the selected lesson.
 */
const GAMES = [
  { id: 'tap',     title: 'Tap & Learn',  subtitle: 'Hear the word, tap the picture',    emoji: '👆', color: '#FFB84C' },
  { id: 'drag',    title: 'Match It!',    subtitle: 'Drag words to pictures',            emoji: '🎯', color: '#4ECDC4' },
  { id: 'balloon', title: 'Balloon Pop',  subtitle: 'Pop the right balloon',             emoji: '🎈', color: '#FF6B9D' },
  { id: 'memory',  title: 'Memory Match', subtitle: 'Flip cards, find the pairs',        emoji: '🧠', color: '#A78BFA' },
  { id: 'odd',     title: 'Odd One Out',  subtitle: 'Find the one that doesn\'t belong', emoji: '🔍', color: '#F59E0B' },
];

export class GamePickerScreen extends Component {
  constructor(context, params) {
    super(context);
    this.lessonId = params?.lessonId ?? 'animals';
    // Prefer the difficulty that was explicitly passed in the nav params;
    // fall back to the global difficulty set from the home screen's picker.
    this.difficulty =
      params?.difficulty ??
      context.services.difficulty?.get() ??
      'Medium';
  }

  render() {
    return el('div', { class: 'screen absolute inset-0 flex flex-col p-4 sm:p-6 overflow-y-auto' }, [
      el('div', { class: 'flex items-center mb-6 gap-4 shrink-0' }, [
        el('button', {
          class: 'w-12 h-12 flex items-center justify-center bg-white/80 rounded-full shadow-soft text-2xl font-bold hover:bg-white active:scale-95 transition-transform shrink-0 outline-none focus:ring-4 focus:ring-brand-blue/50',
          'aria-label': 'Back',
          onclick: () => this.context.router.navigate('home'),
        }, ['←']),
        el('div', { class: 'flex-1' }, [
          el('h1', { class: 'text-3xl sm:text-4xl font-display font-bold text-brand-blue text-shadow-strong' }, ['Pick a game']),
          el('p',  { class: 'text-xl text-ink-soft font-medium mt-1' }, [
            `${this._humanTitle()} · ${this.difficulty}`,
          ]),
        ]),
      ]),

      el('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12' },
        GAMES.map((g, i) =>
          el('button', {
            class: 'relative p-6 rounded-3xl shadow-card transition-transform hover:-translate-y-1 active:translate-y-1 flex items-center gap-4 text-left group overflow-hidden outline-none focus:ring-4 focus:ring-white/50',
            style: { background: g.color, animationDelay: `${i * 0.08}s` },
            onclick: () => this.context.router.navigate(g.id, {
              lessonId: this.lessonId,
              difficulty: this.difficulty,
            }),
          }, [
            el('div', { class: 'text-5xl bg-white/30 p-3 rounded-2xl flex-shrink-0' }, [g.emoji]),
            el('div', { class: 'flex-1' }, [
              el('div', { class: 'text-2xl font-bold text-white text-shadow-strong' }, [g.title]),
              el('div', { class: 'text-white/90 font-medium' }, [g.subtitle]),
            ]),
            el('div', { class: 'text-3xl text-white/50 group-hover:text-white transition-colors' }, ['→']),
          ])
        )
      ),
    ]);
  }

  _humanTitle() {
    // Quick lookup; could fetch from lesson service but this avoids an extra await.
    const titles = {
      animals: 'Animals', colors: 'Colors', fruits: 'Fruits',
      vehicles: 'Vehicles', body: 'My Body', clothes: 'Clothes', weather: 'Weather',
    };
    return titles[this.lessonId] ?? this.lessonId;
  }
}
