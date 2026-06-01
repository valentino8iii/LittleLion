/**
 * Domain-flavoured service over the raw ApiClient.
 * Caches lessons in-memory so we don't re-fetch across screens.
 */
export class LessonService {
  constructor(apiClient, audioService) {
    this.api = apiClient;
    this.audio = audioService;
    this._cache = new Map(); // lessonId -> LessonDetailDto
    this._summariesPromise = null;
  }

  getAllSummaries() {
    if (!this._summariesPromise) {
      this._summariesPromise = this.api.get('/api/lessons');
    }
    return this._summariesPromise;
  }

  async getLesson(id) {
    if (this._cache.has(id)) return this._cache.get(id);
    const lesson = await this.api.get(`/api/lessons/${encodeURIComponent(id)}`);
    this._cache.set(id, lesson);

    // Preload lesson vocabulary audio in the background to minimize game latency
    if (this.audio && typeof this.audio.preload === 'function' && lesson && Array.isArray(lesson.items)) {
      lesson.items.forEach(item => {
        this.audio.preload(item);
      });
    }

    return lesson;
  }
}
