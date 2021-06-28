/**
 * Subset of the `Window` interface that `LocationObserver` relies on.
 *
 * @typedef {Pick<Window,'addEventListener'|'removeEventListener'|'location'|'history'>} WindowLocation
 */

/**
 * Observer that monitors for client-side changes to the document URL.
 *
 * This is useful to respond to URL changes in Single Page Applications and
 * web apps that use Turbolinks-style techniques to optimize page transitions.
 *
 * An unavoidable limitation of this observer is that it cannot know when the
 * content of the page is fully updated to reflect a new URL. Clients should
 * be aware that when the observer's callback is invoked the page may be in an
 * intermediate loading state.
 */
export class LocationObserver {
  /**
   * Begin monitoring for document URL changes.
   *
   * @param {(url: string) => void} callback - Callback to invoke when the document
   *   URL changes
   * @param {WindowLocation} [window_] - Test seam. Document to monitor.
   */
  constructor(callback, window_ = window) {
    /**
     * Flag to keep track of whether URL-observing is active. This exists because
     * we may not be able to un-monkey-patch `History` when `disconnect` is
     * called.
     */
    this._active = true;

    const location = window_.location;
    const history = window_.history;

    let prevURL = window_.location.href;
    this._checkForURLChange = () => {
      if (this._active && window_.location.href !== prevURL) {
        prevURL = location.href;
        callback(location.href);
      }
    };

    /** @param {string} method */
    const wrapHistoryMethod = method => {
      const origMethod = history[method];

      /**
       * @param {any[]} args
       */
      const wrappedMethod = (...args) => {
        const result = origMethod.call(history, ...args);
        this._checkForURLChange();
        return result;
      };
      history[method] = wrappedMethod;

      const unwrap = () => {
        // Un-patch the history API if it hasn't been altered by other code in
        // the interim. If it has been, we just deactivate the wrapper by
        // setting `this._active` to false.
        if (history[method] === wrappedMethod) {
          history[method] = origMethod;
        }
      };
      return unwrap;
    };

    // Observe new URLs being added to session history by `history.{pushState, replaceState}`.
    // There is no event for these so we monkey-patch the APIs instead.
    this._cleanupCallbacks = [
      wrapHistoryMethod('pushState'),
      wrapHistoryMethod('replaceState'),
    ];

    // Observe URL changes through session history programatically via
    // `history.{back, forward, go}` or by the user.
    window_.addEventListener('popstate', this._checkForURLChange);
    this._cleanupCallbacks.push(() =>
      window_.removeEventListener('popstate', this._checkForURLChange)
    );
  }

  /**
   * Stop watching for URL changes.
   */
  disconnect() {
    this._cleanupCallbacks.forEach(cb => cb());
    this._active = false;
  }
}
