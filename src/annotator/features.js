import { TinyEmitter } from 'tiny-emitter';

import { warnOnce } from '../shared/warn-once';

/**
 * An observable container of feature flags.
 */
export class FeatureFlags extends TinyEmitter {
  /**
   * @param {string[]} knownFlags - List of known/used feature flags. Used to
   *   catch mistakes where code checks for a feature flag that no longer exists.
   */
  constructor(knownFlags) {
    super();

    /**
     * Map of flag name to enabled state.
     *
     * @type {Map<string, boolean>}
     */
    this._flags = new Map();
    this._knownFlags = knownFlags;
  }

  /**
   * Update the stored flags and notify observers via a "flagsChanged" event.
   *
   * @param {Record<string, boolean>} flags
   */
  update(flags) {
    this._flags.clear();
    for (let [flag, on] of Object.entries(flags)) {
      this._flags.set(flag, on);
    }
    this.emit('flagsChanged', this._flags);
  }

  /**
   * Test if a feature flag is enabled.
   *
   * This will return false if the feature flags have not yet been received from
   * the backend. Code that uses a feature flag should handle subsequent changes
   * to the flag's state by listening for the "flagsChanged" event.
   *
   * @param {string} flag
   * @return {boolean}
   */
  flagEnabled(flag) {
    if (!this._knownFlags.includes(flag)) {
      warnOnce('Looked up unknown feature', flag);
      return false;
    }
    return this._flags.get(flag) ?? false;
  }
}
