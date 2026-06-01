/**
 * Audio service. Today: uses the browser's Web Speech API (free, works offline).
 * Tomorrow: swap implementation to play pre-generated MP3s from /audio/{word}.mp3
 * (backend already returns these URLs in the lesson DTO).
 *
 * Callers only depend on this interface, so the swap is transparent.
 */
export class AudioService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.currentAudio = null;
    this.preloadCache = new Map(); // url -> Audio
    this._warmUpVoice();
  }

  _warmUpVoice() {
    if (!this.synth) return;
    const pick = () => {
      const voices = this.synth.getVoices();
      this.voice =
        voices.find(v => v.lang.startsWith('en') && /female|samantha|karen|zira|google us english/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith('en')) ||
        null;
    };
    pick();
    this.synth.onvoiceschanged = pick;
  }

  /** Preload the given text or vocabulary item's audio in the background. */
  preload(textOrItem, options = {}) {
    let text = '';
    if (typeof textOrItem === 'string') {
      text = textOrItem;
    } else if (textOrItem && typeof textOrItem === 'object') {
      const age8Mode = localStorage.getItem('littlelion_age8mode') !== 'false';
      text = (age8Mode && textOrItem.audioTranscript) 
        ? textOrItem.audioTranscript 
        : textOrItem.word;
    }

    if (!text) return;

    let rate = 0.80;
    let pitch = 1.45;

    if (typeof options === 'number') {
      rate = options;
    } else if (options && typeof options === 'object') {
      if (options.rate !== undefined) rate = options.rate;
      if (options.pitch !== undefined) pitch = options.pitch;
    }

    const url = `/api/tts?text=${encodeURIComponent(text)}&rate=${rate}&pitch=${pitch}`;
    if (this.preloadCache.has(url)) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    this.preloadCache.set(url, audio);
  }

  /** Speak the given text or vocabulary item. Cancels any in-flight utterance. */
  speak(textOrItem, options = {}) {
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    let text = '';
    if (typeof textOrItem === 'string') {
      text = textOrItem;
    } else if (textOrItem && typeof textOrItem === 'object') {
      const age8Mode = localStorage.getItem('littlelion_age8mode') !== 'false';
      text = (age8Mode && textOrItem.audioTranscript) 
        ? textOrItem.audioTranscript 
        : textOrItem.word;
    }

    if (!text) return;

    // Optimized to sound like an energetic, extremely young child:
    // A pitch of 1.45 creates a very small, youthful voice; a rate of 0.80 is slower and more deliberate.
    let rate = 0.80;
    let pitch = 1.45;

    if (typeof options === 'number') {
      rate = options;
    } else if (options && typeof options === 'object') {
      if (options.rate !== undefined) rate = options.rate;
      if (options.pitch !== undefined) pitch = options.pitch;
    }

    const url = `/api/tts?text=${encodeURIComponent(text)}&rate=${rate}&pitch=${pitch}`;
    
    let audio;
    if (this.preloadCache.has(url)) {
      audio = this.preloadCache.get(url);
      audio.currentTime = 0;
    } else {
      audio = new Audio(url);
    }
    this.currentAudio = audio;

    let fallbackTriggered = false;
    const triggerFallback = (reason) => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      console.warn(`Azure TTS failed (${reason}). Falling back to Web Speech API.`);
      this._speakFallback(text, rate, pitch);
    };

    audio.addEventListener('error', () => {
      triggerFallback("loading/decode error");
    });

    audio.play().catch(err => {
      triggerFallback(err.name === "NotAllowedError" ? "autoplay blocked" : err.message);
    });
  }

  _speakFallback(text, rate, pitch) {
    if (!this.synth) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = 'en-US';
      if (this.voice) utterance.voice = this.voice;
      this.synth.speak(utterance);
    } catch (e) {
      console.error("Fallback SpeechSynthesis failed:", e);
    }
  }
}
