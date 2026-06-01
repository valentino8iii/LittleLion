/**
 * Composition root for the frontend.
 * Creates services, wires the router, registers screens, mounts home.
 *
 * This is the ONLY file that knows about concrete classes.
 * Everything else depends on abstractions passed via `context`.
 */
import { ApiClient }          from './api/ApiClient.js';
import { EventBus }           from './core/EventBus.js';
import { Router }             from './core/Router.js';
import { AudioService }       from './services/AudioService.js';
import { SoundEffectService } from './services/SoundEffectService.js';
import { LessonService }      from './services/LessonService.js';
import { ProgressService }    from './services/ProgressService.js';
import { MediaService }       from './services/MediaService.js';
import { RewardService }      from './services/RewardService.js';
import { DifficultyService }  from './services/DifficultyService.js';

import { HomeScreen }        from './screens/HomeScreen.js';
import { GamePickerScreen }  from './screens/GamePickerScreen.js';
import { WinScreen }         from './screens/WinScreen.js';
import { StickerBookScreen } from './screens/StickerBookScreen.js';
import { UnlockToast }       from './screens/UnlockToast.js';
import { TapGame }          from './games/TapGame.js';
import { DragGame }         from './games/DragGame.js';
import { BalloonGame }      from './games/BalloonGame.js';
import { MemoryGame }       from './games/MemoryGame.js';
import { OddOneOutGame }    from './games/OddOneOutGame.js';

function bootstrap() {
  const bus = new EventBus();
  const api = new ApiClient();

  const services = {
    audio:      new AudioService(),
    sfx:        new SoundEffectService(),
    progress:   new ProgressService(api, bus),
    media:      new MediaService(),
    rewards:    new RewardService(api),
    difficulty: new DifficultyService(bus),
  };
  services.lessons = new LessonService(api, services.audio);

  // Preload common UI audio strings to reduce latency during gameplay
  services.audio.preload("It's OK, let's try again!", { rate: 0.9 });
  services.audio.preload("Great job!");

  // Kick off initial loads in parallel - UI renders before these resolve
  services.progress.refresh();
  services.rewards.refresh();

  // Expose sound effects globally for dynamic/functional components
  window.littleLionSfx = services.sfx;

  const rootEl = document.getElementById('app');
  const router = new Router(rootEl, null);

  const context = { bus, services, router };
  router.context = context; // complete the circular reference intentionally

  // Global unlock toast - mounted once, reacts to 'rewards:unlocked' events
  new UnlockToast(bus, { sfx: services.sfx, audio: services.audio });

  router
    .register('home',        (ctx)         => new HomeScreen(ctx))
    .register('gamePicker',  (ctx, params) => new GamePickerScreen(ctx, params))
    .register('tap',         (ctx, params) => new TapGame(ctx, params))
    .register('drag',        (ctx, params) => new DragGame(ctx, params))
    .register('balloon',     (ctx, params) => new BalloonGame(ctx, params))
    .register('memory',      (ctx, params) => new MemoryGame(ctx, params))
    .register('odd',         (ctx, params) => new OddOneOutGame(ctx, params))
    .register('win',         (ctx, params) => new WinScreen(ctx, params))
    .register('stickerBook', (ctx)         => new StickerBookScreen(ctx));

  router.navigate('home');
}

bootstrap();
