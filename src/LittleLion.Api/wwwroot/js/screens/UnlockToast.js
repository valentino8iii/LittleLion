import { el } from '../core/DomHelpers.js';

/**
 * Global unlock toast. Listens for 'rewards:unlocked' bus events and
 * queues up a celebratory banner per reward. Only one shows at a time;
 * multiple unlocks cascade after each other.
 *
 * Mounted once at app bootstrap; lives for the lifetime of the page.
 */
export class UnlockToast {
  constructor(bus, { sfx, audio } = {}) {
    this._bus   = bus;
    this._sfx   = sfx;
    this._audio = audio;
    this._queue = [];
    this._playing = false;
    this._root = el('div', { class: 'fixed inset-x-0 top-12 pointer-events-none z-[100] flex flex-col items-center gap-4' });
    document.body.appendChild(this._root);
    bus.on('rewards:unlocked', ({ rewards }) => this._enqueue(rewards));
  }

  _enqueue(rewards) {
    for (const r of rewards) this._queue.push(r);
    this._pump();
  }

  _pump() {
    if (this._playing || this._queue.length === 0) return;
    this._playing = true;
    const reward = this._queue.shift();
    this._show(reward);
  }

  _show(reward) {
    this._sfx?.play('fanfare');
    this._audio?.speak(`You unlocked ${reward.name}!`);

    const toast = el('div', { class: 'relative bg-white px-8 py-6 rounded-3xl shadow-card flex flex-col items-center text-center animate-toast-enter transition-all duration-500' }, [
      el('div', { class: 'absolute -top-4 bg-brand-accent text-ink px-4 py-1 rounded-full font-bold text-sm shadow-sm border-2 border-white' }, ['New!']),
      el('div', { class: 'text-6xl mb-2 animate-bounce-soft' }, [reward.emoji]),
      el('div', { class: 'text-2xl font-bold text-brand-primary' }, [reward.name]),
      el('div', { class: 'text-ink-soft font-medium' }, [this._subtitleFor(reward.category)]),
    ]);
    this._root.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('-translate-y-full', 'opacity-0');
      setTimeout(() => {
        toast.remove();
        this._playing = false;
        this._pump();
      }, 500);
    }, 2600);
  }

  _subtitleFor(category) {
    switch (category) {
      case 'Sticker': return 'New sticker!';
      case 'Badge':   return 'New badge!';
      case 'Costume': return 'New costume for Leo!';
      default:        return 'New reward!';
    }
  }
}
