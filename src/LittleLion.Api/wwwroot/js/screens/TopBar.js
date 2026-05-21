import { el } from '../core/DomHelpers.js';

/**
 * Reusable top bar (back + home + progress + stars).
 *
 * Layout: [← back?] [🏠 home] ----progress---- [⭐ 0]
 *
 * The back button is optional - pass { onBack } to show it, omit to
 * hide. Home is always shown. Game screens pass onBack so the child
 * can return to the Game Picker for the same lesson without bouncing
 * all the way to home. Other screens (Home, Sticker Book) only pass
 * onHome or their own navigation.
 *
 * Returns { element, update } so consumers can refresh progress/stars
 * without rebuilding the DOM.
 */
export function createTopBar({ onBack, onHome }) {
  const fill = el('div', { class: 'h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-500' });
  const starsLabel = el('span', { class: 'font-bold text-lg text-ink' }, ['0']);

  const getThemeIcon = (theme) => {
    if (theme === 'boy') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-brand-primary animate-bounce-soft"><path d="M3 15h18v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2z" fill="#93C5FD" stroke="currentColor" /><path d="M7 10l3-4h4l3 4z" fill="white" stroke="currentColor" /><path d="M17 10h4v-3h-4z" fill="#60A5FA" stroke="currentColor" /><circle cx="7.5" cy="16.5" r="2" fill="#4B5563" stroke="currentColor" /><circle cx="7.5" cy="16.5" r="0.5" fill="white" /><circle cx="16.5" cy="16.5" r="2" fill="#4B5563" stroke="currentColor" /><circle cx="16.5" cy="16.5" r="0.5" fill="white" /></svg>`;
    } else {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5000 5000" class="w-6 h-6 text-brand-primary animate-bounce-soft"><path fill-rule="evenodd" fill="currentColor" fill-opacity="1" d="M 2923.03125 2060.421875 C 2850.449219 2038.480469 2775.421875 2032.410156 2709.300781 2033.46875 C 2659.859375 2034.269531 2615.738281 2039.101562 2582.351562 2043.660156 C 2557.621094 1955.5 2508.640625 1859.359375 2432 1772.449219 C 2380.949219 1714.558594 2317.390625 1661.128906 2242.289062 1616.210938 C 2095.171875 1528.21875 1902.371094 1472.519531 1662.488281 1488.550781 C 1437.019531 1502.738281 1241.328125 1632.898438 1102.800781 1778.109375 C 1030.589844 1853.808594 971.335938 1931.058594 940.039062 2013.828125 C 912.464844 2086.769531 905.1875 2161.230469 923.632812 2229.75 C 958.140625 2357.96875 1081.070312 2466.230469 1308.488281 2501.371094 C 1506.300781 2531.53125 1666.378906 2514.671875 1794.421875 2473.800781 C 1582.101562 2773.210938 1573.171875 3152.628906 1731.148438 3466.410156 C 1787.320312 3577.988281 1865.28125 3681.339844 1963.71875 3768.941406 C 2161.070312 3944.558594 2440.179688 4056.453125 2782.671875 4059.871094 C 3305.230469 4062.324219 3670.738281 3829.601562 3840.460938 3497.519531 C 4006.71875 3172.210938 3986.761719 2746.390625 3730.890625 2343.511719 C 3738.210938 2333.46875 3746.890625 2321.851562 3753.910156 2309.960938 C 3852.078125 2143.96875 4072.671875 1778.191406 4085.890625 1470.421875 C 4091.460938 1340.820312 4062.328125 1220.878906 3979.5 1125.589844 C 3914.5 1050.820312 3816.140625 989.71875 3670.96875 954.738281 C 3596.359375 936.289062 3529.289062 936.25 3468.660156 949.261719 C 3320.929688 980.960938 3209.828125 1095.019531 3129.011719 1246.988281 C 2989.339844 1509.628906 2939.589844 1882.941406 2923.53125 2054.75 Z M 2493.421875 3427.101562 L 2953.828125 3461.820312 C 2953.828125 3461.820312 2939.160156 3766.921875 2701.699219 3765.730469 C 2444.089844 3764.441406 2493.421875 3427.101562 2493.421875 3427.101562 Z M 2115.511719 3169.570312 C 2115.511719 3169.570312 2098.128906 3075.910156 2114.519531 2980.78125 C 2128.960938 2896.96875 2170.988281 2809.671875 2290.078125 2804.5 C 2354.660156 2801.691406 2403.820312 2813.011719 2440.828125 2834.488281 C 2497.929688 2867.609375 2524.28125 2924.21875 2536.839844 2979.230469 C 2557.519531 3069.789062 2541.121094 3158.449219 2541.121094 3158.449219 C 2536.460938 3183.578125 2553.078125 3207.78125 2578.210938 3212.441406 C 2603.339844 3217.109375 2627.539062 3200.488281 2632.199219 3175.359375 C 2632.199219 3175.359375 2652.160156 3068.128906 2627.148438 2958.609375 C 2609.261719 2880.21875 2568.691406 2801.570312 2487.320312 2754.359375 C 2437.789062 2725.628906 2372.46875 2708.191406 2286.050781 2711.949219 C 2111.398438 2719.539062 2044.398438 2842.140625 2023.230469 2965.050781 C 2004.011719 3076.628906 2024.441406 3186.488281 2024.441406 3186.488281 C 2029.109375 3211.621094 2053.308594 3228.238281 2078.441406 3223.570312 C 2103.570312 3218.898438 2120.191406 3194.699219 2115.511719 3169.570312 Z M 2989.871094 3140.371094 C 2989.871094 3140.371094 2972.488281 3046.710938 2988.878906 2951.578125 C 3003.308594 2867.769531 3045.339844 2780.46875 3164.429688 2775.300781 C 3229.011719 2772.488281 3278.179688 2783.808594 3315.191406 2805.289062 C 3372.289062 2838.410156 3398.640625 2895.019531 3411.199219 2950.03125 C 3431.878906 3040.589844 3415.480469 3129.25 3415.480469 3129.25 C 3410.808594 3154.378906 3427.429688 3178.578125 3452.570312 3183.238281 C 3477.699219 3187.910156 3501.890625 3171.289062 3506.558594 3146.160156 C 3506.558594 3146.160156 3526.519531 3038.929688 3501.511719 2929.410156 C 3483.609375 2851.019531 3443.050781 2772.371094 3361.679688 2725.160156 C 3312.148438 2696.421875 3246.828125 2678.988281 3160.410156 2682.75 C 2985.75 2690.339844 2918.761719 2812.941406 2897.589844 2935.851562 C 2878.359375 3047.429688 2898.800781 3157.289062 2898.800781 3157.289062 C 2903.46875 3182.421875 2927.660156 3199.039062 2952.800781 3194.371094 C 2977.929688 3189.691406 2994.539062 3165.5 2989.871094 3140.371094 Z M 3262.980469 2226.269531 C 3262.980469 2226.269531 3457.460938 2037.71875 3614.808594 1831.238281 C 3772.148438 1624.761719 3892.351562 1400.351562 3743.78125 1328.628906 C 3314.878906 1121.578125 3262.980469 2226.269531 3262.980469 2226.269531 "/></svg>`;
    }
  };

  const themeToggle = el('button', {
    class: 'w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-soft hover:bg-white active:scale-95 transition-all shrink-0 group',
    'aria-label': 'Toggle Theme',
    title: 'Toggle Theme',
    onclick: () => {
      window.toggleTheme();
      window.littleLionSfx?.play('pop');
    }
  });

  const updateToggleIcon = (theme) => {
    themeToggle.innerHTML = getThemeIcon(theme);
  };

  // Initial update
  updateToggleIcon(window.getCurrentTheme?.() || 'girl');

  // Handle global theme change events (so all instances synchronize immediately)
  const onThemeChanged = (e) => {
    updateToggleIcon(e.detail);
  };
  window.addEventListener('themechanged', onThemeChanged);

  const children = [];

  if (onBack) {
    children.push(el('button', {
      class: 'w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-soft text-xl font-bold hover:bg-white active:scale-95 transition-all shrink-0',
      'aria-label': 'Back to game picker',
      onclick: onBack,
    }, ['←']));
  }

  children.push(
    el('button', {
      class: 'w-10 h-10 flex items-center justify-center bg-white/80 rounded-full shadow-soft text-xl hover:bg-white active:scale-95 transition-all shrink-0',
      'aria-label': 'Home',
      onclick: onHome,
    }, ['🏠']),
    themeToggle,
    el('div', { class: 'flex-1 mx-3 h-3 bg-white/40 border border-brand-primary/10 rounded-full overflow-hidden shadow-inner transition-colors duration-500' }, [fill]),
    el('div', { class: 'flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full shadow-soft shrink-0' }, ['⭐', starsLabel]),
  );

  const element = el('div', {
    class: 'sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-white/50 shrink-0',
  }, children);

  function update({ progress, stars }) {
    if (progress != null) fill.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    if (stars != null) starsLabel.textContent = String(stars);
  }

  function destroy() {
    window.removeEventListener('themechanged', onThemeChanged);
  }

  return { element, update, destroy };
}
