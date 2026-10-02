/**
 * In-memory TTL cache. Concurrent misses for the same key share one upstream
 * request, and if a refresh fails the last good value is served as stale.
 */
class TtlCache {
  constructor({ now = Date.now, log = () => {} } = {}) {
    this.now = now;
    this.log = log;
    this.entries = new Map();
    this.inflight = new Map();
  }

  /**
   * @param {string} key
   * @param {number} ttlMs
   * @param {() => Promise<any>} loader
   * @returns {Promise<{value: any, stale: boolean}>}
   */
  get(key, ttlMs, loader) {
    const entry = this.entries.get(key);
    if (entry && this.now() - entry.fetchedAt < ttlMs) {
      this.log(`cache hit ${key}`);
      return Promise.resolve({ value: entry.value, stale: false });
    }
    if (this.inflight.has(key)) return this.inflight.get(key);

    this.log(`cache miss ${key}`);
    const pending = (async () => {
      try {
        const value = await loader();
        this.entries.set(key, { value, fetchedAt: this.now() });
        return { value, stale: false };
      } catch (err) {
        if (entry) {
          this.log(`refresh failed for ${key}, serving stale: ${err.message}`);
          return { value: entry.value, stale: true };
        }
        throw err;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, pending);
    return pending;
  }
}

module.exports = { TtlCache };
