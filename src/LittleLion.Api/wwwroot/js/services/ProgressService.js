/**
 * Progress state, backed by the backend API.
 * - On construction, optimistically reports zeros until refresh() resolves.
 * - recordSession() POSTs to the server, which is authoritative.
 * - Emits 'progress:changed' on every state update.
 * - Emits 'rewards:unlocked' with an array of newly-unlocked reward ids
 *   when a session returns any.
 */
export class ProgressService {
  constructor(apiClient, bus) {
    this.api = apiClient;
    this.bus = bus;
    this._state = this._loadFromLocalStorage() || this._emptyState();
    this._loaded = false;
  }

  get totalStars()     { return this._state.totalStars; }
  get streakDays()     { return this._state.streakDays; }
  get lessons()        { return this._state.lessons; }
  get unlockedItems()  { return this._state.unlockedItems; }
  get isLoaded()       { return this._loaded; }

  /**
   * Best stars on a given (lesson, difficulty), or 0.
   * If difficulty is omitted, returns the best across any difficulty -
   * useful for "have they ever beaten this lesson" style queries.
   */
  getBestStars(lessonId, difficulty = null) {
    const records = this._state.lessons.filter(l => l.lessonId === lessonId);
    if (records.length === 0) return 0;

    if (difficulty == null) {
      return Math.max(...records.map(l => l.bestStars ?? 0));
    }

    const match = records.find(
      l => (l.difficulty ?? 'Medium').toLowerCase() === difficulty.toLowerCase()
    );
    return match?.bestStars ?? 0;
  }

  hasUnlocked(rewardId) {
    return this._state.unlockedItems.some(u => u.id === rewardId);
  }

  async refresh() {
    try {
      const data = await this.api.get('/api/progress');
      this._applyState(data);
      this._loaded = true;
    } catch (err) {
      console.error('ProgressService.refresh failed', err);
    }
  }

  async recordSession(lessonId, starsEarned, difficulty = 'Medium') {
    try {
      const result = await this.api.post('/api/progress/sessions', {
        lessonId, starsEarned, difficulty,
      });
      this._applyState(result.playerProgress);

      if (Array.isArray(result.newlyUnlocked) && result.newlyUnlocked.length > 0) {
        this.bus.emit('rewards:unlocked', { rewards: result.newlyUnlocked });
      }
    } catch (err) {
      console.error('ProgressService.recordSession failed', err);
      // Fallback: optimistic local star-only update so UI still updates
      this._state.totalStars += starsEarned;
      this._saveToLocalStorage();
      this.bus.emit('progress:changed', { ...this._state });
    }
  }

  _applyState(dto) {
    this._state = {
      totalStars:     dto.totalStars ?? 0,
      streakDays:     dto.streakDays ?? 0,
      lastActiveDate: dto.lastActiveDate ?? null,
      lessons:        Array.isArray(dto.lessons)        ? dto.lessons        : [],
      unlockedItems:  Array.isArray(dto.unlockedItems)  ? dto.unlockedItems  : [],
    };
    this._saveToLocalStorage();
    this.bus.emit('progress:changed', { ...this._state });
  }

  _emptyState() {
    return {
      totalStars: 0,
      streakDays: 0,
      lastActiveDate: null,
      lessons: [],
      unlockedItems: [],
    };
  }

  _isValidProgress(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.totalStars !== 'number' || data.totalStars < 0) return false;
    if (typeof data.streakDays !== 'number' || data.streakDays < 0) return false;
    if (!Array.isArray(data.lessons)) return false;
    if (!Array.isArray(data.unlockedItems)) return false;
    return true;
  }

  _loadFromLocalStorage() {
    try {
      const dataStr = localStorage.getItem('littlelion-progress');
      if (!dataStr) return null;
      const data = JSON.parse(dataStr);
      if (this._isValidProgress(data)) {
        return {
          totalStars: data.totalStars,
          streakDays: data.streakDays,
          lastActiveDate: data.lastActiveDate ?? null,
          lessons: data.lessons,
          unlockedItems: data.unlockedItems
        };
      }
    } catch (err) {
      console.error('ProgressService: failed to load progress from localStorage', err);
    }
    return null;
  }

  _saveToLocalStorage() {
    try {
      localStorage.setItem('littlelion-progress', JSON.stringify(this._state));
    } catch (err) {
      console.error('ProgressService: failed to save progress to localStorage', err);
    }
  }
}
